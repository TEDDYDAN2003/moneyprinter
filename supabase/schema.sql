-- ============================================================================
-- MoneyPrinter — Complete Schema Reference
-- Note: Sequential CLI migrations live in supabase/migrations/:
--   - 20261029000000_init_profiles.sql
--   - 20261029000001_pullback_checklist_storage.sql
--   - 20261030000002_trading_journal.sql
--   - 20261030000003_journal_cashflow_and_screenshots.sql
-- ============================================================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Private Storage Bucket for Pullback Checklist Reference Images (Max 10 MB)
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'pullback-references',
  'pullback-references',
  false,
  10485760, -- 10 MB
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

drop policy if exists "Users can view own pullback reference files" on storage.objects;
create policy "Users can view own pullback reference files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pullback-references'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can upload own pullback reference files" on storage.objects;
create policy "Users can upload own pullback reference files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pullback-references'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update own pullback reference files" on storage.objects;
create policy "Users can update own pullback reference files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pullback-references'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'pullback-references'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete own pullback reference files" on storage.objects;
create policy "Users can delete own pullback reference files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pullback-references'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- 3. Checklist Reference Metadata Table
create table if not exists public.pullback_checklist_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  market text not null check (market in ('bullish', 'bearish', 'catching')),
  step_id text not null check (
    step_id ~ '^(bull|bear|catch)-(flow-)?[1-9][0-9]*$'
  ),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (
    file_size_bytes > 0 and file_size_bytes <= 10485760
  ),
  created_at timestamptz not null default now()
);

create index if not exists idx_pullback_checklist_images_user_step
  on public.pullback_checklist_images (user_id, market, step_id, created_at desc);

alter table public.pullback_checklist_images enable row level security;

drop policy if exists "Users can read own checklist reference metadata" on public.pullback_checklist_images;
create policy "Users can read own checklist reference metadata"
  on public.pullback_checklist_images
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own checklist reference metadata" on public.pullback_checklist_images;
create policy "Users can insert own checklist reference metadata"
  on public.pullback_checklist_images
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own checklist reference metadata" on public.pullback_checklist_images;
create policy "Users can delete own checklist reference metadata"
  on public.pullback_checklist_images
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 4. Trading Journal Entries Table
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_type text not null default 'real' check (account_type in ('real', 'demo')),
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
  on public.journal_entries (user_id, account_type, traded_at desc);

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

-- 5. Journal Deposits & Withdrawals Ledger Table
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

-- 6. Private Storage Bucket 'journal-screenshots' (Max 10 MB)
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
  10485760, -- 10 MB
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

-- 7. Journal Entry Screenshots Metadata Table
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
