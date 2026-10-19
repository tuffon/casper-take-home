import { createSupabaseServerClient } from "@/lib/supabase/server";

// A row in `completed_days` means the writer finished that day's practice:
// everything they wrote that day, added up, met every goal they had at the
// time. Streaks are counted from these rows. Row level security limits
// these queries to the signed-in writer's own rows.

/** Every day the writer has finished, as YYYY-MM-DD strings. */
export async function listCompletedDates(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("completed_days")
    .select("completed_on")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Could not load finished days: ${error.message}`);
  }

  return (data as { completed_on: string }[]).map((row) => row.completed_on);
}

/**
 * Records that the writer finished `date`. Returns true only the first
 * time (that's when the app celebrates); later calls change nothing.
 */
export async function recordCompletedDay(
  userId: string,
  date: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("completed_days")
    .upsert(
      { user_id: userId, completed_on: date },
      { onConflict: "user_id,completed_on", ignoreDuplicates: true },
    )
    .select("completed_on"); // only returns the row if it was newly added

  if (error) {
    throw new Error(`Could not record the finished day: ${error.message}`);
  }

  return data.length > 0;
}
