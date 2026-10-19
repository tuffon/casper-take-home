import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/auth/actions";
import { AuthForm } from "@/auth/auth-form";
import { getSignedInUser } from "@/auth/current-user";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  // Someone already signed in has no reason to see this form.
  if (await getSignedInUser()) {
    redirect("/account");
  }

  return (
    <div className="card">
      <h1 className="page-title">Create an account</h1>
      <p className="mt-2 text-ink-secondary">
        Use your email and a password.
      </p>

      <AuthForm
        action={signUp}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        isNewAccount={true}
      />

      <p className="mt-8 text-sm text-ink-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-link">
          Sign in
        </Link>
      </p>
    </div>
  );
}
