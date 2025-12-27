"use client";

import { useState } from "react";

type SuggestResult = {
  suggestedReply: string;
  intent: string;
  extracted: any;
  riskFlags: string[];
  conversationId: string;
};

export default function AiInboxClient({ suggest, send }: { 
  suggest: (fd: FormData) => Promise<SuggestResult>;
  send: (fd: FormData) => Promise<{ ok: boolean }>;
}) {
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  return (
    <div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>AI Assist Inbox</h1>
      <div style={{color:"#666"}}>Paste the customer message, get a suggested reply, then send when you’re happy ✨</div>

      <form action={async (fd)=>{ 
        setErr(null);
        try { setResult(await suggest(fd)); } catch (e:any) { setErr(String(e?.message ?? e)); }
      }} style={{display:"grid",gap:10,border:"1px solid #eee",borderRadius:14,padding:12}}>
        <div style={{display:"grid",gap:6}}>
          <label style={{fontWeight:800}}>Customer phone</label>
          <input name="phone" placeholder="+27..." style={{padding:10,borderRadius:10,border:"1px solid #ddd"}} required />
        </div>
        <div style={{display:"grid",gap:6}}>
          <label style={{fontWeight:800}}>Customer message</label>
          <textarea name="message" placeholder="Hi, is this still available?" rows={4} style={{padding:10,borderRadius:10,border:"1px solid #ddd"}} required />
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <button style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>Suggest reply ✨</button>
          <span style={{color:"#666",fontSize:12}}>AI never confirms payments or books courier.</span>
        </div>
      </form>

      {err && <div style={{border:"1px solid #f3c",borderRadius:12,padding:12}}>⚠️ {err}</div>}

      {result && (
        <div style={{display:"grid",gap:12}}>
          <div style={{display:"grid",gap:8,border:"1px solid #eee",borderRadius:14,padding:12}}>
            <div style={{fontWeight:900}}>Suggested reply</div>
            <textarea defaultValue={result.suggestedReply} name="replyText" id="replyText" rows={5} style={{padding:10,borderRadius:10,border:"1px solid #ddd"}} />
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <form action={async (fd)=>{ 
                setSending(true); setErr(null);
                try { 
                  // copy edited text into formData
                  const textArea = document.getElementById("replyText") as HTMLTextAreaElement | null;
                  const text = textArea?.value ?? result.suggestedReply;
                  const f = new FormData();
                  f.set("phone", (document.querySelector('input[name="phone"]') as HTMLInputElement)?.value ?? "");
                  f.set("text", text);
                  await send(f);
                  setSending(false);
                } catch (e:any) { setSending(false); setErr(String(e?.message ?? e)); }
              }}>
                <button disabled={sending} style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>
                  {sending ? "Sending..." : "Send on WhatsApp ✅"}
                </button>
              </form>
              <div style={{color:"#666",fontSize:12}}>Intent: <b>{result.intent}</b></div>
            </div>
          </div>

          <div style={{display:"grid",gap:8,border:"1px solid #eee",borderRadius:14,padding:12}}>
            <div style={{fontWeight:900}}>Extracted info (for your records)</div>
            <pre style={{margin:0,whiteSpace:"pre-wrap"}}>{JSON.stringify(result.extracted, null, 2)}</pre>
            {result.riskFlags?.length ? (
              <div style={{marginTop:6}}>
                <div style={{fontWeight:900}}>Risk flags</div>
                <ul style={{margin:0,paddingLeft:18}}>
                  {result.riskFlags.map((r)=> <li key={r}>{r}</li>)}
                </ul>
              </div>
            ) : <div style={{color:"#666"}}>No risk flags ✅</div>}
          </div>
        </div>
      )}
    </div>
  );
}
