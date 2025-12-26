import AdminShell from "../AdminShell";

async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function postJSON(url: string, adminKey: string, body: any) {
  const res = await fetch(url, { method:"POST", headers: { "x-admin-key": adminKey, "content-type":"application/json" }, body: JSON.stringify(body), cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Products() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/products`, adminKey);

  return (
    <AdminShell title="Products">
      <div style={{display:"grid",gap:12}}>
        <h1 style={{margin:0}}>Products</h1>
        <div style={{color:"#666"}}>Add, update, upload images, and control stock — no HTML editing needed ✨</div>

        <form action={async (fd: FormData)=>{ "use server";
          const sku = String(fd.get("sku")??"").trim();
          const name = String(fd.get("name")??"").trim();
          const description = String(fd.get("description")??"").trim();
          const priceCents = Math.round(Number(fd.get("price")??0)*100);
          const stockQty = Number(fd.get("stockQty")??0);
          const active = String(fd.get("active")??"on")==="on";
          const tags = String(fd.get("tags")??"").split(",").map(s=>s.trim()).filter(Boolean);
          await postJSON(`${api}/v1/admin/products`, adminKey, { sku, name, description, priceCents, stockQty, active, imageUrl: "", tags });
        }} style={{display:"grid",gap:8,border:"1px solid #eee",borderRadius:16,padding:14}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input name="sku" placeholder="SKU (unique)" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
            <input name="name" placeholder="Product name" style={{padding:12,borderRadius:12,border:"1px solid #eee",minWidth:220}}/>
            <input name="price" placeholder="Price (R)" type="number" step="0.01" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
            <input name="stockQty" placeholder="Stock" type="number" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
            <label style={{display:"flex",gap:8,alignItems:"center",padding:12,borderRadius:12,border:"1px solid #eee"}}>
              <input name="active" type="checkbox" defaultChecked /> Active
            </label>
          </div>
          <input name="tags" placeholder="Tags (comma separated) e.g. chain, gold, gift" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
          <textarea name="description" rows={3} placeholder="Short description" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
          <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",fontWeight:800}}>Add product</button>
        </form>

        <div style={{display:"grid",gap:10}}>
          {data.products.map((p:any)=>(
            <div key={p.sku} style={{border:"1px solid #eee",borderRadius:16,padding:14,display:"grid",gap:10}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontWeight:950}}>{p.name} <span style={{color:"#666"}}>({p.sku})</span></div>
                  <div style={{color:"#666",fontSize:12}}>Stock: {p.stockQty} • Active: {String(p.active)}</div>
                </div>
                <a href={`/admin/products/${encodeURIComponent(p.sku)}`} style={{textDecoration:"none",padding:"10px 12px",border:"1px solid #111",borderRadius:12,background:"#111",color:"#fff"}}>Manage →</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
