import { NextRequest, NextResponse } from "next/server";

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [b64payload, sig] = parts;

  let payloadJson = "";
  try {
    payloadJson = decodeURIComponent(escape(atob(b64payload.replace(/-/g,'+').replace(/_/g,'/'))));
  } catch {
    return false;
  }

  let payload: any;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return false;
  }

  if (!payload?.exp || typeof payload.exp !== "number") return false;
  if (Date.now() > payload.exp) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      Uint8Array.from(atob(sig.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)),
      enc.encode(payloadJson)
    );
    return ok;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/logout")) // Setup gate: if not completed, force /admin/setup
if (!pathname.startsWith("/admin/setup")) {
  try {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const r = await fetch(`${api}/v1/public/settings`, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      const done = Boolean(j.settings?.setupComplete);
      if (!done) return NextResponse.redirect(new URL("/admin/setup", req.url));
    }
  } catch {}
}

  return NextResponse.next();

  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("cc_admin")?.value ?? "";
    const secret = process.env.ADMIN_SESSION_SECRET ?? "";
    if (!token || !secret) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const ok = await verifyToken(token, secret);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
