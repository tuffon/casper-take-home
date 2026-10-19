import type { Metadata } from "next";
import Link from "next/link";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { listCompletedDates } from "@/practice/completed-days";
import { formatShortDate } from "@/practice/dates";
import { listEntries, type Entry } from "@/practice/entries";
import { calculateStreaks } from "@/practice/streak";
import { getWritersToday } from "@/practice/today";
import { WRITING_FORMS } from "@/practice/writing-forms";

export const metadata: Metadata = { title: "History" };

// Every day the writer has written, newest first, with their overall stats.
export default async function HistoryPage() {
  const user = await requireSignedInUser();
  const [entries, completedDates, today] = await Promise.all([
    listEntries(user.id),
    listCompletedDates(user.id),
    getWritersToday(),
  ]);

  const streak = calculateStreaks(completedDates, today);
  const days = groupByDay(entries);
  const totalWords = entries.reduce((sum, entry) => sum + entry.wordCount, 0);

  return (
    <div className="w-full max-w-2xl">
      <AppNav currentPage="history" userEmail={user.email} />

      <h1 className="display-title mt-10">History</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Current streak" value={streak.current} highlight />
        <Stat label="Longest streak" value={streak.longest} />
        <Stat label="Days written" value={days.length} />
        <Stat label="Total words" value={totalWords.toLocaleString("en-US")} />
      </dl>

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
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold">{formatShortDate(day.date)}</span>
                  {completedDates.includes(day.date) && (
                    <span className="text-sm font-semibold text-success">Goal met</span>
                  )}
                </div>
                <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
                  {day.pieces.map((piece) => (
                    <li key={piece.writingForm}>
                      {WRITING_FORMS[piece.writingForm].label} · {piece.wordCount} words ·{" "}
                      {Math.floor(piece.writingSeconds / 60)} min
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
