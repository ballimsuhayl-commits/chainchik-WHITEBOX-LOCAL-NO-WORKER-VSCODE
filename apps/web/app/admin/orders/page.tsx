import AdminShell from "../AdminShell";
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

export default async function AdminOrders() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/orders?status=POP_RECEIVED`, adminKey);

  return (
    <AdminShell title="Orders"><div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Orders</h1>
      <div style={{color:"#666"}}>Orders waiting for payment confirmation</div>

      {data.orders.map((o:any)=>(
        <div key={o.id} style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
          <div style={{fontWeight:800}}>Order {o.id}</div>
          <div>Status: {o.status}</div>
          <div>Total: {o.currency} {(o.totalCents/100).toFixed(2)}</div>

          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
            <a href={`${api}/v1/admin/orders/${o.id}/pop`} style={{padding:10,borderRadius:10,border:"1px solid #ddd",textDecoration:"none"}}>View POP</a>
            <form action={async()=>{ "use server"; await postJSON(`${api}/v1/admin/orders/${o.id}/confirm-payment`, adminKey); }}>
              <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Confirm payment</button>
            </form>
            <form action={async()=>{ "use server"; await postJSON(`${api}/v1/admin/orders/${o.id}/reject-pop`, adminKey); }}>
              <button style={{padding:10,borderRadius:10,border:"1px solid #ddd",background:"#fff"}}>Reject POP</button>
            </form>
          </div>

          <div style={{marginTop:12,borderTop:"1px solid #f1f1f1",paddingTop:12}}>
            <div style={{fontWeight:800}}>Courier quote → confirm → book</div>
            <div style={{marginTop:10, color:"#666", fontSize:12}}>
              Saved delivery text: {o.deliveryEnteredText ? <b>{o.deliveryEnteredText}</b> : "None yet"}
            </div>



            <form action={async (fd: FormData)=> {
              "use server";
              const deliveryEnteredText = String(fd.get("deliveryEnteredText") ?? "").trim();
              await postJSON(`${api}/v1/admin/orders/${o.id}/delivery`, adminKey, { deliveryEnteredText });
            }} style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              <input name="deliveryEnteredText" defaultValue={o.deliveryEnteredText ?? ""} placeholder="Paste full delivery address here" style={{padding:10,borderRadius:10,border:"1px solid #ddd",width:520}}/>
              <button style={{padding:10,borderRadius:10,border:"1px solid #ddd",background:"#fff"}}>Save delivery</button>
            </form>

            {o.quoteAmountCents ? (
              <div style={{marginTop:6,color:"#166534",fontWeight:800}}>
                Latest quote: {o.quoteCurrency ?? "ZAR"} {(Number(o.quoteAmountCents)/100).toFixed(2)} • Service: {o.quoteServiceLevelCode}
              </div>
            ) : (
              <div style={{marginTop:6,color:"#666"}}>No quote yet. Get a quote first 😊</div>
            )}

            <form action={async (fd: FormData)=> {
              "use server";
              const deliveryAddress = {
                type: "residential",
                entered_address: String(fd.get("entered") ?? "").trim(),
                street_address: String(fd.get("street") ?? "").trim(),
                local_area: String(fd.get("area") ?? "").trim(),
                suburb: String(fd.get("suburb") ?? "").trim(),
                city: String(fd.get("city") ?? "").trim(),
                code: String(fd.get("code") ?? "").trim(),
                zone: String(fd.get("zone") ?? "").trim(),
                country: "South Africa",
                lat: Number(fd.get("lat") ?? 0),
                lng: Number(fd.get("lng") ?? 0)
              };
              await postJSON(`${api}/v1/admin/orders/${o.id}/courier/quote`, adminKey, { deliveryAddress });
            }} style={{display:"grid",gap:8,marginTop:10}}>
              <div style={{display:"grid",gap:8,gridTemplateColumns:"1fr 1fr"}}>
                <input name="entered" defaultValue={o.deliveryEnteredText ?? o.deliveryAddress?.entered_address ?? ""} placeholder="Full address (as customer wrote it)" style={{padding:10,borderRadius:10,border:"1px solid #ddd",gridColumn:"1 / -1"}}/>
                <input name="street" defaultValue={o.deliveryAddress?.street_address ?? ""} placeholder="Street address" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="suburb" defaultValue={o.deliveryAddress?.suburb ?? ""} placeholder="Suburb" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="city" defaultValue={o.deliveryAddress?.city ?? ""} placeholder="City" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="code" defaultValue={o.deliveryAddress?.code ?? ""} placeholder="Postal code" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="zone" defaultValue={o.deliveryAddress?.zone ?? ""} placeholder="Province code (e.g. GP/WC/KZN)" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="lat" type="number" step="0.000001" defaultValue={o.deliveryAddress?.lat ?? 0} placeholder="Latitude (optional)" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="lng" type="number" step="0.000001" defaultValue={o.deliveryAddress?.lng ?? 0} placeholder="Longitude (optional)" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
              </div>
              <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff",width:220}}>Get courier quote</button>
            </form>

            <form action={async (fd: FormData)=> {
              "use server";
              const deliveryAddress = {
                type: "residential",
                entered_address: String(fd.get("entered") ?? "").trim(),
                street_address: String(fd.get("street") ?? "").trim(),
                local_area: String(fd.get("area") ?? "").trim(),
                suburb: String(fd.get("suburb") ?? "").trim(),
                city: String(fd.get("city") ?? "").trim(),
                code: String(fd.get("code") ?? "").trim(),
                zone: String(fd.get("zone") ?? "").trim(),
                country: "South Africa",
                lat: Number(fd.get("lat") ?? 0),
                lng: Number(fd.get("lng") ?? 0)
              };
              const deliveryContact = {
                name: String(fd.get("recvName") ?? "").trim(),
                email: String(fd.get("recvEmail") ?? "").trim(),
                mobile_number: String(fd.get("recvPhone") ?? "").trim()
              };
              const serviceLevelCode = String(fd.get("serviceLevelCode") ?? o.quoteServiceLevelCode ?? "").trim();
              await postJSON(`${api}/v1/admin/orders/${o.id}/book-courier`, adminKey, { deliveryAddress, deliveryContact, serviceLevelCode });
            }} style={{display:"grid",gap:8,marginTop:10}}>
              <div style={{fontWeight:800}}>Confirm & book</div>

{(o.quoteServiceLevelCode && (o.deliveryEnteredText || o.deliveryAddress)) && (
  <form action={async ()=> {
    "use server";
    await postJSON(`${api}/v1/admin/orders/${o.id}/book-courier`, adminKey, {
      serviceLevelCode: String(o.quoteServiceLevelCode),
      // deliveryAddress/contact will be inferred server-side when possible
    });
  }} style={{marginTop:10}}>
    <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff",width:280}}>
      Book using saved details ⚡
    </button>
  </form>
)}

              <div style={{display:"grid",gap:8,gridTemplateColumns:"1fr 1fr"}}>
                <input name="recvName" defaultValue={o.deliveryContact?.name ?? ""} placeholder="Receiver name" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="recvPhone" defaultValue={o.deliveryContact?.mobile_number ?? ""} placeholder="Receiver mobile (+27...)" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="recvEmail" defaultValue={o.deliveryContact?.email ?? ""} placeholder="Receiver email (optional)" style={{padding:10,borderRadius:10,border:"1px solid #ddd",gridColumn:"1 / -1"}}/>
                <input name="serviceLevelCode" placeholder="Service level code (use quoted code)" defaultValue={o.quoteServiceLevelCode ?? ""} style={{padding:10,borderRadius:10,border:"1px solid #ddd",gridColumn:"1 / -1"}}/>

                <input name="entered" defaultValue={o.deliveryEnteredText ?? o.deliveryAddress?.entered_address ?? ""} placeholder="Full address (same as quote form)" style={{padding:10,borderRadius:10,border:"1px solid #ddd",gridColumn:"1 / -1"}}/>
                <input name="street" defaultValue={o.deliveryAddress?.street_address ?? ""} placeholder="Street address" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="suburb" defaultValue={o.deliveryAddress?.suburb ?? ""} placeholder="Suburb" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="city" defaultValue={o.deliveryAddress?.city ?? ""} placeholder="City" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="code" defaultValue={o.deliveryAddress?.code ?? ""} placeholder="Postal code" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="zone" defaultValue={o.deliveryAddress?.zone ?? ""} placeholder="Province code (e.g. GP/WC/KZN)" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="lat" type="number" step="0.000001" defaultValue={o.deliveryAddress?.lat ?? 0} placeholder="Latitude (optional)" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
                <input name="lng" type="number" step="0.000001" defaultValue={o.deliveryAddress?.lng ?? 0} placeholder="Longitude (optional)" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
              </div>
              <button style={{padding:10,borderRadius:10,border:"1px solid #ddd",background:"#fff",width:240}}>Confirm & book courier</button>
            </form>

            <div style={{color:"#666",fontSize:12,marginTop:6}}>
              Tip: set your shop pickup address/contact in <code>.env</code> (COURIER_GUY_COLLECTION_*). Quotes expire after 30 minutes.
            </div>
          </div>
        </div>
      ))}
    </div></AdminShell>
  );
}
