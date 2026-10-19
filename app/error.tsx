"use client";

import { useEffect } from "react";

// Shown when a page hits an unexpected error, such as the database being
// unreachable. `retry` re-renders the page that failed.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card text-center">
      <h1 className="page-title">Something went wrong</h1>
      <p className="mt-2 text-ink-secondary">
        Anything you already saved is safe. Please try again.
      </p>
      <button type="button" onClick={retry} className="button-primary mt-6">
        Try again
      </button>
    </div>
  );
}
