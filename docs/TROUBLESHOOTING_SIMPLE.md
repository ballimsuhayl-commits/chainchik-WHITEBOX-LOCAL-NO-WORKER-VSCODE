# Simple Mode Troubleshooting

## If you see: ".env not found"
Run `START-SIMPLE.bat` again. It creates `.env` from `.env.example`.

## If the browser says "site can't be reached"
1. Wait 1-2 minutes (first build can take time)
2. Check containers:
   - Open Docker Desktop and confirm `web` is running
3. Or run in Terminal:
   - `docker ps`
