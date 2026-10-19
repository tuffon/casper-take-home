"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { CompletedDay } from "@/practice/actions";
import { getCelebrationMessage } from "@/practice/celebration";

type CelebrationDialogProps = {
  completedDay: CompletedDay;
  onClose: () => void;
};

// The pop-up shown once, right after the save that finishes the day.
// It's a native <dialog>, so the browser handles keyboard focus and Escape.
export function CelebrationDialog({ completedDay, onClose }: CelebrationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();

    // The confetti canvas lives inside the dialog so it draws above the
    // dimmed page. Skipped entirely for people who prefer reduced motion.
    if (confettiCanvasRef.current) {
      const fireConfetti = confetti.create(confettiCanvasRef.current, {
        resize: true,
        disableForReducedMotion: true,
      });
      fireConfetti({
        particleCount: 90,
        spread: 75,
        startVelocity: 38,
        origin: { y: 0.35 },
        colors: ["#e8590c", "#0066cc", "#248a3d", "#f8c95a"],
      });
    }
  }, []);

  function close() {
    dialogRef.current?.close(); // fires onClose below
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="celebration-title"
      className="celebration-dialog"
    >
      <canvas
        ref={confettiCanvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full"
      />

      <div className="celebration-card">
        <CheckMark />

        <h2 id="celebration-title" className="mt-4 font-serif text-[32px] leading-tight font-semibold">
          Day complete
        </h2>
        <p className="mt-2 text-ink-secondary">
          {getCelebrationMessage(completedDay.currentStreak)}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2 rounded-field bg-parchment p-4">
          <DayStat value={completedDay.currentStreak} label="day streak" highlight />
          <DayStat value={completedDay.wordCount} label="words" />
          <DayStat value={completedDay.minutesWritten} label="minutes" />
        </div>

        {completedDay.isPersonalBest && (
          <p className="mt-4 text-sm font-semibold text-spark">New personal best</p>
        )}

        <button type="button" onClick={close} autoFocus className="button-primary mt-6 w-full">
          Keep writing
        </button>
        <Link href="/history" className="text-link mt-4 inline-block text-sm">
          See your history
        </Link>
      </div>
    </dialog>
  );
}

function DayStat({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div>
      <p className={`text-[28px] leading-tight font-semibold ${highlight ? "text-spark" : ""}`}>{value}</p>
      <p className="text-xs text-ink-secondary">{label}</p>
    </div>
  );
}

// An orange ring and check mark that draw themselves in (see .check-mark in globals.css).
function CheckMark() {
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true" className="check-mark mx-auto h-14 w-14">
      <circle cx="26" cy="26" r="24" fill="none" strokeWidth="3" />
      <path d="M15 27 l7 7 l15 -16" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
