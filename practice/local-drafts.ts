import { isWritingForm, type WritingForm } from "./writing-forms";

// Unsaved writing is kept in this browser (localStorage), so leaving the page
// without saving loses nothing. Drafts belong to one writer and one day:
// drafts from earlier days are thrown away, because those days are over.
//
// Every call is wrapped in try/catch: storage can be full or blocked (some
// private browsing modes), and then drafts simply aren't kept.

export type LocalDraft = {
  prompt: string;
  body: string;
  writingSeconds: number;
};

export type LocalDrafts = Partial<Record<WritingForm, LocalDraft>>;

const KEY_PREFIX = "writers-block:drafts";

// e.g. "writers-block:drafts:<user id>:2026-10-19"
function draftsKey(userId: string, date: string): string {
  return `${KEY_PREFIX}:${userId}:${date}`;
}

/** The writer's drafts for `date`, or none if there aren't any. */
export function loadDrafts(userId: string, date: string): LocalDrafts {
  try {
    const stored = JSON.parse(localStorage.getItem(draftsKey(userId, date)) ?? "{}");
    const drafts: LocalDrafts = {};

    // Only keep entries that look right, in case storage holds something odd.
    for (const [form, draft] of Object.entries(stored)) {
      if (isWritingForm(form) && isLocalDraft(draft)) {
        drafts[form] = draft;
      }
    }
    return drafts;
  } catch {
    return {};
  }
}

/** Replaces the writer's stored drafts for `date` (removing them if empty). */
export function storeDrafts(userId: string, date: string, drafts: LocalDrafts): void {
  try {
    const key = draftsKey(userId, date);
    if (Object.keys(drafts).length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(drafts));
    }
  } catch {
    // Storage unavailable: drafts just aren't kept.
  }
}

/** Deletes this writer's drafts from any day other than `today`. */
export function deleteOldDrafts(userId: string, today: string): void {
  try {
    const writersPrefix = `${KEY_PREFIX}:${userId}:`;
    const todaysKey = draftsKey(userId, today);

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(writersPrefix) && key !== todaysKey) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage unavailable: nothing to clean up.
  }
}

function isLocalDraft(value: unknown): value is LocalDraft {
  const draft = value as LocalDraft;
  return (
    typeof draft === "object" &&
    draft !== null &&
    typeof draft.prompt === "string" &&
    typeof draft.body === "string" &&
    typeof draft.writingSeconds === "number"
  );
}
