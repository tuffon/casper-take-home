import type { Metadata } from "next";
import Link from "next/link";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { formatShortDate } from "@/practice/dates";
import { listEntries, type Entry } from "@/practice/entries";
import { listGoalCompletions } from "@/practice/goal-completions";
import { calculateAllStreaks } from "@/practice/streak";
import { getWritersToday } from "@/practice/today";
import { getPracticedForms, getWriterProfile } from "@/practice/writer-profile";
import { WRITING_FORMS } from "@/practice/writing-forms";

export const metadata: Metadata = { title: "History" };

// Every day the writer has written, newest first, with their streaks.
export default async function HistoryPage() {
  const user = await requireSignedInUser();
  const [entries, completions, profile, today] = await Promise.all([
    listEntries(user.id),
    listGoalCompletions(user.id),
    getWriterProfile(user.id),
    getWritersToday(),
  ]);

  const streaks = calculateAllStreaks(completions, today);
  const practicedForms = profile ? getPracticedForms(profile) : [];
  const days = groupByDay(entries);
  const totalWords = entries.reduce((sum, entry) => sum + entry.wordCount, 0);

  // e.g. "lyrics:2026-10-19" for every goal reached, to mark pieces below.
  const reachedGoals = new Set(
    completions.map((completion) => `${completion.writingForm}:${completion.completedOn}`),
  );

  return (
    <div className="w-full max-w-2xl">
      <AppNav currentPage="history" userEmail={user.email} />

      <h1 className="display-title mt-10">History</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Overall streak" value={streaks.overall.current} highlight />
        <Stat label="Longest overall" value={streaks.overall.longest} />
        <Stat label="Days written" value={days.length} />
        <Stat label="Total words" value={totalWords.toLocaleString("en-US")} />
      </dl>

      {practicedForms.length > 0 && (
        <ul aria-label="Streak for each kind of writing" className="mt-4 flex flex-wrap gap-2">
          {practicedForms.map((form) => (
            <li key={form} className="streak-chip">
              {WRITING_FORMS[form].label} ·{" "}
              <span className="font-semibold text-spark">{streaks.byForm[form].current}</span>
              -day streak
            </li>
          ))}
        </ul>
      )}

      {days.length === 0 ? (
        <p className="mt-10 text-ink-secondary">
          Nothing here yet.{" "}
          <Link href="/today" className="text-link">
            Start with today’s prompt.
          </Link>
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {days.map((day) => (
            <li key={day.date}>
              <Link
                href={`/history/${day.date}`}
                className="block rounded-card border border-black/8 bg-white p-5 transition-colors hover:border-hairline"
              >
                <span className="font-semibold">{formatShortDate(day.date)}</span>
                <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
                  {day.pieces.map((piece) => (
                    <li key={piece.writingForm}>
                      {WRITING_FORMS[piece.writingForm].label} · {piece.wordCount} words ·{" "}
                      {Math.floor(piece.writingSeconds / 60)} min
                      {reachedGoals.has(`${piece.writingForm}:${day.date}`) && (
                        <span className="font-semibold text-success"> · Goal met</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 line-clamp-2 text-ink-secondary">
                  {day.pieces[0].body || "No writing saved."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Entries arrive newest day first; this keeps that order and puts each
// day's pieces together.
function groupByDay(entries: Entry[]) {
  const days: { date: string; pieces: Entry[] }[] = [];

  for (const entry of entries) {
    const lastDay = days.at(-1);
    if (lastDay && lastDay.date === entry.entryDate) {
      lastDay.pieces.push(entry);
    } else {
      days.push({ date: entry.entryDate, pieces: [entry] });
    }
  }

  return days;
}

type StatProps = {
  label: string;
  value: number | string;
  highlight?: boolean; // show the number in the accent color
};

function Stat({ label, value, highlight = false }: StatProps) {
  return (
    <div className="rounded-card border border-black/8 bg-white p-4">
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd className={`mt-1 text-[28px] leading-tight font-semibold ${highlight ? "text-spark" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
