import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WritingForm } from "./writing-forms";

// Reads from the `entries` table (supabase/migrations). Row level security
// already limits every query to the signed-in writer's own rows; the
// user_id filters below state that intent in the code too.

export type Entry = {
  entryDate: string;
  writingForm: WritingForm;
  prompt: string;
  body: string;
  wordCount: number;
  writingSeconds: number;
  goalMet: boolean;
};

// The same fields as they are named in the database.
type EntryRow = {
  entry_date: string;
  writing_form: WritingForm;
  prompt: string;
  body: string;
  word_count: number;
  writing_seconds: number;
  goal_met: boolean;
};

const ENTRY_COLUMNS =
  "entry_date, writing_form, prompt, body, word_count, writing_seconds, goal_met";

export async function getEntryForDate(
  userId: string,
  date: string,
): Promise<Entry | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .eq("entry_date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load the entry for ${date}: ${error.message}`);
  }

  return data ? toEntry(data as EntryRow) : null;
}

/** All of the writer's entries, newest first. */
export async function listEntries(userId: string): Promise<Entry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .order("entry_date", { ascending: false });

  if (error) {
    throw new Error(`Could not load entries: ${error.message}`);
  }

  return (data as EntryRow[]).map(toEntry);
}

/** Just the dates on which the writer met their goals, for streaks. */
export async function listCompletedDates(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .select("entry_date")
    .eq("user_id", userId)
    .eq("goal_met", true);

  if (error) {
    throw new Error(`Could not load completed days: ${error.message}`);
  }

  return (data as { entry_date: string }[]).map((row) => row.entry_date);
}

function toEntry(row: EntryRow): Entry {
  return {
    entryDate: row.entry_date,
    writingForm: row.writing_form,
    prompt: row.prompt,
    body: row.body,
    wordCount: row.word_count,
    writingSeconds: row.writing_seconds,
    goalMet: row.goal_met,
  };
}
