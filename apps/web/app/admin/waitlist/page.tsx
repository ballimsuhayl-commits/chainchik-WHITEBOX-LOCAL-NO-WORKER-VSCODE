async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function postJSON(url: string, adminKey: string, body?: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-admin-key": adminKey, ...(body ? { "Content-Type":"application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Waitlist() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/waitlist`, adminKey);

  return (
    <div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Back-in-stock waitlist</h1>
      <div style={{color:"#666"}}>When you restock an item, you can notify everyone politely ✨</div>

      {data.items.map((it:any)=>(
        <div key={it.sku} style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
          <div style={{fontWeight:900}}>{it.sku} <span style={{color:"#666"}}>({it.count} subscribers)</span></div>
          <form action={async()=>{ "use server"; await postJSON(`${api}/v1/admin/waitlist/${it.sku}/notify`, adminKey); }} style={{marginTop:10}}>
            <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Notify subscribers ✨</button>
          </form>
        </div>
      ))}
    </div>
  );
}
