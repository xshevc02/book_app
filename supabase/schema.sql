create extension if not exists pgcrypto;

create table if not exists public.user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.user_states enable row level security;
alter table public.posts enable row level security;

drop policy if exists "Users can read own state" on public.user_states;
create policy "Users can read own state"
on public.user_states for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own state" on public.user_states;
create policy "Users can insert own state"
on public.user_states for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own state" on public.user_states;
create policy "Users can update own state"
on public.user_states for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Everyone can read public posts" on public.posts;
create policy "Everyone can read public posts"
on public.posts for select
using (true);

drop policy if exists "Signed in users can create posts" on public.posts;
create policy "Signed in users can create posts"
on public.posts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
on public.posts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
on public.posts for delete
to authenticated
using (auth.uid() = user_id);
