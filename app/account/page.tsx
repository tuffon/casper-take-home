import type { Metadata } from "next";
import { requireSignedInUser } from "@/auth/current-user";
import { SignOutButton } from "@/auth/sign-out-button";

export const metadata: Metadata = { title: "Your account" };

// A protected page. The check runs on the server before anything renders,
// so a signed-out visitor is redirected and never receives this content.
export default async function AccountPage() {
  const user = await requireSignedInUser();

  return (
    <div className="card">
      <h1 className="page-title">Your account</h1>
      <p className="mt-2 text-ink-secondary">You’re signed in.</p>

      <dl className="mt-8 space-y-5">
        <div>
          <dt className="text-ink-secondary">Email</dt>
          <dd className="mt-0.5 font-semibold">{user.email}</dd>
        </div>
        <div>
          <dt className="text-ink-secondary">User ID</dt>
          <dd className="mt-0.5 font-mono text-sm break-all">{user.id}</dd>
        </div>
      </dl>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
