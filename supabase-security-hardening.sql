-- Safe production hardening migration for an existing Leveling Up database.
-- It changes no existing user rows and can be run more than once.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'goals_title_length_check') then
    alter table public.goals add constraint goals_title_length_check check (char_length(title) between 1 and 160) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'goals_description_length_check') then
    alter table public.goals add constraint goals_description_length_check check (description is null or char_length(description) <= 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_title_length_check') then
    alter table public.tasks add constraint tasks_title_length_check check (char_length(title) between 1 and 160) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_description_length_check') then
    alter table public.tasks add constraint tasks_description_length_check check (description is null or char_length(description) <= 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'habits_title_length_check') then
    alter table public.habits add constraint habits_title_length_check check (char_length(title) between 1 and 160) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'habits_description_length_check') then
    alter table public.habits add constraint habits_description_length_check check (description is null or char_length(description) <= 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'skills_title_length_check') then
    alter table public.skills add constraint skills_title_length_check check (char_length(title) between 1 and 160) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'skills_description_length_check') then
    alter table public.skills add constraint skills_description_length_check check (description is null or char_length(description) <= 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'blogs_title_length_check') then
    alter table public.blogs add constraint blogs_title_length_check check (char_length(title) between 1 and 200) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'blogs_description_length_check') then
    alter table public.blogs add constraint blogs_description_length_check check (char_length(description) between 1 and 10000) not valid;
  end if;
end $$;

-- Recreate profile access policies explicitly so ownership is easy to audit.
alter table public.profiles enable row level security;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = user_id);
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
