# Vercel deploy (Hobby-safe)

This package is a single Next.js app designed to deploy cleanly on Vercel Hobby without monorepo/workspace installs.

## Steps
1. Create a new GitHub repo and push the contents of this folder, or use Vercel's drag-and-drop deploy.
2. In Vercel -> Project -> Settings -> Environment Variables, add:
   - GEMINI_API_KEY
   - GEMINI_MODEL (optional) e.g. gemini-2.0-flash
   Apply to Production + Preview.
3. Redeploy.

## Gemini endpoint
POST /api/gemini
Body:
{
  "prompt": "...",
  "system": "...", 
  "temperature": 0.6,
  "topP": 0.9,
  "maxOutputTokens": 512
}

The endpoint runs server-side only. Do not put your key in client-side code.
