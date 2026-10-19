import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormGoal } from "./goals";
import { WRITING_FORM_NAMES, type WritingForm } from "./writing-forms";

// The writer's setup: which writing forms they practice, each with its own
// daily goal (`writing_goals`), and whether they finished or skipped the
// setup questions (`writer_profiles`). Row level security limits these
// reads to the signed-in writer's own rows.

export type WriterProfile = {
  completedSetup: boolean; // false if the writer skipped the setup questions
  goals: Partial<Record<WritingForm, FormGoal>>; // one per form they practice
};

type WritingGoalRow = {
  writing_form: WritingForm;
  daily_word_goal: number | null;
  daily_minute_goal: number | null;
};

/** The writer's profile, or null if they haven't answered or skipped setup yet. */
export async function getWriterProfile(userId: string): Promise<WriterProfile | null> {
  const supabase = await createSupabaseServerClient();
  const [profileResult, goalsResult] = await Promise.all([
    supabase.from("writer_profiles").select("completed_setup").eq("user_id", userId).maybeSingle(),
    supabase
      .from("writing_goals")
      .select("writing_form, daily_word_goal, daily_minute_goal")
      .eq("user_id", userId),
  ]);

  const error = profileResult.error ?? goalsResult.error;
  if (error) {
    throw new Error(`Could not load your profile: ${error.message}`);
  }
  if (!profileResult.data) {
    return null;
  }

  const goals: WriterProfile["goals"] = {};
  for (const row of goalsResult.data as WritingGoalRow[]) {
    goals[row.writing_form] = {
      dailyWordGoal: row.daily_word_goal,
      dailyMinuteGoal: row.daily_minute_goal,
    };
  }

  return {
    completedSetup: (profileResult.data as { completed_setup: boolean }).completed_setup,
    goals,
  };
}

/** The forms the writer practices, in the app's usual order. */
export function getPracticedForms(profile: WriterProfile): WritingForm[] {
  return WRITING_FORM_NAMES.filter((form) => profile.goals[form] !== undefined);
}

/**
 * For pages that need the writer's goals: sends anyone who has neither
 * answered nor skipped the setup questions to /setup first.
 */
export async function requireWriterProfile(userId: string): Promise<WriterProfile> {
  const profile = await getWriterProfile(userId);

  if (!profile || getPracticedForms(profile).length === 0) {
    redirect("/setup");
  }

  return profile;
}
