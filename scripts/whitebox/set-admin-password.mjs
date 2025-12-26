#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const pw = process.env.ADMIN_PW;
if (!pw) {
  console.error("ADMIN_PW env missing");
  process.exit(1);
}

const hash = crypto.createHash("sha256").update(pw).digest("hex");

const envPath = ".env";
let raw = fs.readFileSync(envPath, "utf8");

const key = "ADMIN_PASSWORD_HASH";
const line = `${key}=${hash}`;
const re = new RegExp(`^${key}=.*$`, "m");
if (re.test(raw)) raw = raw.replace(re, line);
else raw += `\n${line}\n`;

fs.writeFileSync(envPath, raw);
console.log("Set ADMIN_PASSWORD_HASH in .env (sha256).");
