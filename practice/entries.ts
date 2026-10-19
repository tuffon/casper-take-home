import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WritingForm } from "./writing-forms";

// Reads from the `entries` table (supabase/migrations). Each entry is one
// piece of writing: at most one per writing form per day. Row level security
// already limits every query to the signed-in writer's own rows; the user_id
// filters below state that intent in the code too.

export type Entry = {
  entryDate: string;
  writingForm: WritingForm;
  prompt: string;
  body: string;
  wordCount: number;
  writingSeconds: number;
};

// The same fields as they are named in the database.
type EntryRow = {
  entry_date: string;
  writing_form: WritingForm;
  prompt: string;
  body: string;
  word_count: number;
  writing_seconds: number;
};

const ENTRY_COLUMNS =
  "entry_date, writing_form, prompt, body, word_count, writing_seconds";

/** The pieces the writer wrote on one day. */
export async function listEntriesForDate(
  userId: string,
  date: string,
): Promise<Entry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .eq("entry_date", date)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load the writing for ${date}: ${error.message}`);
  }

  return (data as EntryRow[]).map(toEntry);
}

/** All of the writer's pieces, newest day first. */
export async function listEntries(userId: string): Promise<Entry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load entries: ${error.message}`);
  }

  return (data as EntryRow[]).map(toEntry);
}

function toEntry(row: EntryRow): Entry {
  return {
    entryDate: row.entry_date,
    writingForm: row.writing_form,
    prompt: row.prompt,
    body: row.body,
    wordCount: row.word_count,
    writingSeconds: row.writing_seconds,
  };
}
