# Why the Worker is disabled in Simple Local Mode

The full stack includes a background worker for automation tasks (sending messages, processing webhooks, etc).

On some Windows setups, TypeScript compilation in the worker can fail due to strict type settings and missing
type packages. This **does not stop you from testing**:

- Storefront
- Admin
- Products + Stock (Sold out)
- Cart + Orders
- Payment proof upload (basic)
- Order status changes

So the simplest local mode starts only:
- `db`, `api`, `web`

When you're ready for full automation, we can re-enable the worker after tightening the types and adding tests.
