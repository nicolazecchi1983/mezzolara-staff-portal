-- NICOLA ZECCHI COACH PORTAL — PROFILI E RUOLI STAFF
-- Script idempotente: può essere eseguito anche se la tabella profiles esiste già.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  role text not null default 'observer',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'observer';
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role in (
    'owner', 'coach', 'assistant', 'athletic_coach', 'goalkeeper_coach',
    'analyst', 'observer', 'physio', 'collaborator', 'sporting_director', 'read_only'
  )
);

-- Crea o aggiorna i profili per tutti gli utenti presenti in Authentication.
insert into public.profiles (id, email, first_name, last_name, role, active)
select
  u.id,
  u.email,
  nullif(u.raw_user_meta_data ->> 'first_name', ''),
  nullif(u.raw_user_meta_data ->> 'last_name', ''),
  case when lower(u.email) = 'nicola.zecchi83@gmail.com' then 'owner' else 'observer' end,
  true
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  updated_at = now();

-- Staff reale e ruoli concordati.
update public.profiles
set first_name = 'Nicola', last_name = 'Zecchi', role = 'owner', active = true, updated_at = now()
where lower(email) = 'nicola.zecchi83@gmail.com';

update public.profiles
set first_name = 'Lorenzo', last_name = 'Palmieri', role = 'assistant', active = true, updated_at = now()
where lower(email) in ('lorenzopalmieri@alice.it', 'lorenzo.palmieri@alice.it');

update public.profiles
set first_name = 'Maurizio', last_name = 'Aldrovandi', role = 'goalkeeper_coach', active = true, updated_at = now()
where lower(email) in ('maurizioaldrovandi@alice.it', 'maurizio.aldrovandi@alice.it');

update public.profiles
set first_name = 'Luca', last_name = 'Platti', role = 'athletic_coach', active = true, updated_at = now()
where lower(email) = 'luca0276@hotmail.it';

update public.profiles
set first_name = 'Matteo', last_name = 'Mari', role = 'sporting_director', active = true, updated_at = now()
where lower(email) = 'mari.flycom@gmail.com';

-- Crea automaticamente il profilo quando viene aggiunto un nuovo utente.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, active)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    case when lower(new.email) = 'nicola.zecchi83@gmail.com' then 'owner' else 'observer' end,
    true
  )
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert or update of email on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_owner_update_all" on public.profiles;
create policy "profiles_owner_update_all"
on public.profiles for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'nicola.zecchi83@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'nicola.zecchi83@gmail.com');

grant select, update on public.profiles to authenticated;

create or replace function public.update_my_profile(
  p_first_name text,
  p_last_name text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  update public.profiles
  set first_name = nullif(trim(p_first_name), ''),
      last_name = nullif(trim(p_last_name), ''),
      updated_at = now()
  where id = auth.uid();
end;
$$;

create or replace function public.admin_update_staff_profile(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_role text,
  p_active boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'nicola.zecchi83@gmail.com' then
    raise exception 'Operazione riservata all amministratore';
  end if;

  if p_role not in (
    'owner', 'coach', 'assistant', 'athletic_coach', 'goalkeeper_coach',
    'analyst', 'observer', 'physio', 'collaborator', 'sporting_director', 'read_only'
  ) then
    raise exception 'Ruolo non valido';
  end if;

  update public.profiles
  set first_name = nullif(trim(p_first_name), ''),
      last_name = nullif(trim(p_last_name), ''),
      role = p_role,
      active = p_active,
      updated_at = now()
  where id = p_user_id;
end;
$$;

revoke update on public.profiles from authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
grant execute on function public.admin_update_staff_profile(uuid, text, text, text, boolean) to authenticated;
