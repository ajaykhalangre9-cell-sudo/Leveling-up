create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  is_active boolean not null default true,
  last_task_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_id_created_at_idx
  on public.habits (user_id, created_at desc);

create index if not exists habits_user_id_is_active_idx
  on public.habits (user_id, is_active);

alter table public.tasks
  add column if not exists habit_id uuid references public.habits(id) on delete set null;

alter table public.habits enable row level security;

drop policy if exists "Users can view their own habits" on public.habits;
create policy "Users can view their own habits"
  on public.habits
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own habits" on public.habits;
create policy "Users can create their own habits"
  on public.habits
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own habits" on public.habits;
create policy "Users can update their own habits"
  on public.habits
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own habits" on public.habits;
create policy "Users can delete their own habits"
  on public.habits
  for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
