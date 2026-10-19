import { addDays } from "./dates";
import { WRITING_FORM_NAMES, type WritingForm } from "./writing-forms";

export type StreakSummary = {
  current: number; // days in a row, up to today
  longest: number; // best run ever
};

// One reached goal: this form's goal was met on this day.
export type GoalCompletion = {
  writingForm: WritingForm;
  completedOn: string;
};

/**
 * Works out streaks from a list of days.
 *
 * - A streak is a run of back-to-back days.
 * - The current streak counts back from today. If today isn't done yet, it
 *   counts back from yesterday instead: a streak isn't broken until the day
 *   is actually over.
 */
export function calculateStreaks(
  completedDates: string[],
  today: string,
): StreakSummary {
  const completedDays = new Set(completedDates);

  let current = 0;
  let day = completedDays.has(today) ? today : addDays(today, -1);
  while (completedDays.has(day)) {
    current += 1;
    day = addDays(day, -1);
  }

  // Walk the days in order, counting how long each run lasts.
  let longest = 0;
  let runLength = 0;
  let previousDay: string | null = null;
  for (const completedDay of [...completedDays].sort()) {
    const continuesRun =
      previousDay !== null && addDays(previousDay, 1) === completedDay;
    runLength = continuesRun ? runLength + 1 : 1;
    longest = Math.max(longest, runLength);
    previousDay = completedDay;
  }

  return { current, longest };
}

/**
 * Streaks for the whole account and for each writing form:
 * - a form's streak counts the days that form's goal was reached
 * - the overall streak counts the days at least one form's goal was reached
 */
export function calculateAllStreaks(completions: GoalCompletion[], today: string) {
  const overall = calculateStreaks(
    completions.map((completion) => completion.completedOn),
    today,
  );

  const byForm = {} as Record<WritingForm, StreakSummary>;
  for (const form of WRITING_FORM_NAMES) {
    const daysForThisForm = completions
      .filter((completion) => completion.writingForm === form)
      .map((completion) => completion.completedOn);
    byForm[form] = calculateStreaks(daysForThisForm, today);
  }

  return { overall, byForm };
}
