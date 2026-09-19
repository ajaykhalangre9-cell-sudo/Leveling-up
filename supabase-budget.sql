create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency_code text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start)
);

alter table public.monthly_budgets
  add column if not exists currency_code text not null default 'USD';

create table if not exists public.budget_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_month date not null,
  title text not null,
  category text not null default 'Other',
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists monthly_budgets_user_month_idx
  on public.monthly_budgets (user_id, month_start desc);

create index if not exists budget_expenses_user_month_date_idx
  on public.budget_expenses (user_id, expense_month desc, expense_date desc);

alter table public.monthly_budgets enable row level security;
alter table public.budget_expenses enable row level security;

drop policy if exists "Users can view their own monthly budgets" on public.monthly_budgets;
create policy "Users can view their own monthly budgets"
  on public.monthly_budgets
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own monthly budgets" on public.monthly_budgets;
create policy "Users can create their own monthly budgets"
  on public.monthly_budgets
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own monthly budgets" on public.monthly_budgets;
create policy "Users can update their own monthly budgets"
  on public.monthly_budgets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own monthly budgets" on public.monthly_budgets;
create policy "Users can delete their own monthly budgets"
  on public.monthly_budgets
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own budget expenses" on public.budget_expenses;
create policy "Users can view their own budget expenses"
  on public.budget_expenses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own budget expenses" on public.budget_expenses;
create policy "Users can create their own budget expenses"
  on public.budget_expenses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own budget expenses" on public.budget_expenses;
create policy "Users can update their own budget expenses"
  on public.budget_expenses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own budget expenses" on public.budget_expenses;
create policy "Users can delete their own budget expenses"
  on public.budget_expenses
  for delete
  using (auth.uid() = user_id);
