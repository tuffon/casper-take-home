import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { formatLongDate, isCalendarDate } from "@/practice/dates";
import { getEntryForDate } from "@/practice/entries";
import { getWritersToday } from "@/practice/today";
import { WRITING_FORMS } from "@/practice/writing-forms";

export const metadata: Metadata = { title: "Entry" };

// One day's entry, e.g. /history/2026-10-19. Read-only; today's entry links
// back to the editor.
export default async function EntryPage({ params }: PageProps<"/history/[date]">) {
  const user = await requireSignedInUser();
  const { date } = await params;

  if (!isCalendarDate(date)) {
    notFound();
  }

  // Row level security means another writer's entry simply isn't found.
  const [entry, today] = await Promise.all([getEntryForDate(user.id, date), getWritersToday()]);
  if (!entry) {
    notFound();
  }

  return (
    <div className="w-full max-w-2xl">
      <AppNav currentPage="history" userEmail={user.email} />

      <Link href="/history" className="text-link mt-8 inline-block text-sm">
        ‹ All entries
      </Link>

      <h1 className="display-title mt-2">
        {formatLongDate(entry.entryDate)}
      </h1>
      <p className="mt-2 text-ink-secondary">
        {WRITING_FORMS[entry.writingForm].label} · {entry.wordCount} words ·{" "}
        {Math.floor(entry.writingSeconds / 60)} min
        {entry.goalMet && <span className="font-semibold text-success"> · Goal met</span>}
      </p>

      <section className="mt-6 rounded-card bg-white/60 p-6">
        <p className="text-sm text-ink-secondary">Prompt</p>
        <p className="mt-1 font-semibold">{entry.prompt}</p>
      </section>

      <article className="mt-4 rounded-card border border-black/8 bg-white p-6 leading-relaxed whitespace-pre-wrap">
        {entry.body || "No writing saved."}
      </article>

      {entry.entryDate === today && (
        <Link href="/today" className="button-primary mt-6">
          Keep writing
        </Link>
      )}
    </div>
  );
}
