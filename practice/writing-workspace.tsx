"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { saveTodaysEntry, type CompletedDay, type SaveEntryState } from "@/practice/actions";
import { CelebrationDialog } from "@/practice/celebration-dialog";
import { countWords, getDayTotals, isDayComplete, type PracticeGoals } from "@/practice/goals";
import {
  deleteOldDrafts,
  loadDrafts,
  storeDrafts,
  type LocalDrafts,
} from "@/practice/local-drafts";
import {
  WRITING_FORMS,
  WRITING_FORM_NAMES,
  getNextPrompt,
  getPromptForDay,
  type WritingForm,
} from "@/practice/writing-forms";

// Time only counts while the writer is actually typing: if nothing has been
// typed for this long, the clock pauses. Leaving the page open adds nothing.
const PAUSE_AFTER_MILLISECONDS = 60 * 1000;

// One piece of writing per form, as it is in the browser right now.
type Piece = {
  prompt: string;
  body: string;
  savedBody: string; // what the server has; different from `body` means unsaved changes
  writingSeconds: number;
  lastSavedAt: string | null; // set when saved during this visit
};

type Pieces = Record<WritingForm, Piece>;

// A piece the writer already saved today, as loaded by the page.
export type SavedPiece = {
  writingForm: WritingForm;
  prompt: string;
  body: string;
  writingSeconds: number;
};

type WritingWorkspaceProps = {
  userId: string; // drafts kept in the browser are stored per writer
  today: string;
  goals: PracticeGoals;
  startingForm: WritingForm; // the writer's usual form
  savedPieces: SavedPiece[];
  isTodayFinished: boolean; // refreshed by the server after every save
};

// Today's writing: a tab per writing form, each with its own prompt and its
// own text. Goals count everything written today, across all the tabs.
export function WritingWorkspace({
  userId,
  today,
  goals,
  startingForm,
  savedPieces,
  isTodayFinished,
}: WritingWorkspaceProps) {
  const [activeForm, setActiveForm] = useState(startingForm);
  const [pieces, setPieces] = useState(() => createPieces(today, savedPieces));
  const [completedDay, setCompletedDay] = useState<CompletedDay | null>(null);
  const clock = useWritingClock(activeForm, setPieces);
  useDraftsInBrowser(userId, today, pieces, setPieces);

  const [saveState, saveAction, isSaving] = useActionState(
    async (previousState: SaveEntryState, formData: FormData) => {
      const result = await saveTodaysEntry(previousState, formData);
      if (result.status === "saved") {
        const savedForm = formData.get("writingForm") as WritingForm;
        const savedBody = String(formData.get("body"));
        setPieces((current) => ({
          ...current,
          [savedForm]: { ...current[savedForm], savedBody, lastSavedAt: result.savedAt },
        }));
        setCompletedDay(result.completedDay); // non-null only when this save finished the day
      }
      return result;
    },
    { status: "idle" },
  );

  const piece = pieces[activeForm];
  const formLabel = WRITING_FORMS[activeForm].label;
  const hasUnsavedChanges = (form: WritingForm) => pieces[form].body !== pieces[form].savedBody;

  const totals = getDayTotals(
    WRITING_FORM_NAMES.map((form) => ({
      wordCount: countWords(pieces[form].body),
      writingSeconds: pieces[form].writingSeconds,
    })),
  );
  const goalsReached = isDayComplete(goals, totals.wordCount, totals.writingSeconds);

  function updateActivePiece(changes: Partial<Piece>) {
    setPieces((current) => ({
      ...current,
      [activeForm]: { ...current[activeForm], ...changes },
    }));
  }

  function switchTo(form: WritingForm) {
    clock.pause(); // typing in one tab shouldn't add time to another
    setActiveForm(form);
  }

  return (
    <div>
      {/* One button per writing form. A dot marks unsaved changes. */}
      <div role="group" aria-label="Writing form" className="segmented mt-8">
        {WRITING_FORM_NAMES.map((form) => (
          <button
            key={form}
            type="button"
            aria-pressed={form === activeForm}
            onClick={() => switchTo(form)}
            className="segmented-option"
          >
            {WRITING_FORMS[form].label}
            {hasUnsavedChanges(form) && (
              <>
                <span className="unsaved-dot" aria-hidden="true" />
                <span className="sr-only"> (unsaved)</span>
              </>
            )}
          </button>
        ))}
      </div>

      <section className="mt-6 rounded-card border border-black/8 bg-white p-6">
        <p className="text-sm text-ink-secondary">{formLabel} prompt</p>
        <p id="todays-prompt" className="mt-2 text-[21px] leading-snug font-semibold">
          {piece.prompt}
        </p>
        <button
          type="button"
          onClick={() => updateActivePiece({ prompt: getNextPrompt(activeForm, piece.prompt) })}
          className="text-link mt-4 text-sm"
        >
          Another prompt
        </button>
      </section>

      <form action={saveAction} className="mt-6">
        {/* Sent along with the text so the server knows which piece this is. */}
        <input type="hidden" name="writingForm" value={activeForm} />
        <input type="hidden" name="prompt" value={piece.prompt} />
        <input type="hidden" name="writingSeconds" value={piece.writingSeconds} />

        <label htmlFor="body" className="sr-only">
          Your {formLabel.toLowerCase()} writing
        </label>
        <textarea
          id="body"
          name="body"
          value={piece.body}
          onChange={(event) => {
            updateActivePiece({ body: event.target.value });
            clock.recordTyping();
          }}
          placeholder="Start writing…"
          aria-describedby="todays-prompt"
          className="writing-area"
        />
        <p className="mt-2 text-sm text-ink-secondary">
          {countWords(piece.body)} words in this piece
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <GoalProgress
            label="Words today"
            current={totals.wordCount}
            goal={goals.dailyWordGoal}
            unit="words"
          />
          <GoalProgress
            label="Time today"
            current={Math.floor(totals.writingSeconds / 60)}
            goal={goals.dailyMinuteGoal}
            unit="min"
          />
        </div>

        <p className="mt-4 text-sm" aria-live="polite">
          <DayStatus
            isTodayFinished={isTodayFinished}
            goalsReached={goalsReached}
            hasGoals={goals.dailyWordGoal !== null || goals.dailyMinuteGoal !== null}
          />
        </p>

        <div className="mt-6 flex items-center gap-4">
          <button type="submit" disabled={isSaving} className="button-primary">
            {isSaving ? "Saving…" : "Save"}
          </button>
          <SaveStatus
            errorMessage={saveState.status === "error" ? saveState.message : null}
            isSaving={isSaving}
            piece={piece}
            hasUnsavedChanges={hasUnsavedChanges(activeForm)}
          />
        </div>
      </form>

      {completedDay && (
        <CelebrationDialog completedDay={completedDay} onClose={() => setCompletedDay(null)} />
      )}
    </div>
  );
}

// Every form starts with today's prompt and no text; then whatever was
// already saved today is filled in.
function createPieces(today: string, savedPieces: SavedPiece[]): Pieces {
  const pieces = {} as Pieces;

  for (const form of WRITING_FORM_NAMES) {
    pieces[form] = {
      prompt: getPromptForDay(form, today),
      body: "",
      savedBody: "",
      writingSeconds: 0,
      lastSavedAt: null,
    };
  }

  for (const saved of savedPieces) {
    pieces[saved.writingForm] = {
      prompt: saved.prompt,
      body: saved.body,
      savedBody: saved.body,
      writingSeconds: saved.writingSeconds,
      lastSavedAt: null,
    };
  }

  return pieces;
}

/**
 * Counts seconds of active writing for whichever form is open. Time only
 * counts while the writer is typing; it pauses a minute after the last
 * keystroke, or straight away when they switch forms.
 */
function useWritingClock(
  activeForm: WritingForm,
  setPieces: Dispatch<SetStateAction<Pieces>>,
) {
  const lastTypedAt = useRef<number | null>(null);
  const activeFormRef = useRef(activeForm);

  useEffect(() => {
    activeFormRef.current = activeForm;
  }, [activeForm]);

  useEffect(() => {
    const timer = setInterval(() => {
      const typedRecently =
        lastTypedAt.current !== null &&
        Date.now() - lastTypedAt.current < PAUSE_AFTER_MILLISECONDS;
      if (!typedRecently) {
        return;
      }

      const form = activeFormRef.current;
      setPieces((current) => ({
        ...current,
        [form]: { ...current[form], writingSeconds: current[form].writingSeconds + 1 },
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [setPieces]);

  return {
    recordTyping() {
      lastTypedAt.current = Date.now();
    },
    pause() {
      lastTypedAt.current = null;
    },
  };
}

/**
 * Keeps unsaved writing in this browser (see local-drafts.ts), so leaving
 * the page without saving loses nothing:
 * - on arrival: throws away drafts from earlier days and brings back today's
 * - after every change: stores whichever pieces have unsaved changes
 */
function useDraftsInBrowser(
  userId: string,
  today: string,
  pieces: Pieces,
  setPieces: Dispatch<SetStateAction<Pieces>>,
) {
  const [hasRestoredDrafts, setHasRestoredDrafts] = useState(false);

  // Browser storage only exists in the browser, so this runs after the page loads.
  useEffect(() => {
    deleteOldDrafts(userId, today);
    const drafts = loadDrafts(userId, today);
    setPieces((current) => applyDrafts(current, drafts));
    // Browser storage can only be read after the page loads, so this one
    // extra render is expected.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasRestoredDrafts(true);
  }, [userId, today, setPieces]);

  useEffect(() => {
    // Wait until drafts are restored, or we'd overwrite them with nothing.
    if (hasRestoredDrafts) {
      storeDrafts(userId, today, collectUnsavedDrafts(pieces));
    }
  }, [hasRestoredDrafts, userId, today, pieces]);
}

// Puts drafts from the browser on top of what the server has.
function applyDrafts(pieces: Pieces, drafts: LocalDrafts): Pieces {
  const updated = { ...pieces };
  for (const form of WRITING_FORM_NAMES) {
    const draft = drafts[form];
    if (draft) {
      updated[form] = {
        ...updated[form],
        prompt: draft.prompt,
        body: draft.body,
        writingSeconds: Math.max(draft.writingSeconds, updated[form].writingSeconds),
      };
    }
  }
  return updated;
}

// The pieces whose text differs from what the server has.
function collectUnsavedDrafts(pieces: Pieces): LocalDrafts {
  const drafts: LocalDrafts = {};
  for (const form of WRITING_FORM_NAMES) {
    const piece = pieces[form];
    if (piece.body !== piece.savedBody) {
      drafts[form] = {
        prompt: piece.prompt,
        body: piece.body,
        writingSeconds: piece.writingSeconds,
      };
    }
  }
  return drafts;
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

type DayStatusProps = {
  isTodayFinished: boolean;
  goalsReached: boolean;
  hasGoals: boolean;
};

function DayStatus({ isTodayFinished, goalsReached, hasGoals }: DayStatusProps) {
  if (isTodayFinished) {
    return (
      <span className="font-semibold text-success">
        Today’s practice is complete. Write more if you like.
      </span>
    );
  }
  if (goalsReached) {
    return (
      <span className="font-semibold text-success">Goal reached. Save to finish the day.</span>
    );
  }
  if (!hasGoals) {
    return <span className="text-ink-secondary">Any writing counts today.</span>;
  }
  return (
    <span className="text-ink-secondary">
      Keep going to reach today’s goal. Every tab counts.
    </span>
  );
}

type SaveStatusProps = {
  errorMessage: string | null;
  isSaving: boolean;
  piece: Piece;
  hasUnsavedChanges: boolean;
};

function SaveStatus({ errorMessage, isSaving, piece, hasUnsavedChanges }: SaveStatusProps) {
  if (isSaving) {
    return null; // the button already says "Saving…"
  }
  if (errorMessage) {
    return (
      <p role="alert" className="text-sm text-danger">
        {errorMessage}
      </p>
    );
  }
  if (hasUnsavedChanges) {
    return <p className="text-sm text-ink-secondary">Unsaved changes</p>;
  }
  if (piece.lastSavedAt) {
    const savedTime = new Date(piece.lastSavedAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return <p className="text-sm text-ink-secondary">Saved at {savedTime}</p>;
  }
  if (piece.savedBody !== "") {
    return <p className="text-sm text-ink-secondary">Saved</p>;
  }
  return null;
}
