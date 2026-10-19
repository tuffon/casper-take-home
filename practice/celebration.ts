// What the "day complete" pop-up says. Milestone days get their own message;
// other days rotate through a few so it doesn't feel canned.

const MILESTONE_MESSAGES: Record<number, string> = {
  1: "Day one is done. Every streak starts here.",
  3: "Three days in a row. This is becoming a habit.",
  7: "A full week. That’s real momentum.",
  14: "Two weeks straight. Your future self says thanks.",
  30: "Thirty days. You’re someone who writes every day.",
  100: "One hundred days. Legendary.",
};

const EVERYDAY_MESSAGES = [
  "Words on the page. That’s the whole job.",
  "You showed up. That’s what counts.",
  "The blank page didn’t stand a chance.",
  "Another day closer to your best work.",
];

export function getCelebrationMessage(streakDays: number): string {
  return (
    MILESTONE_MESSAGES[streakDays] ??
    EVERYDAY_MESSAGES[streakDays % EVERYDAY_MESSAGES.length]
  );
}
