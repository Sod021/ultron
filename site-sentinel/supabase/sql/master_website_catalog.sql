-- Use one account's websites as the initial shared catalog while preserving
-- all other website rows for historical foreign-key relationships.

alter table public.websites
  add column if not exists is_shared boolean not null default false;

do $$
declare
  master_user_id uuid;
begin
  select id
    into master_user_id
  from auth.users
  where lower(email) = lower('dexterm3040809@gmail.com')
  limit 1;

  if master_user_id is null then
    raise exception 'Master website account dexterm3040809@gmail.com was not found';
  end if;

  -- Preserve all rows, but expose only one canonical row per normalized URL
  -- from the designated master account.
  update public.websites set is_shared = false where is_shared = true;

  with ranked_master_websites as (
    select
      id,
      row_number() over (
        partition by lower(rtrim(url, '/'))
        order by id
      ) as duplicate_rank
    from public.websites
    where user_id = master_user_id
  )
  update public.websites as website
  set is_shared = true
  from ranked_master_websites as ranked
  where website.id = ranked.id
    and ranked.duplicate_rank = 1;
end
$$;

alter table public.websites enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'websites'
  loop
    execute format('drop policy if exists %I on public.websites', existing_policy.policyname);
  end loop;
end
$$;

create policy "websites_select_shared" on public.websites
  for select to authenticated
  using (is_shared = true);

create policy "websites_insert_shared" on public.websites
  for insert to authenticated
  with check (auth.uid() = user_id and is_shared = true);

create policy "websites_update_shared" on public.websites
  for update to authenticated
  using (is_shared = true)
  with check (is_shared = true);

create policy "websites_delete_shared" on public.websites
  for delete to authenticated
  using (is_shared = true);

-- Prevent future shared duplicates while allowing preserved historical rows.
create unique index if not exists websites_shared_normalized_url_unique
  on public.websites (lower(rtrim(url, '/')))
  where is_shared = true;

create index if not exists websites_is_shared_idx
  on public.websites (is_shared)
  where is_shared = true;
