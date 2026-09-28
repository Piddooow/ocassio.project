"use client";

import { useCallback, useRef } from "react";
import type { KeyboardEvent } from "react";

/**
 * Roving arrow-key navigation for horizontal filter bars (§31.28:
 * keyboard operable). Returns a ref for the toolbar container and its
 * keydown handler; buttons must carry `data-filter-tab`.
 */
export function useFilterBarKeyboard() {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const buttons = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>("[data-filter-tab]") ??
        [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    buttons[(index + offset + buttons.length) % buttons.length]?.focus();
  }, []);

  return { ref, onKeyDown };
}
