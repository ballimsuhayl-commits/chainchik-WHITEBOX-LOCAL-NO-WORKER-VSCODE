async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function postJSON(url: string, adminKey: string, body: any) {
  const res = await fetch(url, { method:"POST", headers: { "x-admin-key": adminKey, "Content-Type":"application/json" }, body: JSON.stringify(body), cache:"no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function VariantSKU({ params }: { params: { sku: string }}) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/variants/${params.sku}`, adminKey);

  return (
    <div style={{display:"grid",gap:12}}>
      <a href="/admin/variants">← Back</a>
      <h1 style={{margin:0}}>Variants for {params.sku}</h1>

      <form action={async (fd: FormData)=>{ "use server";
        const variantKey = String(fd.get("variantKey")??"").trim();
        const variantName = String(fd.get("variantName")??"").trim();
        const priceCents = Number(fd.get("priceCents")??0);
        const stockQty = Number(fd.get("stockQty")??0);
        await postJSON(`${api}/v1/admin/variants/${params.sku}`, adminKey, { variantKey, variantName, priceCents, stockQty });
      }} style={{display:"flex",gap:8,flexWrap:"wrap",border:"1px solid #eee",borderRadius:12,padding:12}}>
        <input name="variantKey" placeholder="key (e.g. red / small)" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
        <input name="variantName" placeholder="name shown to customers" style={{padding:10,borderRadius:10,border:"1px solid #ddd",width:260}}/>
        <input name="priceCents" placeholder="price cents" type="number" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
        <input name="stockQty" placeholder="stock" type="number" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
        <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Save</button>
      </form>

      <div style={{display:"grid",gap:8}}>
        {data.variants.map((v:any)=>(
          <div key={v.id} style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
            <div style={{fontWeight:900}}>{v.variantName} <span style={{color:"#666"}}>({v.variantKey})</span></div>
            <div style={{color:"#666",fontSize:12}}>Price cents: {v.priceCents} • Stock: {v.stockQty}</div>
            <form action={async (fd: FormData)=>{ "use server";
              const stockQty = Number(fd.get("stockQty")??0);
              await postJSON(`${api}/v1/admin/variants/${params.sku}/${v.variantKey}/stock`, adminKey, { stockQty });
            }} style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
              <input name="stockQty" defaultValue={v.stockQty} type="number" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
              <button style={{padding:10,borderRadius:10,border:"1px solid #ddd",background:"#fff"}}>Update stock</button>
            </form>
          </div>
        ))}
        {data.variants.length === 0 && <div style={{color:"#666"}}>No variants yet.</div>}
      </div>
    </div>
  );
}
