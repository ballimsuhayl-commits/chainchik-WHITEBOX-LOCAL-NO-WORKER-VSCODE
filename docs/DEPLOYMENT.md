# Deployment

## Docker (recommended)
```bash
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api pnpm -C packages/db migrate
```

## Webhooks
- Meta webhook: `/v1/webhooks/meta`
- PayFast ITN: `/v1/webhooks/payfast/itn`

## Notes
- Set `NEXT_PUBLIC_API_URL` for web.
- Keep `ADMIN_API_KEY` server-side only.


## Setup Wizard
After first deploy, login to `/admin` and complete `/admin/setup`.
