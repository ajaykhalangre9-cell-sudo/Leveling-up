-- Profile security migration. Run after supabase-auth-setup.sql.
-- It preserves the existing profiles table, user_id uniqueness, and all rows.
-- Profile creation belongs exclusively to the auth.users trigger; browser clients
-- can only read and update the row that matches their authenticated identity.

alter table public.profiles enable row level security;

-- One-time-safe backfill for accounts created before the auth trigger existed.
-- `do nothing` preserves every existing profile and the user_id uniqueness rule.
insert into public.profiles (user_id, full_name)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1))
from auth.users
on conflict (user_id) do nothing;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own profile" on public.profiles;

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No DELETE policy is created: direct profile deletion remains denied by RLS.
-- The existing security-definer auth trigger remains the only profile creator.

-- The dashboard writes one stable object per user: <auth.uid()>/avatar.jpg.
-- These policies are intentionally bucket-scoped and cannot authorize a user
-- to write another user's object. The public-read configuration of this bucket,
-- if used, is managed by the bucket itself and is unchanged here.
drop policy if exists "Users can insert their own profile photos" on storage.objects;
create policy "Users can insert their own profile photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own profile photos" on storage.objects;
create policy "Users can update their own profile photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
