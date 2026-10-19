-- One row per writer per day: what they wrote, to which prompt, and how many words.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null, -- the writer's local calendar day
  writing_form text not null
    check (writing_form in ('freewrite', 'lyrics', 'poetry', 'essay', 'story')),
  prompt text not null, -- the prompt they wrote to, as shown that day
  body text not null default '' check (char_length(body) <= 50000),
  word_count integer not null default 0 check (word_count >= 0),
  writing_seconds integer not null default 0 check (writing_seconds >= 0), -- active typing time
  goal_met boolean not null default false, -- did this day meet the writer's goals when last saved?
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entries_one_per_day unique (user_id, entry_date)
);

-- Row level security: the database limits every query to the signed-in
-- writer's own rows, even if application code forgets to filter.
alter table public.entries enable row level security;

create policy "Writers can read their own entries"
  on public.entries for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Writers can add their own entries"
  on public.entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Writers can update their own entries"
  on public.entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Signed-in users may use the table (row level security still applies).
-- Signed-out visitors get no access at all.
grant select, insert, update on table public.entries to authenticated;
revoke all on table public.entries from anon;
