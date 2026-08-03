-- RELEASE A.8 - CALENDARIO MULTI-TEAM, RLS E ARCHITETTURA SICURA
-- Eseguire una sola volta nel SQL Editor di Supabase.

begin;

alter table public.events
  add column if not exists team_id uuid references public.teams(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Associa gli eventi storici alla squadra già presente.
update public.events e
set team_id = coalesce(
  e.team_id,
  (select t.id from public.teams t order by t.created_at asc limit 1)
)
where e.team_id is null;

-- Helper SECURITY DEFINER: evita policy ricorsive su teams/team_members.
create or replace function public.current_user_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.teams t
  where t.owner_id = auth.uid()
  union
  select tm.team_id
  from public.team_members tm
  where tm.user_id = auth.uid() and tm.active = true;
$$;

create or replace function public.current_user_can_edit_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.app_role in ('owner', 'admin', 'collaborator')
  ) and exists (
    select 1
    from public.current_user_team_ids() as allowed(team_id)
    where allowed.team_id = p_team_id
  );
$$;

revoke all on function public.current_user_team_ids() from public;
revoke all on function public.current_user_can_edit_team(uuid) from public;
grant execute on function public.current_user_team_ids() to authenticated;
grant execute on function public.current_user_can_edit_team(uuid) to authenticated;

-- Completa automaticamente ownership e team sugli INSERT.
create or replace function public.prepare_event_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  if new.team_id is null then
    select team_id into new.team_id
    from public.current_user_team_ids()
    limit 1;
  end if;

  if new.team_id is null then
    raise exception 'Nessuna squadra associata all utente';
  end if;

  if not public.current_user_can_edit_team(new.team_id) then
    raise exception 'Non hai i permessi per modificare il calendario della squadra';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prepare_event_row_trigger on public.events;
create trigger prepare_event_row_trigger
before insert or update on public.events
for each row execute function public.prepare_event_row();

alter table public.events enable row level security;

-- Rimuove tutte le vecchie policy della tabella events, qualunque fosse il nome.
do $$
declare policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'events'
  loop
    execute format('drop policy if exists %I on public.events', policy_name);
  end loop;
end $$;

create policy "team members read events"
on public.events
for select to authenticated
using (team_id in (select allowed.team_id from public.current_user_team_ids() as allowed(team_id)));

create policy "team editors create events"
on public.events
for insert to authenticated
with check (public.current_user_can_edit_team(team_id));

create policy "team editors update events"
on public.events
for update to authenticated
using (public.current_user_can_edit_team(team_id))
with check (public.current_user_can_edit_team(team_id));

create policy "team editors delete events"
on public.events
for delete to authenticated
using (public.current_user_can_edit_team(team_id));

grant select, insert, update, delete on public.events to authenticated;

create index if not exists events_team_id_start_at_idx
  on public.events(team_id, start_at);

commit;
