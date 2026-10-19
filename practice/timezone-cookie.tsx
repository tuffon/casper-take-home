"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TIMEZONE_COOKIE_NAME } from "@/practice/dates";

/**
 * Saves the browser's timezone in a cookie so server code knows the writer's
 * "today" (see practice/today.ts). If the cookie was missing or out of date
 * (first visit, or travelling), the page re-renders with the right day.
 */
export function TimezoneCookie() {
  const router = useRouter();

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const cookie = `${TIMEZONE_COOKIE_NAME}=${encodeURIComponent(timezone)}`;

    if (!document.cookie.split("; ").includes(cookie)) {
      const oneYearInSeconds = 60 * 60 * 24 * 365;
      document.cookie = `${cookie}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
      router.refresh();
    }
  }, [router]);

  return null;
}
