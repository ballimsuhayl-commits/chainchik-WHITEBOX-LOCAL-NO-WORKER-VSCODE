# Chain Chik — Complete free & portable commerce automation (monorepo)

## Includes
- Storefront (Next.js) with gallery + modal + cart + WhatsApp checkout
- Admin UI (Next.js /admin) for products, collections, orders, inventory, courier booking
- API (Fastify) with deterministic order + stock validation, webhook endpoints
- Worker for WhatsApp POP ingestion, low-stock alerts, back-in-stock notifications
- Postgres migrations + migrator
- Docker compose for portability
- CI workflow (GitHub Actions) + tests scaffolding

## Quickstart
```bash
cp .env.example .env
pnpm docker:up
pnpm db:migrate
```

Open:
- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin (user admin, pass ADMIN_API_KEY)

## Notes
- WhatsApp Cloud API is optional. If not configured, wa.me checkout still works.

## Courier Guy (quote + booking)
Configure in `.env`:
- COURIER_GUY_API_KEY
- COURIER_GUY_COLLECTION_ADDRESS_JSON
- COURIER_GUY_COLLECTION_CONTACT_JSON

## Delivery address capture
Customers can either:
- Enter delivery address on the website (optional field), or
- WhatsApp: `ADDRESS: <their full address>`
The worker stores this on the latest open order for that customer.

### One-click courier quote
If an order has a saved delivery address, Admin → Orders shows **“Quote using saved delivery ✨”**.

### One-click courier booking
If the order has a saved delivery address AND a quote, Admin → Orders shows **“Book using saved details ⚡”**.
Receiver contact is auto-filled from saved delivery contact or the order’s customer name/phone.

## Tracking messages
After courier booking, the API sends the customer a WhatsApp message using `MSG_COURIER_BOOKED` (if WhatsApp Cloud API is configured).


## Enhancements included
- Admin dashboard
- Order detail page + audit timeline
- POP reject flow + customer message
- CSV import/export products
- Product image upload
- Address suggestion helper endpoint
- Stock movement log + dead-letter jobs table


### Resend tracking
Admin order detail page includes **Resend tracking 💬** which sends the tracking template again (and uses dead-letter retries on failure).


## Customer status page
Customers can view status at `/status/<token>`.


## Backups
Run: `docker compose -f infra/docker-compose.yml run --rm cc-backup /scripts/backup.sh`


## Waitlist
Admin can notify subscribers at `/admin/waitlist`.


## Multi-user admin
Owner can manage users at `/admin/users`. API validates `x-admin-key` against `admin_users` (SHA-256 hashed). `ADMIN_API_KEY` still works as owner key.


## Variants
Manage variants at `/admin/variants`. Storefront shows a dropdown when variants exist. Orders store `variant_key` in `order_items`.


## Bulk actions
Use `/admin/bulk` for safe bulk actions (confirm payment, resend tracking).


## AI Assist Inbox (Gemini)
Enable with `AI_ENABLED=true` and set `GEMINI_API_KEY`. Open `/admin/ai` to get suggested replies and send via WhatsApp.


## Meta webhooks + Inbox
Webhook: `GET/POST /v1/webhooks/meta` (set `META_VERIFY_TOKEN` + `META_APP_SECRET`). Admin inbox at `/admin/inbox`.


## Admin password lock
Set `ADMIN_PASSWORD_HASH` in `.env` and visit `/admin/login`.

Generate a bcrypt hash locally:
```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash(process.argv[1], 12).then(h=>console.log(h));" "YOUR_PASSWORD"
```
Paste the output into `ADMIN_PASSWORD_HASH`.


## Admin sessions
Set `ADMIN_SESSION_SECRET` and `ADMIN_SESSION_TTL_HOURS` to protect /admin routes. Login sets a signed, expiring cookie.


## Meta outbound safety
Set `META_OUTBOUND_ENABLED=true` to allow FB/IG outbound replies from Inbox. Only **owner** role can send.


## Abandoned cart recovery
Storefront posts to `/v1/cart-sessions` when customer starts checkout. Worker sends a gentle reminder after `ABANDONED_CART_AFTER_MIN`.


## Templates
Manage templates at `/admin/templates`. Worker uses templates for abandoned cart and status auto-messages.


## Support tickets
Create/manage tickets at `/admin/support`.


## System dashboard
Health + recent system events at `/admin/system`.


## Deploy
See `docs/DEPLOYMENT.md` and `docker-compose.prod.yml`.


## White‑box / reuse for any business
See `docs/WHITEBOX.md` and `docs/NEW_INSTANCE_CHECKLIST.md`.


## Brand Kit
Upload a logo and set store colors at `/admin/brand`.


## Run locally (non-coder)
See `docs/LOCAL_RUN.md`.


## Easy deployment (non-coder)
See `docs/DEPLOY_EASY.md` (one command on a VPS, auto-HTTPS).


## VS Code one-click run
See `docs/VS_CODE_ONE_CLICK.md`.
