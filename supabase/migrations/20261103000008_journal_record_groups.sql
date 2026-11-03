-- A child retains all its own original fields and screenshots. Detaching it
-- restores the original trade simply by clearing parent_entry_id.
alter table public.journal_entries
  add column if not exists parent_entry_id uuid references public.journal_entries(id) on delete restrict;

create index if not exists idx_journal_entries_parent_entry_id
  on public.journal_entries(parent_entry_id) where parent_entry_id is not null;

-- Validate both ends of the relationship. The invoker's existing RLS policies
-- still apply. Lock the parent to serialize a merge against parent edits.
create or replace function public.validate_journal_record_group()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  p public.journal_entries%rowtype;
begin
  if new.parent_entry_id is not null then
    if new.id = new.parent_entry_id then
      raise exception 'A record cannot be its own parent';
    end if;
    select * into p from public.journal_entries
      where id = new.parent_entry_id for update;
    if not found or p.user_id <> new.user_id then
      raise exception 'Parent record not found';
    end if;
    if p.parent_entry_id is not null or p.closing_price is null then
      raise exception 'The parent must be an independent closed record';
    end if;
    if p.account_type <> new.account_type or
       upper(regexp_replace(p.symbol, '[^A-Za-z0-9]', '', 'g')) <>
       upper(regexp_replace(new.symbol, '[^A-Za-z0-9]', '', 'g')) then
      raise exception 'Records must have the same instrument and account';
    end if;
    if exists (select 1 from public.journal_entries where parent_entry_id = new.id) then
      raise exception 'A parent with children cannot become a child';
    end if;
  end if;
  if tg_op = 'UPDATE' and exists
      (select 1 from public.journal_entries where parent_entry_id = old.id) then
    if new.parent_entry_id is not null or new.closing_price is null or
       new.account_type <> old.account_type or
       upper(regexp_replace(new.symbol, '[^A-Za-z0-9]', '', 'g')) <>
       upper(regexp_replace(old.symbol, '[^A-Za-z0-9]', '', 'g')) then
      raise exception 'Detach children before reopening or changing the account or instrument of a parent';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_journal_record_group on public.journal_entries;
create trigger validate_journal_record_group before insert or update on public.journal_entries
  for each row execute function public.validate_journal_record_group();
