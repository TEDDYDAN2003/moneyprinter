-- ============================================================================
-- Migration: 20261102000007_price_alerts.sql
-- Purpose:
--   Create public.price_alerts table + indexes + RLS policies for 24/7 Global
--   Market Price Alerts monitored by Next.js /api/alerts/check (via cron-job.org)
--   with Telegram Bot notifications and Positive (+%) / Negative (-%) move tracking
--   relative to the trader's entered baseline price.
-- ============================================================================

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null check (char_length(trim(symbol)) > 0),
  condition text not null check (condition in ('above', 'below')),
  initial_price numeric(20, 8) not null check (initial_price > 0),
  target_price numeric(20, 8) not null check (target_price > 0),
  positive_pct numeric(10, 4) not null default 0.5000 check (positive_pct >= 0),
  negative_pct numeric(10, 4) not null default 0.5000 check (negative_pct >= 0),
  latest_price numeric(20, 8) check (latest_price is null or latest_price > 0),
  last_checked_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'triggered', 'paused')),
  triggered_price numeric(20, 8) check (triggered_price is null or triggered_price > 0),
  triggered_at timestamptz,
  telegram_notified boolean not null default false,
  telegram_chat_id text,
  strategy text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_price_alerts_status_symbol
  on public.price_alerts (status, symbol);

create index if not exists idx_price_alerts_user_created_at
  on public.price_alerts (user_id, created_at desc);

alter table public.price_alerts enable row level security;

drop policy if exists "Users can view own price alerts" on public.price_alerts;
create policy "Users can view own price alerts"
  on public.price_alerts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own price alerts" on public.price_alerts;
create policy "Users can insert own price alerts"
  on public.price_alerts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own price alerts" on public.price_alerts;
create policy "Users can update own price alerts"
  on public.price_alerts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own price alerts" on public.price_alerts;
create policy "Users can delete own price alerts"
  on public.price_alerts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
