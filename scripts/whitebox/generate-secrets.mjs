#!/usr/bin/env node
import fs from "node:fs";

const envPath = ".env";
const raw = fs.readFileSync(envPath, "utf8");

function randBase64Url(bytes=32){
  const b = Buffer.from(Array.from({length: bytes}, () => Math.floor(Math.random()*256)));
  return b.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

const replacements = {
  JWT_SECRET: randBase64Url(48),
  ADMIN_SESSION_SECRET: randBase64Url(48),
  META_WEBHOOK_SECRET: randBase64Url(24),
  PAYFAST_ITN_PASSPHRASE: randBase64Url(16),
};

let out = raw;
for (const [k,v] of Object.entries(replacements)) {
  const re = new RegExp(`^${k}=.*$`, "m");
  if (re.test(out)) out = out.replace(re, `${k}=${v}`);
  else out += `\n${k}=${v}\n`;
}

fs.writeFileSync(envPath, out);
console.log("Updated .env with generated secrets:", Object.keys(replacements).join(", "));
