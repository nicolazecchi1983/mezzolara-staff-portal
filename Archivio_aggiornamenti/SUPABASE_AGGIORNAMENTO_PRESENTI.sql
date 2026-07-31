-- Coach Portal — campi presenti per le Training Sheet
-- Eseguire in Supabase > SQL Editor.

alter table public.events
  add column if not exists present_count smallint,
  add column if not exists squad_total smallint;

alter table public.events
  drop constraint if exists events_present_count_nonnegative,
  drop constraint if exists events_squad_total_positive,
  drop constraint if exists events_present_count_lte_squad_total;

alter table public.events
  add constraint events_present_count_nonnegative
    check (present_count is null or present_count >= 0),
  add constraint events_squad_total_positive
    check (squad_total is null or squad_total > 0),
  add constraint events_present_count_lte_squad_total
    check (
      present_count is null
      or squad_total is null
      or present_count <= squad_total
    );

-- Aggiorna la seduta del 29/07/2026 alle 17:30 con i dati letti dalla TS AL_006.
update public.events
set present_count = 25,
    squad_total = 28
where event_type = 'training'
  and start_at >= timestamptz '2026-07-29 00:00:00+02'
  and start_at <  timestamptz '2026-07-30 00:00:00+02';
