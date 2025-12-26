import { z } from "zod";
export { correlationId } from "./logging";

export const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT_API: z.coerce.number().default(4000),
  NEXT_PUBLIC_API_URL: z.string().default("http://localhost:4000"),
  ADMIN_API_KEY: z.string().min(8),
  DATABASE_URL: z.string().min(1),
  MEDIA_STORAGE_DIR: z.string().default("/data/media"),
  STORE_LINK: z.string().default("http://localhost:3000"),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  BRAND_SIGNOFF: z.string().default("With love, Chain Chik 💛"),
  MSG_ORDER_RECEIVED: z.string().default("Thanks! {{order_id}}"),
  MSG_POP_RECEIVED: z.string().default("POP received {{order_id}}"),
  MSG_PAYMENT_CONFIRMED: z.string().default("Payment confirmed {{order_id}}"),
  MSG_COURIER_BOOKED: z.string().default("Booked! Tracking {{tracking}}"),
  MSG_ORDER_STATUS_LINK: z.string().default("Status link {{link}}"),
  MSG_ORDER_COLLECTED: z.string().default("Collected {{tracking}}"),
  MSG_ORDER_DELIVERED: z.string().default("Delivered"),
  MSG_POP_REJECTED: z.string().default("Please resend POP {{order_id}}"),
  MSG_ORDER_COLLECTED: z.string().default("Collected {{tracking}}"),
  MSG_ORDER_DELIVERED: z.string().default("Delivered"),
  MSG_SOLD_OUT: z.string().default("Sold out: {{product_name}}"),
  LOW_STOCK_THRESHOLD_DEFAULT: z.coerce.number().default(3),
  ADMIN_ALERT_PHONE: z.string().optional(),
  MSG_LOW_STOCK_ADMIN: z.string().default("Low stock {{sku}} {{stock}}"),
  MSG_BACK_IN_STOCK: z.string().default("Back in stock {{name}} {{STORE_LINK}}"),
  ENABLE_WHATSAPP_SEND: z.string().default("true"),

  // AI Assist (optional)
  AI_ENABLED: z.string().default('false'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  AI_MAX_HISTORY_MESSAGES: z.coerce.number().default(12),

  // Meta webhooks (optional)
  META_VERIFY_TOKEN: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),

  // Admin UI password lock
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().optional(),
  ADMIN_SESSION_TTL_HOURS: z.coerce.number().default(8),

  // Meta outbound (optional)
  META_PAGE_ACCESS_TOKEN: z.string().optional(),
  META_PAGE_ID: z.string().optional(),
  IG_BUSINESS_ID: z.string().optional(),
  META_OUTBOUND_ENABLED: z.string().default('false'),

  // Automations
  ABANDONED_CART_ENABLED: z.string().default('true'),
  ABANDONED_CART_AFTER_MIN: z.coerce.number().default(60),
  ABANDONED_CART_REMINDER_COOLDOWN_MIN: z.coerce.number().default(1440),
  ORDER_STATUS_AUTO_MESSAGES: z.string().default('true'),

  // Inventory reservations
  RESERVATION_ENABLED: z.string().default('true'),
  RESERVATION_TTL_MIN: z.coerce.number().default(30),

  // Payment webhooks (optional)
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  // PayFast
  PAYFAST_ENABLED: z.string().default('false'),
  PAYFAST_MODE: z.string().default('sandbox'),
  PAYFAST_MERCHANT_ID: z.string().optional(),
  PAYFAST_MERCHANT_KEY: z.string().optional(),
  PAYFAST_PASSPHRASE: z.string().optional(),
  PAYFAST_PROCESS_URL: z.string().optional(),
  PAYFAST_VALIDATE_URL: z.string().default('https://api.payfast.co.za/eng/query/validate'),
  PAYFAST_RETURN_URL: z.string().optional(),
  PAYFAST_CANCEL_URL: z.string().optional(),
  PAYFAST_NOTIFY_URL: z.string().optional(),

  // Product auto-tagging
  PRODUCT_TAGGING_ENABLED: z.string().default('true'),

  // API hardening
  API_BODY_LIMIT: z.coerce.number().default(1048576),
  API_RATE_LIMIT_ENABLED: z.string().default('true'),
  API_RATE_LIMIT_MAX: z.coerce.number().default(120),
  API_RATE_LIMIT_TIME_WINDOW_SEC: z.coerce.number().default(60),

  // File storage
  FILE_STORAGE_DRIVER: z.string().default('local'),
  FILE_STORAGE_PUBLIC_BASE_URL: z.string().optional(),
  FILE_STORAGE_LOCAL_DIR: z.string().default('/data/uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),

  // Alerts
  ADMIN_ALERT_PHONE: z.string().optional(),
  LOW_STOCK_ALERTS_ENABLED: z.string().default('true'),

  // Optional bundle pricing
  PRICING_ANY_1_CENTS: z.coerce.number().optional(),
  PRICING_ANY_2_CENTS: z.coerce.number().optional(),
  PRICING_ANY_3_CENTS: z.coerce.number().optional(),
  PRICING_BUNDLE_APPLIES_TO_COLLECTION_SLUG: z.string().default('all'),

  // Courier Guy (PUDO API) optional
  COURIER_GUY_BASE_URL: z.string().default("https://api-pudo.co.za"),
  COURIER_GUY_API_KEY: z.string().optional(),
  COURIER_GUY_COLLECTION_ADDRESS_JSON: z.string().optional(),
  COURIER_GUY_COLLECTION_CONTACT_JSON: z.string().optional(),
  COURIER_GUY_PARCEL_LENGTH_CM: z.coerce.number().default(40),
  COURIER_GUY_PARCEL_WIDTH_CM: z.coerce.number().default(30),
  COURIER_GUY_PARCEL_HEIGHT_CM: z.coerce.number().default(8),
  COURIER_GUY_PARCEL_WEIGHT_KG: z.coerce.number().default(1)
});
export type Env = z.infer<typeof EnvSchema>;
export function loadEnv(input: Record<string, string | undefined>): Env {
  const parsed = EnvSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  return parsed.data;
}
export function tmpl(template: string, vars: Record<string,string>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, k) => vars[String(k).trim()] ?? "");
}
export function boolFromEnv(v: string | undefined, def=false) {
  if (v === undefined) return def;
  return ["1","true","yes","on"].includes(v.toLowerCase());
}
