-- ============================================================================
-- MoneyPrinter — Complete Schema Reference
-- Note: Sequential CLI migrations live in supabase/migrations/:
--   - 20261029000000_init_profiles.sql
--   - 20261029000001_pullback_checklist_storage.sql
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
  market text not null check (market in ('bullish', 'bearish')),
  step_id text not null check (
    step_id in (
      'bull-1', 'bull-2', 'bull-3', 'bull-4',
      'bear-1', 'bear-2', 'bear-3', 'bear-4'
    )
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
