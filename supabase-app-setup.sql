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

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete set null,
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
  add column if not exists habit_id uuid references public.habits(id) on delete set null;

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

create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  title text not null,
  description text not null,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists blogs_created_at_idx
  on public.blogs (created_at desc);

create index if not exists blogs_author_id_created_at_idx
  on public.blogs (author_id, created_at desc);

alter table public.blogs enable row level security;

drop policy if exists "Anyone can view blogs" on public.blogs;
create policy "Anyone can view blogs"
  on public.blogs
  for select
  using (true);

drop policy if exists "Users can create their own blogs" on public.blogs;
create policy "Users can create their own blogs"
  on public.blogs
  for insert
  with check (auth.uid() = author_id);

drop policy if exists "Writers can update their own blogs" on public.blogs;
create policy "Writers can update their own blogs"
  on public.blogs
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Writers can delete their own blogs" on public.blogs;
create policy "Writers can delete their own blogs"
  on public.blogs
  for delete
  using (auth.uid() = author_id);

notify pgrst, 'reload schema';
