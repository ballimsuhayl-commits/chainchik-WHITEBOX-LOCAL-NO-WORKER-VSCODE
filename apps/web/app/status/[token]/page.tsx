async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function StatusPage({ params }: { params: { token: string }}) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const data = await fetchJSON(`${api}/v1/public/status/${params.token}`);

  const steps = ["AWAITING_POP","POP_RECEIVED","PAID_CONFIRMED","READY_TO_SHIP","COLLECTED","DELIVERED"];
  const idx = steps.indexOf(data.order.status);

  return (
    <div style={{display:"grid",gap:14}}>
      <div style={{fontWeight:900,letterSpacing:"0.18em",textTransform:"uppercase"}}>Order status</div>
      <div style={{border:"1px solid #eee",borderRadius:14,padding:14}}>
        <div style={{fontWeight:900}}>Order {data.order.id}</div>
        <div style={{color:"#666"}}>{data.order.currency} {(data.order.totalCents/100).toFixed(2)}</div>
        {data.trackingNumber && <div style={{marginTop:8}}>Tracking: <b>{data.trackingNumber}</b></div>}
      </div>

      <div style={{border:"1px solid #eee",borderRadius:14,padding:14}}>
        <div style={{fontWeight:900}}>Progress</div>
        <div style={{display:"grid",gap:8,marginTop:10}}>
          {steps.map((s,i)=>(
            <div key={s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:10,borderRadius:12,border:"1px solid #f1f1f1",background:i<=idx?"rgba(17,17,20,0.03)":"transparent"}}>
              <div style={{fontWeight:800}}>{s.replaceAll("_"," ")}</div>
              <div>{i<=idx?"✅":"⏳"}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:10,color:"#666",fontSize:12}}>
          Need help? Just reply on WhatsApp — we’ve got you 💛
        </div>
      </div>
    </div>
  );
}
