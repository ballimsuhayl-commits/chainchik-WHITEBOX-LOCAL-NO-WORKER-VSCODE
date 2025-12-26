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

export default async function OrderDetail({ params }: { params: { id: string }}) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/orders/${params.id}`, adminKey);

  return (
    <div style={{display:"grid",gap:14}}>
      <a href="/admin/orders">← Back to orders</a>
      <h1 style={{margin:0}}>Order {data.order.id}</h1>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
          <div style={{fontWeight:900}}>Customer</div>
          <div style={{marginTop:6}}>{data.order.customerName}</div>
          <div style={{color:"#666"}}>{data.order.customerPhone}</div>
        </div>
        <div style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
          <div style={{fontWeight:900}}>Status</div>
          <div style={{marginTop:6}}>{data.order.status}</div>
          <div style={{color:"#666"}}>{data.order.currency} {(data.order.totalCents/100).toFixed(2)}</div>
        </div>
      </div>

      <div style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
        <div style={{fontWeight:900}}>Items</div>
        <ul>
          {data.items.map((i:any)=>(
            <li key={i.sku}>{i.name} ({i.sku}) ×{i.qty}</li>
          ))}
        </ul>
      </div>

      <div style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
        <div style={{fontWeight:900}}>Delivery</div>
        <div style={{marginTop:8,color:"#666"}}>Raw text:</div>
        <div><b>{data.order.deliveryEnteredText ?? "—"}</b></div>
        <div style={{marginTop:8,color:"#666"}}>Structured:</div>
        <pre style={{whiteSpace:"pre-wrap",background:"#fafafa",padding:10,borderRadius:10,border:"1px solid #eee"}}>{JSON.stringify(data.order.deliveryAddress ?? {}, null, 2)}</pre>
      </div>

      <div style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
        <div style={{fontWeight:900}}>Courier</div>
        <form action={async()=>{ "use server"; await postJSON(`${api}/v1/admin/orders/${params.id}/resend-tracking`, adminKey); }} style={{marginTop:10}}>
          <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Resend tracking 💬</button>
        </form>
        {data.quote ? <div>Quote: {data.quote.currency} {(data.quote.amountCents/100).toFixed(2)} • {data.quote.serviceLevelCode}</div> : <div style={{color:"#666"}}>No quote</div>}
        {data.shipment ? (
          <div style={{marginTop:8}}>
            <div>Tracking: <b>{data.shipment.trackingNumber}</b></div>
            {data.shipment.labelUrl && <a href={data.shipment.labelUrl}>Label link</a>}
          </div>
        ) : <div style={{color:"#666", marginTop:8}}>Not booked yet</div>}
      </div>

      <div style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
        <div style={{fontWeight:900}}>Timeline</div>
        <div style={{display:"grid",gap:8,marginTop:10}}>
          {data.events.map((e:any, idx:number)=>(
            <div key={idx} style={{border:"1px solid #f1f1f1",borderRadius:10,padding:10}}>
              <div style={{fontWeight:800}}>{e.type} <span style={{color:"#666"}}>({e.source})</span></div>
              <div style={{color:"#666",fontSize:12}}>{e.createdAt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
