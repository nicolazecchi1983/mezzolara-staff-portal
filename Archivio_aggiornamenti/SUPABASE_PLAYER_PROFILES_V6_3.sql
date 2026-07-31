-- V6.3 - Schede personali Rosa
create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  player_key text not null unique,
  full_name text not null,
  role text not null check (role in ('Portiere','Difensore','Centrocampista','Attaccante')),
  birth_year text,
  preferred_foot text check (preferred_foot is null or preferred_foot in ('DX','SX','AMB')),
  height_cm numeric check (height_cm is null or (height_cm between 120 and 230)),
  weight_kg numeric check (weight_kg is null or (weight_kg between 35 and 180)),
  phone text,
  email text,
  technical_notes text,
  injury_notes text,
  updated_at timestamptz not null default now()
);

alter table public.player_profiles enable row level security;

drop policy if exists "Authenticated staff can read player profiles" on public.player_profiles;
create policy "Authenticated staff can read player profiles"
on public.player_profiles for select
to authenticated
using (true);

drop policy if exists "Administrators can manage player profiles" on public.player_profiles;
create policy "Administrators can manage player profiles"
on public.player_profiles for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.active = true
      and profiles.role in ('owner','admin','administrator')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.active = true
      and profiles.role in ('owner','admin','administrator')
  )
);
