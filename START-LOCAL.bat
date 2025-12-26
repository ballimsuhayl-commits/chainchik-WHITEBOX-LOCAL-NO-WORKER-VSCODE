@echo off
setlocal
echo ✅ Starting White-Box locally...
echo.
REM Prefer PowerShell bootstrap (generates secrets + admin password)
where powershell >nul 2>nul
if %ERRORLEVEL%==0 (
  powershell -ExecutionPolicy Bypass -File "scripts\whitebox\new-business.ps1"
) else (
  echo PowerShell not found in PATH. Running Docker stack directly...
  docker compose -f docker-compose.deploy.yml up -d --build
)
echo.
echo Open:
echo • Store: http://127.0.0.1
echo • Admin: http://127.0.0.1/admin
pause
