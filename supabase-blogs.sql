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
