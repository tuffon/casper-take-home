import type { Metadata } from "next";
import Link from "next/link";
import { requireSignedInUser } from "@/auth/current-user";
import { AppNav } from "@/components/app-nav";
import { formatLongDate } from "@/practice/dates";
import { getEntryForDate, listCompletedDates, type Entry } from "@/practice/entries";
import { calculateStreaks } from "@/practice/streak";
import { getWritersToday } from "@/practice/today";
import { requireWriterProfile } from "@/practice/writer-profile";
import { WritingEditor } from "@/practice/writing-editor";
import {
  WRITING_FORMS,
  WRITING_FORM_NAMES,
  getPromptForDay,
  isWritingForm,
  type WritingForm,
} from "@/practice/writing-forms";

export const metadata: Metadata = { title: "Today" };

// The daily writing page. The URL can choose a form and prompt,
// e.g. /today?form=lyrics&skip=1 is the next lyrics prompt after today's.
export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const user = await requireSignedInUser();
  const profile = await requireWriterProfile(user.id);
  const today = await getWritersToday();

  const [todaysEntry, completedDates] = await Promise.all([
    getEntryForDate(user.id, today),
    listCompletedDates(user.id),
  ]);
  const streak = calculateStreaks(completedDates, today);

  const { form, skip } = await searchParams;
  const { writingForm, prompt, promptSkip } = choosePrompt({
    requestedForm: form,
    requestedSkip: skip,
    todaysEntry,
    usualWritingForm: profile.usualWritingForm,
    today,
  });

  return (
    <div className="w-full max-w-2xl">
      <AppNav currentPage="today" />

      <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-ink-secondary">{formatLongDate(today)}</p>
          <h1 className="text-[40px] leading-tight font-semibold tracking-[-0.015em]">
            Today’s writing
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[28px] leading-tight font-semibold">
            {streak.current} {streak.current === 1 ? "day" : "days"}
          </p>
          <p className="text-sm text-ink-secondary">
            current streak · best {streak.longest}
          </p>
        </div>
      </div>

      {/* Writing form picker. scroll={false} keeps the page where it is. */}
      <nav aria-label="Writing form" className="segmented mt-8">
        {WRITING_FORM_NAMES.map((name) => (
          <Link
            key={name}
            href={`/today?form=${name}`}
            scroll={false}
            aria-current={name === writingForm ? "page" : undefined}
            className="segmented-option"
          >
            {WRITING_FORMS[name].label}
          </Link>
        ))}
      </nav>

      <section className="mt-6 rounded-card border border-black/8 bg-white p-6">
        <p className="text-sm text-ink-secondary">
          {WRITING_FORMS[writingForm].label} prompt
        </p>
        <p id="todays-prompt" className="mt-2 text-[21px] leading-snug font-semibold">
          {prompt}
        </p>
        <Link
          href={`/today?form=${writingForm}&skip=${promptSkip + 1}`}
          scroll={false}
          className="text-link mt-4 inline-block text-sm"
        >
          Another prompt
        </Link>
      </section>

      <WritingEditor
        writingForm={writingForm}
        prompt={prompt}
        goals={profile}
        savedBody={todaysEntry?.body ?? ""}
        savedWritingSeconds={todaysEntry?.writingSeconds ?? 0}
      />
    </div>
  );
}

type ChoosePromptInput = {
  requestedForm: string | string[] | undefined; // from the URL
  requestedSkip: string | string[] | undefined; // from the URL
  todaysEntry: Entry | null;
  usualWritingForm: WritingForm;
  today: string;
};

/**
 * Which prompt to show, in order of preference:
 * 1. the form (and "another prompt" step) the writer just picked
 * 2. the prompt today's saved entry was written to
 * 3. today's prompt for the writer's usual form
 */
function choosePrompt(input: ChoosePromptInput) {
  const skipNumber = Number(input.requestedSkip);
  const promptSkip = Number.isInteger(skipNumber) && skipNumber > 0 ? skipNumber : 0;

  if (isWritingForm(input.requestedForm)) {
    return {
      writingForm: input.requestedForm,
      prompt: getPromptForDay(input.requestedForm, input.today, promptSkip),
      promptSkip,
    };
  }

  if (input.todaysEntry) {
    return {
      writingForm: input.todaysEntry.writingForm,
      prompt: input.todaysEntry.prompt,
      promptSkip: 0,
    };
  }

  return {
    writingForm: input.usualWritingForm,
    prompt: getPromptForDay(input.usualWritingForm, input.today),
    promptSkip: 0,
  };
}
