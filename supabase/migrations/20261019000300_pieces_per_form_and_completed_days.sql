-- Writers can now write one piece per writing form each day (a story and a
-- poem on the same day, say). Their goals apply to the day's total, so
-- "finished the day" is now tracked in its own table instead of per entry.

alter table public.entries drop constraint entries_one_per_day;
alter table public.entries
  add constraint entries_one_per_form_per_day unique (user_id, entry_date, writing_form);

-- One row per day the writer finished: their writing that day met every
-- goal they had at the time. Streaks are counted from these rows.
create table public.completed_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, completed_on)
);

alter table public.completed_days enable row level security;

create policy "Writers can read their own completed days"
  on public.completed_days for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Writers can record their own completed days"
  on public.completed_days for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on table public.completed_days to authenticated;
revoke all on table public.completed_days from anon;

-- Keep the days already finished under the old one-entry-per-day rule.
insert into public.completed_days (user_id, completed_on)
select user_id, entry_date from public.entries where goal_met
on conflict do nothing;

alter table public.entries drop column goal_met;
