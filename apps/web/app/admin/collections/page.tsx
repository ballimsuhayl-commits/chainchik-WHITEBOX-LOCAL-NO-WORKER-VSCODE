async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function postJSON(url: string, adminKey: string, body: any) {
  const res = await fetch(url, { method: "POST", headers: { "x-admin-key": adminKey, "Content-Type":"application/json" }, body: JSON.stringify(body), cache:"no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function AdminCollections() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const [cols, prods] = await Promise.all([
    fetchJSON(`${api}/v1/admin/collections`, adminKey),
    fetchJSON(`${api}/v1/admin/products`, adminKey)
  ]);

  return (
    <div style={{display:"grid",gap:14}}>
      <h1 style={{margin:0}}>Collections</h1>

      <div style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
        <div style={{fontWeight:900}}>Add collection</div>
        <form action={async (fd: FormData) => {
          "use server";
          const slug = String(fd.get("slug") ?? "").trim();
          const name = String(fd.get("name") ?? "").trim();
          const sortOrder = Number(fd.get("sortOrder") ?? 0);
          await postJSON(`${api}/v1/admin/collections`, adminKey, { slug, name, sortOrder });
        }} style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
          <input name="slug" placeholder="slug (e.g. hand-chains)" style={{padding:10,borderRadius:10,border:"1px solid #ddd",width:220}}/>
          <input name="name" placeholder="Name (e.g. Hand Chains)" style={{padding:10,borderRadius:10,border:"1px solid #ddd",width:260}}/>
          <input name="sortOrder" type="number" defaultValue={0} style={{padding:10,borderRadius:10,border:"1px solid #ddd",width:120}}/>
          <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Add</button>
        </form>
      </div>

      <div style={{display:"grid",gap:10}}>
        {cols.collections.map((c:any)=>(
          <div key={c.slug} style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
              <div>
                <div style={{fontWeight:900}}>{c.name} <span style={{color:"#666"}}>({c.slug})</span></div>
                <div style={{color:"#666"}}>Sort: {c.sortOrder} • Active: {String(c.active)}</div>
              </div>
              <form action={async (fd: FormData) => {
                "use server";
                const name = String(fd.get("name") ?? c.name).trim();
                const sortOrder = Number(fd.get("sortOrder") ?? c.sortOrder);
                const active = fd.get("active") === "on";
                await postJSON(`${api}/v1/admin/collections/${c.slug}`, adminKey, { name, sortOrder, active });
              }} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <input name="name" defaultValue={c.name} style={{padding:10,borderRadius:10,border:"1px solid #ddd",width:220}}/>
                <input name="sortOrder" type="number" defaultValue={c.sortOrder} style={{padding:10,borderRadius:10,border:"1px solid #ddd",width:110}}/>
                <label style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input name="active" type="checkbox" defaultChecked={Boolean(c.active)} /> Active
                </label>
                <button style={{padding:10,borderRadius:10,border:"1px solid #ddd",background:"#fff"}}>Save</button>
              </form>
            </div>

            <div style={{marginTop:12,display:"grid",gap:8}}>
              <div style={{fontWeight:800}}>Assign product</div>
              <form action={async (fd: FormData) => {
                "use server";
                const sku = String(fd.get("sku") ?? "").trim();
                await postJSON(`${api}/v1/admin/collections/${c.slug}/assign`, adminKey, { sku });
              }} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <select name="sku" style={{padding:10,borderRadius:10,border:"1px solid #ddd",minWidth:320}}>
                  <option value="">Choose product…</option>
                  {prods.products.map((p:any)=>(<option key={p.sku} value={p.sku}>{p.name} (SKU {p.sku})</option>))}
                </select>
                <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Assign</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
