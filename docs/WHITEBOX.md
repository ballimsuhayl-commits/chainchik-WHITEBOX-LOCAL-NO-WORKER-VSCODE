# White‑box / Clone for Any Business

This project is designed to be rebranded and deployed for any small business.

## What makes it "white‑box"
- **Branding + ops settings live in DB** (`app_settings`) via `/admin/setup`
- **Products + galleries** managed in Admin UI
- **Templates** are editable in Admin (polite/catchy messaging)
- **Portable infrastructure**: Docker + Postgres + optional MinIO
- **No vendor lock‑in**: S3-compatible storage, env-based secrets

## Clone Workflow (recommended)
You can spin up a new business instance in ~5 minutes.

### 1) Copy repo
```bash
cp -R chainchik my-new-business
cd my-new-business
```

### 2) Run the bootstrap script
```bash
bash scripts/whitebox/new-business.sh
```

It will:
- create `.env` from `.env.example` (if missing)
- generate strong random secrets
- ask for a new **ADMIN password**
- start Docker
- run DB migrations

### 3) Finish setup in the browser
- Visit: `http://localhost:3000/admin`
- Complete: `/admin/setup`
- Add products + images
- Test order flow

## Rebranding (no code)
- Business name + signoff: `/admin/setup`
- Templates: `/admin/templates`
- Products and images: `/admin/products`
- Tracking page is automatic

## Multi‑tenant note
This is intentionally **single-tenant per deployment** (simpler, safer).
To host multiple businesses, run multiple deployments (cheap VPS or Docker host).
