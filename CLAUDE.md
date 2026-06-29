# Zenvyk Guardian Web — Claude Code Guide

Next.js (App Router, TS) frontend on Vercel. Auth + dashboard for the Guardian.
Full spec: `ZENVYK_GUARDIAN_FRONTEND_SPEC.md` (read first).

> Note: the spec references `app/` at repo root and Next 14; this project is
> scaffolded with Next.js 16 + React 19 + Tailwind v4 using the `src/` dir, so
> code lives under `src/app`, `src/components`, `src/lib`. The `@/*` alias maps
> to `./src/*`.

## Golden rules

- Build ONLY the Frontend MVP (Section 2). Other nav pages = "Coming soon" placeholders.
- Auth + DB via Supabase. Protect `/dashboard/*` (see `src/middleware.ts`).
- Dashboard data comes from the backend `GET /stats` (`NEXT_PUBLIC_API_URL`) — never hardcode mockup numbers.
- Playground calls `POST /v1/verify`.
- Secrets via env vars only. TypeScript + Tailwind + dark theme throughout.

## Stack

Next.js 16, React 19, Tailwind v4, Recharts, Supabase (`@supabase/ssr`),
lucide-react icons. Deploy: Vercel.

## Layout

- `src/app/(auth)/{login,signup}` — auth pages
- `src/app/dashboard/*` — protected app (overview, playground, api-keys, settings, placeholders)
- `src/components/ui` — small UI primitives (button, card, input, badge…)
- `src/components/dashboard` — stat cards + charts + tables
- `src/components/shell` — sidebar + topbar
- `src/lib/supabase` — browser/server/middleware clients
- `src/lib/api.ts` — Guardian backend fetch wrappers + `/stats` normalizer
- `supabase/migrations` — SQL (profiles, api_keys, RLS)

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npx supabase db push` (apply migrations, once linked)

## Env

Copy `.env.local.example` → `.env.local`. The app boots without Supabase keys
(auth disabled, middleware pass-through) so the dashboard UI stays browsable.
