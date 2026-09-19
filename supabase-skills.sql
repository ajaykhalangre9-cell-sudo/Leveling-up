create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  deadline date,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.skills
  add column if not exists is_completed boolean not null default false;

alter table public.skills
  add column if not exists updated_at timestamptz not null default now();

alter table public.skills
  add column if not exists completed_at timestamptz;

create index if not exists skills_user_id_created_at_idx
  on public.skills (user_id, created_at desc);

create index if not exists skills_user_id_is_completed_idx
  on public.skills (user_id, is_completed);

alter table public.skills enable row level security;

drop policy if exists "Users can view their own skills" on public.skills;
create policy "Users can view their own skills"
  on public.skills
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own skills" on public.skills;
create policy "Users can create their own skills"
  on public.skills
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own skills" on public.skills;
create policy "Users can update their own skills"
  on public.skills
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own skills" on public.skills;
create policy "Users can delete their own skills"
  on public.skills
  for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
