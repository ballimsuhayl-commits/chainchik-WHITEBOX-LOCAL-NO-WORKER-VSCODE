import AiInboxClient from "./AiInboxClient";

export default function AiInboxPage() {
  async function suggest(fd: FormData) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const phone = String(fd.get("phone") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    const res = await fetch(`${api}/v1/admin/ai/suggest-reply`, {
      method: "POST",
      headers: { "x-admin-key": adminKey, "content-type": "application/json" },
      body: JSON.stringify({ channel: "whatsapp", phone, message }),
      cache: "no-store",
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return JSON.parse(txt);
  }

  async function send(fd: FormData) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const phone = String(fd.get("phone") ?? "").trim();
    const text = String(fd.get("text") ?? "").trim();

    const res = await fetch(`${api}/v1/admin/whatsapp/send`, {
      method: "POST",
      headers: { "x-admin-key": adminKey, "content-type": "application/json" },
      body: JSON.stringify({ phone, text }),
      cache: "no-store",
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return JSON.parse(txt);
  }

  return <AiInboxClient suggest={suggest} send={send} />;
}
