# Casper Take-Home

Engineering take-home project. The product idea is still being chosen; this
first milestone is the foundation: email + password accounts, a protected
page, and a live deployment.

**Live app:** _added after the first deploy_

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

**Database setup:** none yet. Supabase Auth manages its own tables. App tables
added later will live in `supabase/migrations/` with row-level security on,
scoped to the signed-in owner.

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
- **Next.js Cache Components are off** to keep the code simple: pages that
  read the session render fresh on every request.
