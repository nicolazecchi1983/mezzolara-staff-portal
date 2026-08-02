-- RELEASE A.2 - CORREZIONE RLS TEAMS E PERMESSI STAFF
-- Eseguire una sola volta nel SQL Editor di Supabase.

begin;

-- 1) Funzione nell'app separata dal ruolo tecnico.
alter table public.profiles
  add column if not exists app_role text not null default 'collaborator';

update public.profiles
set app_role = case
  when role = 'owner' then 'admin'
  when role = 'read_only' then 'read_only'
  else coalesce(nullif(app_role, ''), 'collaborator')
end;

alter table public.profiles drop constraint if exists profiles_app_role_check;
alter table public.profiles add constraint profiles_app_role_check
  check (app_role in ('admin', 'collaborator', 'read_only'));

-- 2) Helper SECURITY DEFINER: evitano la ricorsione tra teams e team_members.
create or replace function public.current_user_is_team_owner(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = p_team_id
      and t.owner_id = auth.uid()
  );
$$;

create or replace function public.current_user_is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.active = true
  );
$$;

create or replace function public.current_user_owns_team_asset(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_folder text;
  v_team_id uuid;
begin
  v_folder := (storage.foldername(p_object_name))[1];
  if v_folder is null then return false; end if;
  begin
    v_team_id := v_folder::uuid;
  exception when others then
    return false;
  end;
  return public.current_user_is_team_owner(v_team_id);
end;
$$;

revoke all on function public.current_user_is_team_owner(uuid) from public;
revoke all on function public.current_user_is_team_member(uuid) from public;
revoke all on function public.current_user_owns_team_asset(text) from public;
grant execute on function public.current_user_is_team_owner(uuid) to authenticated;
grant execute on function public.current_user_is_team_member(uuid) to authenticated;
grant execute on function public.current_user_owns_team_asset(text) to authenticated;

-- 3) Policy senza riferimenti circolari diretti.
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "team members can read teams" on public.teams;
drop policy if exists "owners can insert teams" on public.teams;
drop policy if exists "owners can update teams" on public.teams;
drop policy if exists "owners can delete teams" on public.teams;

create policy "team members can read teams"
on public.teams for select to authenticated
using (
  public.current_user_is_team_owner(id)
  or public.current_user_is_team_member(id)
);

create policy "owners can insert teams"
on public.teams for insert to authenticated
with check (owner_id = auth.uid());

create policy "owners can update teams"
on public.teams for update to authenticated
using (public.current_user_is_team_owner(id))
with check (owner_id = auth.uid());

create policy "owners can delete teams"
on public.teams for delete to authenticated
using (public.current_user_is_team_owner(id));

drop policy if exists "members can read memberships" on public.team_members;
drop policy if exists "owners manage memberships" on public.team_members;

create policy "members can read memberships"
on public.team_members for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_team_owner(team_id)
);

create policy "owners manage memberships"
on public.team_members for all to authenticated
using (public.current_user_is_team_owner(team_id))
with check (public.current_user_is_team_owner(team_id));

-- 4) Policy Storage del logo senza interrogazioni RLS ricorsive.
drop policy if exists "authenticated team assets upload" on storage.objects;
drop policy if exists "owners update team assets" on storage.objects;
drop policy if exists "owners delete team assets" on storage.objects;

create policy "authenticated team assets upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'team-assets'
  and public.current_user_owns_team_asset(name)
);

create policy "owners update team assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'team-assets'
  and public.current_user_owns_team_asset(name)
)
with check (
  bucket_id = 'team-assets'
  and public.current_user_owns_team_asset(name)
);

create policy "owners delete team assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'team-assets'
  and public.current_user_owns_team_asset(name)
);

-- 5) RPC gestione staff: ruolo tecnico + funzione nell'app.
drop function if exists public.admin_update_staff_profile(uuid, text, text, text, boolean);
drop function if exists public.admin_update_staff_profile(uuid, text, text, text, text, boolean);

create function public.admin_update_staff_profile(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_role text,
  p_app_role text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and app_role = 'admin' and active = true
  ) then
    raise exception 'Operazione riservata all amministratore';
  end if;

  if p_role not in (
    'coach', 'assistant', 'athletic_coach', 'goalkeeper_coach',
    'analyst', 'observer', 'physio', 'collaborator', 'sporting_director'
  ) then
    raise exception 'Ruolo tecnico non valido';
  end if;

  if p_app_role not in ('admin', 'collaborator', 'read_only') then
    raise exception 'Funzione nell app non valida';
  end if;

  update public.profiles
  set first_name = nullif(trim(p_first_name), ''),
      last_name = nullif(trim(p_last_name), ''),
      role = p_role,
      app_role = p_app_role,
      active = p_active,
      updated_at = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.admin_update_staff_profile(uuid, text, text, text, text, boolean) to authenticated;

commit;
