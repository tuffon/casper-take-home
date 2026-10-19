-- Goals and streaks are now per writing form. In setup, writers tick the
-- forms they practice and give each its own daily goal. Each form has its
-- own streak; the account streak counts any day at least one form's goal
-- was met.

-- 1. One goal per writing form the writer practices.
create table public.writing_goals (
  user_id uuid not null references auth.users (id) on delete cascade,
  writing_form text not null
    check (writing_form in ('freewrite', 'lyrics', 'poetry', 'essay', 'story')),
  daily_word_goal integer check (daily_word_goal between 1 and 10000), -- null: no word goal
  daily_minute_goal integer check (daily_minute_goal between 1 and 600), -- null: no time goal
  primary key (user_id, writing_form)
);

alter table public.writing_goals enable row level security;

create policy "Writers can read their own goals"
  on public.writing_goals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Writers can add their own goals"
  on public.writing_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Writers can update their own goals"
  on public.writing_goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Needed when a writer stops practicing a form.
create policy "Writers can remove their own goals"
  on public.writing_goals for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.writing_goals to authenticated;
revoke all on table public.writing_goals from anon;

-- Existing writers keep their goal, attached to the form they usually wrote.
insert into public.writing_goals (user_id, writing_form, daily_word_goal, daily_minute_goal)
select user_id, usual_writing_form, daily_word_goal, daily_minute_goal
from public.writer_profiles;

-- writer_profiles now only records whether setup was finished or skipped.
alter table public.writer_profiles
  drop column usual_writing_form,
  drop column daily_word_goal,
  drop column daily_minute_goal;

-- 2. Reached goals are recorded per form and day. Streaks are counted from these.
create table public.goal_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  writing_form text not null
    check (writing_form in ('freewrite', 'lyrics', 'poetry', 'essay', 'story')),
  completed_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, writing_form, completed_on)
);

alter table public.goal_completions enable row level security;

create policy "Writers can read their own completed goals"
  on public.goal_completions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Writers can record their own completed goals"
  on public.goal_completions for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on table public.goal_completions to authenticated;
revoke all on table public.goal_completions from anon;

-- Carry over finished days, credited to the forms written on those days.
insert into public.goal_completions (user_id, writing_form, completed_on)
select distinct days.user_id, entries.writing_form, days.completed_on
from public.completed_days as days
join public.entries as entries
  on entries.user_id = days.user_id and entries.entry_date = days.completed_on;

drop table public.completed_days;
