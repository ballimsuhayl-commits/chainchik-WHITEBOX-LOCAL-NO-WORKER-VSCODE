import crypto from "node:crypto";
export function correlationId() { return crypto.randomUUID(); }
