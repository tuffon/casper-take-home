import { describe, expect, it } from "vitest";
import {
  addDays,
  getTodayInTimezone,
  isCalendarDate,
  isValidTimezone,
} from "./dates";
import { countWords, describeGoal, isGoalMet } from "./goals";
import { getCelebrationMessage } from "./celebration";
import { calculateAllStreaks, calculateStreaks } from "./streak";
import { WRITING_FORMS, getNextPrompt, getPromptForDay, isKnownPrompt } from "./writing-forms";

describe("dates", () => {
  it("uses the writer's timezone to decide what day it is", () => {
    // 03:00 UTC on Oct 20 is still the evening of Oct 19 in Los Angeles.
    const lateEveningInLosAngeles = new Date("2026-10-20T03:00:00Z");
    expect(getTodayInTimezone("America/Los_Angeles", lateEveningInLosAngeles)).toBe("2026-10-19");
    expect(getTodayInTimezone("UTC", lateEveningInLosAngeles)).toBe("2026-10-20");
  });

  it("adds days across month ends and daylight-saving changes", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09"); // US clocks change this day
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("accepts real dates and timezones only", () => {
    expect(isCalendarDate("2026-10-19")).toBe(true);
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("yesterday")).toBe(false);
    expect(isValidTimezone("America/Los_Angeles")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
  });
});

describe("goals", () => {
  it("counts words separated by any whitespace", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("one two\nthree\t four ")).toBe(4);
  });

  it("requires every part of a form's goal to be met", () => {
    const both = { dailyWordGoal: 200, dailyMinuteGoal: 10 };
    expect(isGoalMet(both, 250, 9 * 60)).toBe(false); // words done, time not
    expect(isGoalMet(both, 150, 12 * 60)).toBe(false); // time done, words not
    expect(isGoalMet(both, 200, 10 * 60)).toBe(true);
  });

  it("checks only the parts of the goal that were set", () => {
    expect(isGoalMet({ dailyWordGoal: 250, dailyMinuteGoal: null }, 120, 0)).toBe(false);
    expect(isGoalMet({ dailyWordGoal: 250, dailyMinuteGoal: null }, 250, 0)).toBe(true);
    expect(isGoalMet({ dailyWordGoal: null, dailyMinuteGoal: 15 }, 3, 15 * 60)).toBe(true);
  });

  it("counts any writing when no goal is set", () => {
    const noGoal = { dailyWordGoal: null, dailyMinuteGoal: null };
    expect(isGoalMet(noGoal, 1, 0)).toBe(true);
    expect(isGoalMet(noGoal, 0, 600)).toBe(false);
  });

  it("describes goals in plain words", () => {
    expect(describeGoal({ dailyWordGoal: 250, dailyMinuteGoal: null })).toBe("250 words");
    expect(describeGoal({ dailyWordGoal: 250, dailyMinuteGoal: 15 })).toBe("250 words and 15 min");
    expect(describeGoal({ dailyWordGoal: null, dailyMinuteGoal: null })).toBe("any writing");
  });
});

describe("streaks", () => {
  const today = "2026-10-19";

  it("counts back-to-back days ending today", () => {
    const days = ["2026-10-17", "2026-10-18", "2026-10-19"];
    expect(calculateStreaks(days, today)).toEqual({ current: 3, longest: 3 });
  });

  it("keeps the streak alive until today is over", () => {
    const days = ["2026-10-17", "2026-10-18"]; // nothing yet today
    expect(calculateStreaks(days, today).current).toBe(2);
  });

  it("resets after a missed day but remembers the longest run", () => {
    const days = ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-17"];
    expect(calculateStreaks(days, today)).toEqual({ current: 0, longest: 4 });
  });

  it("keeps a streak per form and an overall streak for any form", () => {
    const completions = [
      { writingForm: "lyrics" as const, completedOn: "2026-10-17" },
      { writingForm: "lyrics" as const, completedOn: "2026-10-18" },
      { writingForm: "story" as const, completedOn: "2026-10-19" },
    ];
    const streaks = calculateAllStreaks(completions, today);
    expect(streaks.byForm.lyrics.current).toBe(2); // still alive until today ends
    expect(streaks.byForm.story.current).toBe(1);
    expect(streaks.byForm.essay.current).toBe(0);
    expect(streaks.overall.current).toBe(3); // some goal was met on each of the 3 days
  });

  it("handles no history and unsorted input", () => {
    expect(calculateStreaks([], today)).toEqual({ current: 0, longest: 0 });
    expect(calculateStreaks(["2026-10-19", "2026-10-18"], today)).toEqual({ current: 2, longest: 2 });
  });
});

describe("prompts", () => {
  it("rotates through a week of prompts, one step per day", () => {
    const promptsForAWeek = Array.from({ length: 7 }, (_, offset) =>
      getPromptForDay("lyrics", addDays("2026-10-19", offset)),
    );
    expect(new Set(promptsForAWeek).size).toBe(7);
    expect(getPromptForDay("lyrics", addDays("2026-10-19", 7))).toBe(promptsForAWeek[0]);
  });

  it("steps to the next prompt for “Another prompt”, wrapping around", () => {
    const essayPrompts = WRITING_FORMS.essay.prompts;
    expect(getNextPrompt("essay", essayPrompts[0])).toBe(essayPrompts[1]);
    expect(getNextPrompt("essay", essayPrompts[6])).toBe(essayPrompts[0]);
  });

  it("has exactly seven prompts for every form", () => {
    for (const form of Object.values(WRITING_FORMS)) {
      expect(form.prompts).toHaveLength(7);
    }
  });

  it("recognises only the form's own prompts", () => {
    expect(isKnownPrompt("story", WRITING_FORMS.story.prompts[0])).toBe(true);
    expect(isKnownPrompt("story", WRITING_FORMS.lyrics.prompts[0])).toBe(false);
  });
});

describe("celebration messages", () => {
  it("has a special message for milestone days", () => {
    expect(getCelebrationMessage(7)).toBe("A full week. That’s real momentum.");
    expect(getCelebrationMessage(30)).toContain("Thirty days");
  });

  it("rotates through everyday messages on other days", () => {
    // Divided by 4, these leave remainders 0, 1, 2 and 3: one of each message.
    const messages = new Set([4, 5, 6, 11].map(getCelebrationMessage));
    expect(messages.size).toBe(4);
  });
});
