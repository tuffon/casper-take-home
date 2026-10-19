import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth/actions";
import { AuthForm } from "@/auth/auth-form";
import { getSignedInUser } from "@/auth/current-user";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Someone already signed in has no reason to see this form.
  if (await getSignedInUser()) {
    redirect("/today");
  }

  return (
    <div className="card">
      <h1 className="page-title">Sign in</h1>
      <p className="mt-2 text-ink-secondary">Welcome back.</p>

      <AuthForm
        action={signIn}
        submitLabel="Sign in"
        pendingLabel="Signing in…"
        isNewAccount={false}
      />

      <p className="mt-8 text-sm text-ink-secondary">
        New here?{" "}
        <Link href="/signup" className="text-link">
          Create an account
        </Link>
      </p>
    </div>
  );
}
