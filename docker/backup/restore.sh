#!/usr/bin/env bash
set -euo pipefail
FILE="${1:-}"
if [[ -z "$FILE" ]]; then
  echo "Usage: ./restore.sh <path-to-sql.gz>"
  exit 1
fi
gunzip -c "$FILE" | psql "${DATABASE_URL}"
echo "Restore complete"
