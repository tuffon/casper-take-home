import { daysSinceEpoch } from "./dates";

// The kinds of writing the app supports. Each has a week of prompts; the
// prompt of the day moves one step through the list each day.
export const WRITING_FORMS = {
  freewrite: {
    label: "Freewrite",
    description: "Journaling, stream of consciousness",
    prompts: [
      "Write about the last thing that made you stop and look twice.",
      "Start with “I never told anyone…” and keep going.",
      "Describe a place you know well using all five senses.",
      "Write a letter to yourself from ten years ago.",
      "What are you avoiding right now? Write about it.",
      "Pick an object within reach and tell its story.",
      "Write about a sound you heard today.",
    ],
  },
  lyrics: {
    label: "Lyrics",
    description: "Songs, raps, hooks and verses",
    prompts: [
      "Write a hook about a promise you’re still trying to keep.",
      "Write a verse that starts in your childhood bedroom and ends where you are now.",
      "Take a cliché like “time is money” and flip it into something new.",
      "Write 8 bars that all use the same rhyme sound.",
      "Write a chorus someone could sing back after hearing it once.",
      "Tell a story in 16 bars: setup, conflict, twist.",
      "Write about a city at 3 a.m.",
    ],
  },
  poetry: {
    label: "Poetry",
    description: "Poems of any shape or length",
    prompts: [
      "Write a poem where every line begins with “Because”.",
      "Write about a color without ever naming it.",
      "Write a poem addressed to something you use every day.",
      "Write a short poem about the weather that is really about a person.",
      "Write a poem with no adjectives.",
      "Describe a memory as if it were a photograph slowly developing.",
      "Write a poem that ends with the line it started with.",
    ],
  },
  essay: {
    label: "Essay",
    description: "Opinions, arguments, reflections",
    prompts: [
      "What’s an opinion you’ve changed your mind about, and what changed it?",
      "Argue for something small that deserves more attention.",
      "Explain a skill you have to someone who’s never tried it.",
      "What does “home” mean to you now, compared with five years ago?",
      "Write about a mistake that taught you more than a success.",
      "Make the case for or against a rule you follow every day.",
      "What’s something everyone around you takes for granted?",
    ],
  },
  story: {
    label: "Story",
    description: "Fiction, scenes, characters",
    prompts: [
      "A character finds a note in their own handwriting that they don’t remember writing.",
      "Two strangers are stuck in an elevator. One of them is lying.",
      "Write a scene that takes place entirely during a phone call.",
      "Someone returns to their hometown after ten years. Something is different.",
      "A character has one hour to make a decision that can’t be undone.",
      "Begin with: “The last train had already left.”",
      "Tell a story through three text messages and what happens between them.",
    ],
  },
} as const;

export type WritingForm = keyof typeof WRITING_FORMS;

// The same list in a fixed order, for menus.
export const WRITING_FORM_NAMES = Object.keys(WRITING_FORMS) as WritingForm[];

export function isWritingForm(value: unknown): value is WritingForm {
  return typeof value === "string" && Object.hasOwn(WRITING_FORMS, value);
}

/**
 * The prompt for a form on a given day. Each day moves one step through the
 * form's list, so the prompts repeat weekly. `skip` moves further along when
 * the writer asks for "another prompt".
 */
export function getPromptForDay(form: WritingForm, date: string, skip = 0): string {
  const prompts = WRITING_FORMS[form].prompts;
  const index = (daysSinceEpoch(date) + skip) % prompts.length;
  return prompts[index];
}

/** True if the text is one of this form's prompts (used to check form submissions). */
export function isKnownPrompt(form: WritingForm, prompt: string): boolean {
  return (WRITING_FORMS[form].prompts as readonly string[]).includes(prompt);
}
