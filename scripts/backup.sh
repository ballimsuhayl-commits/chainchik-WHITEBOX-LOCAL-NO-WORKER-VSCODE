#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:=./backups}"

mkdir -p "$BACKUP_DIR"
ts="$(date +%Y%m%d-%H%M%S)"
file="$BACKUP_DIR/backup-$ts.sql.gz"

echo "Creating backup: $file"
pg_dump "$DATABASE_URL" | gzip > "$file"
echo "OK"
