#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/whitebox/app"
cd "$APP_DIR"

echo "Pulling latest..."
git pull --rebase

echo "Rebuilding + restarting..."
docker compose -f docker-compose.deploy.yml up -d --build

echo "Migrating DB..."
docker compose -f docker-compose.deploy.yml exec -T api pnpm -C packages/db migrate

echo "✅ Updated."
