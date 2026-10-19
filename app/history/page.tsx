import type { Metadata } from "next";
import Link from "next/link";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { formatShortDate } from "@/practice/dates";
import { listEntries } from "@/practice/entries";
import { calculateStreaks } from "@/practice/streak";
import { getWritersToday } from "@/practice/today";
import { WRITING_FORMS } from "@/practice/writing-forms";

export const metadata: Metadata = { title: "History" };

// Every day the writer has written, newest first, with their overall stats.
export default async function HistoryPage() {
  const user = await requireSignedInUser();
  const [entries, today] = await Promise.all([listEntries(user.id), getWritersToday()]);

  const completedDates = entries.filter((entry) => entry.goalMet).map((entry) => entry.entryDate);
  const streak = calculateStreaks(completedDates, today);
  const totalWords = entries.reduce((sum, entry) => sum + entry.wordCount, 0);

  return (
    <div className="w-full max-w-2xl">
      <AppNav currentPage="history" userEmail={user.email} />

      <h1 className="display-title mt-10">History</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Current streak" value={streak.current} highlight />
        <Stat label="Longest streak" value={streak.longest} />
        <Stat label="Days written" value={entries.length} />
        <Stat label="Total words" value={totalWords.toLocaleString("en-US")} />
      </dl>

      {entries.length === 0 ? (
        <p className="mt-10 text-ink-secondary">
          Nothing here yet.{" "}
          <Link href="/today" className="text-link">
            Start with today’s prompt.
          </Link>
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {entries.map((entry) => (
            <li key={entry.entryDate}>
              <Link
                href={`/history/${entry.entryDate}`}
                className="block rounded-card border border-black/8 bg-white p-5 transition-colors hover:border-hairline"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold">{formatShortDate(entry.entryDate)}</span>
                  {entry.goalMet && (
                    <span className="text-sm font-semibold text-success">Goal met</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-secondary">
                  {WRITING_FORMS[entry.writingForm].label} · {entry.wordCount} words ·{" "}
                  {Math.floor(entry.writingSeconds / 60)} min
                </p>
                <p className="mt-3 line-clamp-2 text-ink-secondary">
                  {entry.body || "No writing saved."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
