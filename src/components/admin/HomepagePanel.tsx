"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { Toast } from "@/components/ui/Toast";
import { adminRequest, issuesText, jsonInit } from "@/lib/admin-client";

interface SectionState {
  key: string;
  label: string;
  theme: "dark" | "light";
  required: boolean;
  visible: boolean;
}

/**
 * Admin → Website → Homepage (§10.1): section order and visibility with
 * Show/Hide, Reorder, Preview, and a Publish that persists to the CMS.
 * Hero and the final CTA are required and cannot be hidden.
 */
export function HomepagePanel() {
  const [sections, setSections] = useState<SectionState[]>([]);
  const [baseline, setBaseline] = useState<SectionState[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { ok, body } = await adminRequest<SectionState[]>(
      "/api/admin/homepage-sections",
    );
    if (ok) {
      const rows = body?.data ?? [];
      setSections(rows);
      setBaseline(rows);
    } else {
      setToast(issuesText(body));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = JSON.stringify(sections) !== JSON.stringify(baseline);

  const move = useCallback((index: number, delta: -1 | 1) => {
    setSections((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }, []);

  const toggle = useCallback((key: string) => {
    setSections((current) =>
      current.map((section) =>
        section.key === key && !section.required
          ? { ...section, visible: !section.visible }
          : section,
      ),
    );
  }, []);

  const publish = useCallback(async () => {
    const { ok, body } = await adminRequest(
      "/api/admin/homepage-sections",
      jsonInit("PUT", {
        order: sections.map((section) => section.key),
        sections: sections.map((section) => ({
          key: section.key,
          visible: section.visible,
        })),
      }),
    );
    if (!ok) {
      setToast(issuesText(body));
      return;
    }
    setBaseline(sections);
    setToast("Homepage published.");
  }, [sections]);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-body-sm text-muted">Loading homepage sections...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-title-md font-medium">Homepage</h1>
          <p className="mt-1 text-body-sm text-secondary">
            Manage the sections shown on the public homepage. Hero and the
            final CTA are required and cannot be removed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty ? <StatusChip tone="warning">Unsaved changes</StatusChip> : null}
          <Button href="/" variant="secondary" size="compact" newTab>
            Preview
          </Button>
          <Button
            onClick={() => void publish()}
            variant="primary"
            size="compact"
            disabled={!dirty}
          >
            Publish
          </Button>
        </div>
      </div>

      <ul className="mt-8 border-t border-line" data-homepage-sections>
        {sections.map((section, index) => {
          const firstFixed = index === 0;
          const lastFixed = index === sections.length - 1;
          return (
            <li
              key={section.key}
              data-section-key={section.key}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line py-4"
            >
              <span className="w-8 text-label tabular-nums text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-primary">
                {section.label}
              </span>
              <StatusChip>
                {section.theme === "dark" ? "Dark" : "Light"}
              </StatusChip>
              {section.required ? (
                <StatusChip>Required</StatusChip>
              ) : (
                <StatusChip tone={section.visible ? "neutral" : "warning"}>
                  {section.visible ? "Visible" : "Hidden"}
                </StatusChip>
              )}

              <div className="flex items-center gap-2">
                {section.required ? (
                  <button
                    type="button"
                    onClick={() => toggle(section.key)}
                    disabled
                    aria-pressed
                    className="min-h-11 rounded-pill px-3 text-body-sm font-medium text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hide
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(section.key)}
                    aria-pressed={!section.visible}
                    className="min-h-11 rounded-pill px-3 text-body-sm font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
                  >
                    {section.visible ? "Hide" : "Show"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={firstFixed || sections[index - 1]?.required}
                  aria-label={`Move ${section.label} up`}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-pill text-secondary transition-colors hover:bg-surface-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={lastFixed || sections[index + 1]?.required}
                  aria-label={`Move ${section.label} down`}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-pill text-secondary transition-colors hover:bg-surface-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
