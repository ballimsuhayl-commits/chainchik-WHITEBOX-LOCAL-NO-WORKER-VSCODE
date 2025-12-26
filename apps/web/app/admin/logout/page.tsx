export default function Logout() {
  return (
    <div style={{maxWidth:420,margin:"60px auto",display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Logged out</h1>
      <form action={async ()=>{ "use server";
        const { cookies } = await import("next/headers");
        cookies().set("cc_admin", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
        const { redirect } = await import("next/navigation");
        redirect("/admin/login");
      }}>
        <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff"}}>Go to login</button>
      </form>
    </div>
  );
}
