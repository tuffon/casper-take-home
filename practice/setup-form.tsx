"use client";

import { useActionState, useState } from "react";
import { saveWriterProfile } from "@/practice/actions";
import { GOAL_TYPES, getGoalType, type GoalType } from "@/practice/goals";
import type { WriterProfile } from "@/practice/writer-profile";
import {
  WRITING_FORMS,
  WRITING_FORM_NAMES,
  type WritingForm,
} from "@/practice/writing-forms";

const GOAL_TYPE_NAMES = Object.keys(GOAL_TYPES) as GoalType[];

type SetupFormProps = {
  // The writer's current answers when they come back to change them,
  // or null on their first visit.
  existingProfile: WriterProfile | null;
};

// The setup questions: what the writer usually writes, and what counts as a
// day of practice. The goal inputs only appear for the goal types that need them.
export function SetupForm({ existingProfile }: SetupFormProps) {
  // Each answer is kept in state so it survives a failed submission.
  const [usualWritingForm, setUsualWritingForm] = useState<WritingForm>(
    existingProfile?.usualWritingForm ?? "freewrite",
  );
  const [goalType, setGoalType] = useState<GoalType>(
    existingProfile ? getGoalType(existingProfile) : "words",
  );
  const [dailyWordGoal, setDailyWordGoal] = useState(
    String(existingProfile?.dailyWordGoal ?? 200),
  );
  const [dailyMinuteGoal, setDailyMinuteGoal] = useState(
    String(existingProfile?.dailyMinuteGoal ?? 15),
  );

  const [formState, formAction, isPending] = useActionState(saveWriterProfile, {});

  const asksForWordGoal = goalType === "words" || goalType === "both";
  const asksForMinuteGoal = goalType === "time" || goalType === "both";

  return (
    <form action={formAction} className="mt-8 space-y-10">
      <fieldset>
        <legend className="question">What do you usually write?</legend>
        <p className="mt-1 text-sm text-ink-secondary">
          Your prompts start here. You can switch any day.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {WRITING_FORM_NAMES.map((form) => (
            <label key={form} className="choice">
              <input
                type="radio"
                name="usualWritingForm"
                value={form}
                checked={usualWritingForm === form}
                onChange={() => setUsualWritingForm(form)}
                className="mt-1 accent-action"
              />
              <span>
                <span className="block font-semibold">{WRITING_FORMS[form].label}</span>
                <span className="block text-sm text-ink-secondary">
                  {WRITING_FORMS[form].description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="question">What should count as a day of practice?</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {GOAL_TYPE_NAMES.map((type) => (
            <label key={type} className="choice">
              <input
                type="radio"
                name="goalType"
                value={type}
                checked={goalType === type}
                onChange={() => setGoalType(type)}
                className="mt-1 accent-action"
              />
              <span>
                <span className="block font-semibold">{GOAL_TYPES[type].label}</span>
                <span className="block text-sm text-ink-secondary">
                  {GOAL_TYPES[type].description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {(asksForWordGoal || asksForMinuteGoal) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {asksForWordGoal && (
            <div>
              <label htmlFor="dailyWordGoal" className="field-label">
                Daily word goal
              </label>
              <input
                id="dailyWordGoal"
                name="dailyWordGoal"
                type="number"
                min={1}
                max={10000}
                required
                value={dailyWordGoal}
                onChange={(event) => setDailyWordGoal(event.target.value)}
                className="text-input"
              />
            </div>
          )}
          {asksForMinuteGoal && (
            <div>
              <label htmlFor="dailyMinuteGoal" className="field-label">
                Daily time goal (minutes)
              </label>
              <input
                id="dailyMinuteGoal"
                name="dailyMinuteGoal"
                type="number"
                min={1}
                max={600}
                required
                value={dailyMinuteGoal}
                onChange={(event) => setDailyMinuteGoal(event.target.value)}
                className="text-input"
              />
            </div>
          )}
        </div>
      )}

      {formState.errorMessage && (
        <p role="alert" className="message-error">
          {formState.errorMessage}
        </p>
      )}

      <button type="submit" disabled={isPending} className="button-primary w-full">
        {isPending ? "Saving…" : existingProfile ? "Save changes" : "Start writing"}
      </button>
    </form>
  );
}
