import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GoalCompletion } from "./streak";
import type { WritingForm } from "./writing-forms";

// A row in `goal_completions` means the writer reached a writing form's
// daily goal on that day. Streaks are counted from these rows (streak.ts).
// Row level security limits these queries to the signed-in writer's rows.

type GoalCompletionRow = {
  writing_form: WritingForm;
  completed_on: string;
};

/** Every goal the writer has reached, on every day. */
export async function listGoalCompletions(userId: string): Promise<GoalCompletion[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("goal_completions")
    .select("writing_form, completed_on")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Could not load reached goals: ${error.message}`);
  }

  return (data as GoalCompletionRow[]).map((row) => ({
    writingForm: row.writing_form,
    completedOn: row.completed_on,
  }));
}

/**
 * Records that the writer reached `form`'s goal on `date`. Returns true only
 * the first time (that's when the app celebrates); later calls change nothing.
 */
export async function recordGoalCompletion(
  userId: string,
  form: WritingForm,
  date: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("goal_completions")
    .upsert(
      { user_id: userId, writing_form: form, completed_on: date },
      { onConflict: "user_id,writing_form,completed_on", ignoreDuplicates: true },
    )
    .select("completed_on"); // only returns the row if it was newly added

  if (error) {
    throw new Error(`Could not record the reached goal: ${error.message}`);
  }

  return data.length > 0;
}
