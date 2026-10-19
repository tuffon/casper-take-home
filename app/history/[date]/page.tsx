import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { formatLongDate, isCalendarDate } from "@/practice/dates";
import { listEntriesForDate } from "@/practice/entries";
import { listGoalCompletions } from "@/practice/goal-completions";
import { getWritersToday } from "@/practice/today";
import { WRITING_FORMS } from "@/practice/writing-forms";

export const metadata: Metadata = { title: "Entry" };

// Everything written on one day, e.g. /history/2026-10-19. Read-only; for
// today there's a link back to the editor.
export default async function DayPage({ params }: PageProps<"/history/[date]">) {
  const user = await requireSignedInUser();
  const { date } = await params;

  if (!isCalendarDate(date)) {
    notFound();
  }

  // Row level security means another writer's pieces simply aren't found.
  const [pieces, completions, today] = await Promise.all([
    listEntriesForDate(user.id, date),
    listGoalCompletions(user.id),
    getWritersToday(),
  ]);
  if (pieces.length === 0) {
    notFound();
  }

  const formsWithGoalReached = completions
    .filter((completion) => completion.completedOn === date)
    .map((completion) => completion.writingForm);

  return (
    <div className="w-full max-w-2xl">
      <AppNav currentPage="history" userEmail={user.email} />

      <Link href="/history" className="text-link mt-8 inline-block text-sm">
        ‹ All entries
      </Link>

      <h1 className="display-title mt-2">{formatLongDate(date)}</h1>

      {pieces.map((piece) => (
        <section key={piece.writingForm} className="mt-8">
          <h2 className="font-serif text-[21px] font-semibold">
            {WRITING_FORMS[piece.writingForm].label}
          </h2>
          <p className="text-sm text-ink-secondary">
            {piece.wordCount} words · {Math.floor(piece.writingSeconds / 60)} min
            {formsWithGoalReached.includes(piece.writingForm) && (
              <span className="font-semibold text-success"> · Goal met</span>
            )}
          </p>

          <div className="mt-3 rounded-card bg-white/60 p-5">
            <p className="text-sm text-ink-secondary">Prompt</p>
            <p className="mt-1 font-semibold">{piece.prompt}</p>
          </div>

          <article className="mt-3 rounded-card border border-black/8 bg-white p-6 leading-relaxed whitespace-pre-wrap">
            {piece.body || "No writing saved."}
          </article>
        </section>
      ))}

      {date === today && (
        <Link href="/today" className="button-primary mt-8">
          Keep writing
        </Link>
      )}
    </div>
  );
}
