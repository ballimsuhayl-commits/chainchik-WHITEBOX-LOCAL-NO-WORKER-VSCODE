#!/usr/bin/env bash
set -euo pipefail

echo "✅ ChainChik White‑Box Bootstrap"
echo

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f ".env" ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo
echo "Generating strong secrets (no hardcoded secrets)..."
pnpm -s node scripts/whitebox/generate-secrets.mjs

echo
read -r -p "Set ADMIN password (will be hashed locally): " ADMIN_PW
export ADMIN_PW

pnpm -s node scripts/whitebox/set-admin-password.mjs

echo
echo "Starting Docker stack..."
docker compose -f docker-compose.prod.yml up -d --build

echo
echo "Running DB migrations..."
docker compose -f docker-compose.prod.yml exec -T api pnpm -C packages/db migrate

echo
echo "✅ Done."
echo "Next:"
echo "1) Open http://localhost:3000/admin"
echo "2) Complete /admin/setup"
echo "3) Add products in /admin/products"
