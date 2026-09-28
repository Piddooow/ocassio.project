"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  FormField,
  TextAreaInput,
  TextInput,
} from "@/components/forms/FormField";
import { useAdminCollection } from "./useAdminCollection";

interface ProcessRow {
  id: number;
  stepNumber: number;
  title: string;
  explanation: string;
  sortOrder: number;
  status: string;
}

const EMPTY_CREATE = { stepNumber: "", title: "", explanation: "", sortOrder: "" };

/**
 * Process module panel (§16, §6.7): the nine steps, Hide/Show instead of
 * a draft/archived lifecycle.
 */
export function ProcessPanel() {
  const collection = useAdminCollection<ProcessRow>("/api/admin/process");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [created, setCreated] = useState(EMPTY_CREATE);

  const openEditor = (row: ProcessRow) => {
    if (editingId === row.id) {
      setEditingId(null);
      setDraft(null);
      return;
    }
    setEditingId(row.id);
    setDraft({
      stepNumber: String(row.stepNumber),
      title: row.title,
      explanation: row.explanation,
      sortOrder: String(row.sortOrder),
    });
  };

  const saveEditor = async (row: ProcessRow) => {
    if (!draft) return;
    const ok = await collection.update(row.id, {
      stepNumber: Number(draft.stepNumber),
      title: draft.title,
      explanation: draft.explanation,
      sortOrder: Number(draft.sortOrder),
    });
    if (ok) {
      setEditingId(null);
      setDraft(null);
    }
  };

  return (
    <div className="grid gap-12 xl:grid-cols-[1.8fr_1fr]">
      <section>
        <h2 className="text-title-sm text-primary">Steps</h2>
        {!collection.loaded ? (
          <p className="mt-4 text-body-sm text-muted">Loading steps...</p>
        ) : null}
        {collection.listError ? (
          <p role="alert" className="mt-4 text-caption text-error">
            {collection.listError}
          </p>
        ) : null}
        <ul className="mt-4 flex flex-col">
          {collection.items.map((row) => (
            <li
              key={row.id}
              data-admin-step={row.stepNumber}
              className="border-b border-line py-5 first:border-t"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-primary">
                    {String(row.stepNumber).padStart(2, "0")} · {row.title}
                  </p>
                  <p className="mt-1 max-w-xl text-caption text-muted">
                    {row.explanation}
                  </p>
                </div>
                <StatusChip
                  tone={row.status === "visible" ? "success" : "neutral"}
                >
                  {row.status}
                </StatusChip>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  size="compact"
                  variant="secondary"
                  onClick={() => openEditor(row)}
                >
                  {editingId === row.id ? "Editing" : "Edit"}
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={collection.busyId === row.id}
                  onClick={() =>
                    void collection.update(row.id, {
                      status: row.status === "visible" ? "hidden" : "visible",
                    })
                  }
                >
                  {row.status === "visible" ? "Hide" : "Show"}
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={collection.busyId === row.id}
                  onClick={() => void collection.remove(row.id)}
                >
                  Delete
                </Button>
              </div>
              {collection.rowError[row.id] ? (
                <p role="alert" className="mt-2 text-caption text-error">
                  {collection.rowError[row.id]}
                </p>
              ) : null}

              {editingId === row.id && draft ? (
                <div className="mt-5 flex flex-col gap-4 border-l-2 border-line pl-5">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <FormField id={`ps-num-${row.id}`} label="Number" required>
                      <TextInput
                        id={`ps-num-${row.id}`}
                        name="stepNumber"
                        value={draft.stepNumber}
                        onChange={(event) =>
                          setDraft({ ...draft, stepNumber: event.target.value })
                        }
                      />
                    </FormField>
                    <div className="sm:col-span-3">
                      <FormField id={`ps-title-${row.id}`} label="Title" required>
                        <TextInput
                          id={`ps-title-${row.id}`}
                          name="title"
                          value={draft.title}
                          onChange={(event) =>
                            setDraft({ ...draft, title: event.target.value })
                          }
                        />
                      </FormField>
                    </div>
                  </div>
                  <FormField
                    id={`ps-expl-${row.id}`}
                    label="Explanation"
                    required
                  >
                    <TextAreaInput
                      id={`ps-expl-${row.id}`}
                      name="explanation"
                      rows={3}
                      value={draft.explanation}
                      onChange={(event) =>
                        setDraft({ ...draft, explanation: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField id={`ps-order-${row.id}`} label="Display order">
                    <TextInput
                      id={`ps-order-${row.id}`}
                      name="sortOrder"
                      value={draft.sortOrder}
                      onChange={(event) =>
                        setDraft({ ...draft, sortOrder: event.target.value })
                      }
                    />
                  </FormField>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="compact"
                      disabled={collection.busyId === row.id}
                      onClick={() => void saveEditor(row)}
                    >
                      {collection.busyId === row.id ? "Saving..." : "Save step"}
                    </Button>
                    <Button
                      size="compact"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line pt-8 xl:border-l xl:border-t-0 xl:pl-12 xl:pt-0">
        <h2 className="text-title-sm text-primary">Add a step</h2>
        <form
          data-step-create
          className="mt-5 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await collection.create({
              stepNumber: Number(created.stepNumber),
              title: created.title,
              explanation: created.explanation,
              sortOrder: created.sortOrder === "" ? 0 : Number(created.sortOrder),
            });
            if (ok) setCreated(EMPTY_CREATE);
          }}
        >
          <FormField id="new-step-number" label="Number" required hint="1 to 99.">
            <TextInput
              id="new-step-number"
              name="stepNumber"
              value={created.stepNumber}
              onChange={(event) =>
                setCreated({ ...created, stepNumber: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-step-title" label="Title" required>
            <TextInput
              id="new-step-title"
              name="title"
              value={created.title}
              onChange={(event) =>
                setCreated({ ...created, title: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-step-explanation" label="Explanation" required>
            <TextAreaInput
              id="new-step-explanation"
              name="explanation"
              rows={3}
              value={created.explanation}
              onChange={(event) =>
                setCreated({ ...created, explanation: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-step-order" label="Display order">
            <TextInput
              id="new-step-order"
              name="sortOrder"
              value={created.sortOrder}
              onChange={(event) =>
                setCreated({ ...created, sortOrder: event.target.value })
              }
            />
          </FormField>
          {collection.createError ? (
            <p role="alert" className="text-caption text-error">
              {collection.createError}
            </p>
          ) : null}
          <Button type="submit" disabled={collection.creating}>
            {collection.creating ? "Creating..." : "Create step"}
          </Button>
        </form>
      </section>
    </div>
  );
}
