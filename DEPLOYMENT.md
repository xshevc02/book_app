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
