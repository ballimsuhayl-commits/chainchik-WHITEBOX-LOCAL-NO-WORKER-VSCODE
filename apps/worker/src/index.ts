import pino from "pino";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { boolFromEnv, loadEnv, tmpl } from "@cc/shared";

const env = loadEnv(process.env as any);
const { Client } = pg;

async function processDeadLetterJobs() {
  const c = await dbClient();
  try {
    const jobs = (await c.query(
      "SELECT id,payload,attempts FROM dead_letter_jobs WHERE type='WHATSAPP_SEND' AND next_run_at <= now() ORDER BY next_run_at ASC LIMIT 10"
    )).rows;

    for (const j of jobs) {
      const to = String(j.payload?.to ?? "");
      const text = String(j.payload?.text ?? "");

// Abandoned cart: if customer replies YES, send a resume link
if (text && text.trim().toUpperCase() === "YES") {
  const c = await dbClient();
  try {
    const cart = (await c.query(
      "SELECT id FROM cart_sessions WHERE customer_phone=$1 AND status='OPEN' ORDER BY updated_at DESC LIMIT 1",
      [from]
    )).rows[0];
    if (cart) {
      const base = String((env as any).CART_RESUME_BASE_URL ?? "http://localhost:3000/resume");
      const link = `${base}/${cart.id}`;
      await sendWhatsAppText(from, `Perfect 😊 Here’s your cart link to finish checkout: ${link} ${env.BRAND_SIGNOFF}`);
    }
  } finally { await c.end(); }
}
      try {
        if (!to || !text) throw new Error("Missing to/text");
        await sendWhatsAppText(to, text);
        await c.query("DELETE FROM dead_letter_jobs WHERE id=$1", [j.id]);
      } catch (err: any) {
        const attempts = Number(j.attempts ?? 1) + 1;
        const delayMin = Math.min(60, Math.pow(2, Math.min(attempts, 6)));
        await c.query(
          "UPDATE dead_letter_jobs SET attempts=$2, error=$3, next_run_at=now() + ($4 || ' minutes')::interval WHERE id=$1",
          [j.id, attempts, String(err?.message ?? err), String(delayMin)]
        );
      }
    }
  } finally {
    await c.end();
  }
}

async function dbClient() {
  const c = new Client({ connectionString: env.DATABASE_URL });
  await c.connect();
  return c;
}

async function sendWhatsAppText(toPhone: string, text: string) {
  if (!boolFromEnv(env.ENABLE_WHATSAPP_SEND, true)) return;
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) return;

  const url = `https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type":"application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: toPhone, type:"text", text:{ body: text } })
  });
  if (!res.ok) console.warn("WhatsApp send failed", res.status, await res.text());
}

async function downloadWhatsAppMedia(mediaId: string) {
  if (!env.WHATSAPP_ACCESS_TOKEN) throw new Error("Missing WHATSAPP_ACCESS_TOKEN");
  const metaUrl = `https://graph.facebook.com/v20.0/${mediaId}`;
  const metaRes = await fetch(metaUrl, { headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` } });
  if (!metaRes.ok) throw new Error(`meta failed ${metaRes.status}`);
  const meta = await metaRes.json();
  const dl = String(meta.url ?? "");
  const mime = meta.mime_type ? String(meta.mime_type) : undefined;
  const sha256 = meta.sha256 ? String(meta.sha256) : undefined;

  const dlRes = await fetch(dl, { headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` } });
  if (!dlRes.ok) throw new Error(`download failed ${dlRes.status}`);
  const bytes = new Uint8Array(await dlRes.arrayBuffer());

  if (sha256) {
    const ours = crypto.createHash("sha256").update(bytes).digest("hex");
    if (ours !== sha256) throw new Error("sha256 mismatch");
  }
  return { bytes, mime, sha256 };
}

function extractWaEvents(payload: any) {
  const out: Array<{ fromPhone: string; kind: "text" | "media"; text?: string; mediaId?: string; mime?: string; }> = [];
  try {
    const entries = payload.entry ?? [];
    for (const e of entries) {
      const changes = e.changes ?? [];
      for (const c of changes) {
        const v = c.value;
        const msgs = v?.messages ?? [];
        for (const m of msgs) {
          const from = String(m.from ?? "");
          if (!from) continue;
          if (m.type === "text") out.push({ fromPhone: from, kind: "text", text: String(m.text?.body ?? "") });
          if (m.type === "image") out.push({ fromPhone: from, kind: "media", mediaId: String(m.image?.id ?? ""), mime: String(m.image?.mime_type ?? "") });
          if (m.type === "document") out.push({ fromPhone: from, kind: "media", mediaId: String(m.document?.id ?? ""), mime: String(m.document?.mime_type ?? "") });
        }
      }
    }
  } catch {}
  return out;
}

async function findLatestOrderAwaitingPop(c: pg.Client, phone: string) {
  const cust = await c.query("SELECT id FROM customers WHERE phone=$1", [phone]);
  if (!cust.rows.length) return null;
  const customerId = cust.rows[0].id;
  const o = await c.query(
    "SELECT id FROM orders WHERE customer_id=$1 AND status IN ('AWAITING_POP','POP_RECEIVED') ORDER BY created_at DESC LIMIT 1",
    [customerId]
  );
  return o.rows[0]?.id ?? null;
}

async function handleWebhookReceived(payload: any) {
  const waEvents = extractWaEvents(payload);
  if (waEvents.length === 0) return;

  const c = await dbClient();
  try {
    for (const ev of waEvents) {
      const orderId = await findLatestOrderAwaitingPop(c, ev.fromPhone);
      if (!orderId) continue;

      if (ev.kind === "text") {
        const t = (ev.text ?? "").toLowerCase();
        if (t.startsWith("address:")) {
          const entered = (ev.text ?? "").slice(8).trim();
          if (entered.length >= 10) {
            await c.query(
              "UPDATE orders SET delivery_entered_text=$1, updated_at=now() WHERE id=$2",
              [entered, orderId]
            );
            await c.query(
              "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'whatsapp','DELIVERY_TEXT_RECEIVED',$2,$3) ON CONFLICT DO NOTHING",
              [orderId, `addr_text:${orderId}:${Date.now()}`, { entered }]
            );
            await sendWhatsAppText(ev.fromPhone, "Thank you! 📍 Address received. We’ll use it for delivery 🚚\n" + env.BRAND_SIGNOFF);
          }
        }

        if (t.includes("paid")) {
          await c.query("UPDATE orders SET status='POP_RECEIVED', updated_at=now() WHERE id=$1", [orderId]);
          await c.query(
            "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'whatsapp','POP_RECEIVED',$2,$3) ON CONFLICT DO NOTHING",
            [orderId, `paid_keyword:${orderId}`, { text: ev.text }]
          );
          const msg = tmpl(env.MSG_POP_RECEIVED, { order_id: orderId, signoff: env.BRAND_SIGNOFF });
          await sendWhatsAppText(ev.fromPhone, msg);
        }
        continue;
      }

      if (ev.kind === "media" && ev.mediaId) {
        const { bytes, mime, sha256 } = await downloadWhatsAppMedia(ev.mediaId);
        const ext =
          (mime?.includes("pdf") ? "pdf" :
           mime?.includes("jpeg") ? "jpg" :
           mime?.includes("png") ? "png" : "bin");

        const dir = path.join(env.MEDIA_STORAGE_DIR, "pop", orderId);
        await fs.mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${ev.mediaId}.${ext}`);
        await fs.writeFile(filePath, bytes);

        await c.query(
          "INSERT INTO payments (order_id, method, status, proof_media_id, proof_media_path, proof_mime_type, proof_sha256, received_at) VALUES ($1,'EFT_POP','RECEIVED',$2,$3,$4,$5,now())",
          [orderId, ev.mediaId, filePath, mime ?? null, sha256 ?? null]
        );
        await c.query("UPDATE orders SET status='POP_RECEIVED', updated_at=now() WHERE id=$1", [orderId]);
        await c.query(
          "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'whatsapp','POP_RECEIVED',$2,$3) ON CONFLICT DO NOTHING",
          [orderId, `pop_media:${ev.mediaId}:${orderId}`, { mediaId: ev.mediaId, mime }]
        );

        const msg = tmpl(env.MSG_POP_RECEIVED, { order_id: orderId, signoff: env.BRAND_SIGNOFF });
        await sendWhatsAppText(ev.fromPhone, msg);
      }
    }
  } finally { await c.end(); }
}

async function sendLowStockAlert(sku: string) {
  if (!env.ADMIN_ALERT_PHONE) return;
  const c = await dbClient();
  try {
    const r = await c.query("SELECT name, stock_qty, low_stock_threshold, last_low_stock_alert_at FROM products WHERE sku=$1", [sku]);
    if (!r.rows.length) return;
    const p = r.rows[0];
    const stock = Number(p.stock_qty);
    const threshold = Number(p.low_stock_threshold ?? env.LOW_STOCK_THRESHOLD_DEFAULT);
    if (stock > threshold) return;

    const last = p.last_low_stock_alert_at ? new Date(p.last_low_stock_alert_at) : null;
    if (last && (Date.now() - last.getTime()) < 12*60*60*1000) return;

    const msg = tmpl(env.MSG_LOW_STOCK_ADMIN, { name: p.name, sku, stock: String(stock) });
    await sendWhatsAppText(env.ADMIN_ALERT_PHONE!, msg);
    await c.query("UPDATE products SET last_low_stock_alert_at=now() WHERE sku=$1", [sku]);
  } finally { await c.end(); }
}

async function notifyBackInStock(sku: string) {
  const c = await dbClient();
  try {
    const p = await c.query("SELECT name, stock_qty FROM products WHERE sku=$1", [sku]);
    if (!p.rows.length) return;
    if (Number(p.rows[0].stock_qty) <= 0) return;

    const wl = await c.query("SELECT phone FROM stock_waitlist WHERE sku=$1", [sku]);
    if (!wl.rows.length) return;

    const text = tmpl(env.MSG_BACK_IN_STOCK, { name: p.rows[0].name, STORE_LINK: env.STORE_LINK });
    for (const row of wl.rows) await sendWhatsAppText(String(row.phone), text);

    await c.query("DELETE FROM stock_waitlist WHERE sku=$1", [sku]);
  } finally { await c.end(); }
}

async function getBrandSignoff(): Promise<string> {
  const c = await dbClient();
  try {
    const row = (await c.query("SELECT brand_signoff as s FROM app_settings WHERE id=1")).rows[0];
    return String(row?.s ?? env.BRAND_SIGNOFF ?? "— Team");
  } finally { await c.end(); }
}

async function getTemplateByKey(key: string) {
  const c = await dbClient();
  try {
    const r = await c.query("SELECT body FROM message_templates WHERE key=$1 AND active=true LIMIT 1", [key]);
    return String(r.rows[0]?.body ?? "");
  } finally { await c.end(); }
}

async function processAbandonedCarts() {
  if (String((env as any).ABANDONED_CART_ENABLED ?? "true") !== "true") return;
  const afterMin = Number((env as any).ABANDONED_CART_AFTER_MIN ?? 60);
  const cooldownMin = Number((env as any).ABANDONED_CART_REMINDER_COOLDOWN_MIN ?? 1440);

  const c = await dbClient();
  try {
    const rows = (await c.query(
      "SELECT id, customer_phone as phone, updated_at as updatedAt, last_reminded_at as lastRemindedAt FROM cart_sessions WHERE status='OPEN' AND updated_at < now() - ($1 || ' minutes')::interval LIMIT 50",
      [afterMin]
    )).rows;

    const tmplBody = await getTemplateByKey("abandoned_cart");
    for (const r of rows) {
      const last = r.lastRemindedAt;
      if (last) {
        const cool = (await c.query("SELECT now() - $1::timestamptz as diff", [last])).rows[0]?.diff;
      }
      // cooldown check in SQL
      const ok = (await c.query(
        "SELECT (last_reminded_at IS NULL OR last_reminded_at < now() - ($1 || ' minutes')::interval) as ok FROM cart_sessions WHERE id=$2",
        [cooldownMin, r.id]
      )).rows[0]?.ok;
      if (!ok) continue;

      const msg = tmpl(tmplBody || (env as any).MSG_ABANDONED_CART || "Hey! Still keen to checkout? 😊 {{signoff}}", { signoff: await getBrandSignoff() });
      await sendWhatsAppText(String(r.phone), msg);

      await c.query("UPDATE cart_sessions SET last_reminded_at=now(), updated_at=now() WHERE id=$1", [r.id]);
    }
  } finally { await c.end(); }
}

async function processAutoStatusMessages() {
  if (String((env as any).ORDER_STATUS_AUTO_MESSAGES ?? "true") !== "true") return;

  const c = await dbClient();
  try {
    const orders = (await c.query(
      "SELECT o.id, o.status, o.tracking_id as \"trackingId\", cu.phone FROM orders o JOIN customers cu ON cu.id=o.customer_id WHERE o.status IN ('PAID_CONFIRMED','READY_TO_SHIP','SHIPPED') ORDER BY o.updated_at ASC LIMIT 50"
    )).rows;

    const tPay = await getTemplateByKey("payment_confirmed");
    const tReady = await getTemplateByKey("ready_to_ship");
    const tTrack = await getTemplateByKey("tracking_sent");

    for (const o of orders) {
      const key = `auto_status:${o.id}:${o.status}`;
      const exists = (await c.query("SELECT 1 FROM events WHERE idempotency_key=$1 LIMIT 1", [key])).rows.length > 0;
      if (exists) continue;

      if (o.status === "PAID_CONFIRMED") {
        const msg = tmpl(tPay || (env as any).MSG_PAYMENT_CONFIRMED || "✅ Payment confirmed for order {{order_id}}. {{signoff}}", { order_id: o.id, signoff: await getBrandSignoff() });
        await sendWhatsAppText(String(o.phone), msg);
      } else if (o.status === "READY_TO_SHIP") {
        const msg = tmpl(tReady || "📦 Your order {{order_id}} is packed. {{signoff}}", { order_id: o.id, signoff: await getBrandSignoff() });
        await sendWhatsAppText(String(o.phone), msg);
      } else if (o.status === "SHIPPED") {
        const msg = tmpl(tTrack || "🚚 Tracking for {{order_id}}: {{tracking_id}}. {{signoff}}", { order_id: o.id, tracking_id: o.trackingId ?? "—", signoff: await getBrandSignoff() });
        await sendWhatsAppText(String(o.phone), msg);
      }

      await c.query("INSERT INTO events (order_id, source, type, idempotency_key, payload) VALUES ($1,'worker','AUTO_MESSAGE',$2,$3) ON CONFLICT DO NOTHING",
                    [o.id, key, { status: o.status }]);
    }
  } finally { await c.end(); }
}

async function expireReservations() {
  if (String((env as any).RESERVATION_ENABLED ?? "true") !== "true") return;
  const c = await dbClient();
  try {
    await c.query("UPDATE inventory_reservations SET status='EXPIRED', updated_at=now() WHERE status='HELD' AND expires_at <= now()");
  } finally { await c.end(); }
}

async function pollLoop() {
  log.info("Worker started");
  while (true) {
    await processDeadLetterJobs();
    await processAbandonedCarts();
    await processAutoStatusMessages();
    await expireReservations();
    const c = await dbClient();
    try {
      const rows = (await c.query(
        "SELECT id, type, payload FROM events WHERE type IN ('BACK_IN_STOCK_ENQUEUE','LOW_STOCK_ENQUEUE','WEBHOOK_RECEIVED') ORDER BY created_at ASC LIMIT 25"
      )).rows;

      for (const e of rows) {
        const payload = e.payload ?? {};
        if (e.type === "WEBHOOK_RECEIVED") await handleWebhookReceived(payload);
        if (e.type === "LOW_STOCK_ENQUEUE") await sendLowStockAlert(String(payload.sku ?? ""));
        if (e.type === "BACK_IN_STOCK_ENQUEUE") await notifyBackInStock(String(payload.sku ?? ""));
        await c.query("DELETE FROM events WHERE id=$1", [e.id]);
      }
    } catch (err) {
      log.error("Worker loop error", err);
      try {
        const c2 = await dbClient();
        await c2.query("INSERT INTO dead_letter_jobs (source,type,payload,error) VALUES ($1,$2,$3,$4)", ["worker","LOOP_ERROR", {}, String(err?.message ?? err)]);
        await c2.end();
      } catch {}

    } finally {
      await c.end();
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}
await pollLoop();
