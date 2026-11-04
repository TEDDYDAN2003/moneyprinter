-- One shared risk percentage per signed-in user. Journal balances remain per account.
create table if not exists public.journal_risk_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  risk_percent numeric(7,4) not null default 3 check (risk_percent > 0 and risk_percent <= 100),
  updated_at timestamptz not null default now()
);
alter table public.journal_risk_settings enable row level security;
drop policy if exists "Users manage own journal risk settings" on public.journal_risk_settings;
create policy "Users manage own journal risk settings" on public.journal_risk_settings
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
