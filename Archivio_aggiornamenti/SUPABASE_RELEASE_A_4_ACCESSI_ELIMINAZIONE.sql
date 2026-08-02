-- RELEASE A.4 - LIVELLI DI ACCESSO ED ELIMINAZIONE UTENTI
-- Eseguire una sola volta nel SQL Editor di Supabase.

begin;

-- Il proprietario viene identificato dal proprietario reale della squadra.
alter table public.profiles drop constraint if exists profiles_app_role_check;
alter table public.profiles add constraint profiles_app_role_check
  check (app_role in ('owner', 'admin', 'collaborator', 'read_only'));

update public.profiles p
set app_role = 'owner',
    active = true,
    updated_at = now()
where exists (
  select 1
  from public.teams t
  where t.owner_id = p.id
);

-- Mantiene coerente il ruolo della membership con il livello di accesso.
update public.team_members tm
set role = case
  when exists (select 1 from public.teams t where t.id = tm.team_id and t.owner_id = tm.user_id) then 'owner'
  when exists (select 1 from public.profiles p where p.id = tm.user_id and p.app_role = 'admin') then 'admin'
  else 'member'
end;


-- Inizializzazione squadra compatibile con il nuovo livello Proprietario.
create or replace function public.ensure_my_team(
  p_name text,
  p_short_name text,
  p_season text,
  p_category text,
  p_primary_color text,
  p_secondary_color text,
  p_kit_pattern text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null then
    raise exception 'Utente non autenticato';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and app_role in ('owner', 'admin') and active = true
  ) then
    raise exception 'Operazione riservata a Proprietario e Amministratore';
  end if;

  if p_kit_pattern not in ('solid', 'vertical', 'horizontal') then
    raise exception 'Stile maglia non valido';
  end if;

  select id into v_team_id
  from public.teams
  where owner_id = v_user_id
  order by created_at asc
  limit 1;

  if v_team_id is null then
    insert into public.teams (
      owner_id, name, short_name, season, category,
      primary_color, secondary_color, kit_pattern
    ) values (
      v_user_id,
      coalesce(nullif(trim(p_name), ''), 'Squadra'),
      coalesce(nullif(trim(p_short_name), ''), 'Squadra'),
      nullif(trim(p_season), ''),
      nullif(trim(p_category), ''),
      coalesce(nullif(trim(p_primary_color), ''), '#07194f'),
      coalesce(nullif(trim(p_secondary_color), ''), '#1f93e5'),
      p_kit_pattern
    ) returning id into v_team_id;
  end if;

  insert into public.team_members (team_id, user_id, role, active)
  values (v_team_id, v_user_id, 'owner', true)
  on conflict (team_id, user_id) do update
    set role = 'owner', active = true;

  return v_team_id;
end;
$$;

revoke all on function public.ensure_my_team(text,text,text,text,text,text,text) from public;
grant execute on function public.ensure_my_team(text,text,text,text,text,text,text) to authenticated;

-- Aggiornamento sicuro dei profili staff.
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
declare
  v_caller_role text;
  v_target_role text;
  v_is_target_owner boolean;
begin
  select app_role into v_caller_role
  from public.profiles
  where id = auth.uid() and active = true;

  if v_caller_role not in ('owner', 'admin') then
    raise exception 'Operazione riservata a Proprietario e Amministratore';
  end if;

  if not exists (
    select 1
    from public.team_members caller_tm
    join public.team_members target_tm on target_tm.team_id = caller_tm.team_id
    where caller_tm.user_id = auth.uid()
      and caller_tm.active = true
      and target_tm.user_id = p_user_id
  ) and not exists (
    select 1 from public.teams t
    join public.team_members target_tm on target_tm.team_id = t.id
    where t.owner_id = auth.uid()
      and target_tm.user_id = p_user_id
  ) then
    raise exception 'L utente non appartiene alla tua squadra';
  end if;

  select app_role into v_target_role
  from public.profiles
  where id = p_user_id;

  select exists (
    select 1 from public.teams where owner_id = p_user_id
  ) into v_is_target_owner;

  if v_is_target_owner or v_target_role = 'owner' then
    if auth.uid() <> p_user_id then
      raise exception 'Il Proprietario non può essere modificato da altri utenti';
    end if;
    p_app_role := 'owner';
    p_active := true;
  elsif p_app_role = 'owner' then
    raise exception 'Il livello Proprietario non può essere assegnato da questa schermata';
  end if;

  if p_role not in (
    'coach', 'assistant', 'athletic_coach', 'goalkeeper_coach',
    'analyst', 'observer', 'physio', 'collaborator', 'sporting_director'
  ) then
    raise exception 'Ruolo tecnico non valido';
  end if;

  if p_app_role not in ('owner', 'admin', 'collaborator', 'read_only') then
    raise exception 'Livello di accesso non valido';
  end if;

  update public.profiles
  set first_name = nullif(trim(p_first_name), ''),
      last_name = nullif(trim(p_last_name), ''),
      role = p_role,
      app_role = p_app_role,
      active = p_active,
      updated_at = now()
  where id = p_user_id;

  update public.team_members
  set role = case when p_app_role = 'admin' then 'admin' else 'member' end,
      active = p_active
  where user_id = p_user_id
    and not v_is_target_owner;
end;
$$;

grant execute on function public.admin_update_staff_profile(uuid, text, text, text, text, boolean) to authenticated;

commit;
