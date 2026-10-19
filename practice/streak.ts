import { addDays } from "./dates";

export type StreakSummary = {
  current: number; // days in a row, up to today
  longest: number; // best run ever
};

/**
 * Works out streaks from the days the writer completed their practice.
 *
 * - A streak is a run of back-to-back completed days.
 * - The current streak counts back from today. If today isn't finished yet,
 *   it counts back from yesterday instead: a streak isn't broken until the
 *   day is actually over.
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
