create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  start_time time not null,
  finish_date date not null,
  finish_time time not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists is_done boolean not null default false;

alter table public.tasks
  add column if not exists updated_at timestamptz not null default now();

alter table public.tasks
  add column if not exists completed_at timestamptz;

alter table public.tasks
  add column if not exists habit_id uuid;

create index if not exists tasks_user_id_created_at_idx
  on public.tasks (user_id, created_at desc);

create index if not exists tasks_user_id_is_done_idx
  on public.tasks (user_id, is_done);

alter table public.tasks enable row level security;

drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks"
  on public.tasks
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
  on public.tasks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks
  for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
