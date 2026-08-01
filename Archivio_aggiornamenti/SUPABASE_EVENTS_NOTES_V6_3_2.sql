-- Coach Portal V6.3.2
-- Aggiunge il campo necessario a salvare e riaprire integralmente le Training Sheet.
-- Operazione idempotente: può essere eseguita più volte senza errore.

alter table public.events
  add column if not exists notes text;

comment on column public.events.notes is
  'Metadati JSON dell’evento e dati modificabili del Training Sheet Editor.';
