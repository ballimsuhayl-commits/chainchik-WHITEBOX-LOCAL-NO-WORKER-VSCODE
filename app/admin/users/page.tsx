async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function postJSON(url: string, adminKey: string, body?: any, method: string="POST") {
  const res = await fetch(url, {
    method,
    headers: { "x-admin-key": adminKey, ...(body ? { "Content-Type":"application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Users() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/users`, adminKey);

  return (
    <div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Admin users</h1>
      <div style={{color:"#666"}}>Owner can create separate keys for ops/inventory staff.</div>

      <form action={async (fd: FormData)=>{ "use server";
        const username = String(fd.get("username")??"").trim();
        const role = String(fd.get("role")??"ops").trim();
        const apiKey = String(fd.get("apiKey")??"").trim();
        await postJSON(`${api}/v1/admin/users`, adminKey, { username, role, apiKey });
      }} style={{display:"flex",gap:8,flexWrap:"wrap",border:"1px solid #eee",borderRadius:12,padding:12}}>
        <input name="username" placeholder="username" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}/>
        <select name="role" style={{padding:10,borderRadius:10,border:"1px solid #ddd"}}>
          <option value="owner">owner</option>
          <option value="ops">ops</option>
          <option value="inventory">inventory</option>
        </select>
        <input name="apiKey" placeholder="new api key (store safely)" style={{padding:10,borderRadius:10,border:"1px solid #ddd",width:280}}/>
        <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Create</button>
      </form>

      <div style={{display:"grid",gap:8}}>
        {data.users.map((u:any)=>(
          <div key={u.id} style={{border:"1px solid #eee",borderRadius:12,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div>
              <div style={{fontWeight:900}}>{u.username}</div>
              <div style={{color:"#666",fontSize:12}}>{u.role} • {u.createdAt}</div>
            </div>
            <form action={async()=>{ "use server"; await postJSON(`${api}/v1/admin/users/${u.id}`, adminKey, undefined, "DELETE"); }}>
              <button style={{padding:10,borderRadius:10,border:"1px solid #ddd",background:"#fff"}}>Delete</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
