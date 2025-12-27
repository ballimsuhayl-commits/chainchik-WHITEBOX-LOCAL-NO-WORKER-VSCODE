export default async function PayfastPay({ params }: { params: { orderId: string }}) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const url = `${api}/v1/payments/payfast/form?orderId=${encodeURIComponent(params.orderId)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return <div style={{maxWidth:520,margin:"60px auto"}}>PayFast not available.</div>;
  }
  const data = await res.json();
  return (
    <div style={{maxWidth:520,margin:"60px auto",display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Secure payment</h1>
      <div style={{color:"#666"}}>Redirecting you to PayFast…</div>
      <form id="pf" action={data.processUrl} method="post">
        {Object.entries(data.fields).map(([k,v]:any)=>(
          <input key={k} type="hidden" name={k} value={String(v)} />
        ))}
        <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff"}}>Continue</button>
      </form>
      <script dangerouslySetInnerHTML={{__html:`setTimeout(()=>document.getElementById('pf')?.submit(), 50);`}} />
    </div>
  );
}
