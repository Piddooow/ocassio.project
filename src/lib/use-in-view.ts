"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True once the element has come near the viewport (rootMargin matches the
 * browser's lazy-loading reach, so placeholders only animate for frames
 * whose media is actually being fetched).
 */
export function useInViewOnce<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "600px",
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true);
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, inView, rootMargin]);

  return inView;
}
