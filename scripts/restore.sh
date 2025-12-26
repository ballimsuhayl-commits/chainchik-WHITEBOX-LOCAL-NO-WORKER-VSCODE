#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
file="${1:-}"
if [[ -z "$file" ]]; then
  echo "Usage: scripts/restore.sh backups/backup-YYYYMMDD-HHMMSS.sql.gz"
  exit 1
fi
if [[ ! -f "$file" ]]; then
  echo "File not found: $file"
  exit 1
fi

echo "RESTORE WARNING: This will overwrite current DB data."
echo "Press Ctrl+C to cancel. Waiting 10 seconds..."
sleep 10

gunzip -c "$file" | psql "$DATABASE_URL"
echo "OK"
