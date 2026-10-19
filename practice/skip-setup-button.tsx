"use client";

import { useFormStatus } from "react-dom";
import { skipSetup } from "@/practice/actions";

// "Skip for now" on the setup page. Writers who skip are asked again at
// their next sign-in.
export function SkipSetupButton() {
  return (
    <form action={skipSetup}>
      <SubmitButton />
    </form>
  );
}

// useFormStatus only works in a component rendered inside the <form>.
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="text-link text-sm">
      {pending ? "Skipping…" : "Skip for now"}
    </button>
  );
}
