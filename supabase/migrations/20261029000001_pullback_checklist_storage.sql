-- ============================================================================
-- Migration: 20261029000001_pullback_checklist_storage.sql
-- Purpose:
--   1. Create private Supabase Storage bucket 'pullback-references' limited to
--      10 MB (10,485,760 bytes) and image MIME types only.
--   2. Configure RLS policies on storage.objects so logged-in users can upload,
--      view, update, and delete ONLY files inside their own user folder
--      ({auth.uid()}/{market}/{step_id}/{filename}).
--   3. Create public.pullback_checklist_images table with RLS and a 10 MB check
--      constraint to index reference images per pullback market & checklist step.
-- ============================================================================

-- 1. Create / update the 'pullback-references' storage bucket (Max 10 MB)
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

-- 2. Storage Object RLS Policies (scoped per authenticated user folder)
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

-- 3. Metadata index table for checklist reference images
create table if not exists public.pullback_checklist_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  market text not null check (market in ('bullish', 'bearish')),
  step_id text not null check (
    step_id ~ '^(bull|bear)-[1-9][0-9]*$'
  ),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (
    file_size_bytes > 0 and file_size_bytes <= 10485760 -- Max 10 MB
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
