-- RELEASE A.3 - INIZIALIZZAZIONE SICURA DELLA SQUADRA
-- Eseguire una sola volta nel SQL Editor di Supabase.

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
    where id = v_user_id and app_role = 'admin' and active = true
  ) then
    raise exception 'Operazione riservata all amministratore';
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
