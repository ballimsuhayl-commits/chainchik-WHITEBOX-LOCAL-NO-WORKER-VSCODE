# Security checklist
- Set a strong ADMIN_API_KEY
- Use HTTPS in production
- Enable webhook signature verification (META_APP_SECRET / YOCO_WEBHOOK_SECRET)
- Rate limiting + body limits are enabled in API
- Media path traversal is blocked

## Request IDs
Every request gets an `x-request-id` header for debugging.
