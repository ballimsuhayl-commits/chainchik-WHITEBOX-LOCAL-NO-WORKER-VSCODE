import AdminShell from "../AdminShell";
async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function postJSON(url: string, adminKey: string, body: any, method: string="POST") {
  const res = await fetch(url, { method, headers: { "x-admin-key": adminKey, "content-type":"application/json" }, body: JSON.stringify(body), cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Templates() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/templates`, adminKey);

  return (
    <AdminShell title="Templates"><div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Templates</h1>
      <div style={{color:"#666"}}>Use {{order_id}}, {{tracking_id}}, {{signoff}} placeholders.</div>

      <form action={async (fd: FormData)=>{ "use server";
        const key = String(fd.get("key")??"").trim();
        const name = String(fd.get("name")??"").trim();
        const channel = String(fd.get("channel")??"whatsapp").trim();
        const body = String(fd.get("body")??"").trim();
        await postJSON(`${api}/v1/admin/templates`, adminKey, { key, name, channel, body, active: true });
      }} style={{display:"grid",gap:8,border:"1px solid #eee",borderRadius:14,padding:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <input name="key" placeholder="key (e.g. abandoned_cart)" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
          <input name="name" placeholder="Display name" style={{padding:10,borderRadius:10,border:"1px solid #ddd",minWidth:220}}/>
          <select name="channel" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}>
            <option value="whatsapp">whatsapp</option>
            <option value="facebook">facebook</option>
            <option value="instagram">instagram</option>
            <option value="any">any</option>
          </select>
        </div>
        <textarea name="body" rows={4} placeholder="Template text..." style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
        <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Save template</button>
      </form>

      <div style={{display:"grid",gap:8}}>
        {data.templates.map((t:any)=>(
          <div key={t.id} style={{border:"1px solid #eee",borderRadius:14,padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
              <div>
                <div style={{fontWeight:900}}>{t.name} <span style={{color:"#666"}}>({t.key})</span></div>
                <div style={{color:"#666",fontSize:12}}>{t.channel}</div>
              </div>
              <form action={async ()=>{ "use server"; await postJSON(`${api}/v1/admin/templates/${t.id}`, adminKey, {}, "DELETE"); }}>
                <button style={{padding:10,borderRadius:10,border:"1px solid #ddd",background:"#fff"}}>Delete</button>
              </form>
            </div>
            <pre style={{whiteSpace:"pre-wrap",marginTop:10}}>{t.body}</pre>
          </div>
        ))}
      </div>
    </div></AdminShell>
  );
}
