async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Variants() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const products = await fetchJSON(`${api}/v1/admin/products`, adminKey);

  return (
    <div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Variants</h1>
      <div style={{color:"#666"}}>Add options per product (sizes/colors). Variant stock is tracked separately.</div>

      {products.products.map((p:any)=>(
        <div key={p.sku} style={{border:"1px solid #eee",borderRadius:14,padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div style={{fontWeight:900}}>{p.name} <span style={{color:"#666"}}>({p.sku})</span></div>
            <a href={`/admin/variants/${p.sku}`}>Manage</a>
          </div>
        </div>
      ))}
    </div>
  );
}
