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

export default async function DeadLetter() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/dead-letter?limit=100`, adminKey);

  return (
    <div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Retries</h1>
      <div style={{color:"#666"}}>If something fails (WhatsApp sends etc.), it lands here. You can retry safely 😊</div>

      {data.jobs.length === 0 && <div style={{border:"1px solid #eee",borderRadius:12,padding:12}}>All clear ✨</div>}

      {data.jobs.map((j:any)=>(
        <div key={j.id} style={{border:"1px solid #eee",borderRadius:12,padding:12}}>
          <div style={{fontWeight:900}}>{j.type} <span style={{color:"#666"}}>({j.source})</span></div>
          <div style={{color:"#666",fontSize:12}}>Attempts: {j.attempts} • Next: {j.nextRunAt}</div>
          {j.error && <div style={{marginTop:8,color:"#b91c1c",fontWeight:800}}>Error: {j.error}</div>}
          <details style={{marginTop:8}}>
            <summary>Payload</summary>
            <pre style={{whiteSpace:"pre-wrap",background:"#fafafa",padding:10,borderRadius:10,border:"1px solid #eee"}}>{JSON.stringify(j.payload ?? {}, null, 2)}</pre>
          </details>
          <form action={async()=>{ "use server"; await postJSON(`${api}/v1/admin/dead-letter/${j.id}/retry`, adminKey); }} style={{marginTop:10}}>
            <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Retry now</button>
          </form>
        </div>
      ))}
    </div>
  );
}
