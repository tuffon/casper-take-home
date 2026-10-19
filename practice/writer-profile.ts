import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PracticeGoals } from "./goals";
import type { WritingForm } from "./writing-forms";

// Reads the writer's setup answers from the `writer_profiles` table.
// Row level security limits this to the signed-in writer's own profile.

export type WriterProfile = PracticeGoals & {
  usualWritingForm: WritingForm;
  completedSetup: boolean; // false if the writer skipped the setup questions
};

type WriterProfileRow = {
  usual_writing_form: WritingForm;
  daily_word_goal: number | null;
  daily_minute_goal: number | null;
  completed_setup: boolean;
};

/** The writer's profile, or null if they haven't answered or skipped setup yet. */
export async function getWriterProfile(
  userId: string,
): Promise<WriterProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("writer_profiles")
    .select("usual_writing_form, daily_word_goal, daily_minute_goal, completed_setup")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load your profile: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const row = data as WriterProfileRow;
  return {
    usualWritingForm: row.usual_writing_form,
    dailyWordGoal: row.daily_word_goal,
    dailyMinuteGoal: row.daily_minute_goal,
    completedSetup: row.completed_setup,
  };
}

/**
 * For pages that need the writer's goals: sends anyone who has neither
 * answered nor skipped the setup questions to /setup first.
 */
export async function requireWriterProfile(
  userId: string,
): Promise<WriterProfile> {
  const profile = await getWriterProfile(userId);

  if (!profile) {
    redirect("/setup");
  }

  return profile;
}
