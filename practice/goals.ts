// What counts as a finished day of practice. Each writer picks their goals
// during setup (app/setup): a word goal, a time goal, both, or neither.

export type PracticeGoals = {
  dailyWordGoal: number | null; // null means "no word goal"
  dailyMinuteGoal: number | null; // null means "no time goal"
};

// The four answers to "What should count as a day of practice?"
export const GOAL_TYPES = {
  words: { label: "A word count", description: "Write a set number of words." },
  time: { label: "Time spent writing", description: "Write for a set number of minutes." },
  both: { label: "Both", description: "Hit a word goal and a time goal." },
  none: { label: "Just showing up", description: "Any writing counts." },
} as const;

export type GoalType = keyof typeof GOAL_TYPES;

export function isGoalType(value: unknown): value is GoalType {
  return typeof value === "string" && Object.hasOwn(GOAL_TYPES, value);
}

/** Works out which goal type a saved set of goals corresponds to. */
export function getGoalType(goals: PracticeGoals): GoalType {
  const hasWordGoal = goals.dailyWordGoal !== null;
  const hasMinuteGoal = goals.dailyMinuteGoal !== null;

  if (hasWordGoal && hasMinuteGoal) return "both";
  if (hasWordGoal) return "words";
  if (hasMinuteGoal) return "time";
  return "none";
}

/** Counts words the way a person would: groups of characters separated by spaces. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/**
 * True once the day's writing meets every goal the writer chose.
 * With no goals at all ("just showing up"), any writing counts.
 */
export function isDayComplete(
  goals: PracticeGoals,
  wordCount: number,
  writingSeconds: number,
): boolean {
  if (goals.dailyWordGoal === null && goals.dailyMinuteGoal === null) {
    return wordCount > 0;
  }

  const wordGoalMet =
    goals.dailyWordGoal === null || wordCount >= goals.dailyWordGoal;
  const minuteGoalMet =
    goals.dailyMinuteGoal === null ||
    writingSeconds >= goals.dailyMinuteGoal * 60;

  return wordGoalMet && minuteGoalMet;
}
