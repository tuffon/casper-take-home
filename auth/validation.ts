// Sign-up rules, shared by the form (which shows them) and the Server
// Action (which enforces them, since browser checks are easy to skip).

// Keep in sync with the "Minimum password length" setting in Supabase Auth,
// which enforces the same rule on Supabase's side.
export const MINIMUM_PASSWORD_LENGTH = 8;

// Deliberately loose: catches typos like a missing "@" or domain.
// Supabase does the real email validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns a message for the first problem found, or null if the input is fine.
export function getSignUpValidationError(
  email: string,
  password: string,
): string | null {
  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address.";
  }

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`;
  }

  return null;
}
