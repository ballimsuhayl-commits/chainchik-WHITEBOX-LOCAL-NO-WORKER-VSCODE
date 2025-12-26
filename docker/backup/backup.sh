#!/usr/bin/env bash
set -euo pipefail
TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p /backups
pg_dump "${DATABASE_URL}" | gzip > "/backups/db-${TS}.sql.gz"
echo "Backup written: /backups/db-${TS}.sql.gz"
