import type { Metadata } from "next";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { SetupForm } from "@/practice/setup-form";
import { getWriterProfile } from "@/practice/writer-profile";

export const metadata: Metadata = { title: "Your practice" };

// First-time setup after sign-up. Writers come back here to change their goals.
export default async function SetupPage() {
  const user = await requireSignedInUser();
  const profile = await getWriterProfile(user.id);
  const isFirstVisit = profile === null;

  return (
    <div className="w-full max-w-xl">
      {/* The other pages need a finished setup, so only show links once there is one. */}
      {!isFirstVisit && <AppNav currentPage="account" />}

      <div className="card mt-8 max-w-xl">
        <h1 className="page-title">
          {isFirstVisit ? "Set up your daily practice" : "Your writing goals"}
        </h1>
        <p className="mt-2 text-ink-secondary">
          {isFirstVisit
            ? "Two quick questions, then today’s prompt."
            : "Change what you write and what counts as a day."}
        </p>

        <SetupForm existingProfile={profile} />
      </div>
    </div>
  );
}
