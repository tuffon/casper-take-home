// Each writing form the writer practices has its own daily goal, chosen in
// setup (app/setup): a number of words, a number of minutes, both, or
// neither, in which case any writing counts.

export type FormGoal = {
  dailyWordGoal: number | null; // null means "no word goal"
  dailyMinuteGoal: number | null; // null means "no time goal"
};

/** Counts words the way a person would: groups of characters separated by spaces. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/**
 * True once a piece of writing meets its form's goal (every part of the
 * goal that was set). With no goal set, any writing counts.
 */
export function isGoalMet(
  goal: FormGoal,
  wordCount: number,
  writingSeconds: number,
): boolean {
  if (goal.dailyWordGoal === null && goal.dailyMinuteGoal === null) {
    return wordCount > 0;
  }

  const wordGoalMet =
    goal.dailyWordGoal === null || wordCount >= goal.dailyWordGoal;
  const minuteGoalMet =
    goal.dailyMinuteGoal === null ||
    writingSeconds >= goal.dailyMinuteGoal * 60;

  return wordGoalMet && minuteGoalMet;
}

/** A short description of a goal: "250 words", "15 min", "250 words and 15 min", or "any writing". */
export function describeGoal(goal: FormGoal): string {
  const parts: string[] = [];
  if (goal.dailyWordGoal !== null) {
    parts.push(`${goal.dailyWordGoal} words`);
  }
  if (goal.dailyMinuteGoal !== null) {
    parts.push(`${goal.dailyMinuteGoal} min`);
  }
  return parts.length === 0 ? "any writing" : parts.join(" and ");
}
