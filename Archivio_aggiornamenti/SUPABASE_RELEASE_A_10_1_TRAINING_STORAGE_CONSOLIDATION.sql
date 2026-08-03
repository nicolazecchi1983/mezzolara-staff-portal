-- RELEASE A.10.1 - CONSOLIDAMENTO STORAGE TRAINING SHEET
-- Script idempotente: rimuove policy storiche/duplicate e crea una sola policy canonica per operazione.

insert into storage.buckets (id, name, public)
values ('training-sheets', 'training-sheets', false)
on conflict (id) do update set public = false;

create or replace function public.storage_object_team_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path to 'public', 'storage'
as $function$
declare
  first_segment text;
begin
  first_segment := (storage.foldername(p_name))[1];
  if first_segment is null
     or first_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return first_segment::uuid;
exception when others then
  return null;
end;
$function$;

-- Policy storiche e policy introdotte nelle release precedenti.
drop policy if exists "Authenticated users can read training sheets" on storage.objects;
drop policy if exists "Authenticated users can view training sheets" on storage.objects;
drop policy if exists "Owner can upload training sheets" on storage.objects;
drop policy if exists "Owner can update training sheets" on storage.objects;
drop policy if exists "Owner can delete training sheets" on storage.objects;
drop policy if exists "Team editors can upload training sheets" on storage.objects;
drop policy if exists "Team editors can update training sheets" on storage.objects;
drop policy if exists "Team editors can delete training sheets" on storage.objects;
drop policy if exists "training sheets authenticated read" on storage.objects;
drop policy if exists "training sheets team read" on storage.objects;
drop policy if exists "training sheets team insert" on storage.objects;
drop policy if exists "training sheets team update" on storage.objects;
drop policy if exists "training sheets team delete" on storage.objects;

-- I file storici, privi di team UUID nella prima cartella, restano leggibili agli autenticati.
-- I nuovi documenti sono isolati per squadra.
create policy "training sheets team read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'training-sheets'
  and (
    public.storage_object_team_id(name) is null
    or public.storage_object_team_id(name) in (select public.current_user_team_ids())
  )
);

create policy "training sheets team insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'training-sheets'
  and public.storage_object_team_id(name) is not null
  and public.current_user_can_edit_team(public.storage_object_team_id(name))
);

create policy "training sheets team update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'training-sheets'
  and public.storage_object_team_id(name) is not null
  and public.current_user_can_edit_team(public.storage_object_team_id(name))
)
with check (
  bucket_id = 'training-sheets'
  and public.storage_object_team_id(name) is not null
  and public.current_user_can_edit_team(public.storage_object_team_id(name))
);

create policy "training sheets team delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'training-sheets'
  and public.storage_object_team_id(name) is not null
  and public.current_user_can_edit_team(public.storage_object_team_id(name))
);
