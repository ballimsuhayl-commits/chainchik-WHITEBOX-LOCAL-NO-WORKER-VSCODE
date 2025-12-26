@echo off
setlocal
echo ✅ Starting White-Box (SIMPLE MODE - NO WORKER)...
echo.
echo This mode starts ONLY what you need to test the website + admin:
echo   Store: http://127.0.0.1:3000
echo   Admin: http://127.0.0.1:3000/admin
echo   API:   http://127.0.0.1:4000
echo.

REM Ensure .env exists (copy from example)
if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo Created .env from .env.example
  ) else (
    echo ❌ Missing .env.example. Please re-download the package.
    pause
    exit /b 1
  )
)

docker compose -f docker-compose.simple.noworker.yml up -d --build
echo.
echo ✅ Started.
echo If the page doesn't load immediately, wait 1-2 minutes then refresh.
pause
