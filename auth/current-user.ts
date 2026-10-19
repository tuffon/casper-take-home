import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignedInUser = {
  id: string;
  email: string;
};

/**
 * Returns the signed-in user, or null if nobody is signed in.
 *
 * Uses getClaims(), which verifies the session token's signature before
 * trusting it, so a forged or expired cookie counts as "signed out".
 * (Supabase's getSession() does not verify, so never use it for access checks.)
 */
export async function getSignedInUser(): Promise<SignedInUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) {
    return null;
  }

  return {
    id: data.claims.sub,
    email: data.claims.email ?? "",
  };
}

/**
 * Call this at the top of every protected page or Server Action.
 * Signed-out visitors are sent to the sign-in page before any private
 * content is rendered or any private data is touched.
 */
export async function requireSignedInUser(): Promise<SignedInUser> {
  const user = await getSignedInUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
