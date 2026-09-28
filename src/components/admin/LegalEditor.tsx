"use client";

import { useMemo, useState } from "react";
import {
  LEGAL_PAGES,
  type LegalBlock,
  type LegalPage,
} from "@/lib/content/legal";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { Toast } from "@/components/ui/Toast";
import {
  FormField,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/forms/FormField";

type LegalSlug = LegalPage["slug"];

interface EditableDoc {
  slug: LegalSlug;
  title: string;
  updatedDate: string;
  status: LegalPage["status"];
  blocks: LegalBlock[];
}

const STATUS_OPTIONS = ["draft", "scheduled", "published", "archived"] as const;

function toEditable(page: LegalPage): EditableDoc {
  return {
    slug: page.slug,
    title: page.title,
    updatedDate: page.updatedDate,
    status: page.status,
    blocks: page.blocks.map((block) => ({ ...block })),
  };
}

/**
 * Admin → Website → Legal (§6.14, §9.4, §31.33).
 * One editor for both documents with Save Draft / Preview / Publish.
 * Frontend-only stage: changes live in local state until the CMS backend.
 */
export function LegalEditor() {
  const initial = useMemo(() => LEGAL_PAGES.map(toEditable), []);
  const [docs, setDocs] = useState<EditableDoc[]>(initial);
  const [baseline, setBaseline] = useState<EditableDoc[]>(initial);
  const [activeSlug, setActiveSlug] = useState<LegalSlug>("privacy");
  const [toast, setToast] = useState<string | null>(null);

  const active = docs.find((doc) => doc.slug === activeSlug)!;
  const activeBaseline = baseline.find((doc) => doc.slug === activeSlug)!;
  const dirty = JSON.stringify(active) !== JSON.stringify(activeBaseline);

  const updateActive = (updater: (doc: EditableDoc) => EditableDoc) => {
    setDocs((current) =>
      current.map((doc) => (doc.slug === activeSlug ? updater(doc) : doc)),
    );
  };

  const updateBlock = (
    index: number,
    patch: Partial<Pick<LegalBlock, "type" | "text">>,
  ) => {
    updateActive((doc) => ({
      ...doc,
      blocks: doc.blocks.map((block, blockIndex) =>
        blockIndex === index ? { ...block, ...patch } : block,
      ),
    }));
  };

  const addBlock = (type: LegalBlock["type"]) => {
    updateActive((doc) => ({
      ...doc,
      blocks: [...doc.blocks, { type, text: "" }],
    }));
  };

  const removeBlock = (index: number) => {
    updateActive((doc) => ({
      ...doc,
      blocks: doc.blocks.filter((_, blockIndex) => blockIndex !== index),
    }));
  };

  const moveBlock = (index: number, delta: -1 | 1) => {
    updateActive((doc) => {
      const target = index + delta;
      if (target < 0 || target >= doc.blocks.length) return doc;
      const blocks = [...doc.blocks];
      const [block] = blocks.splice(index, 1);
      blocks.splice(target, 0, block);
      return { ...doc, blocks };
    });
  };

  const commit = (next: EditableDoc, message: string) => {
    setDocs((current) =>
      current.map((doc) => (doc.slug === next.slug ? next : doc)),
    );
    setBaseline((current) =>
      current.map((doc) => (doc.slug === next.slug ? next : doc)),
    );
    setToast(message);
  };

  const saveDraft = () => {
    commit(
      { ...active, status: "draft" },
      `${active.title} saved as draft.`,
    );
  };

  const publish = () => {
    commit({ ...active, status: "published" }, `${active.title} published.`);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-title-md font-medium">Legal</h1>
          <p className="mt-1 text-body-sm text-secondary">
            Manage the Privacy and Terms content shown on the public site.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty ? <StatusChip tone="warning">Unsaved changes</StatusChip> : null}
          <StatusChip>{active.status}</StatusChip>
          <Button href={`/${active.slug}`} variant="secondary" size="compact" newTab>
            Preview
          </Button>
          <Button
            onClick={saveDraft}
            variant="secondary"
            size="compact"
            disabled={!dirty}
          >
            Save Draft
          </Button>
          <Button
            onClick={publish}
            variant="primary"
            size="compact"
            disabled={!dirty}
          >
            Publish
          </Button>
        </div>
      </div>

      <div
        role="group"
        aria-label="Legal documents"
        className="mt-8 flex gap-6 border-b border-line"
      >
        {docs.map((doc) => {
          const isActive = doc.slug === activeSlug;
          return (
            <button
              key={doc.slug}
              type="button"
              data-doc-tab={doc.slug}
              onClick={() => setActiveSlug(doc.slug)}
              aria-pressed={isActive}
              className={`min-h-11 border-b-2 pb-2 text-body-sm font-medium transition-colors duration-300 ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-secondary"
              }`}
            >
              {doc.slug === "privacy" ? "Privacy" : "Terms"}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <FormField id="legal-title" label="Title">
          <TextInput
            id="legal-title"
            name="legal-title"
            value={active.title}
            onChange={(event) =>
              updateActive((doc) => ({ ...doc, title: event.target.value }))
            }
          />
        </FormField>
        <div className="grid grid-cols-2 gap-6">
          <FormField id="legal-updated" label="Updated Date">
            <TextInput
              id="legal-updated"
              name="legal-updated"
              type="date"
              value={active.updatedDate}
              onChange={(event) =>
                updateActive((doc) => ({
                  ...doc,
                  updatedDate: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField id="legal-status" label="Status">
            <SelectInput
              id="legal-status"
              name="legal-status"
              value={active.status}
              onChange={(event) =>
                updateActive((doc) => ({
                  ...doc,
                  status: event.target.value as EditableDoc["status"],
                }))
              }
              options={STATUS_OPTIONS}
              placeholder="Select a status…"
            />
          </FormField>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-label uppercase tracking-label-wide text-secondary">
          Body
        </p>
        <ul className="mt-4 flex flex-col gap-4">
          {active.blocks.map((block, index) => (
            <li
              key={`${block.type}-${index}`}
              data-legal-block
              className="rounded-md border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-label uppercase tracking-label-wide text-muted">
                  {block.type === "heading" ? "Heading" : "Paragraph"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateBlock(index, {
                        type: block.type === "heading" ? "paragraph" : "heading",
                      })
                    }
                    className="min-h-11 rounded-pill px-3 text-body-sm font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
                  >
                    {block.type === "heading" ? "Make paragraph" : "Make heading"}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move block ${index + 1} up`}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-pill text-secondary transition-colors hover:bg-surface-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === active.blocks.length - 1}
                    aria-label={`Move block ${index + 1} down`}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-pill text-secondary transition-colors hover:bg-surface-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(index)}
                    aria-label={`Remove block ${index + 1}`}
                    className="min-h-11 rounded-pill px-3 text-body-sm font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-error"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <TextAreaInput
                  id={`legal-block-${index}`}
                  name={`legal-block-${index}`}
                  value={block.text}
                  onChange={(event) =>
                    updateBlock(index, { text: event.target.value })
                  }
                  rows={block.type === "heading" ? 2 : 4}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" size="compact" onClick={() => addBlock("paragraph")}>
            Add paragraph
          </Button>
          <Button variant="secondary" size="compact" onClick={() => addBlock("heading")}>
            Add heading
          </Button>
        </div>
      </div>

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
