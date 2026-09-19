create table if not exists public.bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  description text check (char_length(description) <= 400),
  category text not null,
  target_date date,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists bucket_list_items_user_id_created_at_idx
  on public.bucket_list_items (user_id, created_at desc);

alter table public.bucket_list_items enable row level security;

drop policy if exists "Users can view their own bucket list items" on public.bucket_list_items;
create policy "Users can view their own bucket list items"
  on public.bucket_list_items for select using (auth.uid() = user_id);

drop policy if exists "Users can create their own bucket list items" on public.bucket_list_items;
create policy "Users can create their own bucket list items"
  on public.bucket_list_items for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own bucket list items" on public.bucket_list_items;
create policy "Users can update their own bucket list items"
  on public.bucket_list_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own bucket list items" on public.bucket_list_items;
create policy "Users can delete their own bucket list items"
  on public.bucket_list_items for delete using (auth.uid() = user_id);
