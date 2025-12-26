export default function Login({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams?.next ?? "/admin";
  return (
    <div style={{maxWidth:420,margin:"60px auto",display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Admin login</h1>
      <div style={{color:"#666"}}>Enter your password to manage orders, stock, and messages.</div>

      <form action={async (fd: FormData)=>{ "use server";
        const password = String(fd.get("password") ?? "");
        const nextPath = String(fd.get("next") ?? "/admin");
        const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

        const res = await fetch(`${api}/v1/admin/login`, {
          method: "POST",
          headers: { "content-type":"application/json", "x-admin-key": process.env.ADMIN_API_KEY ?? "" },
          body: JSON.stringify({ password }),
          cache: "no-store"
        });

        if (!res.ok) throw new Error(await res.text());

        const { cookies } = await import("next/headers");
        const secret = process.env.ADMIN_SESSION_SECRET ?? "";
if (!secret) throw new Error("ADMIN_SESSION_SECRET not set");
const ttlHours = Number(process.env.ADMIN_SESSION_TTL_HOURS ?? 8);
const exp = Date.now() + ttlHours * 60 * 60 * 1000;
const payload = JSON.stringify({ v: 1, exp });
const crypto = await import("node:crypto");
const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
const token = Buffer.from(payload).toString("base64url") + "." + sig;

cookies().set("cc_admin", token, {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ttlHours * 60 * 60,
});

        const { redirect } = await import("next/navigation");
        redirect(nextPath);
      }} style={{display:"grid",gap:10,border:"1px solid #eee",borderRadius:14,padding:12}}>
        <input type="hidden" name="next" value={next} />
        <input name="password" type="password" placeholder="Password" style={{padding:12,borderRadius:12,border:"1px solid #ddd"}} required />
        <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff"}}>Unlock ✅</button>
      </form>

      <div style={{fontSize:12,color:"#666"}}>Tip: Set <b>ADMIN_PASSWORD_HASH</b> in your .env.</div>
    </div>
  );
}
