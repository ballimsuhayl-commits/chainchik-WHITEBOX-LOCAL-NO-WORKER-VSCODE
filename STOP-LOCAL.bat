@echo off
setlocal
echo 🛑 Stopping White-Box local stack...
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.deploy.yml down
pause
