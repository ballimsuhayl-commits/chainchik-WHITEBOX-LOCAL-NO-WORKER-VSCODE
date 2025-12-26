import { correlationId } from "@cc/shared";

export async function registerCorrelation(app: any) {
  app.addHook("onRequest", async (req: any, reply: any) => {
    const incoming = req.headers["x-correlation-id"];
    const cid = typeof incoming === "string" && incoming.length >= 8 ? incoming : correlationId();
    req.correlationId = cid;
    reply.header("x-correlation-id", cid);
  });
}
