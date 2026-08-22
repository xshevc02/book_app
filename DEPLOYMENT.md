# Pockland Deployment

## Supabase

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Authentication > Providers, enable Google.
4. Add these redirect URLs in Supabase Authentication URL settings:
   - `http://127.0.0.1:5173`
   - your Vercel production URL

## Local env

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these values, the app keeps working in local demo mode.

## Vercel

1. Import this project into Vercel.
2. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
3. Build command: `pnpm run build`
4. Output directory: `dist`

User shelves, progress, ratings, and custom shelves are private per Google account.
Feed posts are public for everyone for now.

## GitHub Pages

This repository also has a GitHub Actions workflow for Pages.

1. Open GitHub repository settings.
2. Go to Pages.
3. Set Source to GitHub Actions.
4. Push to `master`; the workflow deploys `dist`.

Production URL:

```text
https://xshevc02.github.io/book_app/
```

Add this URL in Supabase Authentication > URL Configuration > Redirect URLs:

```text
https://xshevc02.github.io/book_app/
```

In Google Cloud OAuth Client, add this JavaScript origin:

```text
https://xshevc02.github.io
```
