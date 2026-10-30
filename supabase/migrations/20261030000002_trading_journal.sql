-- ============================================================================
-- Migration: 20261030000002_trading_journal.sql
-- Purpose:
--   Create public.journal_entries table + RLS policies for the Trading Journal
--   storing symbol, trade_type (buy/sell), lot_size, take_profit, stop_loss,
--   opening_price, closing_price, traded_at (date & time), and leverage.
-- ============================================================================

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null check (char_length(trim(symbol)) > 0),
  trade_type text not null check (trade_type in ('buy', 'sell')),
  lot_size numeric(12, 4) not null check (lot_size > 0),
  opening_price numeric(20, 8) not null check (opening_price > 0),
  closing_price numeric(20, 8) check (closing_price is null or closing_price > 0),
  stop_loss numeric(20, 8) check (stop_loss is null or stop_loss > 0),
  take_profit numeric(20, 8) check (take_profit is null or take_profit > 0),
  leverage integer not null default 500 check (leverage >= 1 and leverage <= 100000),
  traded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_journal_entries_user_traded_at
  on public.journal_entries (user_id, traded_at desc);

alter table public.journal_entries enable row level security;

drop policy if exists "Users can view own journal entries" on public.journal_entries;
create policy "Users can view own journal entries"
  on public.journal_entries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own journal entries" on public.journal_entries;
create policy "Users can insert own journal entries"
  on public.journal_entries
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own journal entries" on public.journal_entries;
create policy "Users can update own journal entries"
  on public.journal_entries
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own journal entries" on public.journal_entries;
create policy "Users can delete own journal entries"
  on public.journal_entries
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
