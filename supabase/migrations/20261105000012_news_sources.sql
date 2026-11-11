-- Personal news and economic-calendar bookmarks for the Timezones page.
create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  url text not null check (char_length(url) between 1 and 2048 and url ~* '^https?://[^[:space:]]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_news_sources_user_created on public.news_sources (user_id, created_at desc);
alter table public.news_sources enable row level security;
grant select, insert, update, delete on public.news_sources to authenticated;
drop policy if exists "Users can view own news sources" on public.news_sources;
create policy "Users can view own news sources" on public.news_sources for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can add own news sources" on public.news_sources;
create policy "Users can add own news sources" on public.news_sources for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can edit own news sources" on public.news_sources;
create policy "Users can edit own news sources" on public.news_sources for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own news sources" on public.news_sources;
create policy "Users can delete own news sources" on public.news_sources for delete to authenticated using ((select auth.uid()) = user_id);
