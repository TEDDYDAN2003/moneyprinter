-- ============================================================================
-- Migration: 20261030000003_journal_cashflow_and_screenshots.sql
-- Purpose:
--   1. Add account_type ('real' | 'demo') to public.journal_entries.
--   2. Create public.journal_transactions for Deposits & Withdrawals tracking
--      so Current Balance = (Deposits - Withdrawals) + Realized Net P&L.
--   3. Create private Supabase Storage bucket 'journal-screenshots' (10 MB max)
--      + storage.objects RLS policies for per-trade study chart screenshots.
--   4. Create public.journal_entry_screenshots metadata table + RLS policies.
-- ============================================================================

-- 1. Add account_type ('real' | 'demo') to public.journal_entries
alter table public.journal_entries
  add column if not exists account_type text not null default 'real'
  check (account_type in ('real', 'demo'));

create index if not exists idx_journal_entries_user_account_traded
  on public.journal_entries (user_id, account_type, traded_at desc);

-- 2. Deposits & Withdrawals Ledger Table
create table if not exists public.journal_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_type text not null default 'real' check (account_type in ('real', 'demo')),
  tx_type text not null check (tx_type in ('deposit', 'withdrawal')),
  amount numeric(16, 2) not null check (amount > 0),
  note text,
  transacted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_journal_transactions_user_account_date
  on public.journal_transactions (user_id, account_type, transacted_at desc);

alter table public.journal_transactions enable row level security;

drop policy if exists "Users can view own journal transactions" on public.journal_transactions;
create policy "Users can view own journal transactions"
  on public.journal_transactions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own journal transactions" on public.journal_transactions;
create policy "Users can insert own journal transactions"
  on public.journal_transactions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own journal transactions" on public.journal_transactions;
create policy "Users can update own journal transactions"
  on public.journal_transactions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own journal transactions" on public.journal_transactions;
create policy "Users can delete own journal transactions"
  on public.journal_transactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 3. Private Storage Bucket 'journal-screenshots' (Max 10 MB per screenshot)
--    Path convention: {user_id}/{journal_entry_id}/{timestamp}-{filename}
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'journal-screenshots',
  'journal-screenshots',
  false,
  10485760, -- 10 MB (10 * 1024 * 1024 bytes)
  array[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view own journal screenshots" on storage.objects;
create policy "Users can view own journal screenshots"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'journal-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can upload own journal screenshots" on storage.objects;
create policy "Users can upload own journal screenshots"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'journal-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update own journal screenshots" on storage.objects;
create policy "Users can update own journal screenshots"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'journal-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'journal-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete own journal screenshots" on storage.objects;
create policy "Users can delete own journal screenshots"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'journal-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- 4. Journal Entry Screenshots Metadata Table
create table if not exists public.journal_entry_screenshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (
    file_size_bytes > 0 and file_size_bytes <= 10485760
  ),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists idx_journal_entry_screenshots_entry
  on public.journal_entry_screenshots (user_id, journal_entry_id, created_at asc);

alter table public.journal_entry_screenshots enable row level security;

drop policy if exists "Users can read own journal screenshot metadata" on public.journal_entry_screenshots;
create policy "Users can read own journal screenshot metadata"
  on public.journal_entry_screenshots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own journal screenshot metadata" on public.journal_entry_screenshots;
create policy "Users can insert own journal screenshot metadata"
  on public.journal_entry_screenshots
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own journal screenshot metadata" on public.journal_entry_screenshots;
create policy "Users can delete own journal screenshot metadata"
  on public.journal_entry_screenshots
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
