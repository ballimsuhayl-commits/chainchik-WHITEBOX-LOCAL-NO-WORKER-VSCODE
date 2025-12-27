import AdminShell from "../AdminShell";
import InboxClient from "./InboxClient";

export default function InboxPage() {
  async function loadConversations(intent?: string, phone?: string)(channel?: string) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const params = new URLSearchParams();
    if (intent) params.set('intent', intent);
    if (phone) params.set('phone', phone);
    const url = `${api}/v1/admin/conversations/search?${params.toString()}`;
    const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return JSON.parse(txt);
  }

  async function loadMessages(id: string) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const res = await fetch(`${api}/v1/admin/conversations/search/${id}/messages`, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return JSON.parse(txt);
  }

  async function aiSuggest(id: string) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const res = await fetch(`${api}/v1/admin/conversations/search/${id}/ai-suggest`, {
      method:"POST",
      headers: { "x-admin-key": adminKey, "content-type":"application/json" },
      body: "{}",
      cache: "no-store"
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return JSON.parse(txt);
  }

  async function markRead(id: string) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const res = await fetch(`${api}/v1/admin/conversations/${id}/read`, { method: 'POST', headers: { 'x-admin-key': adminKey }, cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function sendMessage(id: string, text: string) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const res = await fetch(`${api}/v1/admin/conversations/search/${id}/send`, {
      method:"POST",
      headers: { "x-admin-key": adminKey, "content-type":"application/json" },
      body: JSON.stringify({ text }),
      cache: "no-store"
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return JSON.parse(txt);
  }

  return (
    <AdminShell title="Inbox">
      <InboxClient loadConversations={loadConversations} loadMessages={loadMessages} aiSuggest={aiSuggest} sendMessage={sendMessage} markRead={markRead} />
    </AdminShell>
  );
}
