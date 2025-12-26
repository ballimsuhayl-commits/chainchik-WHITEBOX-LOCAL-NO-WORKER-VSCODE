# Vercel Hobby Deploy (Fix for `workspace:*`)

## What was wrong
Your Vercel build log showed:

- `npm ERR! EUNSUPPORTEDPROTOCOL`
- `Unsupported URL Type "workspace:": workspace:*`

That happens because **npm does not support** the `workspace:*` version protocol.

## What I changed in this download
I removed `workspace:*` usage by switching the internal dependency to a local file reference:

- `apps/api/package.json`: `@cc/shared` -> `file:../../packages/shared`
- `apps/worker/package.json`: `@cc/shared` -> `file:../../packages/shared`

This makes **npm install** compatible on Vercel Hobby.

## Deploy on Vercel (Hobby) — recommended setup
Deploy the **Next.js web app** on Vercel:

1. Push this code to GitHub (new repo or overwrite the existing one).
2. In Vercel: **New Project** → import the repo.
3. Set **Root Directory** to:
   - `apps/web`
4. Build settings (if Vercel does not auto-detect):
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `.next` (usually auto)
5. Deploy.

### If your web app needs code from `packages/*`
In Vercel, enable the option that allows using source files outside the Root Directory (wording varies by UI). If you enable it, Vercel will include `packages/*` during the build.

## If you insist on deploying from repo root
You can, but it is heavier on Hobby.

- Install Command: `npm install`
- Build Command: `npm -w apps/web run build`

(Only do this if you cannot set Root Directory.)
