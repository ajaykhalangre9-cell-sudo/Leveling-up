-- Run this after supabase-tasks.sql, since task completion is recorded here.
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "Users can view their own progress" on public.user_progress;
create policy "Users can view their own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

-- There is deliberately no client insert/update policy here. XP is written
-- only by complete_task_and_award_xp(), preventing browser-side score forgery.

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  source text not null default 'task',
  earned_at timestamptz not null default now()
);

create index if not exists xp_events_user_id_earned_at_idx
  on public.xp_events (user_id, earned_at desc);

alter table public.xp_events enable row level security;

drop policy if exists "Users can view their own XP events" on public.xp_events;
create policy "Users can view their own XP events" on public.xp_events for select using (auth.uid() = user_id);

-- XP events are inserted only by complete_task_and_award_xp().

-- Complete a task and record its XP in one transaction. This keeps task history,
-- progress, and the daily leaderboard in sync even when requests are retried.
create or replace function public.complete_task_and_award_xp(p_task_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  task_owner uuid;
  task_is_done boolean;
  new_total_xp integer;
begin
  select user_id, is_done
    into task_owner, task_is_done
    from public.tasks
   where id = p_task_id
   for update;

  if not found or task_owner <> auth.uid() then
    raise exception 'Task not found';
  end if;

  if task_is_done then
    raise exception 'Task has already been completed';
  end if;

  update public.tasks
     set is_done = true,
         completed_at = now(),
         updated_at = now()
   where id = p_task_id;

  insert into public.user_progress (user_id, total_xp, updated_at)
  values (auth.uid(), 10, now())
  on conflict (user_id) do update
    set total_xp = public.user_progress.total_xp + 10,
        updated_at = now()
  returning total_xp into new_total_xp;

  insert into public.xp_events (user_id, amount, source)
  values (auth.uid(), 10, 'task');

  return new_total_xp;
end;
$$;

revoke all on function public.complete_task_and_award_xp(uuid) from public;
grant execute on function public.complete_task_and_award_xp(uuid) to authenticated;

notify pgrst, 'reload schema';
