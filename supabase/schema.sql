-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create Enum Types
create type public.sport_type as enum ('athletics', 'cycling', 'other');

-- Create Tables

-- 1. Profiles Table (Public Profile Data)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Trigger to handle updated_at for profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- 2. Athletes Table
create table public.athletes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birth_date date,
  position text,
  team text,
  sport public.sport_type,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger on_athletes_updated
  before update on public.athletes
  for each row execute procedure public.handle_updated_at();

-- 3. Tests Table
create table public.tests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  protocol_level integer not null,
  total_time numeric not null,
  notes text,
  created_at timestamptz default now() not null
);

-- 4. Test Results Table
create table public.test_results (
  id uuid default uuid_generate_v4() primary key,
  test_id uuid not null references public.tests(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  athlete_name text not null,
  completed_stages integer not null,
  completed_reps_in_last_stage integer not null,
  peak_velocity numeric not null,
  final_distance numeric not null,
  is_last_stage_complete boolean not null default false,
  heart_rate integer,
  eliminated_by_failure boolean default false,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.athletes enable row level security;
alter table public.tests enable row level security;
alter table public.test_results enable row level security;

-- Create Policies

-- Profiles: Users can view and edit their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Athletes: Users can CRUD their own athletes
create policy "Users can view own athletes" on public.athletes
  for select using (auth.uid() = user_id);

create policy "Users can insert own athletes" on public.athletes
  for insert with check (auth.uid() = user_id);

create policy "Users can update own athletes" on public.athletes
  for update using (auth.uid() = user_id);

create policy "Users can delete own athletes" on public.athletes
  for delete using (auth.uid() = user_id);

-- Tests: Users can CRUD their own tests
create policy "Users can view own tests" on public.tests
  for select using (auth.uid() = user_id);

create policy "Users can insert own tests" on public.tests
  for insert with check (auth.uid() = user_id);

create policy "Users can update own tests" on public.tests
  for update using (auth.uid() = user_id);

create policy "Users can delete own tests" on public.tests
  for delete using (auth.uid() = user_id);

-- Test Results: Users can CRUD results where they own the test (via test_id join)
create policy "Users can view own test results" on public.test_results
  for select using (
    exists (
      select 1 from public.tests
      where tests.id = test_results.test_id
      and tests.user_id = auth.uid()
    )
  );

create policy "Users can insert own test results" on public.test_results
  for insert with check (
    exists (
      select 1 from public.tests
      where tests.id = test_results.test_id
      and tests.user_id = auth.uid()
    )
  );

create policy "Users can update own test results" on public.test_results
  for update using (
    exists (
      select 1 from public.tests
      where tests.id = test_results.test_id
      and tests.user_id = auth.uid()
    )
  );

create policy "Users can delete own test results" on public.test_results
  for delete using (
    exists (
      select 1 from public.tests
      where tests.id = test_results.test_id
      and tests.user_id = auth.uid()
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_id, email, full_name)
  values (new.id, new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid conflicts on multiple runs
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
