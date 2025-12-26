import AdminShell from "../AdminShell";
async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function System() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const health = await fetchJSON(`${api}/v1/admin/system/health`, adminKey);
  const events = await fetchJSON(`${api}/v1/admin/system/events`, adminKey);

  return (
    <AdminShell title="System"><div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>System</h1>
      <div style={{display:"grid",gap:8,border:"1px solid #eee",borderRadius:14,padding:12}}>
        <div><b>Last webhook:</b> {health.lastWebhookAt ?? "—"}</div>
        <div><b>Open orders:</b> {health.openOrders}</div>
        <div><b>Open tickets:</b> {health.openTickets}</div>
        <div><b>Last error:</b> {health.lastError?.message ?? "—"}</div>
      </div>

      <div style={{display:"grid",gap:8}}>
        {events.events.map((e:any)=>(
          <div key={e.id} style={{border:"1px solid #eee",borderRadius:14,padding:12}}>
            <div style={{fontWeight:900}}>{e.level} • {e.source} • {e.eventKey}</div>
            <div style={{color:"#666",fontSize:12}}>{e.createdAt}</div>
            <div style={{marginTop:8,whiteSpace:"pre-wrap"}}>{e.message}</div>
          </div>
        ))}
      </div>
    </div></AdminShell>
  );
}
