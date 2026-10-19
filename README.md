# Writers Block

_Casper take-home project._

A daily writing practice app. Every day you get a prompt for the kind of
writing you do (freewriting, lyrics, poetry, essays, stories), write toward
your own goal, and build a streak.

- **Setup:** after signing up, choose what you usually write and what counts
  as a day of practice: a word goal, a time goal, both, or just showing up.
- **Today:** a tab per writing form, each with its own prompt (7 per form,
  rotating daily, with "another prompt") and its own text. Goals count
  everything written today across the tabs. Unsaved writing is kept in the
  browser until you save it. Finishing the day shows a small celebration.
- **History:** current and longest streak, totals, and every past entry.

**Live app:** https://casper-take-home-rho.vercel.app

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
Supabase (Auth + Postgres) · Vercel

## Run it locally

1. Install Node.js 20 or newer, then run `npm install`.
2. Create a free Supabase project. In its dashboard:
   - **Authentication → Sign In / Providers → Email:** turn **Confirm email**
     off and set **Minimum password length** to `8` (see "Decisions" below).
   - **Authentication → URL Configuration:** set **Site URL** to
     `http://localhost:3000`.
3. Copy `.env.example` to `.env.local` and fill in the project URL and
   publishable key (**Project Settings → API Keys**).
4. Run `npm run dev` and open http://localhost:3000.

**Database setup:** run the SQL files in `supabase/migrations/` in order
(paste them into the Supabase SQL Editor, or use `supabase db push`). They
create `writer_profiles` (setup answers), `entries` (one piece of writing per
form per day) and `completed_days` (days the goals were met), all with
row-level security so each writer can only read and change their own rows.

**Tests:** `npm test` runs the unit tests for the streak, goal, date, and
prompt logic (`practice/practice-logic.test.ts`).

## How sign-in works

1. The sign-in form sends the email and password to a Server Action
   (`auth/actions.ts`), which runs only on the server.
2. The server asks Supabase to check them. On success Supabase returns a
   session, which the Supabase server client stores in a browser cookie.
3. Every later request carries that cookie. `proxy.ts` refreshes it shortly
   before it expires, so people stay signed in.
4. Protected pages call `requireSignedInUser()` (`auth/current-user.ts`). It
   verifies the session's signature with Supabase's `getClaims()`; without a
   valid session the server redirects to `/login` before rendering anything.
5. Signing out ends the session in Supabase and clears the cookie.

## Project map

| Path | What it does |
| --- | --- |
| `app/page.tsx` | Public home page |
| `app/login`, `app/signup` | Sign-in and sign-up pages |
| `app/account` | Protected page showing the signed-in user |
| `auth/actions.ts` | Server Actions: sign up, sign in, sign out |
| `auth/current-user.ts` | Server-side "who is signed in?" checks |
| `auth/auth-form.tsx` | Email + password form with errors and loading state |
| `auth/validation.ts` | Sign-up rules shared by the form and the server |
| `proxy.ts`, `lib/supabase/` | Supabase clients and session refresh |
| `app/setup`, `app/today`, `app/history` | Setup questions, the daily page, past entries |
| `practice/actions.ts` | Server Actions: save setup answers, save today's entry |
| `practice/goals.ts`, `practice/streak.ts` | What counts as a finished day; streak rules |
| `practice/writing-forms.ts` | The writing forms and their 7 prompts each |
| `practice/dates.ts`, `practice/today.ts` | Calendar-day helpers; the writer's local "today" |
| `practice/writing-workspace.tsx` | Form tabs, writing area, typing timer, day totals, save |
| `practice/local-drafts.ts` | Keeps unsaved writing in the browser |
| `practice/celebration-dialog.tsx` | The "day complete" pop-up |
| `practice/entries.ts`, `practice/completed-days.ts`, `practice/writer-profile.ts` | Database reads and writes |
| `supabase/migrations/` | Tables and row-level security policies |
| `app/globals.css` | Design tokens (colors, type, radii) and shared styles |

## Decisions

- **Email confirmation is off.** Supabase's built-in email sender only
  delivers to members of the project's own team (and 2 emails per hour), so a
  reviewer could never receive a confirmation link. With confirmation off,
  anyone can create an account and sign in immediately. The trade-off: email
  ownership isn't verified. For production, connect a custom SMTP provider and
  turn confirmation back on; the sign-up action already handles the "check
  your email" case.
- **Access checks happen on the server**, in every protected page and action,
  not only in `proxy.ts` and never just by hiding UI.
- **No secret keys.** The app uses only Supabase's publishable key, which is
  designed to be public. Data will be protected by row-level security.
- **"Today" is the writer's today.** The server runs in UTC, so the browser
  reports its timezone in a cookie and the server uses it to decide which
  day an entry belongs to. The server, not the browser, sets the entry date.
- **Goals apply to the whole day,** however the writing is split between
  forms. The first save that meets them adds a row to `completed_days` (and
  triggers the pop-up, once). Finished days stay finished, so changing your
  goals later doesn't rewrite your past streak.
- **Unsaved writing lives in the browser** (`localStorage`), per writer and
  per day, so leaving the page loses nothing. Drafts from earlier days are
  erased, since those days can no longer be saved.
- **Time counts only while typing.** The clock pauses after a minute without
  typing. It's measured in the browser and trusted, since it's the writer's
  own practice log.
- **Streaks forgive the current day:** the streak only breaks once a day ends
  without a finished entry.
- **Next.js Cache Components are off** to keep the code simple: pages that
  read the session render fresh on every request.
