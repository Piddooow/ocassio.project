"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ocassio-visitor";

/**
 * Anonymous visitor identity for likes: a random id kept in
 * localStorage so one visitor counts once per entity.
 */
export function useVisitorId(): string | null {
  const [visitorId, setVisitorId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const existing = window.localStorage.getItem(STORAGE_KEY);
      if (existing) {
        setVisitorId(existing);
        return;
      }
      const created = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, created);
      setVisitorId(created);
    } catch {
      setVisitorId(null);
    }
  }, []);

  return visitorId;
}
