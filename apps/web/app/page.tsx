"use client";
import { useEffect, useMemo, useState } from "react";

type Product = { sku:string; name:string; priceCents:number; stockQty:number; lowStockThreshold:number; badge?:string|null; primaryImageUrl?:string|null; };
type Catalog = { collections: Array<{slug:string; name:string}>; grouped: Record<string, {collection:{slug:string;name:string}; products: Product[]}>; };
type CartItem = Product & { qty:number };

const money = (c:number)=>`R${(c/100).toFixed(0)}`;

export default function Page(){
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Chain Chik";
  const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER ?? "27727240134";

  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [tab,setTab]=useState("all");
  const [q,setQ]=useState("");
  const [cart,setCart]=useState<Record<string, CartItem>>({});
  const [modal,setModal]=useState<Product|null>(null);
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [addressText,setAddressText]=useState("");
  const [err,setErr]=useState<string|null>(null);
  const [orderId,setOrderId]=useState<string|null>(null);

  useEffect(()=>{
  const u = new URL(window.location.href);
  const rc = u.searchParams.get('resumeCart');
  if (rc) {
    fetch(`${api}/v1/cart-sessions/${rc}`).then(r=>r.json()).then(d=>{
      const items = d.cart?.items ?? [];
      // map into cart format used by app
      setCart(items.map((it:any)=>({ sku: it.sku, variantKey: it.variantKey ?? null, qty: it.qty })));
    }).catch(()=>{});
  }
 (async()=>{
    const res = await fetch(`${apiUrl}/v1/catalog`, {cache:"no-store"});
    const data = await res.json();
    setCatalog(data);
  })().catch(()=>setErr("Sorry — the shop couldn’t load right now 🌷")); },[apiUrl]);

  const tabs = useMemo(()=>[{slug:"all",name:"ALL"}, ...(catalog?.collections??[])], [catalog]);

  const products = useMemo(()=>{
    if(!catalog) return [] as Product[];
    const groups=catalog.grouped??{};
    let list:Product[]=[];
    if(tab==="all"){
      const seen=new Set<string>();
      for(const slug of Object.keys(groups)){
        for(const p of (groups[slug]?.products??[])){
          if(seen.has(p.sku)) continue;
          seen.add(p.sku); list.push(p);
        }
      }
    } else list = groups[tab]?.products ?? [];
    const s=q.trim().toLowerCase();
    if(!s) return list;
    return list.filter(p=>`${p.name} ${p.sku}`.toLowerCase().includes(s));
  },[catalog,tab,q]);

  const cartItems = useMemo(()=>Object.values(cart).filter(i=>i.qty>0),[cart]);
  const cartCount = useMemo(()=>cartItems.reduce((s,i)=>s+i.qty,0),[cartItems]);
  const totalCents = useMemo(()=>cartItems.reduce((s,i)=>s+i.qty*i.priceCents,0),[cartItems]);

  function add(p:Product, qty=1){
    if(p.stockQty===0) return alert("This item is sold out 🌷");
    setCart(prev=>{
      const cur = prev[p.sku] ?? {...p, qty:0};
      const nextQty = Math.min(cur.qty+qty, p.stockQty);
      return {...prev, [p.sku]: {...cur, qty: nextQty}};
    });
  }
  function setQty(p:Product, qty:number){
    setCart(prev=>{
      const cur = prev[p.sku] ?? {...p, qty:0};
      const nextQty = Math.max(0, Math.min(qty, p.stockQty));
      return {...prev, [p.sku]: {...cur, qty: nextQty}};
    });
  }

  function waMessage(){
    const lines:string[]=[];
    lines.push(`Hi! 😊 I’d like to place an order from ${brand}:`);
    lines.push("");
    for(const it of cartItems) lines.push(`• ${it.name} (${it.sku}) ×${it.qty} — ${money(it.qty*it.priceCents)}`);
    lines.push("");
    lines.push(`Total: ${money(totalCents)}`);
    lines.push("");
    lines.push("Thank you! 🌿");
    return lines.join("\n");
  }

  async function checkout(){
    setErr(null); setOrderId(null);
    if(!name || phone.length<6) return setErr("Please enter your name and WhatsApp number 💛");
    if(cartItems.length===0) return setErr("Add at least one item to your cart ✨");

    const res = await fetch(`${apiUrl}/v1/orders`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        customer:{name, phone},
        deliveryEnteredText: addressText || null,
        items: cartItems.map(it=>({sku:it.sku, name:it.name, qty:it.qty, unitCents:it.priceCents})),
        currency:"ZAR", notes:""
      })
    });
    if(!res.ok){ setErr(await res.text()); return; }
    const data = await res.json();
    setOrderId(data.orderId);

    const text = encodeURIComponent(waMessage());
    window.open(`https://wa.me/${waNumber}?text=${text}`,"_blank","noopener,noreferrer");
  }

  return (
    <div style={{display:"grid", gap:14}}>
      <div style={{background:"#0f0f10",color:accent,padding:10,borderRadius:12,fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",textAlign:"center"}}>
        Any 1 piece R249 • Any 2 pieces R349 • Any 3 items R499
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontWeight:900,letterSpacing:"0.28em"}}>{brand.toUpperCase()}</div>
        <div style={{fontWeight:900,color:"#555"}}>🛍️ {cartCount}</div>
      </div>

      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,fontFamily:'ui-serif, Georgia, "Times New Roman", Times, serif'}}>The Collection</div>
      </div>

      <div style={{display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
        {tabs.map(t=>(
          <button key={t.slug} onClick={()=>setTab(t.slug)} style={{
            border:"none",background:"transparent",padding:"10px 4px",fontWeight:900,letterSpacing:"0.20em",textTransform:"uppercase",
            fontSize:11,cursor:"pointer",color:tab===t.slug?"#111":"rgba(17,17,20,.55)",borderBottom:tab===t.slug?"2px solid #111":"2px solid transparent"
          }}>{t.name}</button>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:"1px solid rgba(15,15,16,0.10)",borderRadius:10,background:"rgba(255,255,255,0.85)",minWidth:320}}>
          <span>🔎</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search the collection…" style={{border:"none",outline:"none",background:"transparent",width:"100%"}}/>
        </div>
      </div>

      <div style={{border:"1px solid rgba(15,15,16,0.10)",borderRadius:16,background:"rgba(255,255,255,0.78)",padding:16}}>
        <div style={{fontWeight:900}}>Your details</div>
        <div style={{color:"#666",fontSize:13,marginTop:4}}>We’ll use this to send your order summary on WhatsApp.</div>
        <div style={{display:"grid",gap:8,marginTop:10}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{padding:10,borderRadius:10,border:"1px solid rgba(15,15,16,0.14)"}}/>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="WhatsApp number (e.g. 27...)" style={{padding:10,borderRadius:10,border:"1px solid rgba(15,15,16,0.14)"}}/>
          <textarea value={addressText} onChange={e=>setAddressText(e.target.value)} placeholder="Delivery address (optional — you can also WhatsApp: ADDRESS: your full address)" rows={3} style={{padding:10,borderRadius:10,border:"1px solid rgba(15,15,16,0.14)"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
          <div style={{fontWeight:900}}>Total: {money(totalCents)}</div>
          <button onClick={checkout} style={{padding:"12px 14px",borderRadius:14,border:"1px solid #0f0f10",background:"#0f0f10",color:accent,fontWeight:900,cursor:"pointer"}}>
            Proceed to WhatsApp 💬
          </button>
        </div>
        {err && <div style={{marginTop:10,color:"#b91c1c",fontWeight:800}}>{err}</div>}
        {orderId && <div style={{marginTop:10,color:"#166534",fontWeight:800}}>Order created ✅ {orderId}</div>
{process.env.NEXT_PUBLIC_PAYFAST_ENABLED==='true' && (<a href={`/pay/payfast/${orderId}`} style={{textDecoration:'none',padding:12,borderRadius:12,border:'1px solid #111',background:'#111',color:'#fff',textAlign:'center'}}>Pay securely with PayFast</a>)}}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4, minmax(0, 1fr))",gap:14}}>
        {products.map(p=>{
          const soldOut = p.stockQty===0;
          const lowStock = !soldOut && p.stockQty<=p.lowStockThreshold;
          const qty = cart[p.sku]?.qty ?? 0;
          return (
            <div key={p.sku} style={{border:"1px solid rgba(15,15,16,0.06)",borderRadius:14,background:"rgba(255,255,255,0.80)",overflow:"hidden"}}>
              <div onClick={()=>setModal(p)} style={{position:"relative",aspectRatio:"4/5",background:"rgba(15,15,16,0.03)",cursor:"pointer"}}>
                {p.badge && <div style={{position:"absolute",top:10,left:10,background:"rgba(15,15,16,0.88)",color:accent,fontSize:11,fontWeight:900,letterSpacing:"0.16em",padding:"6px 10px",borderRadius:999,textTransform:"uppercase"}}>{p.badge}</div>}
                {p.primaryImageUrl
                  ? <img src={p.primaryImageUrl} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                  : <div style={{padding:14,color:"rgba(17,17,20,.35)",fontWeight:800}}>Image coming soon</div>}
              </div>
              <div style={{padding:12,display:"grid",gap:6}}>
                <div style={{fontWeight:900}}>{p.name}</div>
                <div style={{color:"#666",fontSize:13}}>{money(p.priceCents)} {soldOut?" • Sold out":lowStock?` • Only ${p.stockQty} left`:""}</div>

                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <button onClick={()=>add(p,1)} disabled={soldOut} style={{padding:"8px 10px",borderRadius:12,border:"1px solid rgba(15,15,16,0.14)",background:"rgba(255,255,255,0.85)",cursor:soldOut?"not-allowed":"pointer",fontWeight:800}}>Add</button>
                  <input type="number" min={0} max={soldOut?0:p.stockQty} value={qty} disabled={soldOut}
                    onChange={e=>setQty(p, Number(e.target.value))}
                    style={{width:84,height:38,padding:"0 10px",borderRadius:12,border:"1px solid rgba(15,15,16,0.14)",background:soldOut?"rgba(15,15,16,0.03)":"rgba(255,255,255,0.85)"}}/>

                  {soldOut && <button onClick={async()=>{
                    if(!phone) return alert("Please enter your WhatsApp number first 😊");
                    await fetch(`${apiUrl}/v1/stock/subscribe`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sku:p.sku, phone})});
                    alert("You’re on the list ✅ We’ll message you as soon as it’s back!");
                  }} style={{padding:"8px 10px",borderRadius:12,border:"1px solid rgba(15,15,16,0.14)",background:"rgba(255,255,255,0.85)",cursor:"pointer",fontWeight:800}}>Notify me ✨</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(15,15,16,0.45)",backdropFilter:"blur(2px)",zIndex:1000}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,maxWidth:900,margin:"6vh auto",padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:900,fontSize:16}}>{modal.name}</div>
              <button onClick={()=>setModal(null)} style={{fontSize:28,background:"none",border:"none",cursor:"pointer"}}>×</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginTop:12}}>
              <div style={{borderRadius:14,overflow:"hidden",background:"rgba(15,15,16,0.03)"}}>
                {modal.primaryImageUrl
                  ? <img src={modal.primaryImageUrl} alt={modal.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                  : <div style={{padding:14,color:"rgba(17,17,20,.35)",fontWeight:800}}>Image coming soon</div>}
              </div>
              <div>
                <div style={{fontWeight:900}}>{money(modal.priceCents)}</div>
                <div style={{color:"#666",marginTop:6}}>{modal.stockQty===0?"Sold out":modal.stockQty<=modal.lowStockThreshold?`Only ${modal.stockQty} left`:""}</div>
                <div style={{marginTop:14}}>
                  <label style={{fontWeight:800,fontSize:13}}>Quantity</label>
                  <input id="modalQty" type="number" min={1} max={modal.stockQty||1} defaultValue={1}
                    style={{display:"block",width:120,height:40,marginTop:6,padding:"0 10px",borderRadius:12,border:"1px solid rgba(15,15,16,0.14)"}}/>
                </div>
                <button onClick={()=>{ const el=document.getElementById("modalQty") as HTMLInputElement|null; const qty=el?Number(el.value):1; add(modal, Number.isFinite(qty)?qty:1); setModal(null); }}
                  disabled={modal.stockQty===0}
                  style={{marginTop:18,padding:12,borderRadius:14,border:"1px solid #0f0f10",background:"#0f0f10",color:accent,fontWeight:900,cursor:modal.stockQty===0?"not-allowed":"pointer"}}>
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
