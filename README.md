# Writers Block

_Casper take-home project._

A daily writing practice app. Every day you get a prompt for the kind of
writing you do (freewriting, lyrics, poetry, essays, stories), write toward
your own goal, and build a streak.

- **Setup:** after signing up, tick the kinds of writing you practice. Each
  gets its own daily goal: a number of words, minutes, both, or neither (then
  any writing counts). Setup can be skipped; it's offered again at each sign-in.
- **Today:** a tab per kind of writing you practice, each with its own prompt
  (7 per form, rotating daily, with "another prompt"), text, goal and streak.
  Reaching a goal shows a small celebration, once per form per day. Unsaved
  writing is kept in the browser until you save it.
- **History:** the overall streak (days you reached at least one goal), a
  streak per form, totals, and every past piece.

**Live app:** https://casper-take-home-rho.vercel.app

## Submission notes

### What works

- Sign up, sign in and sign out with email and password. Every protected
  page and action checks the session on the server.
- Setup: pick the kinds of writing you practice and give each its own words
  and/or minutes goal. It can be skipped, and is offered again at each sign-in
  until it's finished. Goals can be changed later from Account.
- Today: a tab for each kind of writing, each with its own rotating prompt
  ("Another prompt" swaps it), text, typing timer, goal progress and streak.
  The server checks the goal on save; the first time a goal is reached that
  day, a pop-up shows the new streaks.
- Unsaved writing is kept in the browser and comes back when you return.
  Drafts from earlier days are cleared.
- History: the overall streak (days with at least one goal reached), the
  longest streak, a streak per kind of writing, totals, and a read-only page
  for each day.
- Row-level security on every table limits each row to its owner. The app
  uses only Supabase's publishable key.
- Deployed on Vercel and Supabase. `npm test` runs 19 unit tests for dates,
  goals, streaks, prompts and pop-up messages. `npm run test:e2e` drives a
  real browser through the main flows (sign-up, sign-in, sign-out, redirects,
  setup, saving, goals, streaks, pop-up, drafts, history, one writer's data
  hidden from another): 74 checks, all passing against the deployed app.

### What's incomplete

- No password reset, email change or account deletion.
- Email confirmation is off (see Decisions), so email ownership isn't verified.
- Prompts are a fixed set of 7 per kind of writing; writers can't add their own.
- One piece per kind of writing per day, and past days are read-only.
- Drafts live in one browser; they don't sync across devices.
- Writing time is measured in the browser and trusted.
- The browser tests are plain scripts run by hand, not part of a CI pipeline,
  and each run leaves its throwaway accounts behind.
- History and streaks load every row at once. That's fine at this size, but
  long histories would need pagination and streaks calculated in SQL.

### How to run

- **Live:** open https://casper-take-home-rho.vercel.app and create an
  account with any email and a password of 8 or more characters. No
  confirmation email is needed.
- **Locally:** follow "Run it locally" below: Node 20+, a Supabase project with
  the migrations applied, `.env.local` copied from `.env.example`, then
  `npm run dev`. `npm test` runs the unit tests; `npm run test:e2e` runs the
  browser tests (see Tests below).

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
create `writer_profiles` (setup finished or skipped), `writing_goals` (one
goal per form a writer practices), `entries` (one piece of writing per form
per day) and `goal_completions` (each form's goal reached on a day), all with
row-level security so each writer can only read and change their own rows.

**Tests:** `npm test` runs the unit tests for the streak, goal, date, and
prompt logic (`practice/practice-logic.test.ts`).

`npm run test:e2e` runs the browser tests in `tests/e2e/` against
`http://localhost:3000`, or another address set in `E2E_BASE_URL`:

```sh
npx playwright install chromium   # once, downloads the test browser
E2E_BASE_URL=https://casper-take-home-rho.vercel.app npm run test:e2e
```

`auth.mjs` covers sign-up, sign-in, sign-out, error messages and protected
pages (including a forged session cookie). `practice.mjs` covers setup, goals,
streaks, the pop-up, drafts, history, timezones and one writer not seeing
another's entries. Each run signs up new throwaway accounts, and screenshots
land in `test-results/`.

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
| `practice/goals.ts`, `practice/streak.ts` | When a goal is reached; streak rules |
| `practice/writing-forms.ts` | The writing forms and their 7 prompts each |
| `practice/dates.ts`, `practice/today.ts` | Calendar-day helpers; the writer's local "today" |
| `practice/writing-workspace.tsx` | Form tabs, writing area, typing timer, goal progress, save |
| `practice/local-drafts.ts` | Keeps unsaved writing in the browser |
| `practice/celebration-dialog.tsx` | The "goal reached" pop-up |
| `practice/entries.ts`, `practice/goal-completions.ts`, `practice/writer-profile.ts` | Database reads and writes |
| `supabase/migrations/` | Tables and row-level security policies |
| `tests/e2e/` | Browser tests for sign-in and the writing practice |
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
  designed to be public. Data is protected by row-level security.
- **"Today" is the writer's today.** The server runs in UTC, so the browser
  reports its timezone in a cookie and the server uses it to decide which
  day an entry belongs to. The server, not the browser, sets the entry date.
- **Goals and streaks are per form.** 120 words of a story never counts
  toward a 250-word story goal, whatever else was written that day. The first
  save that meets a form's goal adds a row to `goal_completions` (and shows
  the pop-up, once). Each form's streak counts its own completions; the
  overall streak counts days with at least one. Reached goals stay reached,
  so changing goals later doesn't rewrite past streaks.
- **Unsaved writing lives in the browser** (`localStorage`), per writer and
  per day, so leaving the page loses nothing. Drafts from earlier days are
  erased, since those days can no longer be saved.
- **Time counts only while typing.** The clock pauses after a minute without
  typing. It's measured in the browser and trusted, since it's the writer's
  own practice log.
- **Streaks forgive the current day:** the streak only breaks once a day ends
  without a reached goal.
- **Next.js Cache Components are off** to keep the code simple: pages that
  read the session render fresh on every request.
