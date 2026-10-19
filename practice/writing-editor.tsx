"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveTodaysEntry, type CompletedDay, type SaveEntryState } from "@/practice/actions";
import { CelebrationDialog } from "@/practice/celebration-dialog";
import { countWords, isDayComplete, type PracticeGoals } from "@/practice/goals";
import type { WritingForm } from "@/practice/writing-forms";

// Time only counts while the writer is actually typing: if nothing has been
// typed for this long, the clock pauses. Leaving the page open adds nothing.
const PAUSE_AFTER_MILLISECONDS = 60 * 1000;

type WritingEditorProps = {
  writingForm: WritingForm;
  prompt: string;
  goals: PracticeGoals;
  savedBody: string; // today's entry as last saved ("" if there isn't one yet)
  savedWritingSeconds: number;
};

export function WritingEditor({
  writingForm,
  prompt,
  goals,
  savedBody,
  savedWritingSeconds,
}: WritingEditorProps) {
  const [body, setBody] = useState(savedBody);
  const [lastSavedBody, setLastSavedBody] = useState(savedBody);
  const { activeSeconds, recordTyping } = useActiveWritingTime(savedWritingSeconds);
  const [completedDay, setCompletedDay] = useState<CompletedDay | null>(null);

  // Calls the Server Action, and remembers what was saved so we can tell
  // when there are unsaved changes.
  const [saveState, saveAction, isSaving] = useActionState(
    async (previousState: SaveEntryState, formData: FormData) => {
      const result = await saveTodaysEntry(previousState, formData);
      if (result.status === "saved") {
        setLastSavedBody(String(formData.get("body")));
        setCompletedDay(result.completedDay); // non-null only when this save finished the day
      }
      return result;
    },
    { status: "idle" },
  );

  const wordCount = countWords(body);
  const minutesWritten = Math.floor(activeSeconds / 60);
  const dayComplete = isDayComplete(goals, wordCount, activeSeconds);
  const hasUnsavedChanges = body !== lastSavedBody;

  return (
    <form action={saveAction} className="mt-6">
      {/* Sent along with the text so the server knows what was written to. */}
      <input type="hidden" name="writingForm" value={writingForm} />
      <input type="hidden" name="prompt" value={prompt} />
      <input type="hidden" name="writingSeconds" value={activeSeconds} />

      <label htmlFor="body" className="sr-only">
        Your writing
      </label>
      <textarea
        id="body"
        name="body"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          recordTyping();
        }}
        placeholder="Start writing…"
        aria-describedby="todays-prompt" // the prompt, shown on the Today page
        className="writing-area"
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <GoalProgress
          label="Words"
          current={wordCount}
          goal={goals.dailyWordGoal}
          unit="words"
        />
        <GoalProgress
          label="Time writing"
          current={minutesWritten}
          goal={goals.dailyMinuteGoal}
          unit="min"
        />
      </div>

      <p className="mt-4 text-sm" aria-live="polite">
        {dayComplete && hasUnsavedChanges ? (
          <span className="font-semibold text-success">
            Goal reached. Save to finish the day.
          </span>
        ) : dayComplete ? (
          <span className="font-semibold text-success">
            Today’s practice is complete.
          </span>
        ) : goals.dailyWordGoal === null && goals.dailyMinuteGoal === null ? (
          <span className="text-ink-secondary">Any writing counts today.</span>
        ) : (
          <span className="text-ink-secondary">Keep going to reach today’s goal.</span>
        )}
      </p>

      <div className="mt-6 flex items-center gap-4">
        <button type="submit" disabled={isSaving} className="button-primary">
          {isSaving ? "Saving…" : "Save"}
        </button>
        <SaveStatus
          saveState={saveState}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>

      {completedDay && (
        <CelebrationDialog completedDay={completedDay} onClose={() => setCompletedDay(null)} />
      )}
    </form>
  );
}

/** Counts seconds of active writing, carrying on from the saved total. */
function useActiveWritingTime(startingSeconds: number) {
  const [activeSeconds, setActiveSeconds] = useState(startingSeconds);
  const lastTypedAt = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const typedRecently =
        lastTypedAt.current !== null &&
        Date.now() - lastTypedAt.current < PAUSE_AFTER_MILLISECONDS;

      if (typedRecently) {
        setActiveSeconds((seconds) => seconds + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  function recordTyping() {
    lastTypedAt.current = Date.now();
  }

  return { activeSeconds, recordTyping };
}

type GoalProgressProps = {
  label: string;
  current: number;
  goal: number | null; // null when the writer didn't set this goal
  unit: string;
};

function GoalProgress({ label, current, goal, unit }: GoalProgressProps) {
  if (goal === null) {
    return (
      <div>
        <p className="text-sm text-ink-secondary">{label}</p>
        <p className="mt-1 font-semibold">
          {current} {unit}
        </p>
      </div>
    );
  }

  const percentDone = Math.min(100, Math.round((current / goal) * 100));

  return (
    <div>
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-1 font-semibold">
        {current} / {goal} {unit}
      </p>
      <div
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuenow={percentDone}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/8"
      >
        <div
          className={`h-full rounded-full ${percentDone === 100 ? "bg-success" : "bg-action"}`}
          style={{ width: `${percentDone}%` }}
        />
      </div>
    </div>
  );
}

type SaveStatusProps = {
  saveState: SaveEntryState;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
};

function SaveStatus({ saveState, isSaving, hasUnsavedChanges }: SaveStatusProps) {
  if (isSaving) {
    return null; // the button already says "Saving…"
  }
  if (saveState.status === "error") {
    return (
      <p role="alert" className="text-sm text-danger">
        {saveState.message}
      </p>
    );
  }
  if (hasUnsavedChanges) {
    return <p className="text-sm text-ink-secondary">Unsaved changes</p>;
  }
  if (saveState.status === "saved") {
    const savedTime = new Date(saveState.savedAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return <p className="text-sm text-ink-secondary">Saved at {savedTime}</p>;
  }
  return null;
}
