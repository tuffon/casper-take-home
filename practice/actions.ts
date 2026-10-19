"use server";

// Server Actions for the writing practice: saving setup answers and saving
// today's writing. Both check who is signed in first, and the database's
// row level security makes sure they can only touch that writer's rows.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSignedInUser } from "@/auth/current-user";
import { listGoalCompletions, recordGoalCompletion } from "@/practice/goal-completions";
import { countWords, isGoalMet, type FormGoal } from "@/practice/goals";
import { calculateAllStreaks } from "@/practice/streak";
import { getWritersToday } from "@/practice/today";
import { getWriterProfile } from "@/practice/writer-profile";
import {
  WRITING_FORMS,
  WRITING_FORM_NAMES,
  isKnownPrompt,
  isWritingForm,
  type WritingForm,
} from "@/practice/writing-forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ---------- Setup ----------

export type SetupFormState = {
  errorMessage?: string;
};

// These limits match the checks in the database.
const MAXIMUM_WORD_GOAL = 10000;
const MAXIMUM_MINUTE_GOAL = 600;

const SETUP_SAVE_FAILED: SetupFormState = {
  errorMessage: "Couldn’t save your answers. Please try again.",
};

export async function saveWriterProfile(
  _previousState: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  const user = await requireSignedInUser();

  // Each ticked checkbox arrives as a "writingForms" value.
  const tickedForms = formData.getAll("writingForms");
  const chosenForms = WRITING_FORM_NAMES.filter((form) => tickedForms.includes(form));
  if (chosenForms.length === 0) {
    return { errorMessage: "Pick at least one kind of writing to practice." };
  }

  const goalRows = [];
  for (const form of chosenForms) {
    const label = WRITING_FORMS[form].label;
    const dailyWordGoal = readOptionalGoal(formData.get(`${form}-words`), MAXIMUM_WORD_GOAL);
    const dailyMinuteGoal = readOptionalGoal(formData.get(`${form}-minutes`), MAXIMUM_MINUTE_GOAL);

    if (dailyWordGoal === "invalid") {
      return { errorMessage: `${label}: the word goal must be a whole number from 1 to 10,000.` };
    }
    if (dailyMinuteGoal === "invalid") {
      return { errorMessage: `${label}: the time goal must be a whole number from 1 to 600 minutes.` };
    }

    goalRows.push({
      user_id: user.id,
      writing_form: form,
      daily_word_goal: dailyWordGoal,
      daily_minute_goal: dailyMinuteGoal,
    });
  }

  const supabase = await createSupabaseServerClient();

  // Replace the writer's goals with the new set, then mark setup as finished.
  const { error: removeError } = await supabase.from("writing_goals").delete().eq("user_id", user.id);
  if (removeError) {
    return SETUP_SAVE_FAILED;
  }

  const { error: insertError } = await supabase.from("writing_goals").insert(goalRows);
  if (insertError) {
    return SETUP_SAVE_FAILED;
  }

  const { error: profileError } = await supabase.from("writer_profiles").upsert({
    user_id: user.id,
    completed_setup: true,
    updated_at: new Date().toISOString(),
  });
  if (profileError) {
    return SETUP_SAVE_FAILED;
  }

  redirect("/today");
}

/**
 * "Skip for now": takes the writer straight to today's prompt. They get every
 * writing form with no goal (any writing counts), and are asked the setup
 * questions again the next time they sign in. Existing answers are kept.
 */
export async function skipSetup() {
  const user = await requireSignedInUser();
  const existingProfile = await getWriterProfile(user.id);

  if (!existingProfile) {
    const supabase = await createSupabaseServerClient();

    const { error: profileError } = await supabase
      .from("writer_profiles")
      .insert({ user_id: user.id, completed_setup: false });
    if (profileError) {
      throw new Error(`Could not skip setup: ${profileError.message}`);
    }

    const { error: goalsError } = await supabase.from("writing_goals").insert(
      WRITING_FORM_NAMES.map((form) => ({
        user_id: user.id,
        writing_form: form,
        daily_word_goal: null,
        daily_minute_goal: null,
      })),
    );
    if (goalsError) {
      throw new Error(`Could not skip setup: ${goalsError.message}`);
    }
  }

  redirect("/today");
}

// ---------- Today's writing ----------

// Details for the "goal reached" pop-up. Only sent with the save that first
// reaches a form's goal on a day, never with later saves.
export type ReachedGoal = {
  writingForm: WritingForm;
  formStreak: number; // days in a row this form's goal was reached
  overallStreak: number; // days in a row any goal was reached
  isPersonalBest: boolean; // the form's current streak is its longest ever
  wordCount: number;
  minutesWritten: number;
};

export type SaveEntryState =
  | { status: "idle" }
  | { status: "saved"; savedAt: string; reachedGoal: ReachedGoal | null }
  | { status: "error"; message: string };

const MAXIMUM_BODY_LENGTH = 50000; // matches the database check
const MAXIMUM_WRITING_SECONDS = 24 * 60 * 60; // a day

export async function saveTodaysEntry(
  _previousState: SaveEntryState,
  formData: FormData,
): Promise<SaveEntryState> {
  const user = await requireSignedInUser();
  const profile = await getWriterProfile(user.id);
  if (!profile) {
    return { status: "error", message: "Finish setting up your goals first." };
  }

  const writingForm = formData.get("writingForm");
  const prompt = formData.get("prompt");
  const body = String(formData.get("body") ?? "");

  // Only accept prompts the app actually offers for that form.
  if (
    !isWritingForm(writingForm) ||
    typeof prompt !== "string" ||
    !isKnownPrompt(writingForm, prompt)
  ) {
    return { status: "error", message: "That prompt wasn’t recognised. Reload the page and try again." };
  }

  const goal = profile.goals[writingForm];
  if (!goal) {
    return { status: "error", message: "You don’t practice that kind of writing yet. Add it in your goals." };
  }
  if (body.length > MAXIMUM_BODY_LENGTH) {
    return { status: "error", message: "That’s too long to save in one entry." };
  }

  // Writing time is measured in the browser (writing-workspace.tsx). It's the
  // writer's own practice log, so we trust it, but keep it within sane limits.
  const writingSeconds = Math.min(
    readWholeNumber(formData.get("writingSeconds")) ?? 0,
    MAXIMUM_WRITING_SECONDS,
  );
  const wordCount = countWords(body);
  const today = await getWritersToday(); // decided by the server, not the browser

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("entries").upsert(
    {
      user_id: user.id,
      entry_date: today,
      writing_form: writingForm,
      prompt,
      body,
      word_count: wordCount,
      writing_seconds: writingSeconds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,entry_date,writing_form" }, // one piece per form per day
  );

  if (error) {
    return { status: "error", message: "Couldn’t save. Check your connection and try again." };
  }

  // Re-render the page so the streaks reflect this save.
  revalidatePath("/today");

  return {
    status: "saved",
    savedAt: new Date().toISOString(),
    reachedGoal: await checkForReachedGoal({
      userId: user.id,
      today,
      writingForm,
      goal,
      wordCount,
      writingSeconds,
    }),
  };
}

type SavedPiece = {
  userId: string;
  today: string;
  writingForm: WritingForm;
  goal: FormGoal;
  wordCount: number;
  writingSeconds: number;
};

/**
 * After a save: if the piece meets its form's goal, record that. Returns the
 * pop-up details only the first time the goal is reached that day, so the
 * celebration never repeats. Once reached, a goal stays reached for that
 * day, even if the goal is changed later.
 */
async function checkForReachedGoal(piece: SavedPiece): Promise<ReachedGoal | null> {
  if (!isGoalMet(piece.goal, piece.wordCount, piece.writingSeconds)) {
    return null;
  }

  const isFirstTimeToday = await recordGoalCompletion(piece.userId, piece.writingForm, piece.today);
  if (!isFirstTimeToday) {
    return null;
  }

  const streaks = calculateAllStreaks(await listGoalCompletions(piece.userId), piece.today);
  const formStreak = streaks.byForm[piece.writingForm];

  return {
    writingForm: piece.writingForm,
    formStreak: formStreak.current,
    overallStreak: streaks.overall.current,
    isPersonalBest: formStreak.current > 1 && formStreak.current === formStreak.longest,
    wordCount: piece.wordCount,
    minutesWritten: Math.floor(piece.writingSeconds / 60),
  };
}

// ---------- Helpers ----------

/** Reads a form field as a whole number of zero or more, or null if it isn't one. */
function readWholeNumber(value: FormDataEntryValue | null): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

/** Reads an optional goal box: empty means no goal; otherwise a whole number from 1 to `maximum`. */
function readOptionalGoal(
  value: FormDataEntryValue | null,
  maximum: number,
): number | null | "invalid" {
  const text = String(value ?? "").trim();
  if (text === "") {
    return null;
  }

  const number = Number(text);
  return Number.isInteger(number) && number >= 1 && number <= maximum ? number : "invalid";
}
