"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

/**
 * System feedback (§31.37): concise, specific, auto-dismissing.
 * Announced politely for assistive tech.
 */
export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[60] flex max-w-sm items-center gap-4 rounded-md border border-line bg-surface px-5 py-3 shadow-elevated"
    >
      <span className="text-body-sm text-primary">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-label uppercase text-muted transition-colors hover:text-primary"
      >
        Dismiss
      </button>
    </div>
  );
}
