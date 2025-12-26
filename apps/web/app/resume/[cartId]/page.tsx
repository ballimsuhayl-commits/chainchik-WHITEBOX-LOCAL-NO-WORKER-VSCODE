export default async function Resume({ params }: { params: { cartId: string }}) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${api}/v1/cart-sessions/${encodeURIComponent(params.cartId)}`, { cache: "no-store" });
  if (!res.ok) return <div style={{maxWidth:520,margin:"60px auto"}}>Cart not found.</div>;
  const data = await res.json();
  return (
    <div style={{maxWidth:520,margin:"60px auto",display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Finish your order</h1>
      <div style={{color:"#666"}}>Your cart is saved — you’re one step away ✨</div>
      <a href={`/?resumeCart=${encodeURIComponent(params.cartId)}`} style={{textDecoration:"none",padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",textAlign:"center"}}>Open cart</a>
    </div>
  );
}
