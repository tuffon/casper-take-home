"use client";

import { useActionState, useState } from "react";
import { saveWriterProfile } from "@/practice/actions";
import type { WriterProfile } from "@/practice/writer-profile";
import {
  WRITING_FORMS,
  WRITING_FORM_NAMES,
  type WritingForm,
} from "@/practice/writing-forms";

type SetupFormProps = {
  // The writer's current answers when they come back to change them,
  // or null on their first visit.
  existingProfile: WriterProfile | null;
};

// What the form holds for each kind of writing while it's being filled in.
type FormChoice = {
  isChosen: boolean;
  wordGoal: string; // "" means no word goal
  minuteGoal: string; // "" means no time goal
};

// The setup question: which kinds of writing to practice, each with its own
// daily goal. The goal boxes only appear for ticked kinds.
export function SetupForm({ existingProfile }: SetupFormProps) {
  // Kept in state so the answers survive a failed submission.
  const [choices, setChoices] = useState(() => createChoices(existingProfile));
  const [formState, formAction, isPending] = useActionState(saveWriterProfile, {});

  function updateChoice(form: WritingForm, changes: Partial<FormChoice>) {
    setChoices((current) => ({ ...current, [form]: { ...current[form], ...changes } }));
  }

  return (
    <form action={formAction} className="mt-8 space-y-8">
      <fieldset>
        <legend className="question">What do you want to practice?</legend>
        <p className="mt-1 text-sm text-ink-secondary">
          Pick one or more. Each gets its own daily goal and streak. Leave a goal
          box empty for no goal of that kind; leave both empty and any writing counts.
        </p>

        <div className="mt-4 space-y-3">
          {WRITING_FORM_NAMES.map((form) => {
            const choice = choices[form];
            const label = WRITING_FORMS[form].label;

            return (
              <div key={form} className="choice-card">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="writingForms"
                    value={form}
                    checked={choice.isChosen}
                    onChange={(event) => updateChoice(form, { isChosen: event.target.checked })}
                    className="mt-1 accent-action"
                  />
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-sm text-ink-secondary">
                      {WRITING_FORMS[form].description}
                    </span>
                  </span>
                </label>

                {choice.isChosen && (
                  <div className="mt-3 ml-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span className="text-ink-secondary">Daily goal:</span>
                    <label className="flex items-center gap-2">
                      <input
                        type="number"
                        name={`${form}-words`}
                        min={1}
                        max={10000}
                        value={choice.wordGoal}
                        onChange={(event) => updateChoice(form, { wordGoal: event.target.value })}
                        aria-label={`${label} word goal`}
                        className="goal-input"
                      />
                      words
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="number"
                        name={`${form}-minutes`}
                        min={1}
                        max={600}
                        value={choice.minuteGoal}
                        onChange={(event) => updateChoice(form, { minuteGoal: event.target.value })}
                        aria-label={`${label} time goal in minutes`}
                        className="goal-input"
                      />
                      minutes
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

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

// Starts from the writer's saved goals. On a first visit nothing is ticked,
// and ticking a kind suggests a 250-word goal.
function createChoices(profile: WriterProfile | null): Record<WritingForm, FormChoice> {
  const choices = {} as Record<WritingForm, FormChoice>;

  for (const form of WRITING_FORM_NAMES) {
    const goal = profile?.goals[form];
    choices[form] = goal
      ? {
          isChosen: true,
          wordGoal: goal.dailyWordGoal?.toString() ?? "",
          minuteGoal: goal.dailyMinuteGoal?.toString() ?? "",
        }
      : { isChosen: false, wordGoal: "250", minuteGoal: "" };
  }

  return choices;
}
