# Runbook

## Start / stop
```bash
pnpm docker:up
pnpm docker:down
```

## Admin
- `/admin` uses Basic Auth
- user: `admin`
- pass: `ADMIN_API_KEY`

## Migrations
```bash
pnpm db:migrate
```

## Webhooks
- Meta verify+receive: `/webhooks/meta`
- Yoco receive: `/webhooks/yoco`

## Backups
See `scripts/backup.sh`


## Docker backup service
Backups run in `docker-compose.prod.yml` via the `backup` service, stored in the `backups_data` volume.

Manual backup:
```bash
docker compose -f docker-compose.prod.yml exec backup /app/backup.sh
```
List backups:
```bash
docker compose -f docker-compose.prod.yml exec backup ls -lh /backups
```
Restore (dangerous):
```bash
docker compose -f docker-compose.prod.yml exec api bash -lc "scripts/restore.sh /backups/<file>.sql.gz"
```
