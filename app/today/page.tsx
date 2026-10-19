import type { Metadata } from "next";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { formatLongDate } from "@/practice/dates";
import { listEntriesForDate } from "@/practice/entries";
import { listGoalCompletions } from "@/practice/goal-completions";
import { calculateAllStreaks } from "@/practice/streak";
import { getWritersToday } from "@/practice/today";
import { getPracticedForms, requireWriterProfile } from "@/practice/writer-profile";
import { WritingWorkspace } from "@/practice/writing-workspace";

export const metadata: Metadata = { title: "Today" };

// The daily writing page: today's date and overall streak, then a tab for
// each writing form the writer practices.
export default async function TodayPage() {
  const user = await requireSignedInUser();
  const profile = await requireWriterProfile(user.id);
  const today = await getWritersToday();

  const [todaysPieces, completions] = await Promise.all([
    listEntriesForDate(user.id, today),
    listGoalCompletions(user.id),
  ]);
  const streaks = calculateAllStreaks(completions, today);
  const goalsReachedToday = completions
    .filter((completion) => completion.completedOn === today)
    .map((completion) => completion.writingForm);

  return (
    <div className="w-full max-w-2xl">
      <AppNav currentPage="today" userEmail={user.email} />

      <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-ink-secondary">{formatLongDate(today)}</p>
          <h1 className="display-title">Today’s writing</h1>
        </div>
        <div className="text-right">
          <p className="text-[28px] leading-tight font-semibold text-spark">
            {streaks.overall.current} {streaks.overall.current === 1 ? "day" : "days"}
          </p>
          <p className="text-sm text-ink-secondary">
            overall streak · best {streaks.overall.longest}
          </p>
        </div>
      </div>

      <WritingWorkspace
        userId={user.id}
        today={today}
        practicedForms={getPracticedForms(profile)}
        goals={profile.goals}
        savedPieces={todaysPieces}
        formStreaks={streaks.byForm}
        goalsReachedToday={goalsReachedToday}
      />
    </div>
  );
}
