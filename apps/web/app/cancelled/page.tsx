export default function Cancelled() {
  return (
    <div style={{maxWidth:520,margin:"60px auto",display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Payment cancelled</h1>
      <div style={{color:"#666"}}>No stress 😊 You can try again whenever you’re ready.</div>
      <a href="/" style={{textDecoration:"none",padding:12,borderRadius:12,border:"1px solid #111",background:"#111",color:"#fff",textAlign:"center"}}>Back to store</a>
    </div>
  );
}
