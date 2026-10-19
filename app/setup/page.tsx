import type { Metadata } from "next";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { SetupForm } from "@/practice/setup-form";
import { SkipSetupButton } from "@/practice/skip-setup-button";
import { getWriterProfile } from "@/practice/writer-profile";

export const metadata: Metadata = { title: "Your practice" };

// The setup questions. New writers land here after sign-up, writers who
// skipped land here at each sign-in, and anyone can return to change goals.
export default async function SetupPage() {
  const user = await requireSignedInUser();
  const profile = await getWriterProfile(user.id);
  const hasCompletedSetup = profile?.completedSetup === true;

  return (
    <div className="w-full max-w-xl">
      {/* Today needs a profile (answered or skipped), so only link there once one exists. */}
      {profile && <AppNav currentPage="account" userEmail={user.email} />}

      <div className="card mt-8 max-w-xl">
        <h1 className="page-title">
          {hasCompletedSetup ? "Your writing goals" : "Set up your daily practice"}
        </h1>
        <p className="mt-2 text-ink-secondary">
          {hasCompletedSetup
            ? "Change what you practice and the goal for each."
            : "Pick what you practice and set a goal for each. Then today’s prompt."}
        </p>

        <SetupForm existingProfile={hasCompletedSetup ? profile : null} />

        {!hasCompletedSetup && (
          <div className="mt-5 text-center">
            <SkipSetupButton />
          </div>
        )}
      </div>
    </div>
  );
}
