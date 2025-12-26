import AdminShell from "../../AdminShell";
import { redirect } from "next/navigation";

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

export default async function ProductManage({ params, searchParams }: { params: { sku: string }, searchParams?: Record<string, string | string[] | undefined> }) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const sku = params.sku;

  const data = await fetchJSON(`${api}/v1/admin/products/${encodeURIComponent(sku)}`, adminKey);
  const imgs = await fetch(`${api}/v1/products/${encodeURIComponent(sku)}/images`, { cache:"no-store" }).then(r=>r.ok?r.json():({images:[]}));

  const uploaded = typeof searchParams?.uploaded === "string" ? searchParams?.uploaded : "";
  const p = data.product;

  async function uploadImage(fd: FormData) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const sku = String(fd.get("sku") ?? "");
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) redirect(`/admin/products/${encodeURIComponent(sku)}?error=Please+select+a+file`);

    const form = new FormData();
    form.set("file", file);

    const res = await fetch(`${api}/v1/admin/uploads/image`, {
      method: "POST",
      headers: { "x-admin-key": adminKey },
      body: form,
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) redirect(`/admin/products/${encodeURIComponent(sku)}?error=${encodeURIComponent(text)}`);
    const j = JSON.parse(text);
    const url = String(j.url ?? "");
    redirect(`/admin/products/${encodeURIComponent(sku)}?uploaded=${encodeURIComponent(url)}`);
  }

  return (
    <AdminShell title={`Product: ${sku}`}>
      <div style={{display:"grid",gap:12,maxWidth:900}}>
        <h1 style={{margin:0}}>{p.name} <span style={{color:"#666"}}>({sku})</span></h1>

        <form action={async (fd: FormData)=>{ "use server";
          const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
          const adminKey = process.env.ADMIN_API_KEY ?? "";
          const sku = String(fd.get("sku") ?? "");
          const name = String(fd.get("name")??"").trim();
          const description = String(fd.get("description")??"").trim();
          const priceCents = Math.round(Number(fd.get("price")??0)*100);
          const stockQty = Number(fd.get("stockQty")??0);
          const active = String(fd.get("active")??"on")==="on";
          const tags = String(fd.get("tags")??"").split(",").map(s=>s.trim()).filter(Boolean);
          await postJSON(`${api}/v1/admin/products/${encodeURIComponent(sku)}`, adminKey, { name, description, priceCents, stockQty, active, imageUrl: "", tags });
          redirect(`/admin/products/${encodeURIComponent(sku)}?saved=1`);
        }} style={{display:"grid",gap:8,border:"1px solid #eee",borderRadius:16,padding:14}}>
          <input type="hidden" name="sku" value={sku}/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input name="name" defaultValue={p.name} style={{padding:12,borderRadius:12,border:"1px solid #eee",minWidth:260}}/>
            <input name="price" defaultValue={(p.priceCents/100).toFixed(2)} type="number" step="0.01" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
            <input name="stockQty" defaultValue={p.stockQty} type="number" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
            <label style={{display:"flex",gap:8,alignItems:"center",padding:12,borderRadius:12,border:"1px solid #eee"}}>
              <input name="active" type="checkbox" defaultChecked={p.active} /> Active
            </label>
          </div>
          <input name="tags" defaultValue={(p.tags ?? []).join(", ")} placeholder="Tags (comma separated)" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
          <textarea name="description" rows={4} defaultValue={p.description ?? ""} style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
          <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",fontWeight:800}}>Save</button>
        </form>

        <div style={{border:"1px solid #eee",borderRadius:16,padding:14,display:"grid",gap:10}}>
          <div style={{fontWeight:950}}>Gallery images</div>
          <div style={{color:"#666",fontSize:12}}>Upload your images here (no curl). After upload, the URL appears and you can Save gallery.</div>

          <form action={uploadImage} style={{display:"grid",gap:8}}>
            <input type="hidden" name="sku" value={sku}/>
            <input name="file" type="file" accept="image/*" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
            <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",fontWeight:800}}>Upload image</button>
          </form>

          {uploaded ? (
            <div style={{border:"1px solid #eee",borderRadius:12,padding:12,display:"grid",gap:8}}>
              <div style={{fontWeight:800}}>Uploaded ✅</div>
              <input value={uploaded} readOnly style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
              <div style={{color:"#666",fontSize:12}}>Tip: copy this URL into the list below (one per line).</div>
            </div>
          ) : null}

          <form action={async (fd: FormData)=>{ "use server";
            const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
            const adminKey = process.env.ADMIN_API_KEY ?? "";
            const sku = String(fd.get("sku") ?? "");
            const urls = String(fd.get("urls")??"").split("\n").map(s=>s.trim()).filter(Boolean);
            const images = urls.map((u,idx)=>({ url: u, altText: p.name, sortOrder: idx }));
            await postJSON(`${api}/v1/admin/products/${encodeURIComponent(sku)}/images`, adminKey, { images });
            redirect(`/admin/products/${encodeURIComponent(sku)}?savedGallery=1`);
          }} style={{display:"grid",gap:8}}>
            <input type="hidden" name="sku" value={sku}/>
            <textarea
              name="urls"
              rows={7}
              defaultValue={
                (uploaded ? [uploaded] : [])
                  .concat((imgs.images ?? []).map((x:any)=>x.url))
                  .filter((v,i,a)=>a.indexOf(v)===i)
                  .join("\n")
              }
              placeholder="One image URL per line"
              style={{padding:12,borderRadius:12,border:"1px solid #eee"}}
            />
            <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",fontWeight:800}}>Save gallery</button>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
