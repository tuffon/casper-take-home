"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/auth/actions";
import { MINIMUM_PASSWORD_LENGTH } from "@/auth/validation";

type AuthFormProps = {
  // The Server Action that handles the submission: signIn or signUp.
  action: (
    previousState: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  submitLabel: string; // e.g. "Sign in"
  pendingLabel: string; // shown while the server works, e.g. "Signing in…"
  isNewAccount: boolean; // sign-up picks a new password; sign-in types an existing one
};

const initialFormState: AuthFormState = { email: "" };

// The email + password form used by both the sign-in and sign-up pages.
export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  isNewAccount,
}: AuthFormProps) {
  // useActionState calls the Server Action on submit and gives us:
  //   formState – whatever the action returned last (errors, the email typed)
  //   isPending – true while we wait for the server
  const [formState, formAction, isPending] = useActionState(
    action,
    initialFormState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={formState.email}
          className="text-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isNewAccount ? MINIMUM_PASSWORD_LENGTH : undefined}
          autoComplete={isNewAccount ? "new-password" : "current-password"}
          className="text-input"
        />
        {isNewAccount && (
          <p className="mt-1.5 text-xs text-ink-secondary">
            At least {MINIMUM_PASSWORD_LENGTH} characters.
          </p>
        )}
      </div>

      {formState.errorMessage && (
        <p role="alert" className="message-error">
          {formState.errorMessage}
        </p>
      )}

      {formState.noticeMessage && (
        <p role="status" className="message-notice">
          {formState.noticeMessage}
        </p>
      )}

      <button type="submit" disabled={isPending} className="button-primary mt-2 w-full">
        {isPending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
