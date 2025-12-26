# Architecture (Deterministic / No-Error)

## Services
- `apps/web`: storefront + admin (Basic Auth)
- `apps/api`: API + webhooks + admin endpoints
- `apps/worker`: background processor
- `packages/db`: migrations
- `packages/shared`: env validation + templating + correlation IDs

## Key guarantees
- No AI controls payments, courier, or status changes
- Orders use deterministic validation + state transitions
- Payment confirmation is admin-gated (or webhook-gated with verified signature)
- Inventory is decremented transactionally on payment confirmation only
- Full audit trail in `events` table
