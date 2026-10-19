// Calendar days are passed around as "YYYY-MM-DD" strings (e.g. "2026-10-19").
// They sort correctly as plain text and match Postgres's `date` type.

// The browser stores its timezone in this cookie (see timezone-cookie.tsx),
// so the server knows when the writer's day starts and ends.
export const TIMEZONE_COOKIE_NAME = "timezone";

/**
 * Today's date for someone in the given timezone. A writer in Los Angeles at
 * 8pm on Oct 19 gets "2026-10-19", even though it's already Oct 20 in UTC.
 */
export function getTodayInTimezone(timezone: string, now = new Date()): string {
  // The en-CA locale happens to format dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Moves a date forward by whole days (or back, with a negative number). */
export function addDays(date: string, days: number): string {
  // Work in UTC so daylight-saving changes can't shift the day.
  const moment = new Date(`${date}T00:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, 10);
}

/** Whole days since 1970-01-01. Used to rotate the daily prompt. */
export function daysSinceEpoch(date: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / millisecondsPerDay);
}

/** True for a real calendar date in YYYY-MM-DD form (rejects "2026-02-30"). */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

/** True if the browser sent a timezone name this server recognises. */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** "2026-10-19" → "Monday, October 19" */
export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** "2026-10-19" → "Mon, Oct 19" */
export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
