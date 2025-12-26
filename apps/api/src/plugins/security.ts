import rateLimit from "@fastify/rate-limit";

export async function registerSecurity(app: any) {
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  app.addContentTypeParser("application/json", { bodyLimit: 1024 * 1024 }, app.defaultJSONParser);
}
