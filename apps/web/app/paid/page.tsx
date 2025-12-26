export default function Paid() {
  return (
    <div style={{maxWidth:520,margin:"60px auto",display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Payment received ✅</h1>
      <div style={{color:"#666"}}>Thank you! If you don’t see a WhatsApp confirmation within a few minutes, message us and we’ll sort it out quickly.</div>
      <a href="/" style={{textDecoration:"none",padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",textAlign:"center"}}>Back to store</a>
    </div>
  );
}
