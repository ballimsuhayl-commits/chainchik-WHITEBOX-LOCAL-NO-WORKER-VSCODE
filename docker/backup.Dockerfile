FROM alpine:3.20
RUN apk add --no-cache bash postgresql16-client coreutils gzip tzdata
WORKDIR /app
COPY scripts/backup.sh /app/backup.sh
RUN chmod +x /app/backup.sh
# Simple loop "cron": run every BACKUP_INTERVAL_HOURS
ENV BACKUP_INTERVAL_HOURS=24
CMD ["bash","-lc","while true; do /app/backup.sh; sleep $((BACKUP_INTERVAL_HOURS*3600)); done"]
