"use server";

// Server Actions for the writing practice: saving setup answers and saving
// today's entry. Both check who is signed in first, and the database's row
// level security makes sure they can only touch that writer's rows.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSignedInUser } from "@/auth/current-user";
import { listCompletedDates, recordCompletedDay } from "@/practice/completed-days";
import { listEntriesForDate } from "@/practice/entries";
import {
  countWords,
  getDayTotals,
  isDayComplete,
  isGoalType,
  type PracticeGoals,
} from "@/practice/goals";
import { calculateStreaks } from "@/practice/streak";
import { getWritersToday } from "@/practice/today";
import { getWriterProfile } from "@/practice/writer-profile";
import { isKnownPrompt, isWritingForm } from "@/practice/writing-forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ---------- Setup ----------

export type SetupFormState = {
  errorMessage?: string;
};

export async function saveWriterProfile(
  _previousState: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  const user = await requireSignedInUser();

  const usualWritingForm = formData.get("usualWritingForm");
  const goalType = formData.get("goalType");

  if (!isWritingForm(usualWritingForm)) {
    return { errorMessage: "Choose the kind of writing you usually do." };
  }
  if (!isGoalType(goalType)) {
    return { errorMessage: "Choose what should count as a day of practice." };
  }

  const wantsWordGoal = goalType === "words" || goalType === "both";
  const wantsMinuteGoal = goalType === "time" || goalType === "both";

  const dailyWordGoal = wantsWordGoal
    ? readWholeNumber(formData.get("dailyWordGoal"))
    : null;
  const dailyMinuteGoal = wantsMinuteGoal
    ? readWholeNumber(formData.get("dailyMinuteGoal"))
    : null;

  // These limits match the checks in the database.
  if (wantsWordGoal && !isBetween(dailyWordGoal, 1, 10000)) {
    return { errorMessage: "Set a word goal between 1 and 10,000." };
  }
  if (wantsMinuteGoal && !isBetween(dailyMinuteGoal, 1, 600)) {
    return { errorMessage: "Set a time goal between 1 and 600 minutes." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("writer_profiles").upsert({
    user_id: user.id,
    usual_writing_form: usualWritingForm,
    daily_word_goal: dailyWordGoal,
    daily_minute_goal: dailyMinuteGoal,
    completed_setup: true,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { errorMessage: "Couldn’t save your answers. Please try again." };
  }

  redirect("/today");
}

/**
 * "Skip for now": takes the writer straight to today's prompt. They get a
 * profile with no goals (any writing counts) and are asked the setup
 * questions again the next time they sign in. An existing profile is kept.
 */
export async function skipSetup() {
  const user = await requireSignedInUser();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("writer_profiles").upsert(
    {
      user_id: user.id,
      usual_writing_form: "freewrite",
      daily_word_goal: null,
      daily_minute_goal: null,
      completed_setup: false,
    },
    { onConflict: "user_id", ignoreDuplicates: true }, // never overwrite real answers
  );

  if (error) {
    throw new Error(`Could not skip setup: ${error.message}`);
  }

  redirect("/today");
}

// ---------- Today's entry ----------

// Details for the "day complete" pop-up. Only sent with the save that
// finishes the day, never with later saves.
export type CompletedDay = {
  currentStreak: number;
  isPersonalBest: boolean;
  wordsToday: number; // across every piece written today
  minutesToday: number;
};

export type SaveEntryState =
  | { status: "idle" }
  | { status: "saved"; savedAt: string; completedDay: CompletedDay | null }
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
  if (body.length > MAXIMUM_BODY_LENGTH) {
    return { status: "error", message: "That’s too long to save in one entry." };
  }

  // Writing time is measured in the browser (writing-workspace.tsx). It's the
  // writer's own practice log, so we trust it, but keep it within sane limits.
  const writingSeconds = Math.min(
    readWholeNumber(formData.get("writingSeconds")) ?? 0,
    MAXIMUM_WRITING_SECONDS,
  );
  const today = await getWritersToday(); // decided by the server, not the browser

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("entries").upsert(
    {
      user_id: user.id,
      entry_date: today,
      writing_form: writingForm,
      prompt,
      body,
      word_count: countWords(body),
      writing_seconds: writingSeconds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,entry_date,writing_form" }, // one piece per form per day
  );

  if (error) {
    return { status: "error", message: "Couldn’t save. Check your connection and try again." };
  }

  // Re-render the page so the streak reflects this save.
  revalidatePath("/today");

  return {
    status: "saved",
    savedAt: new Date().toISOString(),
    completedDay: await checkForFinishedDay(user.id, today, profile),
  };
}

/**
 * After a save: if everything written today, added up, now meets the
 * writer's goals, record the day as finished. Returns the pop-up details
 * only the first time a day is finished, so the celebration never repeats.
 * Once finished, a day stays finished, even if goals change later.
 */
async function checkForFinishedDay(
  userId: string,
  today: string,
  goals: PracticeGoals,
): Promise<CompletedDay | null> {
  const totals = getDayTotals(await listEntriesForDate(userId, today));
  if (!isDayComplete(goals, totals.wordCount, totals.writingSeconds)) {
    return null;
  }

  const isFirstTimeToday = await recordCompletedDay(userId, today);
  if (!isFirstTimeToday) {
    return null;
  }

  const streak = calculateStreaks(await listCompletedDates(userId), today);
  return {
    currentStreak: streak.current,
    isPersonalBest: streak.current > 1 && streak.current === streak.longest,
    wordsToday: totals.wordCount,
    minutesToday: Math.floor(totals.writingSeconds / 60),
  };
}

// ---------- Helpers ----------

/** Reads a form field as a whole number of zero or more, or null if it isn't one. */
function readWholeNumber(value: FormDataEntryValue | null): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function isBetween(value: number | null, minimum: number, maximum: number) {
  return value !== null && value >= minimum && value <= maximum;
}
