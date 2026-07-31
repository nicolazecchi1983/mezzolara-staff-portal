-- V5.6.0 - Archivio osservazioni importate dal Google Form
create table if not exists public.match_analysis (
  id uuid primary key default gen_random_uuid(),
  observer text,
  match_date date,
  match_name text,
  minute text,
  game_phase text,
  outcome text,
  observation text,
  raw_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.match_analysis enable row level security;

drop policy if exists "Staff can read match analysis" on public.match_analysis;
create policy "Staff can read match analysis"
on public.match_analysis for select
to authenticated
using (true);

drop policy if exists "Owners can insert match analysis" on public.match_analysis;
create policy "Owners can insert match analysis"
on public.match_analysis for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
      and profiles.active = true
  )
);

create index if not exists match_analysis_match_date_idx
  on public.match_analysis(match_date desc);
create index if not exists match_analysis_match_name_idx
  on public.match_analysis(match_name);
