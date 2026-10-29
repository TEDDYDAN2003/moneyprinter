# MoneyPrinter

Personal Trading Journal & Pre-Trade Strategy Execution Workspace built with **Next.js (App Router)**, **Tailwind CSS**, and **Supabase Auth (`@supabase/ssr`)**.

## Included in Foundation (Phase 1)

- **Supabase Auth Layer (`src/lib/supabase/`)**
  - `client.ts` — Browser client (`createBrowserClient`)
  - `server.ts` — Server Component & Route Handler client (`createServerClient`)
  - `middleware.ts` + `src/middleware.ts` — Automatic JWT session refresh and `/admin` route guard
  - `src/app/auth/callback/route.ts` & `src/app/auth/confirm/route.ts` — PKCE and OTP email verification handlers
  - `src/app/api/auth/{login,signup,logout}/route.ts` — Email/password authentication endpoints (with automatic preview fallback until `.env.local` is added)
- **Minimal Landing & Auth Pages**
  - `/` — Concise landing page with embedded Sign In / Create Account card
  - `/login` — Dedicated authentication gate
- **Protected Admin Workspace (`/admin`)**
  - Sidebar navigation featuring:
    - **Overview** (`/admin`)
    - **Journal** (`/admin/journal`)
    - **Strategy** (hover in sidebar to reveal sub-items) → **Pullback Strategy** (`/admin/strategy/pullback-strategy`)

## Connecting Supabase

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Add your Supabase project credentials from **Supabase Dashboard → Project Settings → API**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
3. (Optional) Run `supabase/schema.sql` inside your Supabase SQL Editor to initialize the `profiles` table with Row Level Security.

## Local Development

```bash
npm install
npm run dev
```
