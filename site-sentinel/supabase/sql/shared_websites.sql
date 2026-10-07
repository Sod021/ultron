-- Make `websites` a single shared catalog for every signed-in account.
-- The user_id column is retained as creator/audit metadata and for compatibility.

alter table public.websites enable row level security;

-- Replace every previous ownership policy, regardless of the policy names used
-- when the table was originally created.
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

create policy "websites_select_authenticated" on public.websites
  for select to authenticated
  using (true);

create policy "websites_insert_authenticated" on public.websites
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "websites_update_authenticated" on public.websites
  for update to authenticated
  using (true)
  with check (true);

create policy "websites_delete_authenticated" on public.websites
  for delete to authenticated
  using (true);

-- Speeds up global URL comparisons without destructively merging pre-existing rows.
create index if not exists websites_shared_url_idx
  on public.websites (lower(rtrim(url, '/')));

-- Required for immediate cross-account updates when Realtime is enabled.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'websites'
  ) then
    alter publication supabase_realtime add table public.websites;
  end if;
end
$$;
