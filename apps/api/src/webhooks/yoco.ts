import crypto from "node:crypto";

export function verifyYocoSignature(raw: Buffer, signature: string, secret: string) {
  const hmac = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}
