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

export default async function Bulk({ searchParams }: { searchParams: { status?: string }}) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const status = (searchParams.status ?? "POP_RECEIVED").toString();
  const data = await fetchJSON(`${api}/v1/admin/orders?status=${encodeURIComponent(status)}`, adminKey);

  return (
    <div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Bulk actions</h1>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {["POP_RECEIVED","PAID_CONFIRMED","READY_TO_SHIP"].map(s=>(
          <a key={s} href={`/admin/bulk?status=${encodeURIComponent(s)}`} style={{padding:10,border:"1px solid #ddd",borderRadius:10,textDecoration:"none"}}>{s}</a>
        ))}
      </div>

      <form action={async (fd: FormData)=>{ "use server";
        const action = String(fd.get("action")??"RESEND_TRACKING");
        const orderIds = fd.getAll("orderId").map(String);
        await postJSON(`${api}/v1/admin/orders/bulk`, adminKey, { action, orderIds });
      }} style={{display:"grid",gap:10}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select name="action" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}>
            <option value="RESEND_TRACKING">Resend tracking</option>
            <option value="CONFIRM_PAYMENT">Confirm payment</option>
          </select>
          <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Run on selected</button>
        </div>

        <div style={{display:"grid",gap:8}}>
          {data.orders.map((o:any)=>(
            <label key={o.id} style={{display:"flex",gap:10,alignItems:"center",border:"1px solid #eee",borderRadius:12,padding:10}}>
              <input type="checkbox" name="orderId" value={o.id}/>
              <div>
                <div style={{fontWeight:800}}>{o.id}</div>
                <div style={{color:"#666",fontSize:12}}>{o.status} • {(o.totalCents/100).toFixed(2)} {o.currency}</div>
              </div>
            </label>
          ))}
          {data.orders.length===0 && <div style={{color:"#666"}}>No orders in this status.</div>}
        </div>
      </form>
    </div>
  );
}
