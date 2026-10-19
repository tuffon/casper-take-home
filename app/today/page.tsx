import type { Metadata } from "next";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { listCompletedDates } from "@/practice/completed-days";
import { formatLongDate } from "@/practice/dates";
import { listEntriesForDate } from "@/practice/entries";
import { calculateStreaks } from "@/practice/streak";
import { getWritersToday } from "@/practice/today";
import { requireWriterProfile } from "@/practice/writer-profile";
import { WritingWorkspace } from "@/practice/writing-workspace";

export const metadata: Metadata = { title: "Today" };

// The daily writing page: today's date and streak, then the writing
// workspace with a tab for each writing form.
export default async function TodayPage() {
  const user = await requireSignedInUser();
  const profile = await requireWriterProfile(user.id);
  const today = await getWritersToday();

  const [todaysPieces, completedDates] = await Promise.all([
    listEntriesForDate(user.id, today),
    listCompletedDates(user.id),
  ]);
  const streak = calculateStreaks(completedDates, today);

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
            {streak.current} {streak.current === 1 ? "day" : "days"}
          </p>
          <p className="text-sm text-ink-secondary">
            current streak · best {streak.longest}
          </p>
        </div>
      </div>

      <WritingWorkspace
        userId={user.id}
        today={today}
        goals={{
          dailyWordGoal: profile.dailyWordGoal,
          dailyMinuteGoal: profile.dailyMinuteGoal,
        }}
        startingForm={profile.usualWritingForm}
        savedPieces={todaysPieces}
        isTodayFinished={completedDates.includes(today)}
      />
    </div>
  );
}
