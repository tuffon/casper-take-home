"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton />
    </form>
  );
}

// useFormStatus only works in a component rendered inside the <form>,
// which is why the button is its own component.
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="button-secondary">
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
