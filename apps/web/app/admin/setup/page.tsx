import AdminShell from "../AdminShell";

async function fetchJSON(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey }, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function postJSON(url: string, adminKey: string, body: any) {
  const res = await fetch(url, { method:"POST", headers: { "x-admin-key": adminKey, "content-type":"application/json" }, body: JSON.stringify(body), cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Setup() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const data = await fetchJSON(`${api}/v1/admin/settings`, adminKey);
  const s = data.settings ?? { setupComplete: false };

  return (
    <AdminShell title="Setup">
      <div style={{display:"grid",gap:12,maxWidth:700}}>
        <h1 style={{margin:0}}>Setup Wizard</h1>
        <div style={{color:"#666"}}>Let’s set up your store once — then everything runs smoothly ✨</div>

        <form action={async (fd: FormData)=>{ "use server";
          const businessName = String(fd.get("businessName")??"").trim();
          const brandSignoff = String(fd.get("brandSignoff")??"").trim();
          const whatsappNumber = String(fd.get("whatsappNumber")??"").trim();
          const lowStockThreshold = Number(fd.get("lowStockThreshold")??3);
          const paymentMode = String(fd.get("paymentMode")??"POP");
          const courierMode = String(fd.get("courierMode")??"MANUAL");
          await postJSON(`${api}/v1/admin/settings`, adminKey, { businessName, brandSignoff, whatsappNumber, lowStockThreshold, paymentMode, courierMode, setupComplete: true });
        }} style={{display:"grid",gap:10,border:"1px solid #eee",borderRadius:16,padding:14}}>
          <div style={{display:"grid",gap:6}}>
            <label style={{fontWeight:800}}>Business name</label>
            <input name="businessName" defaultValue={s.businessName ?? ""} placeholder="Chain Chik" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
          </div>

          <div style={{display:"grid",gap:6}}>
            <label style={{fontWeight:800}}>Sign-off (used in messages)</label>
            <input name="brandSignoff" defaultValue={s.brandSignoff ?? "— Team"} placeholder="— Chain Chik" style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
          </div>

          <div style={{display:"grid",gap:6}}>
            <label style={{fontWeight:800}}>WhatsApp number</label>
            <input name="whatsappNumber" defaultValue={s.whatsappNumber ?? ""} placeholder="+2772..." style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
            <div style={{color:"#666",fontSize:12}}>This is for display and templates (your Meta webhook config stays in env).</div>
          </div>

          <div style={{display:"grid",gap:6}}>
            <label style={{fontWeight:800}}>Low-stock alert threshold</label>
            <input name="lowStockThreshold" type="number" defaultValue={s.lowStockThreshold ?? 3} min={0} style={{padding:12,borderRadius:12,border:"1px solid #eee"}}/>
          </div>

          <div style={{display:"grid",gap:6}}>
            <label style={{fontWeight:800}}>Payment mode</label>
            <select name="paymentMode" defaultValue={s.paymentMode ?? "POP"} style={{padding:12,borderRadius:12,border:"1px solid #eee"}}>
              <option value="POP">POP (Proof of Payment)</option>
              <option value="PAYFAST">PayFast only</option>
              <option value="BOTH">Both (recommended)</option>
            </select>
          </div>

          <div style={{display:"grid",gap:6}}>
            <label style={{fontWeight:800}}>Courier mode</label>
            <select name="courierMode" defaultValue={s.courierMode ?? "MANUAL"} style={{padding:12,borderRadius:12,border:"1px solid #eee"}}>
              <option value="MANUAL">Manual booking</option>
              <option value="COURIER_GUY">Courier Guy (if configured)</option>
            </select>
          </div>

          <button style={{padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",fontWeight:800}}>
            Save & Finish Setup ✅
          </button>

          {s.setupComplete ? <div style={{color:"#0a0",fontWeight:800}}>Setup complete ✅</div> : <div style={{color:"#a60"}}>Setup not completed yet.</div>}
        </form>

        <div style={{color:"#666",fontSize:12}}>Tip: you can re-run this wizard anytime to update settings.</div>
      </div>
    </AdminShell>
  );
}
