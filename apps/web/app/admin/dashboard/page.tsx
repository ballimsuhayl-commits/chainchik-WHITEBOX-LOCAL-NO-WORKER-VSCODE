async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Dashboard() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const orders = await fetchJSON(`${api}/v1/admin/orders`, adminKey);

  const counts: Record<string, number> = {};
  for (const o of orders.orders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  return (
    <div style={{display:"grid",gap:14}}>
      <h1 style={{margin:0}}>Dashboard</h1>
      <div style={{color:"#666"}}>A quick view of what needs attention today ✨</div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4, minmax(0,1fr))",gap:10}}>
        {Object.entries(counts).map(([k,v])=>(
          <div key={k} style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
            <div style={{fontWeight:900}}>{k}</div>
            <div style={{fontSize:28,fontWeight:900}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
        <div style={{fontWeight:900}}>Quick links</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10}}>
          <a href="/admin/orders" style={{padding:10,border:"1px solid #ddd",borderRadius:10,textDecoration:"none"}}>Orders</a>
          <a href="/admin/products" style={{padding:10,border:"1px solid #ddd",borderRadius:10,textDecoration:"none"}}>Products</a>
          <a href="/admin/collections" style={{padding:10,border:"1px solid #ddd",borderRadius:10,textDecoration:"none"}}>Collections</a>
        </div>
      </div>
    </div>
  );
}
