import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  prompt: string;
  system?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
};

function jsonErr(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("Missing GEMINI_API_KEY on server.", 500);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonErr("Invalid JSON body.");
  }

  const prompt = (body.prompt || "").trim();
  if (!prompt) return jsonErr("prompt is required.");
  if (prompt.length > 12000) return jsonErr("prompt too long.");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const temperature = typeof body.temperature === "number" ? Math.min(Math.max(body.temperature, 0), 2) : 0.6;
  const topP = typeof body.topP === "number" ? Math.min(Math.max(body.topP, 0), 1) : 0.9;
  const maxOutputTokens = typeof body.maxOutputTokens === "number" ? Math.min(Math.max(body.maxOutputTokens, 32), 2048) : 512;

  const system = (body.system || "").trim();
  const text = system ? `SYSTEM:
${system}

USER:
${prompt}` : prompt;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: { temperature, topP, maxOutputTokens },
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }, 20000);
  } catch (e: any) {
    return jsonErr(`Gemini request failed: ${e?.message || "unknown"}`, 502);
  }

  const raw = await res.text();
  if (!res.ok) {
    return NextResponse.json({ ok: false, status: res.status, error: "Gemini error", details: raw.slice(0, 2000) }, { status: 502 });
  }

  try {
    const data = JSON.parse(raw) as any;
    const out = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") || "";
    return NextResponse.json({ ok: true, text: out, usage: data?.usageMetadata ?? null }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true, raw }, { status: 200 });
  }
}
