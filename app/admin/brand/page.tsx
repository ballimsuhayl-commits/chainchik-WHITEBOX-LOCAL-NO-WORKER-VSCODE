import AdminShell from "../AdminShell";
import { redirect } from "next/navigation";

async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function BrandKit({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/settings`, adminKey);
  const s = data.settings ?? {};

  async function uploadLogo(fd: FormData) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) redirect("/admin/brand?error=Please+select+a+logo");
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`${api}/v1/admin/uploads/image`, {
      method: "POST",
      headers: { "x-admin-key": adminKey },
      body: form,
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) redirect(`/admin/brand?error=${encodeURIComponent(text)}`);
    const j = JSON.parse(text);
    redirect(`/admin/brand?uploaded=${encodeURIComponent(String(j.url ?? ""))}`);
  }

  const uploaded = typeof searchParams?.uploaded === "string" ? searchParams.uploaded : "";

  async function save(fd: FormData) {
    "use server";
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const adminKey = process.env.ADMIN_API_KEY ?? "";
    const brandLogoUrl = String(fd.get("brandLogoUrl") ?? "").trim();
    const brandPrimaryColor = String(fd.get("brandPrimaryColor") ?? "#111111").trim();
    const brandAccentColor = String(fd.get("brandAccentColor") ?? "#ffffff").trim();
    const current = await fetchJSON(`${api}/v1/admin/settings`, adminKey);
    const base = current.settings ?? {};
    await fetch(`${api}/v1/admin/settings`, {
      method: "POST",
      headers: { "x-admin-key": adminKey, "content-type": "application/json" },
      body: JSON.stringify({
        ...base,
        brandLogoUrl,
        brandPrimaryColor,
        brandAccentColor,
        setupComplete: true,
      }),
      cache: "no-store",
    });
    redirect("/admin/brand?saved=1");
  }

  return (
    <AdminShell title="Brand Kit">
      <div style={{display:"grid",gap:12,maxWidth:800}}>
        <h1 style={{margin:0}}>Brand Kit</h1>
        <div style={{color:"#666"}}>Make this store yours — logo + colors update the storefront instantly ✨</div>

        <div style={{border:"1px solid #eee",borderRadius:16,padding:14,display:"grid",gap:10}}>
          <div style={{fontWeight:950}}>Upload logo</div>
          <form action={uploadLogo} style={{display:"grid",gap:8}}>
            <input name="file" type="file" accept="image/*" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
            <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",fontWeight:800}}>Upload logo</button>
          </form>

          {(uploaded || s.brandLogoUrl) ? (
            <div style={{display:"grid",gap:8}}>
              <div style={{color:"#666",fontSize:12}}>Current logo URL</div>
              <input readOnly value={uploaded || s.brandLogoUrl || ""} style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <div style={{width:64,height:64,border:"1px solid #eee",borderRadius:14,display:"grid",placeItems:"center",overflow:"hidden"}}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploaded || s.brandLogoUrl} alt="logo" style={{maxWidth:"100%",maxHeight:"100%"}} />
                </div>
                <div style={{color:"#666",fontSize:12}}>Tip: square logos look best.</div>
              </div>
            </div>
          ) : null}
        </div>

        <form action={save} style={{border:"1px solid #eee",borderRadius:16,padding:14,display:"grid",gap:10}}>
          <div style={{fontWeight:950}}>Colors</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <label style={{display:"grid",gap:6}}>
              <span style={{fontWeight:800}}>Primary</span>
              <input name="brandPrimaryColor" defaultValue={s.brandPrimaryColor ?? "#111111"} style={{padding:12,borderRadius:12,border:"1px solid #eee",minWidth:220}}/>
            </label>
            <label style={{display:"grid",gap:6}}>
              <span style={{fontWeight:800}}>Accent</span>
              <input name="brandAccentColor" defaultValue={s.brandAccentColor ?? "#ffffff"} style={{padding:12,borderRadius:12,border:"1px solid #eee",minWidth:220}}/>
            </label>
          </div>

          <label style={{display:"grid",gap:6}}>
            <span style={{fontWeight:800}}>Logo URL</span>
            <input name="brandLogoUrl" defaultValue={uploaded || s.brandLogoUrl || ""} placeholder="(upload above or paste a URL)" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
          </label>

          <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",fontWeight:800}}>Save brand kit</button>
        </form>
      </div>
    </AdminShell>
  );
}
