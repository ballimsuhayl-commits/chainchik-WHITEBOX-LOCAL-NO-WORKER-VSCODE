#!/usr/bin/env bash
set -euo pipefail

echo "✅ White-Box Easy VPS Installer (Ubuntu)"
echo

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (use: sudo -i)"
  exit 1
fi

read -rp "Domain (e.g. shop.example.com): " DOMAIN
if [[ -z "$DOMAIN" ]]; then
  echo "Domain is required."
  exit 1
fi

APP_DIR="/opt/whitebox/app"
REPO_URL="${REPO_URL:-}"

if [[ -z "$REPO_URL" ]]; then
  echo
  echo "Paste your GitHub repo URL (example: https://github.com/USER/REPO.git)"
  read -rp "Repo URL: " REPO_URL
fi

echo
echo "Installing prerequisites..."
apt-get update -y
apt-get install -y ca-certificates curl git ufw

# Docker
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
if ! command -v docker compose >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi

echo
echo "Firewall..."
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

echo
echo "Cloning repo..."
mkdir -p "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git pull --rebase
else
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo
echo "Creating .env..."
if [[ ! -f .env ]]; then
  cp .env.example .env
fi

# Generate secrets (simple base64url)
rand() { python3 - <<'PY'
import os,base64
b=os.urandom(48)
print(base64.urlsafe_b64encode(b).decode().rstrip('='))
PY
}
set_kv() {
  local k="$1"; local v="$2"
  if grep -q "^${k}=" .env; then
    sed -i "s#^${k}=.*#${k}=${v}#g" .env
  else
    echo "${k}=${v}" >> .env
  fi
}
set_kv JWT_SECRET "$(rand)"
set_kv ADMIN_SESSION_SECRET "$(rand)"
set_kv META_WEBHOOK_SECRET "$(python3 - <<'PY'
import os,base64
print(base64.urlsafe_b64encode(os.urandom(24)).decode().rstrip('='))
PY
)"
set_kv PAYFAST_ITN_PASSPHRASE "$(python3 - <<'PY'
import os,base64
print(base64.urlsafe_b64encode(os.urandom(12)).decode().rstrip('='))
PY
)"

echo
read -rsp "Set ADMIN password (will be hashed): " ADMIN_PW
echo
ADMIN_HASH="$(python3 - <<PY
import hashlib
print(hashlib.sha256(${ADMIN_PW@Q}.encode()).hexdigest())
PY
)"
set_kv ADMIN_PASSWORD_HASH "$ADMIN_HASH"

# Set public URLs
set_kv NEXT_PUBLIC_API_URL "https://${DOMAIN}"
set_kv PUBLIC_BASE_URL "https://${DOMAIN}"

# Caddyfile: replace DOMAIN token
mkdir -p infra
if [[ -f infra/Caddyfile ]]; then
  sed -i "s/^DOMAIN /${DOMAIN} /" infra/Caddyfile || true
  # if it still contains DOMAIN { ... } line
  sed -i "s/^DOMAIN\\s*{/${DOMAIN} {/" infra/Caddyfile || true
fi

echo
echo "Starting stack (HTTPS auto)..."
docker compose -f docker-compose.deploy.yml up -d --build

echo
echo "Running DB migrations..."
docker compose -f docker-compose.deploy.yml exec -T api pnpm -C packages/db migrate

echo
echo "✅ Done!"
echo "Open: https://${DOMAIN}"
echo "Admin: https://${DOMAIN}/admin"
