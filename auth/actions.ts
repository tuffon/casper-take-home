"use server";

// Server Actions for signing up, signing in, and signing out.
//
// "use server" means these functions only ever run on the server. The forms
// call them directly; Next.js handles the request in between. The password
// travels browser → our server → Supabase, and the resulting session is
// stored in cookies by the Supabase server client.

import { redirect } from "next/navigation";
import { getSignUpValidationError } from "@/auth/validation";
import { getWriterProfile } from "@/practice/writer-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// What a form shows after a submission that didn't redirect.
export type AuthFormState = {
  email: string; // sent back so the person doesn't have to retype it
  errorMessage?: string;
  noticeMessage?: string;
};

export async function signUp(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readEmailAndPassword(formData);

  const validationError = getSignUpValidationError(email, password);
  if (validationError) {
    return { email, errorMessage: validationError };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { email, errorMessage: describeAuthError(error.code, error.message) };
  }

  // "Confirm email" is turned off for this project (see README), so Supabase
  // signs the new user in right away. If it's ever turned back on, there is
  // no session until the person clicks the link in their email.
  if (!data.session) {
    return {
      email,
      noticeMessage: "Check your email to confirm your account, then sign in.",
    };
  }

  // New writers answer the setup questions first.
  redirect("/setup");
}

export async function signIn(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readEmailAndPassword(formData);

  if (!email || !password) {
    return { email, errorMessage: "Enter your email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { email, errorMessage: describeAuthError(error.code, error.message) };
  }

  // Writers who skipped the setup questions (or never saw them) get them
  // again at every sign-in. Everyone else goes straight to today's prompt.
  const profile = await getWriterProfile(data.user.id);
  redirect(profile?.completedSetup ? "/today" : "/setup");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}

function readEmailAndPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  return { email, password };
}

// Turns Supabase error codes into messages a person can act on.
// Anything unrecognised falls back to Supabase's own message.
function describeAuthError(code: string | undefined, fallbackMessage: string) {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match an account.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Try signing in.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a minute and try again.";
    default:
      return fallbackMessage;
  }
}
