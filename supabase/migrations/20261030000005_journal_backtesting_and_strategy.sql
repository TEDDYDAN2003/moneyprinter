-- ============================================================================
-- Migration: 20261030000005_journal_backtesting_and_strategy.sql
-- Purpose:
--   1. Allow account_type = 'backtest' alongside 'real' and 'demo' in
--      public.journal_entries and public.journal_transactions.
--   2. Add strategy, timeframe, and session_name metadata columns to
--      public.journal_entries for recording backtested setups and computing
--      per-strategy win/loss probability analytics.
-- ============================================================================

-- 1. Update account_type constraint on public.journal_entries
alter table public.journal_entries
  drop constraint if exists journal_entries_account_type_check;

alter table public.journal_entries
  add constraint journal_entries_account_type_check
  check (account_type in ('real', 'demo', 'backtest'));

-- 2. Add strategy & backtest context metadata columns to public.journal_entries
alter table public.journal_entries
  add column if not exists strategy text,
  add column if not exists timeframe text,
  add column if not exists session_name text;

create index if not exists idx_journal_entries_backtest_strategy
  on public.journal_entries (user_id, account_type, strategy, traded_at desc);

-- 3. Update account_type constraint on public.journal_transactions
alter table public.journal_transactions
  drop constraint if exists journal_transactions_account_type_check;

alter table public.journal_transactions
  add constraint journal_transactions_account_type_check
  check (account_type in ('real', 'demo', 'backtest'));
