"use client";

import { useEffect, useState } from "react";

type Conversation = { id: string; channel: string; customerPhone: string; updatedAt: string };
type Message = { id: string; role: string; text: string; createdAt: string; meta?: any };

export default function InboxClient({
  loadConversations,
  loadMessages,
  aiSuggest,
  sendMessage,
  markRead,
}: {
  loadConversations: (channel?: string) => Promise<{ conversations: Conversation[] }>;
  loadMessages: (id: string) => Promise<{ conversation: Conversation; messages: Message[] }>;
  aiSuggest: (id: string) => Promise<{ suggestedReply: string; intent: string; extracted: any; riskFlags: string[] }>;
  sendMessage: (id: string, text: string) => Promise<{ ok: boolean }>;
}) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [q, setQ] = useState('');
  const [intent, setIntent] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await loadConversations(intent, q);
        setConvs(r.conversations);
        if (r.conversations[0]?.id) setSelected(r.conversations[0].id);
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const r = await loadMessages(selected);
        markRead(selected).catch(()=>{});
        setMessages(r.messages);
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      }
    })();
  }, [selected]);

  return (
    <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:12}}>
      <div style={{border:"1px solid #eee",borderRadius:14,padding:12,display:"grid",gap:10,height:"calc(100vh - 140px)",overflow:"auto"}}>
        <div style={{fontWeight:900}}>Inbox</div>
        {convs.map(c=>(
          <button key={c.id} onClick={()=>setSelected(c.id)} style={{
            textAlign:"left",
            padding:10,
            borderRadius:12,
            border:"1px solid #eee",
            background: selected===c.id ? "rgba(17,17,20,0.04)" : "#fff"
          }}>
            <div style={{fontWeight:800}}>{c.customerPhone}</div>
            <div style={{color:"#666",fontSize:12}}>{c.channel} • {c.updatedAt}</div>
          </button>
        ))}
        {convs.length===0 && <div style={{color:"#666"}}>No messages yet.</div>}
      </div>

      <div style={{display:"grid",gap:12}}>
        <div style={{border:"1px solid #eee",borderRadius:14,padding:12,height:"calc(100vh - 260px)",overflow:"auto"}}>
          {messages.map(m=>(
            <div key={m.id} style={{display:"flex",justifyContent:m.role==="customer"?"flex-start":"flex-end",marginBottom:10}}>
              <div style={{
                maxWidth: "78%",
                padding:10,
                borderRadius:14,
                border:"1px solid #eee",
                background: m.role==="customer" ? "#fff" : "rgba(17,17,20,0.04)"
              }}>
                <div style={{fontSize:12,color:"#666",marginBottom:4}}>{m.role}</div>
                <div style={{whiteSpace:"pre-wrap"}}>{m.text}</div>
              </div>
            </div>
          ))}
        </div>

        {err && <div style={{border:"1px solid #f3c",borderRadius:12,padding:12}}>⚠️ {err}</div>}

        <div style={{border:"1px solid #eee",borderRadius:14,padding:12,display:"grid",gap:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={async()=>{ if(!selected) return; setErr(null); try{ const r=await aiSuggest(selected); setDraft(r.suggestedReply);}catch(e:any){setErr(String(e?.message??e));}}}
              style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>
              AI Suggest ✨
            </button>
            <div style={{color:"#666",fontSize:12,alignSelf:"center"}}>AI suggests. You approve.</div>
          </div>

          <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={4} placeholder="Write your reply..."
            style={{padding:10,borderRadius:10,border:"1px solid #ddd"}} />

          <button onClick={async()=>{ if(!selected) return; setErr(null); try{ await sendMessage(selected, draft); setDraft(""); const r=await loadMessages(selected);
        markRead(selected).catch(()=>{}); setMessages(r.messages);}catch(e:any){setErr(String(e?.message??e));}}}
            style={{padding:10,borderRadius:10,border:"1px solid #111",background:"#111",color:"#fff"}}>
            Send ✅
          </button>
        </div>
      </div>
    </div>
  );
}
