# ZENVYK GUARDIAN — Frontend Build Specification (Claude Code)

> The dashboard + signup/login for the Zenvyk Guardian. A Next.js app (deployed on Vercel) where users **sign up, log in, see the verification dashboard, test prompts, and manage their API key.** It connects to the existing Guardian **backend** (FastAPI on Railway).
>
> This document is the source of truth for the frontend MVP. Written for **Claude Code**. Deploy target: **Vercel**.

---

## 1. OVERVIEW

**What this is:** The web app for Zenvyk Guardian — auth + dashboard + playground.
**Backend (already built, separate):** FastAPI on Railway exposing `/v1/verify`, `/stats`, `/health`.
**This frontend:** Next.js on Vercel that users log into and that calls the backend.

**The design already exists** (Reid's dashboard mockup) — build to match it.

---

## 2. SCOPE

### ✅ In scope (Frontend MVP — build this)
- **Auth** via Supabase: sign up, log in, log out, protected routes
- **Dashboard / Overview page** matching Reid's design:
  - Stat cards: Total Requests, Verified (Pass), Flagged, Blocked, Avg Response Time
  - Verification Overview line chart (Pass/Flagged/Blocked over time)
  - Consensus Vote donut (3-of-5)
  - Top Flagged Topics, Requests by Model
  - Recent Activity table
  - Endpoint Status, Usage Summary
- **Playground page:** a box where the user types a prompt → calls backend `/v1/verify` → shows the verdict (PASS/FLAGGED/BLOCKED) + scores live
- **API Keys page:** generate / view / revoke an API key (stored in Supabase)
- **Settings page:** basic profile
- **App shell:** left sidebar nav (matching the design), top bar with user menu
- Connect to backend via `NEXT_PUBLIC_API_URL`
- Deploy to Vercel

### ❌ Out of scope (later phases — do NOT build now)
- True per-tenant data isolation in the dashboard (see Section 9 note) — for MVP the dashboard reads the backend's `/stats`
- Stripe billing / paid plans
- Team management, Datasets, Policies, Reports, Integrations pages → build as **placeholder pages** only (nav links that show "Coming soon")
- Email campaigns, blockchain audit, Phase-2 backend features

---

## 3. TECH STACK
- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts (line chart + donut)
- **Auth + DB:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Hosting:** Vercel
- **Backend it talks to:** the Guardian FastAPI on Railway (via REST)

---

## 4. ARCHITECTURE

```
Browser
   │
   ▼
Next.js app (Vercel)
   ├─ Supabase  → auth (signup/login) + DB (users, api_keys)
   └─ fetch()   → Guardian backend (Railway): /stats, /v1/verify
```

- **Supabase** handles who the user is + stores their API keys.
- **The Guardian backend (Railway)** provides the verification + stats data.
- The frontend is the glue: logged-in users see the dashboard (from `/stats`) and can run verifications (`/v1/verify`).

---

## 5. PAGES / ROUTES
```
/                      → marketing/landing (or redirect to /login)
/login                 → Supabase login
/signup                → Supabase signup
/dashboard             → Overview (the main design) [protected]
/dashboard/playground  → test a prompt live [protected]
/dashboard/api-keys    → generate/view/revoke API key [protected]
/dashboard/settings    → profile [protected]
/dashboard/(others)    → placeholder "Coming soon" pages for the rest of the nav
```
All `/dashboard/*` routes are **protected** — redirect to `/login` if not authenticated.

---

## 6. AUTH (Supabase)
- Sign up with email + password (and optionally Google).
- On signup, create a row in `profiles` (Section 9).
- Protect all `/dashboard/*` routes with Supabase session check (middleware).
- Top-bar user menu: show email, "Log out."

---

## 7. THE DASHBOARD (build to match Reid's design)
Dark theme, matching the mockup. Components:
- **5 stat cards** (top): Total Requests, Verified (Pass) + %, Flagged + %, Blocked + %, Avg Response Time
- **Verification Overview** — Recharts line chart, 3 lines (Pass / Flagged / Blocked) over the date range
- **Consensus Vote (3-of-5)** — Recharts donut showing Pass / Flagged / Reject %
- **Top Flagged Topics** — horizontal bars (Medical, Legal, Financial, Politics, Other)
- **Requests by Model** — bars per model (GPT-4o, Claude, Gemini, Llama, Other) with %
- **Recent Activity** — table: Time, Model, Request, Result (colored), Consensus (e.g. 5/5), Response Time
- **Endpoint Status** — list with health dots
- **Usage Summary** — donut (% of quota) + Requests Used / Remaining / Resets On

**Data source:** fetch from the backend `GET /stats`. Map the JSON into these components. Where the backend doesn't yet return a field (e.g., per-topic breakdown), use the value if present or show a sensible empty state. Do NOT hardcode the mockup numbers — wire them to `/stats`.

---

## 8. PLAYGROUND PAGE
- A textarea for a prompt + a "Verify" button.
- On submit → `POST {API_URL}/v1/verify { prompt }`.
- Show: the **verdict** (big colored badge PASS/FLAGGED/BLOCKED), consensus score, agreement (e.g. 4/5), the verified response, per-model breakdown.
- This is the live demo of the engine — great for showing Reid / grant reviewers.

---

## 9. DATABASE (Supabase tables)
```sql
profiles (
  id uuid primary key references auth.users,
  email text,
  created_at timestamptz default now()
)

api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  key text unique,           -- e.g. "zk_live_..." generated on create
  name text,
  created_at timestamptz default now(),
  revoked boolean default false
)
```
- **API Keys page:** "Generate Key" → create a `zk_live_...` string, store it, show it once.
- RLS (row-level security): users can only see their own `api_keys`.

> ⚠️ **Per-tenant dashboard data note:** For the MVP, the dashboard shows the backend's overall `/stats`. To make each user see ONLY their own requests, the **backend** must authenticate by API key and filter usage per tenant — that's **Phase 2** (backend work). Keep the frontend MVP reading `/stats` for now; the API-keys plumbing here sets up that future step.

---

## 10. ENVIRONMENT VARIABLES (`.env.local` + Vercel)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Guardian backend (Railway)
NEXT_PUBLIC_API_URL=https://zenvyk-guardian.up.railway.app
```

---

## 11. PROJECT STRUCTURE
```
zenvyk-guardian-web/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx          # sidebar + topbar shell
│   │   ├── page.tsx            # Overview dashboard
│   │   ├── playground/page.tsx
│   │   ├── api-keys/page.tsx
│   │   └── settings/page.tsx
│   ├── layout.tsx
│   └── page.tsx                # landing / redirect
├── components/                 # shadcn/ui + dashboard components (charts, cards, table)
├── lib/
│   ├── supabase/               # client + server helpers
│   └── api.ts                  # fetch wrappers for the Guardian backend
├── middleware.ts               # protect /dashboard/*
├── supabase/migrations/        # the SQL above
├── .env.local.example
├── CLAUDE.md
└── ZENVYK_GUARDIAN_FRONTEND_SPEC.md
```

---

## 12. BUILD PHASES (Claude Code: do in order, verify each)
1. **Scaffold** — Next.js + Tailwind + shadcn + Supabase client. Deploy a hello-world to Vercel.
2. **Auth** — signup/login/logout + protected `/dashboard` (middleware). Create `profiles` on signup.
3. **App shell** — sidebar nav (matching the design) + topbar with user menu.
4. **Dashboard** — build the Overview page components and wire them to backend `GET /stats`.
5. **Playground** — prompt box → `POST /v1/verify` → show verdict.
6. **API Keys** — `api_keys` table + generate/view/revoke (RLS).
7. **Placeholders** — the remaining nav items as "Coming soon" pages.
8. **Polish + deploy** — match the dark design, deploy to Vercel.

---

## 13. CLAUDE CODE — KICKOFF PROMPT
```
You are building "Zenvyk Guardian Web" — the Next.js 14 (App Router, TypeScript) frontend for the Guardian, deployed on Vercel. Read ZENVYK_GUARDIAN_FRONTEND_SPEC.md fully before writing code — it is the source of truth.

What it is: a dashboard + signup/login. Users sign up (Supabase auth), log in, see the verification dashboard (data from the Guardian backend's /stats), test prompts in a Playground (calls the backend /v1/verify), and manage an API key (stored in Supabase).

Hard rules:
- Build ONLY the Frontend MVP scope in Section 2. The other nav pages (Datasets, Policies, Reports, etc.) are "Coming soon" placeholders — do NOT build them.
- Use Supabase for auth + the api_keys/profiles tables (Section 9). Protect all /dashboard/* routes.
- Do NOT hardcode the mockup dashboard numbers — fetch from the backend GET /stats via NEXT_PUBLIC_API_URL. Show sensible empty states if a field is missing.
- Match the dark theme of the provided design (stat cards, line chart, consensus donut, tables).
- Secrets in env vars only.

Build in the phase order in Section 12. Start with Phase 1 (scaffold) and Phase 2 (auth + protected dashboard). Then STOP and show me login/signup working before continuing to the dashboard.

Ask me for any Supabase keys / the backend URL you need; use placeholders in .env.local.example and document them.
```

---

## 14. CLAUDE.md (repo root)
```markdown
# Zenvyk Guardian Web — Claude Code Guide
Next.js 14 (App Router, TS) frontend on Vercel. Auth + dashboard for the Guardian.
Full spec: ZENVYK_GUARDIAN_FRONTEND_SPEC.md (read first).

## Golden rules
- Build ONLY the Frontend MVP (Section 2). Other nav pages = "Coming soon" placeholders.
- Auth + DB via Supabase. Protect /dashboard/*.
- Dashboard data comes from the backend GET /stats (NEXT_PUBLIC_API_URL) — never hardcode mockup numbers.
- Playground calls POST /v1/verify.
- Secrets via env vars only. TypeScript + Tailwind + shadcn/ui throughout.

## Stack
Next.js 14, Tailwind, shadcn/ui, Recharts, Supabase. Deploy: Vercel.

## Commands
- npm install
- npm run dev
- npx supabase db push   (apply migrations)
```

---

## 15. DEPLOYMENT (Vercel)
1. Push repo to GitHub.
2. Vercel → New Project → import the repo.
3. Add env vars (Section 10): Supabase keys + `NEXT_PUBLIC_API_URL` (the Railway backend URL).
4. Deploy → get the Vercel URL.
5. ⚠️ **CORS:** add the Vercel URL to the backend's CORS `allow_origins` (FastAPI) so the dashboard can call it.

---

## 16. DELIVERABLE
A deployed (Vercel) Next.js app where:
- Anyone can **sign up / log in** (Supabase),
- Logged-in users see the **Guardian dashboard** (live data from the backend),
- Users can **test prompts** in the Playground (live verdict),
- Users can **generate an API key**,
- Connected to the Guardian backend on Railway.

Together with the backend, this is the working Zenvyk Guardian SaaS MVP. (True per-tenant usage isolation = Phase 2 backend work.)
