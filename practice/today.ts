import { cookies } from "next/headers";
import { TIMEZONE_COOKIE_NAME, getTodayInTimezone, isValidTimezone } from "./dates";

/**
 * Today's date for the signed-in writer, in their own timezone.
 *
 * The server runs in UTC, so it can't tell on its own when a writer's day
 * starts. The browser reports its timezone in a cookie (timezone-cookie.tsx);
 * until that arrives we fall back to UTC.
 */
export async function getWritersToday(): Promise<string> {
  const timezone = (await cookies()).get(TIMEZONE_COOKIE_NAME)?.value;
  const safeTimezone = timezone && isValidTimezone(timezone) ? timezone : "UTC";

  return getTodayInTimezone(safeTimezone);
}
