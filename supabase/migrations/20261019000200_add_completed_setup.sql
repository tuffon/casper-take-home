-- Whether the writer answered the setup questions (true) or skipped them
-- (false). Writers who skipped are asked again each time they sign in.
alter table public.writer_profiles
  add column completed_setup boolean not null default false;

-- Everyone who had a profile before this change answered the questions.
update public.writer_profiles set completed_setup = true;
