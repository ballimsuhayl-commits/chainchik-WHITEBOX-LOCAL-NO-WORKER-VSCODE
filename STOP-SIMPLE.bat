@echo off
setlocal
echo 🛑 Stopping White-Box (SIMPLE MODE - NO WORKER)...
docker compose -f docker-compose.simple.noworker.yml down
pause
