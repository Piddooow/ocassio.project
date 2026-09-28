"use client";

import Link from "next/link";

/**
 * Root error boundary (R-27): keeps the Ocassio chrome, explains what
 * happened without vagueness, and offers a retry plus a way home.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 text-center text-primary">
      <p className="text-label uppercase tracking-[0.14em] text-muted">
        Something went wrong
      </p>
      <h1 className="mt-6 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
        This page could not be loaded.
      </h1>
      <p className="mt-4 max-w-md text-body text-secondary">
        A rendering error interrupted the page. Trying again usually fixes it;
        if it keeps happening, head home and continue from there.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-full bg-cta px-5 text-button font-medium text-cta-foreground transition-opacity duration-300 hover:opacity-80"
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-button font-medium text-primary underline-offset-4 transition-opacity duration-300 hover:opacity-70"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
