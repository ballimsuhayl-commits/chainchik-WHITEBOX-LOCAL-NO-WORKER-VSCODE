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

export default async function Support({ searchParams }: { searchParams: { status?: string }}) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const status = (searchParams.status ?? "OPEN").toString();
  const data = await fetchJSON(`${api}/v1/admin/support?status=${encodeURIComponent(status)}`, adminKey);

  return (
    <AdminShell title="Support"><div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Support</h1>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {["OPEN","WAITING_CUSTOMER","RESOLVED"].map(s=>(
          <a key={s} href={`/admin/support?status=${encodeURIComponent(s)}`} style={{padding:10,border:"1px solid #ddd",borderRadius:10,textDecoration:"none"}}>{s}</a>
        ))}
      </div>

      <form action={async (fd: FormData)=>{ "use server";
        const phone = String(fd.get("phone")??"").trim();
        const category = String(fd.get("category")??"other").trim();
        const description = String(fd.get("description")??"").trim();
        await postJSON(`${api}/v1/admin/support`, adminKey, { phone, category, description, channel:"whatsapp" });
      }} style={{display:"grid",gap:8,border:"1px solid #eee",borderRadius:14,padding:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <input name="phone" placeholder="+27..." style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
          <select name="category" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}>
            <option value="delivery_issue">delivery_issue</option>
            <option value="damaged">damaged</option>
            <option value="wrong_item">wrong_item</option>
            <option value="refund">refund</option>
            <option value="other">other</option>
          </select>
        </div>
        <textarea name="description" rows={3} placeholder="What happened?" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
        <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Create ticket</button>
      </form>

      <div style={{display:"grid",gap:8}}>
        {data.tickets.map((t:any)=>(
          <div key={t.id} style={{border:"1px solid #eee",borderRadius:14,padding:12}}>
            <div style={{fontWeight:900}}>{t.category} • {t.status}</div>
            <div style={{color:"#666",fontSize:12}}>{t.customerPhone}</div>
            <div style={{marginTop:8,whiteSpace:"pre-wrap"}}>{t.description}</div>
            <form action={async (fd: FormData)=>{ "use server";
              const status = String(fd.get("status")??"OPEN");
              await postJSON(`${api}/v1/admin/support/${t.id}/status`, adminKey, { status });
            }} style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
              <select name="status" defaultValue={t.status} style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}>
                <option value="OPEN">OPEN</option>
                <option value="WAITING_CUSTOMER">WAITING_CUSTOMER</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
              <button style={{padding:10,borderRadius:10,border:"1px solid #ddd",background:"#fff"}}>Update</button>
            </form>
          </div>
        ))}
        {data.tickets.length===0 && <div style={{color:"#666"}}>No tickets in this status.</div>}
      </div>
    </div></AdminShell>
  );
}
