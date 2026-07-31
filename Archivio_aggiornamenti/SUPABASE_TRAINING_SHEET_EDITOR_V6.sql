-- NZ V6.0 — Training Sheet Editor Base
-- Eseguire una sola volta nel SQL Editor di Supabase.

create table if not exists public.training_sheet_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_text text not null,
  status text not null default 'draft' check (status in ('draft', 'to_complete', 'ready', 'published')),
  session_date date,
  session_time time,
  location text,
  parsed_data jsonb not null default '{}'::jsonb,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_sheet_drafts enable row level security;

drop policy if exists "training_sheet_drafts_select_own" on public.training_sheet_drafts;
create policy "training_sheet_drafts_select_own"
on public.training_sheet_drafts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "training_sheet_drafts_insert_own" on public.training_sheet_drafts;
create policy "training_sheet_drafts_insert_own"
on public.training_sheet_drafts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "training_sheet_drafts_update_own" on public.training_sheet_drafts;
create policy "training_sheet_drafts_update_own"
on public.training_sheet_drafts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "training_sheet_drafts_delete_own" on public.training_sheet_drafts;
create policy "training_sheet_drafts_delete_own"
on public.training_sheet_drafts for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists training_sheet_drafts_user_date_idx
on public.training_sheet_drafts (user_id, session_date desc, created_at desc);
