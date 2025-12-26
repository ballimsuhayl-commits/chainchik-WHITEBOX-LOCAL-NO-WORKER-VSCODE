import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import rawBody from "fastify-raw-body";
import multipart from "@fastify/multipart";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { boolFromEnv, loadEnv, tmpl } from "@cc/shared";
import { registerSecurity } from "./plugins/security";
import { registerCorrelation } from "./plugins/correlation";
import { verifyYocoSignature } from "./webhooks/yoco";
import { bookWithCourierGuy, quoteWithCourierGuy } from "./integrations/couriers";

const env = loadEnv(process.env as any);
const { Client } = pg;

const app = Fastify({ logger: true });

// Needed for Meta webhook signature verification
await app.register(rawBody, {
  field: 'rawBody',
  global: false,
  encoding: 'utf8',
  runFirst: true,
});

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3) {
  let lastErr: any = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      const txt = await res.text().catch(() => "");
      lastErr = new Error(`HTTP ${res.status} ${txt}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, 250 * Math.pow(2, i)));
  }
  throw lastErr ?? new Error("fetchWithRetry failed");
}



await app.register(cors, { origin: false });
await app.register(swagger, { openapi: { info: { title: "ChainChik API", version: "0.1.0" } } });
await app.register(swaggerUI, { routePrefix: "/docs" });

app.setErrorHandler((err, _req, reply) => {
  const sc = (err as any).statusCode ?? 500;
  reply.code(sc).send((err as any).message ?? 'Error');
});
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

await registerSecurity(app);
await registerCorrelation(app);

async function requireAdmin(req: any) {
  const key = String(req.headers["x-admin-key"] ?? "").trim() || null;
  const v = await validateAdminKey(key);
  if (!v.ok) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  req.admin = v;
}

}

function parseJsonOrThrow(buf: any) {
  if (Buffer.isBuffer(buf)) return JSON.parse(buf.toString("utf8"));
  if (typeof buf === "string") return JSON.parse(buf);
  return buf;
}


async function loadSavedDeliveryForOrder(orderId: string) {
  const c = await dbClient();
  try {
    const r = await c.query("SELECT delivery_address_json as addr, delivery_entered_text as txt FROM orders WHERE id=$1", [orderId]);
    if (!r.rows.length) return { deliveryAddress: null, deliveryEnteredText: null };
    return { deliveryAddress: r.rows[0].addr ?? null, deliveryEnteredText: r.rows[0].txt ?? null };
  } finally { await c.end(); }
}


async function loadCustomerForOrder(orderId: string) {
  const c = await dbClient();
  try {
    const r = await c.query(
      "SELECT cu.name as name, cu.phone as phone FROM orders o JOIN customers cu ON cu.id=o.customer_id WHERE o.id=$1",
      [orderId]
    );
    if (!r.rows.length) return null;
    return { name: String(r.rows[0].name ?? ""), phone: String(r.rows[0].phone ?? "") };
  } finally { await c.end(); }
}

async function dbClient() {
  const c = new Client({ connectionString: env.DATABASE_URL });
  await c.connect();
  return c;
}

async function callGeminiJSON(prompt: string, system: string) {
  if (String(env.AI_ENABLED ?? "false") !== "true") throw Object.assign(new Error("AI disabled"), { statusCode: 400 });
  const key = String((env as any).GEMINI_API_KEY ?? "");
  if (!key) throw Object.assign(new Error("Missing GEMINI_API_KEY"), { statusCode: 500 });
  const model = String((env as any).GEMINI_MODEL ?? "gemini-2.5-flash");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
  };

  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const txt = await r.text();
  if (!r.ok) throw Object.assign(new Error(`Gemini error: ${txt}`), { statusCode: 502 });
  const data = JSON.parse(txt);
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!out) throw Object.assign(new Error("Empty Gemini response"), { statusCode: 502 });
  return JSON.parse(out);
}

async function upsertConversation(channel: string, phone: string) {
  const c = await dbClient();
  try {
    const r = await c.query(
      "INSERT INTO conversations (channel, customer_phone) VALUES ($1,$2) ON CONFLICT (channel, customer_phone) DO UPDATE SET updated_at=now() RETURNING id",
      [channel, phone]
    );
    return String(r.rows[0].id);
  } finally { await c.end(); }
}

async function logConversationMessage(conversationId: string, role: string, text: string, meta?: any) {
  const c = await dbClient();
  try {
    await c.query("INSERT INTO conversation_messages (conversation_id, role, text, meta) VALUES ($1,$2,$3,$4)", [conversationId, role, text, meta ? JSON.stringify(meta) : null]);
  } finally { await c.end(); }
}

async function getReservedQty(c: any, sku: string, variantKey: string | null) {
  const r = await c.query(
    "SELECT COALESCE(SUM(qty),0)::int as n FROM inventory_reservations WHERE status='HELD' AND expires_at>now() AND sku=$1 AND ((variant_key IS NULL AND $2 IS NULL) OR variant_key=$2)",
    [sku, variantKey]
  );
  return Number(r.rows[0]?.n ?? 0);
}

async function getReservedQtyOther(c: any, sku: string, variantKey: string | null, phone: string) {
  const r = await c.query(
    "SELECT COALESCE(SUM(qty),0)::int as n FROM inventory_reservations WHERE status='HELD' AND expires_at>now() AND sku=$1 AND ((variant_key IS NULL AND $2 IS NULL) OR variant_key=$2) AND customer_phone <> $3",
    [sku, variantKey, phone]
  );
  return Number(r.rows[0]?.n ?? 0);
}

async function getConversationHistory(conversationId: string, limit: number) {
  const c = await dbClient();
  try {
    const rows = (await c.query(
      "SELECT role, text, created_at as \"createdAt\" FROM conversation_messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT $2",
      [conversationId, limit]
    )).rows;
    return rows.reverse();
  } finally { await c.end(); }
}

async function sendMetaText(channel: "facebook" | "instagram", recipientId: string, text: string) {
  const token = String((env as any).META_PAGE_ACCESS_TOKEN ?? "");
  const igBiz = String((env as any).IG_BUSINESS_ID ?? "");
  if (!token) throw Object.assign(new Error("Missing META_PAGE_ACCESS_TOKEN"), { statusCode: 500 });

  if (channel === "facebook") {
    const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${encodeURIComponent(token)}`;
    const body = { messaging_type: "RESPONSE", recipient: { id: recipientId }, message: { text } };
    const r = await fetch(url, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(body) });
    const t = await r.text();
    if (!r.ok) throw Object.assign(new Error(`Meta send error: ${t}`), { statusCode: 502 });
    return;
  }

  if (channel === "instagram") {
    if (!igBiz) throw Object.assign(new Error("Missing IG_BUSINESS_ID"), { statusCode: 500 });
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(igBiz)}/messages?access_token=${encodeURIComponent(token)}`;
    const body = { recipient: { id: recipientId }, message: { text } };
    const r = await fetch(url, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(body) });
    const t = await r.text();
    if (!r.ok) throw Object.assign(new Error(`IG send error: ${t}`), { statusCode: 502 });
    return;
  }
}

async function sendWhatsAppText(toPhone: string, text: string) {
  if (!boolFromEnv(env.ENABLE_WHATSAPP_SEND, true)) return;
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) return;

  const url = `https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to: toPhone, type: "text", text: { body: text } })
  });
  if (!res.ok) app.log.warn({ status: res.status, body: await res.text() }, "WhatsApp send failed");
}

function verifyMetaSignature(rawBody: Buffer, signatureHeader: string | undefined) {
  if (!env.META_APP_SECRET) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const sig = signatureHeader.slice("sha256=".length);
  const hmac = crypto.createHmac("sha256", env.META_APP_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
  } catch {
    return false;
  }
}

await app.register((await import("@fastify/sensible")).default);

if (String((env as any).API_RATE_LIMIT_ENABLED ?? "true") === "true") {
  await app.register((await import("@fastify/rate-limit")).default, {
    max: Number((env as any).API_RATE_LIMIT_MAX ?? 120),
    timeWindow: Number((env as any).API_RATE_LIMIT_TIME_WINDOW_SEC ?? 60) * 1000,
    hook: "onRequest",
    keyGenerator: (req) => {
      const fwd = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim();
      return fwd || req.ip;
    },
  });
}

// Correlation IDs
app.addHook("onRequest", async (req, reply) => {
  const incoming = String(req.headers["x-request-id"] ?? "");
  const id = incoming || randomUUID();
  (req as any).requestId = id;
  reply.header("x-request-id", id);
});

app.addHook("onResponse", async (req, reply) => {
  app.log.info(
    { requestId: (req as any).requestId, method: req.method, url: req.url, statusCode: reply.statusCode },
    "request"
  );
});

app.get("/health", async () => ({ ok: true, time: new Date().toISOString() }));

// Public media (product images) and POP stored under /data/media
app.get("/media/*", async (req, reply) => {
  const rel = String((req.params as any)["*"] ?? "");
  const base = path.resolve(env.MEDIA_STORAGE_DIR);
  const filePath = path.resolve(path.join(base, rel));
  if (!filePath.startsWith(base)) return reply.code(400).send("Bad path");
  const buf = await fs.readFile(filePath);
  reply.header("Content-Type", "application/octet-stream");
  return reply.send(buf);
});

// Public catalog for storefront
app.get("/v1/catalog", async (_req, reply) => {
  const c = await dbClient();
  try {
    const collections = (await c.query(
      "SELECT slug, name, sort_order as \"sortOrder\" FROM collections WHERE active=true ORDER BY sort_order ASC, created_at DESC"
    )).rows;

    const products = (await c.query(
      "SELECT sku, name, price_cents as \"priceCents\", stock_qty as \"stockQty\", low_stock_threshold as \"lowStockThreshold\", badge, primary_image_url as \"primaryImageUrl\" FROM products WHERE active=true ORDER BY o.created_at DESC"
    )).rows;

    const maps = (await c.query(
      "SELECT product_sku as \"productSku\", collection_slug as \"collectionSlug\" FROM product_collections"
    )).rows;

    const bySku = new Map<string, any>();
    for (const p of products) bySku.set(p.sku, { ...p, collections: [] as string[] });
    for (const m of maps) {
      const p = bySku.get(m.productSku);
      if (p) p.collections.push(m.collectionSlug);
    }

    const grouped: Record<string, any> = {};
    for (const col of collections) grouped[col.slug] = { collection: col, products: [] as any[] };
    for (const p of bySku.values()) for (const slug of p.collections) grouped[slug]?.products.push(p);

    return reply.send({ collections, grouped });
  } finally {
    await c.end();
  }
});

// Waitlist subscribe (sold out)
app.post("/v1/stock/subscribe", async (req, reply) => {
  const body = parseJsonOrThrow(req.body as any);
  const sku = String(body.sku ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!sku || phone.length < 6) return reply.code(400).send({ ok: false });

  const c = await dbClient();
  try {
    const p = await c.query("SELECT sku FROM products WHERE sku=$1", [sku]);
    if (!p.rows.length) return reply.code(404).send({ ok: false });

    await c.query("INSERT INTO stock_waitlist (sku, phone) VALUES ($1,$2) ON CONFLICT DO NOTHING", [sku, phone]);
    await c.query(
      "INSERT INTO events (source,type,idempotency_key,payload) VALUES ('web','WAITLIST_SUBSCRIBED',$1,$2) ON CONFLICT DO NOTHING",
      [`waitlist:${sku}:${phone}`, { sku, phone }]
    );

    return reply.send({ ok: true });
  } finally { await c.end(); }
});

// Create order from web (deterministic validation)
app.post("/v1/orders", async (req, reply) => {
  const body = parseJsonOrThrow(req.body as any);
  const customer = body.customer ?? {};
  const items = Array.isArray(body.items) ? body.items : [];
  const currency = String(body.currency ?? "ZAR");
  const notes = String(body.notes ?? "");

  const bankReference = typeof body.bankReference === 'string' ? body.bankReference.trim() : null;
  const paidAmountCents = body.paidAmountCents != null ? Number(body.paidAmountCents) : null;
  const publicStatusToken = makePublicToken();

  const name = String(customer.name ?? "").trim();
  const phone = String(customer.phone ?? "").trim();

  if (!name || phone.length < 6 || items.length === 0) {
    return reply.code(400).send("Please enter your name, WhatsApp number, and add at least one item 💛");
  }

  const c = await dbClient();
  try {
    let total = 0;
    for (const it of items) {
      const sku = String(it.sku ?? "").trim();
      const qty = Number(it.qty ?? 0);
      if (!sku || !Number.isInteger(qty) || qty <= 0) return reply.code(400).send("Invalid cart item.");
      const pr = await c.query("SELECT name, price_cents, stock_qty FROM products WHERE sku=$1 AND active=true", [sku]);
      if (!pr.rows.length) return reply.code(409).send("One of the items is unavailable right now 🌷");
      const p = pr.rows[0];
      if (Number(p.stock_qty) === 0) return reply.code(409).send(tmpl(env.MSG_SOLD_OUT, { product_name: p.name }));
      if (qty > Number(p.stock_qty)) return reply.code(409).send(`Almost there 🌷 We only have ${p.stock_qty} left of ${p.name}. Please adjust your cart and try again 😊`);
      total += qty * Number(p.price_cents);
    }

    const cust = await c.query(
      "INSERT INTO customers (name, phone) VALUES ($1,$2) ON CONFLICT (phone) DO UPDATE SET name=EXCLUDED.name RETURNING id",
      [name, phone]
    );
    const customerId = cust.rows[0].id;

    const order = await c.query(
      "INSERT INTO orders (customer_id, status, currency, total_cents, notes) VALUES ($1,'AWAITING_POP',$2,$3,$4) RETURNING id",
      [customerId, currency, total, notes]
    );
    const orderId = order.rows[0].id;

    for (const it of items) {
      await c.query(
        "INSERT INTO order_items (order_id, sku, name, qty, unit_cents) VALUES ($1,$2,$3,$4,$5)",
        [orderId, String(it.sku), String(it.name ?? it.sku), Number(it.qty), Number(it.unitCents)]
      );
    }

    await c.query(
      "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'web','ORDER_CREATED',$2,$3) ON CONFLICT DO NOTHING",
      [orderId, `order_created:${orderId}`, { phone, items }]
    );

    const summary = items.map((i: any) => `${i.name} x${i.qty}`).join(", ");
    const msg = tmpl(env.MSG_ORDER_RECEIVED, {
      order_id: orderId,
      items_summary: summary,
      total: `${currency} ${(total / 100).toFixed(2)}`,
      signoff: env.BRAND_SIGNOFF
    });
    await sendWhatsAppText(phone, msg);

    return reply.send({ ok: true, orderId });
  } finally { await c.end(); }
});

// Admin: products
app.get("/v1/admin/products.csv", async (req, reply) => {
  await requireAdmin(req as any);
  const c = await dbClient();
  try {
    const rows = (await c.query("SELECT sku,name,price_cents,stock_qty,low_stock_threshold,badge,primary_image_url,active FROM products ORDER BY created_at DESC")).rows;
    const header = ["sku","name","price_cents","stock_qty","low_stock_threshold","badge","primary_image_url","active"].join(",");
    const lines = rows.map((r:any)=>[
      r.sku, JSON.stringify(r.name), r.price_cents, r.stock_qty, r.low_stock_threshold,
      r.badge ? JSON.stringify(r.badge) : "",
      r.primary_image_url ? JSON.stringify(r.primary_image_url) : "",
      r.active
    ].join(","));
    reply.header("Content-Type","text/csv; charset=utf-8");
    reply.send([header, ...lines].join("\n"));
  } finally { await c.end(); }
});

app.post("/v1/admin/products.csv", async (req, reply) => {
  await requireAdmin(req as any);
  const body = String(req.body ?? "");
  const lines = body.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return reply.code(400).send("CSV must include header + at least 1 row");
  const header = lines[0].split(",").map(s=>s.trim());
  const idx = (k:string)=>header.indexOf(k);
  const c = await dbClient();
  try {
    for (const line of lines.slice(1)) {
      const cols = line.split(",");
      const sku = cols[idx("sku")]?.trim();
      if (!sku) continue;
      const name = JSON.parse(cols[idx("name")] ?? """");
      const price_cents = Number(cols[idx("price_cents")] ?? 0);
      const stock_qty = Number(cols[idx("stock_qty")] ?? 0);
      const low_stock_threshold = Number(cols[idx("low_stock_threshold")] ?? 3);
      const badgeRaw = cols[idx("badge")] ?? "";
      const imgRaw = cols[idx("primary_image_url")] ?? "";
      const badge = badgeRaw ? JSON.parse(badgeRaw) : null;
      const primary_image_url = imgRaw ? JSON.parse(imgRaw) : null;
      const active = String(cols[idx("active")] ?? "true").trim() !== "false";

      await c.query(
        "INSERT INTO products (sku,name,price_cents,stock_qty,low_stock_threshold,badge,primary_image_url,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (sku) DO UPDATE SET name=EXCLUDED.name, price_cents=EXCLUDED.price_cents, stock_qty=EXCLUDED.stock_qty, low_stock_threshold=EXCLUDED.low_stock_threshold, badge=EXCLUDED.badge, primary_image_url=EXCLUDED.primary_image_url, active=EXCLUDED.active",
        [sku, name, price_cents, stock_qty, low_stock_threshold, badge, primary_image_url, active]
      );
    }
    reply.send({ ok: true });
  } finally { await c.end(); }
});

app.get("/v1/admin/products", async (req, reply) => {
  await requireAdmin(req as any);
  const c = await dbClient();
  try {
    const rows = (await c.query(
      "SELECT sku, name, price_cents as \"priceCents\", stock_qty as \"stockQty\", low_stock_threshold as \"lowStockThreshold\", badge, primary_image_url as \"primaryImageUrl\", active FROM products ORDER BY o.created_at DESC"
    )).rows;
    for (const p of rows) {
    const imgs = (await c.query("SELECT url, alt_text as \"altText\", sort_order as \"sortOrder\" FROM product_images WHERE product_sku=$1 ORDER BY sort_order ASC, created_at ASC", [String((p as any).sku)])).rows;
    (p as any).images = imgs;

    const reserved = await getReservedQty(c, String(p.sku), null);
    (p as any).availableStock = Math.max(0, Number((p as any).stockQty ?? 0) - reserved);
    if ((p as any).variants) {
      for (const v of (p as any).variants) {
        const rsv = await getReservedQty(c, String(p.sku), String((v as any).variantKey));
        (v as any).availableStock = Math.max(0, Number((v as any).stockQty ?? 0) - rsv);
      }
    }
  }
  reply.send({ products: rows });
  } finally { await c.end(); }
});

app.post("/v1/admin/products", async (req, reply) => {
  await requireAdmin(req as any);
  const body = parseJsonOrThrow(req.body as any);
  const sku = String(body.sku ?? "").trim();
  const name = String(body.name ?? "").trim();
  const priceCents = Number(body.priceCents ?? -1);
  const stockQty = Number(body.stockQty ?? -1);
  const lowStockThreshold = Number(body.lowStockThreshold ?? env.LOW_STOCK_THRESHOLD_DEFAULT);
  const badge = body.badge ? String(body.badge) : null;
  const primaryImageUrl = body.primaryImageUrl ? String(body.primaryImageUrl) : null;
  const active = body.active === undefined ? true : Boolean(body.active);

  if (!sku || !name) return reply.code(400).send("Please provide SKU and product name 😊");
  if (!Number.isInteger(priceCents) || priceCents < 0) return reply.code(400).send("Price must be valid cents.");
  if (!Number.isInteger(stockQty) || stockQty < 0) return reply.code(400).send("Stock must be 0 or higher.");

  const c = await dbClient();
  try {
    await c.query(
      "INSERT INTO products (sku,name,price_cents,stock_qty,low_stock_threshold,badge,primary_image_url,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [sku, name, priceCents, stockQty, lowStockThreshold, badge, primaryImageUrl, active]
    );
    reply.send({ ok: true });
  } catch {
    reply.code(409).send("That SKU already exists. Please choose a unique SKU 💛");
  } finally { await c.end(); }
});

app.post("/v1/admin/products/:sku/image", async (req, reply) => {
  await requireAdmin(req as any);
  const sku = String((req.params as any).sku ?? "").trim();
  const part = await (req as any).file();
  if (!part) return reply.code(400).send("Missing file");
  const mime = String(part.mimetype ?? "");
  if (!mime.startsWith("image/")) return reply.code(400).send("Only images allowed");
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const base = path.resolve(env.MEDIA_STORAGE_DIR);
  const dir = path.join(base, "products", sku);
  await fs.mkdir(dir, { recursive: true });
  const filename = `primary.${ext}`;
  const filePath = path.join(dir, filename);
  const buf = await part.toBuffer();
  await fs.writeFile(filePath, buf);

  const publicUrl = `${env.NEXT_PUBLIC_API_URL}/media/products/${sku}/${filename}`;
  const c = await dbClient();
  try {
    await c.query("UPDATE products SET primary_image_url=$1 WHERE sku=$2", [publicUrl, sku]);
    await c.query("INSERT INTO events (source,type,idempotency_key,payload) VALUES ('admin','PRODUCT_IMAGE_UPLOADED',$1,$2) ON CONFLICT DO NOTHING",
      [`img:${sku}:${Date.now()}`, { sku, publicUrl }]);
  } finally { await c.end(); }

  reply.send({ ok: true, url: publicUrl });
});

app.post("/v1/admin/products/:sku/stock", async (req, reply) => {
  await requireAdmin(req as any);
  const sku = String((req.params as any).sku ?? "").trim();
  const body = parseJsonOrThrow(req.body as any);
  const newStock = Number(body.stockQty ?? -1);
  if (!Number.isInteger(newStock) || newStock < 0) return reply.code(400).send("Stock must be 0 or higher.");

  const c = await dbClient();
  try {
    const ex = await c.query("SELECT stock_qty FROM products WHERE sku=$1", [sku]);
    if (!ex.rows.length) return reply.code(404).send("Product not found.");
    const prevStock = Number(ex.rows[0].stock_qty);

    await c.query("UPDATE products SET stock_qty=$1 WHERE sku=$2", [newStock, sku]);
    await c.query("INSERT INTO stock_movements (sku, delta, reason, actor) VALUES ($1,$2,'ADMIN_STOCK_SET','admin')", [sku, newStock - prevStock]);

    if (prevStock === 0 && newStock > 0) {
      await c.query(
        "INSERT INTO events (source,type,idempotency_key,payload) VALUES ('system','BACK_IN_STOCK_ENQUEUE',$1,$2) ON CONFLICT DO NOTHING",
        [`back_in_stock:${sku}:${Date.now()}`, { sku }]
      );
    }
    reply.send({ ok: true, sku, prevStock, newStock });
  } finally { await c.end(); }
});

// Admin: collections CRUD + assignments
app.get("/v1/admin/collections", async (req, reply) => {
  await requireAdmin(req as any);
  const c = await dbClient();
  try {
    const rows = (await c.query(
      "SELECT slug, name, sort_order as \"sortOrder\", active FROM collections ORDER BY sort_order ASC, created_at DESC"
    )).rows;
    reply.send({ collections: rows });
  } finally { await c.end(); }
});

app.post("/v1/admin/collections", async (req, reply) => {
  await requireAdmin(req as any);
  const body = parseJsonOrThrow(req.body as any);
  const slug = String(body.slug ?? "").trim();
  const name = String(body.name ?? "").trim();
  const sortOrder = Number(body.sortOrder ?? 0);
  if (!slug || !name) return reply.code(400).send("Please provide slug and name 😊");

  const c = await dbClient();
  try {
    await c.query("INSERT INTO collections (slug,name,sort_order,active) VALUES ($1,$2,$3,true)", [slug, name, Number.isFinite(sortOrder) ? sortOrder : 0]);
    reply.send({ ok: true });
  } catch {
    reply.code(409).send("That slug already exists. Please choose a unique slug 💛");
  } finally { await c.end(); }
});

app.post("/v1/admin/collections/:slug", async (req, reply) => {
  await requireAdmin(req as any);
  const slug = String((req.params as any).slug ?? "").trim();
  const body = parseJsonOrThrow(req.body as any);
  const patch: any = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder);
  if (body.active !== undefined) patch.active = Boolean(body.active);
  const cols = Object.keys(patch);
  if (!cols.length) return reply.code(400).send("No updates provided.");

  const values = cols.map(k => patch[k]);
  const setSql = cols.map((k,i)=>`${k}=$${i+1}`).join(",");
  const c = await dbClient();
  try {
    await c.query(`UPDATE collections SET ${setSql} WHERE slug=$${cols.length+1}`, [...values, slug]);
    reply.send({ ok: true });
  } finally { await c.end(); }
});

app.post("/v1/admin/collections/:slug/assign", async (req, reply) => {
  await requireAdmin(req as any);
  const slug = String((req.params as any).slug ?? "").trim();
  const body = parseJsonOrThrow(req.body as any);
  const sku = String(body.sku ?? "").trim();
  if (!slug || !sku) return reply.code(400).send("Missing collection slug or product SKU");
  const c = await dbClient();
  try {
    await c.query("INSERT INTO product_collections (product_sku, collection_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING", [sku, slug]);
    reply.send({ ok: true });
  } finally { await c.end(); }
});

app.post("/v1/admin/collections/:slug/unassign", async (req, reply) => {
  await requireAdmin(req as any);
  const slug = String((req.params as any).slug ?? "").trim();
  const body = parseJsonOrThrow(req.body as any);
  const sku = String(body.sku ?? "").trim();
  if (!slug || !sku) return reply.code(400).send("Missing collection slug or product SKU");
  const c = await dbClient();
  try {
    await c.query("DELETE FROM product_collections WHERE product_sku=$1 AND collection_slug=$2", [sku, slug]);
    reply.send({ ok: true });
  } finally { await c.end(); }
});


// Admin: mark collected (manual fallback)
app.post("/v1/admin/orders/:id/mark-collected", async (req, reply) => {
  await requireAdmin(req as any);
  const orderId = String((req.params as any).id ?? "");
  const c = await dbClient();
  try {
    const ship = (await c.query("SELECT tracking_number as tracking FROM shipments WHERE order_id=$1", [orderId])).rows[0];
    if (!ship) return reply.code(400).send("No shipment booked yet");
    await c.query("UPDATE shipments SET collected_at=now() WHERE order_id=$1", [orderId]);
    await c.query("INSERT INTO order_status_events (order_id,status,source) VALUES ($1,'COLLECTED','admin')", [orderId]);
    const cust = await c.query("SELECT cu.phone as phone FROM orders o JOIN customers cu ON cu.id=o.customer_id WHERE o.id=$1", [orderId]);
    const phone = cust.rows?.[0]?.phone ? String(cust.rows[0].phone) : null;
    if (phone) await sendWhatsAppText(phone, tmpl(env.MSG_ORDER_COLLECTED, { tracking: String(ship.tracking), signoff: env.BRAND_SIGNOFF }));
    reply.send({ ok: true });
  } finally { await c.end(); }
});

app.post("/v1/admin/orders/:id/mark-delivered", async (req, reply) => {
  await requireAdmin(req as any);
  const orderId = String((req.params as any).id ?? "");
  const c = await dbClient();
  try {
    await c.query("UPDATE shipments SET delivered_at=now() WHERE order_id=$1", [orderId]);
    await c.query("INSERT INTO order_status_events (order_id,status,source) VALUES ($1,'DELIVERED','admin')", [orderId]);
    const cust = await c.query("SELECT cu.phone as phone FROM orders o JOIN customers cu ON cu.id=o.customer_id WHERE o.id=$1", [orderId]);
    const phone = cust.rows?.[0]?.phone ? String(cust.rows[0].phone) : null;
    if (phone) await sendWhatsAppText(phone, tmpl(env.MSG_ORDER_DELIVERED, { signoff: env.BRAND_SIGNOFF }));
    reply.send({ ok: true });
  } finally { await c.end(); }
});

// Admin: password check (for web UI lock)
app.post("/v1/admin/login", async (req, reply) => {
  await requireAdmin(req as any);

  const ip = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || (req.ip ?? "unknown");
  const rl = checkLoginRateLimit(ip);
  if (!rl.ok) return reply.code(429).send("Too many attempts. Please try again later.");

  const body = parseJsonOrThrow(req.body as any);
  const password = String(body.password ?? "");
  const hash = String((env as any).ADMIN_PASSWORD_HASH ?? "");
  if (!hash) return reply.code(500).send("ADMIN_PASSWORD_HASH not set");

  const ok = await bcrypt.compare(password, hash);
  if (!ok) return reply.code(401).send("Invalid password");

  reply.send({ ok: true });
});

});

// Admin: send WhatsApp message (manual / AI assist)
app.post("/v1/admin/whatsapp/send", async (req, reply) => {
  await requireAdmin(req as any);
  const body = parseJsonOrThrow(req.body as any);
  const phone = String(body.phone ?? "").trim();
  const text = String(body.text ?? "").trim();
  if (!phone || !text) return reply.code(400).send("phone + text required");
  await sendWhatsAppText(phone, text);
  reply.send({ ok: true });
});

// Admin: resend tracking message (safe)
app.post("/v1/admin/orders/:id/resend-tracking", async (req, reply) => {
  await requireAdmin(req as any);
  const orderId = String((req.params as any).id ?? "");
  const c = await dbClient();
  try {
    const r = await c.query(
      "SELECT cu.phone as phone, s.tracking_number as tracking FROM orders o JOIN customers cu ON cu.id=o.customer_id LEFT JOIN shipments s ON s.order_id=o.id WHERE o.id=$1",
      [orderId]
    );
    if (!r.rows.length) return reply.code(404).send("Order not found");
    const phone = r.rows[0].phone ? String(r.rows[0].phone) : null;
    const tracking = r.rows[0].tracking ? String(r.rows[0].tracking) : null;
    if (!phone) return reply.code(400).send("Customer phone missing");
    if (!tracking) return reply.code(400).send("No tracking number saved yet");

    const msg = tmpl(env.MSG_COURIER_BOOKED, { tracking, signoff: env.BRAND_SIGNOFF });
    try {
      await sendWhatsAppText(phone, msg);
    } catch {
      // sendWhatsAppText already dead-letters on failure in hardened build
    }

    await c.query(
      "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'admin','TRACKING_RESENT',$2,$3) ON CONFLICT DO NOTHING",
      [orderId, `tracking_resent:${orderId}:${Date.now()}`, { tracking }]
    );
    reply.send({ ok: true });
  } finally { await c.end(); }
});

// Admin: orders list
// Admin: product variants
app.get("/v1/admin/variants/:sku", async (req, reply) => {
  await requireAdmin(req as any);
  const sku = String((req.params as any).sku ?? "");
  const c = await dbClient();
  try {
    const rows = (await c.query(
      "SELECT id,product_sku as \"productSku\",variant_key as \"variantKey\",variant_name as \"variantName\",price_cents as \"priceCents\",stock_qty as \"stockQty\",active FROM product_variants WHERE product_sku=$1 ORDER BY created_at ASC",
      [sku]
    )).rows;
    reply.send({ variants: rows });
  } finally { await c.end(); }
});

app.post("/v1/admin/variants/:sku", async (req, reply) => {
  await requireAdmin(req as any);
  if (!["owner","inventory"].includes(req.admin.role)) return reply.code(403).send("Inventory role required");
  const sku = String((req.params as any).sku ?? "");
  const body = parseJsonOrThrow(req.body as any);
  const variantKey = String(body.variantKey ?? "").trim();
  const variantName = String(body.variantName ?? "").trim();
  const priceCents = Number(body.priceCents ?? 0);
  const stockQty = Number(body.stockQty ?? 0);
  if (!variantKey || !variantName) return reply.code(400).send("variantKey + variantName required");
  const c = await dbClient();
  try {
    await c.query(
      "INSERT INTO product_variants (product_sku,variant_key,variant_name,price_cents,stock_qty,active) VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT (product_sku,variant_key) DO UPDATE SET variant_name=EXCLUDED.variant_name, price_cents=EXCLUDED.price_cents, stock_qty=EXCLUDED.stock_qty, updated_at=now()",
      [sku, variantKey, variantName, priceCents, stockQty]
    );
    reply.send({ ok: true });
  } finally { await c.end(); }
});

app.post("/v1/admin/variants/:sku/:variantKey/stock", async (req, reply) => {
  await requireAdmin(req as any);
  if (!["owner","inventory"].includes(req.admin.role)) return reply.code(403).send("Inventory role required");
  const sku = String((req.params as any).sku ?? "");
  const variantKey = String((req.params as any).variantKey ?? "");
  const body = parseJsonOrThrow(req.body as any);
  const stockQty = Number(body.stockQty ?? 0);
  const c = await dbClient();
  try {
    await c.query("UPDATE product_variants SET stock_qty=$1, updated_at=now() WHERE product_sku=$2 AND variant_key=$3", [stockQty, sku, variantKey]);
    reply.send({ ok: true });
  } finally { await c.end(); }
});

app.get("/v1/admin/orders", async (req, reply) => {
  await requireAdmin(req as any);
  const status = String((req.query as any)?.status ?? "").trim();
  const c = await dbClient();
  try {
    const rows = (await c.query(
      status
        ? "SELECT id,status,currency,total_cents as \"totalCents\",created_at as \"createdAt\" FROM orders o LEFT JOIN courier_quotes q ON q.order_id=o.id WHERE o.status=$1 ORDER BY o.created_at DESC LIMIT 100"
        : "SELECT id,status,currency,total_cents as \"totalCents\",created_at as \"createdAt\" FROM orders o LEFT JOIN courier_quotes q ON q.order_id=o.id ORDER BY o.created_at DESC LIMIT 100",
      status ? [status] : []
    )).rows;
    reply.send({ orders: rows });
  } finally { await c.end(); }
});

// Admin: reject POP (deterministic)
app.post("/v1/admin/orders/:id/reject-pop", async (req, reply) => {
  await requireAdmin(req as any);
  const orderId = String((req.params as any).id ?? "");
  const c = await dbClient();
  try {
    const st = (await c.query("SELECT status FROM orders WHERE id=$1", [orderId])).rows[0]?.status;
        if (st !== 'POP_RECEIVED') return reply.code(409).send('This order is not in POP_RECEIVED state 😊');
        await c.query("UPDATE orders SET status='AWAITING_POP', updated_at=now() WHERE id=$1", [orderId]);
    await c.query(
      "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'admin','POP_REJECTED',$2,$3) ON CONFLICT DO NOTHING",
      [orderId, `pop_rejected:${orderId}:${Date.now()}`, {}]
    );
    const cust = await c.query("SELECT cu.phone as phone FROM orders o JOIN customers cu ON cu.id=o.customer_id WHERE o.id=$1", [orderId]);
    const phone = cust.rows?.[0]?.phone ? String(cust.rows[0].phone) : null;
    if (phone) {
      const msg = tmpl(env.MSG_POP_REJECTED, { order_id: orderId, signoff: env.BRAND_SIGNOFF });
      await sendWhatsAppText(phone, msg);
    }
    return reply.send({ ok: true });
  } finally { await c.end(); }
});

// Admin: confirm payment (transactional stock decrement)

app.post("/v1/admin/orders/:id/confirm-payment", async (req, reply) => {
  await requireAdmin(req as any);
  const orderId = String((req.params as any).id ?? "");
  const c = await dbClient();
  try {
    await c.query("BEGIN");
    const o = await c.query("SELECT status, customer_id FROM orders WHERE id=$1 FOR UPDATE", [orderId]);
    if (!o.rows.length) { await c.query("ROLLBACK"); return reply.code(404).send("Order not found"); }
    if (o.rows[0].status === "PAID_CONFIRMED") { await c.query("COMMIT"); return reply.send({ ok: true }); }

    const items = (await c.query("SELECT sku, qty FROM order_items WHERE order_id=$1", [orderId])).rows;

    // Save delivery contact for one-click future use
    await c.query("UPDATE orders SET delivery_contact_json=$1, updated_at=now() WHERE id=$2", [deliveryContact, orderId]);
    for (const it of items) {
      const r = await c.query(
        "UPDATE products SET stock_qty = stock_qty - $1 WHERE sku=$2 AND stock_qty >= $1 RETURNING stock_qty, name, low_stock_threshold",
        [Number(it.qty), String(it.sku)]
      );
      if (!r.rows.length) { await c.query("ROLLBACK"); return reply.code(409).send("Stock changed — an item no longer has enough quantity 🌷"); }
      await c.query("INSERT INTO stock_movements (sku, delta, reason, actor, order_id) VALUES ($1,$2,'ORDER_PAID','system',$3)", [String(it.sku), -Number(it.qty), orderId]);
      const newStock = Number(r.rows[0].stock_qty);
      const threshold = Number(r.rows[0].low_stock_threshold ?? env.LOW_STOCK_THRESHOLD_DEFAULT);
      if (newStock <= threshold) {
        await c.query(
          "INSERT INTO events (source,type,idempotency_key,payload) VALUES ('system','LOW_STOCK_ENQUEUE',$1,$2) ON CONFLICT DO NOTHING",
          [`low_stock:${it.sku}:${Date.now()}`, { sku: it.sku }]
        );
      }
    }

    await c.query("UPDATE orders SET status='PAID_CONFIRMED', updated_at=now() WHERE id=$1", [orderId]);
    await c.query(
      "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'admin','PAYMENT_CONFIRMED',$2,$3) ON CONFLICT DO NOTHING",
      [orderId, `pay_confirm:${orderId}`, { orderId }]
    );
    await c.query("COMMIT");

    const custPhone = (await c.query("SELECT phone FROM customers WHERE id=$1", [o.rows[0].customer_id])).rows?.[0]?.phone;
    if (custPhone) {
      const msg = tmpl(env.MSG_PAYMENT_CONFIRMED, { order_id: orderId, signoff: env.BRAND_SIGNOFF });
      await sendWhatsAppText(String(custPhone), msg);
    }
    reply.send({ ok: true });
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally { await c.end(); }
});


function suggestAddress(raw: string) {
  const out: any = { type: "residential", entered_address: raw };
  const s = raw.replace(/\s+/g, " ").trim();
  // crude SA postal code match
  const mCode = s.match(/\b(\d{4})\b/);
  if (mCode) out.code = mCode[1];
  // province tokens
  const provinces: Record<string,string> = { gp:"GP", gauteng:"GP", wc:"WC", "western cape":"WC", ec:"EC", "eastern cape":"EC", kzn:"KZN", "kwazulu-natal":"KZN", limpopo:"LP", mpumalanga:"MP", freestate:"FS", "free state":"FS", "north west":"NW", nw:"NW", nc:"NC", "northern cape":"NC" };
  const low = s.toLowerCase();
  for (const k of Object.keys(provinces)) if (low.includes(k)) { out.zone = provinces[k]; break; }
  // try split by commas
  const parts = s.split(",").map(p=>p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    out.street_address = parts[0];
    out.suburb = parts[1];
    if (parts[2]) out.city = parts[2];
  } else {
    out.street_address = s;
  }
  out.country = "South Africa";
  return out;
}

// Admin: update delivery details
app.post("/v1/admin/orders/:id/delivery", async (req, reply) => {
  await requireAdmin(req as any);
  const orderId = String((req.params as any).id ?? "");
  const body = parseJsonOrThrow(req.body as any);
  const deliveryAddress = body.deliveryAddress ?? null;
  const deliveryContact = body.deliveryContact ?? null;
  const deliveryEnteredText = typeof body.deliveryEnteredText === "string" ? body.deliveryEnteredText : null;

  const c = await dbClient();
  try {
    await c.query(
      "UPDATE orders SET delivery_address_json=$1, delivery_contact_json=$2, delivery_entered_text=$3, updated_at=now() WHERE id=$4",
      [deliveryAddress, deliveryContact, deliveryEnteredText, orderId]
    );
    await c.query(
      "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'admin','DELIVERY_UPDATED',$2,$3) ON CONFLICT DO NOTHING",
      [orderId, `delivery_updated:${orderId}:${Date.now()}`, { deliveryAddress, deliveryContact }]
    );
    reply.send({ ok: true });
  } finally { await c.end(); }
});

// Admin: view POP (protected)
app.get("/v1/admin/orders/:id/pop", async (req, reply) => {
  await requireAdmin(req as any);
  const orderId = String((req.params as any).id ?? "");
  const c = await dbClient();
  try {
    const pay = (await c.query(
      "SELECT proof_media_path as path, proof_mime_type as mime FROM payments WHERE order_id=$1 ORDER BY received_at DESC LIMIT 1",
      [orderId]
    )).rows[0];
    if (!pay?.path) return reply.code(404).send("No POP");
    const base = path.resolve(env.MEDIA_STORAGE_DIR);
    const filePath = path.resolve(pay.path);
    if (!filePath.startsWith(base)) return reply.code(400).send("Bad path");
    const buf = await fs.readFile(filePath);
    reply.header("Content-Type", pay.mime ?? "application/octet-stream");
    reply.send(buf);
  } finally { await c.end(); }
});

// Admin: get courier quote (deterministic, no booking)
app.post("/v1/admin/orders/:id/courier/quote", async (req, reply) => {
  await requireAdmin(req as any);
  const orderId = String((req.params as any).id ?? "");
  const body = parseJsonOrThrow(req.body as any);

  let deliveryAddress = body.deliveryAddress;
  if (!deliveryAddress) {
    const saved = await loadSavedDeliveryForOrder(orderId);
    deliveryAddress = saved.deliveryAddress ?? (saved.deliveryEnteredText ? { type: "residential", entered_address: String(saved.deliveryEnteredText) } : null);
  }
  if (!deliveryAddress || typeof deliveryAddress !== "object") return reply.code(400).send("Please save a delivery address first 😊");
const parcels = [{
    submitted_length_cm: String(env.COURIER_GUY_PARCEL_LENGTH_CM),
    submitted_width_cm: String(env.COURIER_GUY_PARCEL_WIDTH_CM),
    submitted_height_cm: String(env.COURIER_GUY_PARCEL_HEIGHT_CM),
    submitted_weight_kg: String(env.COURIER_GUY_PARCEL_WEIGHT_KG),
    parcel_description: "Standard parcel",
    alternative_tracking_reference: orderId
  }];

  const q = await quoteWithCourierGuy(env, { deliveryAddress, parcels });

  const c = await dbClient();
  try {
    await c.query(
      "INSERT INTO courier_quotes (order_id, provider, amount_cents, currency, service_level_code, raw_response, expires_at) VALUES ($1,$2,$3,$4,$5,$6, now() + interval '30 minutes') ON CONFLICT (order_id) DO UPDATE SET provider=EXCLUDED.provider, amount_cents=EXCLUDED.amount_cents, currency=EXCLUDED.currency, service_level_code=EXCLUDED.service_level_code, raw_response=EXCLUDED.raw_response, expires_at=EXCLUDED.expires_at, created_at=now()",
      [orderId, q.provider, q.amountCents, q.currency, q.serviceLevelCode, q.raw]
    );
    await c.query(
      "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'admin','COURIER_QUOTED',$2,$3) ON CONFLICT DO NOTHING",
      [orderId, `courier_quote:${orderId}`, { provider: q.provider, amountCents: q.amountCents, serviceLevelCode: q.serviceLevelCode }]
    );
  } finally { await c.end(); }

  return reply.send({ ok: true, ...q });
});

// Admin: book courier (deterministic)

app.post("/v1/admin/orders/:id/book-courier", async (req, reply) => {
  await requireAdmin(req as any);
  const orderId = String((req.params as any).id ?? "");
  const provider = String(process.env.COURIER_PROVIDER ?? "courier-guy");
  const body = parseJsonOrThrow(req.body as any);
  let deliveryAddress = body.deliveryAddress;
  let deliveryContact = body.deliveryContact;
  const serviceLevelCode = String(body.serviceLevelCode ?? "").trim();
  if (!deliveryAddress) {
    const saved = await loadSavedDeliveryForOrder(orderId);
    deliveryAddress = saved.deliveryAddress ?? (saved.deliveryEnteredText ? { type: "residential", entered_address: String(saved.deliveryEnteredText) } : null);
  }
  if (!deliveryAddress || typeof deliveryAddress !== "object") return reply.code(400).send("Please save a delivery address first 😊");
  if (!deliveryContact || typeof deliveryContact !== "object") {
    const cust = await loadCustomerForOrder(orderId);
    if (cust?.phone) {
      deliveryContact = { name: cust.name || "Customer", mobile_number: cust.phone };
    }
  }
  if (!deliveryContact || typeof deliveryContact !== "object" || !String((deliveryContact as any).mobile_number ?? "").trim()) {
    return reply.code(400).send("Please provide receiver contact details 😊");
  }
  if (!serviceLevelCode) return reply.code(400).send("Please select a service level (serviceLevelCode) 😊");
const c = await dbClient();
  try {
    const o = await c.query("SELECT status FROM orders WHERE id=$1", [orderId]);
    if (!o.rows.length) return reply.code(404).send("Order not found");
    if (String(o.rows[0].status) !== "PAID_CONFIRMED") return reply.code(409).send("Please confirm payment before booking courier 😊");

    const items = (await c.query("SELECT sku, qty FROM order_items WHERE order_id=$1", [orderId])).rows;

    // Save delivery contact for one-click future use
    await c.query("UPDATE orders SET delivery_contact_json=$1, updated_at=now() WHERE id=$2", [deliveryContact, orderId]);
    const parcels = [{
      submitted_length_cm: String(env.COURIER_GUY_PARCEL_LENGTH_CM),
      submitted_width_cm: String(env.COURIER_GUY_PARCEL_WIDTH_CM),
      submitted_height_cm: String(env.COURIER_GUY_PARCEL_HEIGHT_CM),
      submitted_weight_kg: String(env.COURIER_GUY_PARCEL_WEIGHT_KG),
      parcel_description: "Standard parcel",
      alternative_tracking_reference: orderId
    }];
    const reqObj = { orderId, deliveryAddress, deliveryContact, parcels, serviceLevelCode };

    const result = await bookWithCourierGuy(env, reqObj);

    await c.query(
      "INSERT INTO shipments (order_id, provider, tracking_number, label_url) VALUES ($1,$2,$3,$4) ON CONFLICT (order_id) DO UPDATE SET provider=EXCLUDED.provider, tracking_number=EXCLUDED.tracking_number, label_url=EXCLUDED.label_url",
      [orderId, result.provider, result.trackingNumber, result.labelUrl ?? null]
    );
    await c.query("UPDATE orders SET status='READY_TO_SHIP', updated_at=now() WHERE id=$1", [orderId]);
    await c.query(
      "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'admin','COURIER_BOOKED',$2,$3) ON CONFLICT DO NOTHING",
      [orderId, `courier_booked:${orderId}`, { provider: result.provider, trackingNumber: result.trackingNumber }]
    );

    // Notify customer with tracking (deterministic)
const cust = await c.query(
  "SELECT cu.phone as phone FROM orders o JOIN customers cu ON cu.id=o.customer_id WHERE o.id=$1",
  [orderId]
);
const custPhone = cust.rows?.[0]?.phone ? String(cust.rows[0].phone) : null;
if (custPhone) {
  const msg = tmpl(env.MSG_COURIER_BOOKED, { tracking: String(result.trackingNumber), signoff: env.BRAND_SIGNOFF });
  await sendWhatsAppText(custPhone, msg);
}

reply.send({ ok: true, ...result });
  } finally { await c.end(); }
});

// Meta webhook verify
app.get("/webhooks/meta", async (req, reply) => {
  const q = req.query as any;
  const mode = String(q["hub.mode"] ?? "");
  const token = String(q["hub.verify_token"] ?? "");
  const challenge = String(q["hub.challenge"] ?? "");
  if (mode === "subscribe" && token && env.WEBHOOK_VERIFY_TOKEN && token === env.WEBHOOK_VERIFY_TOKEN) {
    return reply.type("text/plain").send(challenge);
  }
  return reply.code(403).send("Forbidden");
});

// Meta webhook receive (signature verified). Raw payload logged as event; worker processes.
app.post("/webhooks/meta", { config: { rawBody: true } } as any, async (req, reply) => {
  const raw = (req as any).rawBody as Buffer | undefined;
  const sig = String(req.headers["x-hub-signature-256"] ?? "");
  if (!raw || !verifyMetaSignature(raw, sig)) return reply.code(401).send({ ok: false });

  const payload = parseJsonOrThrow(raw);
  const idemKey = crypto.createHash("sha256").update(raw).digest("hex");

  const c = await dbClient();
  try {
    await c.query(
      "INSERT INTO events (source,type,idempotency_key,payload) VALUES ('meta','WEBHOOK_RECEIVED',$1,$2) ON CONFLICT DO NOTHING",
      [`wh:${idemKey}`, payload]
    );
  } finally { await c.end(); }

  reply.send({ ok: true });
});

// Yoco webhook (optional)
app.post("/webhooks/yoco", { config: { rawBody: true } } as any, async (req, reply) => {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) return reply.code(501).send("Yoco not configured");

  const raw = (req as any).rawBody as Buffer | undefined;
  if (!raw) return reply.code(400).send("Missing raw body");
  const sig = String(req.headers["x-yoco-signature"] ?? req.headers["x-yoco-signature-256"] ?? "");
  if (!sig) return reply.code(401).send("Missing signature");
  if (!verifyYocoSignature(raw, sig, secret)) return reply.code(401).send("Bad signature");

  const event = parseJsonOrThrow(raw);
  const orderId = String(event?.data?.metadata?.order_id ?? event?.data?.metadata?.orderId ?? event?.data?.reference ?? "").trim();
  const eventType = String(event?.type ?? "");

  const c = await dbClient();
  try {
    await c.query(
      "INSERT INTO events (source,type,idempotency_key,payload) VALUES ('yoco','YOCO_EVENT',$1,$2) ON CONFLICT DO NOTHING",
      [`yoco:${crypto.createHash("sha256").update(raw).digest("hex")}`, event]
    );

    if (!orderId) return reply.send({ ok: true, matched: false });

    if (eventType === "payment.succeeded" || eventType === "payment_successful") {
      await c.query("UPDATE orders SET status='PAID_CONFIRMED', updated_at=now() WHERE id=$1 AND status <> 'PAID_CONFIRMED'", [orderId]);
      await c.query(
        "INSERT INTO events (order_id, source,type,idempotency_key,payload) VALUES ($1,'yoco','PAYMENT_CONFIRMED',$2,$3) ON CONFLICT DO NOTHING",
        [orderId, `yoco_confirm:${orderId}`, { eventType }]
      );
    }
  } finally { await c.end(); }

  return reply.send({ ok: true, matched: Boolean(orderId) });
});

app.listen({ port: env.PORT_API, host: "0.0.0.0" });


// Admin: app settings (setup wizard)
app.get("/v1/admin/settings", async (req, reply) => {
  await requireAdmin(req as any);
  const c = await dbClient();
  try {
    const row = (await c.query(
      "SELECT business_name as \"businessName\", brand_signoff as \"brandSignoff\", whatsapp_number as \"whatsappNumber\", low_stock_threshold as \"lowStockThreshold\", payment_mode as \"paymentMode\", courier_mode as \"courierMode\", setup_complete as \"setupComplete\" FROM app_settings WHERE id=1"
    )).rows[0];
    reply.send({ settings: row ?? { setupComplete: false } });
  } finally { await c.end(); }
});

app.post("/v1/admin/settings", async (req, reply) => {
  await requireAdmin(req as any);
  const body = parseJsonOrThrow(req.body as any);
  const businessName = String(body.businessName ?? "Your Business").trim();
  const brandSignoff = String(body.brandSignoff ?? "— Team").trim();
  const whatsappNumber = String(body.whatsappNumber ?? "").trim();
  const lowStockThreshold = Number(body.lowStockThreshold ?? 3);
  const paymentMode = String(body.paymentMode ?? "POP").trim().toUpperCase();
  const courierMode = String(body.courierMode ?? "MANUAL").trim().toUpperCase();
  const setupComplete = body.setupComplete === true;
      const brandLogoUrl = String(body.brandLogoUrl ?? "").trim();
      const brandPrimaryColor = String(body.brandPrimaryColor ?? "#111111").trim();
      const brandAccentColor = String(body.brandAccentColor ?? "#ffffff").trim();

  if (!businessName) return reply.code(400).send("businessName required");
  if (!brandSignoff) return reply.code(400).send("brandSignoff required");
  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) return reply.code(400).send("lowStockThreshold invalid");
  if (!["POP","PAYFAST","BOTH"].includes(paymentMode)) return reply.code(400).send("paymentMode invalid");
  if (!["MANUAL","COURIER_GUY"].includes(courierMode)) return reply.code(400).send("courierMode invalid");

  const c = await dbClient();
  try {
    await c.query(
      "UPDATE app_settings SET business_name=$1, brand_signoff=$2, whatsapp_number=$3, low_stock_threshold=$4, payment_mode=$5, courier_mode=$6, setup_complete=$7, brand_logo_url=$8, brand_primary_color=$9, brand_accent_color=$10, updated_at=now() WHERE id=1",
      [businessName, brandSignoff, whatsappNumber, lowStockThreshold, paymentMode, courierMode, setupComplete, brandLogoUrl, brandPrimaryColor, brandAccentColor]
    );
    reply.send({ ok: true });
  } finally { await c.end(); }
});


// Public: minimal settings (no secrets)
app.get("/v1/public/settings", async (_req, reply) => {
  const c = await dbClient();
  try {
    const row = (await c.query(
      "SELECT business_name as \"businessName\", brand_signoff as \"brandSignoff\", low_stock_threshold as \"lowStockThreshold\", payment_mode as \"paymentMode\", courier_mode as \"courierMode\", setup_complete as \"setupComplete\" FROM app_settings WHERE id=1"
    )).rows[0];
    reply.send({ settings: row ?? { setupComplete: false } });
  } finally { await c.end(); }
});
