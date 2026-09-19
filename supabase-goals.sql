create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  goal_type text not null check (goal_type in ('This Year', 'Future Goal')),
  target_date date,
  created_at timestamptz not null default now()
);

create index if not exists goals_user_id_created_at_idx
  on public.goals (user_id, created_at desc);

alter table public.goals enable row level security;

drop policy if exists "Users can view their own goals" on public.goals;
create policy "Users can view their own goals"
  on public.goals
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own goals" on public.goals;
create policy "Users can create their own goals"
  on public.goals
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own goals" on public.goals;
create policy "Users can update their own goals"
  on public.goals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own goals" on public.goals;
create policy "Users can delete their own goals"
  on public.goals
  for delete
  using (auth.uid() = user_id);
