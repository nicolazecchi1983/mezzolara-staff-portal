-- RELEASE A.9 - CONSOLIDAMENTO TRIGGER CALENDARIO
-- Script idempotente che formalizza la correzione gia verificata in produzione.

create or replace function public.prepare_event_row()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  if new.team_id is null then
    select allowed.team_id
    into new.team_id
    from public.current_user_team_ids() as allowed(team_id)
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
$function$;
