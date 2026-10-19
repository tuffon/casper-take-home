-- Each writer's answers from the setup questions: what they usually write
-- and what counts as a finished day of practice for them.
create table public.writer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  usual_writing_form text not null
    check (usual_writing_form in ('freewrite', 'lyrics', 'poetry', 'essay', 'story')),
  daily_word_goal integer check (daily_word_goal between 1 and 10000), -- null: no word goal
  daily_minute_goal integer check (daily_minute_goal between 1 and 600), -- null: no time goal
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row level security: writers can only see and change their own profile.
alter table public.writer_profiles enable row level security;

create policy "Writers can read their own profile"
  on public.writer_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Writers can create their own profile"
  on public.writer_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Writers can update their own profile"
  on public.writer_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.writer_profiles to authenticated;
revoke all on table public.writer_profiles from anon;
