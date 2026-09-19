-- Production leaderboard migration. Run after supabase-auth-setup.sql and
-- supabase-progress.sql. It does not delete or recreate any existing table.
--
-- This keeps the legacy get_daily_leaderboard() RPC intact for compatibility.
-- The application uses get_leaderboard(), whose standings reflect cumulative XP.

-- Supports the ordered Top 50, including new accounts with zero XP.
create index if not exists user_progress_leaderboard_idx
  on public.user_progress (total_xp desc, user_id asc);

-- XP is authoritative only when awarded by a trusted database routine.
-- Existing users can still read their own progress/history, but cannot forge it
-- from browser JavaScript.
drop policy if exists "Users can create their own progress" on public.user_progress;
drop policy if exists "Users can update their own progress" on public.user_progress;
drop policy if exists "Users can create their own XP events" on public.xp_events;

-- Returns only public leaderboard fields. The window function calculates a
-- current global position; no position is stored and therefore cannot go stale.
create or replace function public.get_leaderboard()
returns table (
  position bigint,
  full_name text,
  avatar_url text,
  rank_code text,
  level integer,
  total_xp integer,
  is_current boolean,
  above_full_name text,
  above_xp integer,
  xp_to_overtake integer
)
language sql
security definer
set search_path = public
as $$
  with eligible as materialized (
    select
      coalesce(up.user_id, p.user_id) as user_id,
      coalesce(nullif(trim(p.full_name), ''), 'Leveling Up member') as full_name,
      p.avatar_url,
      coalesce(up.total_xp, 0) as total_xp,
      (floor(coalesce(up.total_xp, 0) / 1000.0)::integer + 1) as level
    from public.profiles p
    full outer join public.user_progress up on up.user_id = p.user_id
  ), ranked as materialized (
    select
      *,
      row_number() over (
        order by total_xp desc, level desc, user_id asc
      ) as position,
      lag(full_name) over (
        order by total_xp desc, level desc, user_id asc
      ) as above_full_name,
      lag(total_xp) over (
        order by total_xp desc, level desc, user_id asc
      ) as above_xp
    from eligible
  )
  select
    position,
    full_name,
    avatar_url,
    case
      when level > 30 then 'S'
      when level > 20 then 'A'
      when level > 15 then 'B'
      when level > 10 then 'C'
      when level > 5 then 'D'
      else 'E'
    end as rank_code,
    level,
    total_xp,
    user_id = auth.uid() as is_current,
    case when user_id = auth.uid() then above_full_name end as above_full_name,
    case when user_id = auth.uid() then above_xp end as above_xp,
    case
      when user_id = auth.uid() and above_xp is not null
        then greatest(1, above_xp - total_xp + 1)
    end as xp_to_overtake
  from ranked
  where position <= 50 or user_id = auth.uid()
  order by position;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;

notify pgrst, 'reload schema';
