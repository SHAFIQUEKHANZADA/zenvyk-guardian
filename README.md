# Zenvyk Guardian — Web

The Next.js frontend for **Zenvyk Guardian**: auth, a live verification
dashboard, a verification Playground, and API-key management. It connects to
the Guardian backend (FastAPI on Railway) and uses Supabase for auth + storage.

> Source of truth: [`ZENVYK_GUARDIAN_FRONTEND_SPEC.md`](./ZENVYK_GUARDIAN_FRONTEND_SPEC.md).
> Build notes for Claude Code: [`CLAUDE.md`](./CLAUDE.md).

## Stack

Next.js 16 (App Router, TS) · React 19 · Tailwind v4 · Recharts ·
Supabase (`@supabase/ssr`) · lucide-react · Vercel.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The app boots even without Supabase keys — auth is disabled and middleware
> becomes a pass-through so you can browse the dashboard UI during setup.

## Environment

See `.env.local.example`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged key (optional) |
| `NEXT_PUBLIC_API_URL` | Guardian backend base URL (Railway) |

## Database

Apply the migration in `supabase/migrations/0001_init.sql` (profiles + api_keys
with RLS). Via the Supabase CLI once the project is linked:

```bash
npx supabase db push
```

Or paste the SQL into the Supabase SQL editor.

## Routes

- `/` — landing (redirects to `/dashboard` when signed in)
- `/login`, `/signup` — Supabase auth
- `/dashboard` — Overview (live data from backend `GET /stats`)
- `/dashboard/playground` — verify a prompt via `POST /v1/verify`
- `/dashboard/api-keys` — generate / revoke API keys
- `/dashboard/settings` — profile
- `/dashboard/{datasets,policies,reports,integrations,team}` — "Coming soon"

All `/dashboard/*` routes are protected by `src/middleware.ts`.

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add the env vars above.
3. Deploy, then add the Vercel URL to the backend's CORS `allow_origins`.
