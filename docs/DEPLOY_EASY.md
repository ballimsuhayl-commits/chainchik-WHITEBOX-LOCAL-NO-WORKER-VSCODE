# Easy Deployment (non-coder friendly)

This is the simplest portable deployment:
- 1 cheap VPS (Ubuntu)
- 1 domain
- Copy/paste one command
- Automatic HTTPS (Caddy)

## What you need
1. A VPS (Ubuntu 22.04/24.04) from any provider
2. A domain name (e.g. yourstore.co.za)
3. Point DNS:
   - `A` record: `@` -> VPS IP
   - `A` record: `www` -> VPS IP (optional)

## One-command install (run on the VPS)
SSH into your VPS, then run:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_REPO/main/scripts/deploy/vps-install.sh | bash
```

The installer will ask:
- domain
- admin password
- WhatsApp credentials (optional now, can add later)

## After install
Open:
- https://YOURDOMAIN/admin  (login + setup wizard)
- https://YOURDOMAIN        (storefront)

To update to latest code:
```bash
bash /opt/whitebox/app/scripts/deploy/vps-update.sh
```

## Cost
- VPS: usually the only cost (needed for 24/7 webhooks + database)
- Everything else is open-source and portable.
