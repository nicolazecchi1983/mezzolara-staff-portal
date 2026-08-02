-- RELEASE A - Identità squadra persistente e sicura
create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  short_name text not null,
  season text,
  category text,
  logo_url text,
  primary_color text not null default '#07194f',
  secondary_color text not null default '#1f93e5',
  kit_pattern text not null default 'solid' check (kit_pattern in ('solid','vertical','horizontal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "team members can read teams" on public.teams;
create policy "team members can read teams" on public.teams
for select to authenticated using (
  owner_id = auth.uid() or exists (
    select 1 from public.team_members tm
    where tm.team_id = teams.id and tm.user_id = auth.uid() and tm.active
  )
);
drop policy if exists "owners can insert teams" on public.teams;
create policy "owners can insert teams" on public.teams
for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "owners can update teams" on public.teams;
create policy "owners can update teams" on public.teams
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owners can delete teams" on public.teams;
create policy "owners can delete teams" on public.teams
for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "members can read memberships" on public.team_members;
create policy "members can read memberships" on public.team_members
for select to authenticated using (user_id = auth.uid() or exists (
  select 1 from public.teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
));
drop policy if exists "owners manage memberships" on public.team_members;
create policy "owners manage memberships" on public.team_members
for all to authenticated using (exists (
  select 1 from public.teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
)) with check (exists (
  select 1 from public.teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-assets', 'team-assets', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists "public team assets read" on storage.objects;
create policy "public team assets read" on storage.objects for select using (bucket_id = 'team-assets');
drop policy if exists "authenticated team assets upload" on storage.objects;
create policy "authenticated team assets upload" on storage.objects for insert to authenticated
with check (bucket_id = 'team-assets' and (storage.foldername(name))[1] in (
  select t.id::text from public.teams t where t.owner_id = auth.uid()
));
drop policy if exists "owners update team assets" on storage.objects;
create policy "owners update team assets" on storage.objects for update to authenticated
using (bucket_id = 'team-assets' and (storage.foldername(name))[1] in (
  select t.id::text from public.teams t where t.owner_id = auth.uid()
));
drop policy if exists "owners delete team assets" on storage.objects;
create policy "owners delete team assets" on storage.objects for delete to authenticated
using (bucket_id = 'team-assets' and (storage.foldername(name))[1] in (
  select t.id::text from public.teams t where t.owner_id = auth.uid()
));
