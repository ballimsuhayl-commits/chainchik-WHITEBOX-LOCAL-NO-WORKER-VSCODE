import AdminShell from "../AdminShell";
async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Customers() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/customers`, adminKey);

  return (
    <AdminShell title="Customers"><div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Customers</h1>
      <div style={{color:"#666"}}>Your top customers, at a glance ✨</div>

      <div style={{display:"grid",gap:8}}>
        {data.customers.map((c:any)=>(
          <div key={c.phone} style={{border:"1px solid #eee",borderRadius:14,padding:12,display:"flex",justifyContent:"space-between",gap:10}}>
            <div>
              <div style={{fontWeight:900}}>{c.name ?? "Customer"} <span style={{color:"#666"}}>{c.phone}</span></div>
              <div style={{color:"#666",fontSize:12}}>Orders: {c.orderCount} • Spend: R{(c.totalCents/100).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div></AdminShell>
  );
}
