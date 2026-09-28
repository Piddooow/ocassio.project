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

interface FaqRow {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  status: string;
}

const EMPTY_CREATE = { question: "", answer: "", sortOrder: "" };

/**
 * FAQ module panel (§12.4): entries surface on Service Detail pages
 * once related to a service. Publish workflow included.
 */
export function FaqPanel() {
  const collection = useAdminCollection<FaqRow>("/api/admin/faq");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [created, setCreated] = useState(EMPTY_CREATE);

  const openEditor = (row: FaqRow) => {
    if (editingId === row.id) {
      setEditingId(null);
      setDraft(null);
      return;
    }
    setEditingId(row.id);
    setDraft({
      question: row.question,
      answer: row.answer,
      sortOrder: String(row.sortOrder),
    });
  };

  const saveEditor = async (row: FaqRow) => {
    if (!draft) return;
    const ok = await collection.update(row.id, {
      question: draft.question,
      answer: draft.answer,
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
        <h2 className="text-title-sm text-primary">Questions</h2>
        {!collection.loaded ? (
          <p className="mt-4 text-body-sm text-muted">Loading FAQ...</p>
        ) : null}
        {collection.listError ? (
          <p role="alert" className="mt-4 text-caption text-error">
            {collection.listError}
          </p>
        ) : null}
        {collection.loaded && collection.items.length === 0 ? (
          <p className="mt-4 text-body-sm text-muted">
            No FAQ entries yet. Add the first question.
          </p>
        ) : null}
        <ul className="mt-4 flex flex-col">
          {collection.items.map((row) => (
            <li
              key={row.id}
              data-admin-faq={row.id}
              className="border-b border-line py-5 first:border-t"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-primary">
                    {row.question}
                  </p>
                  <p className="mt-1 max-w-xl text-caption text-muted">
                    {row.answer}
                  </p>
                </div>
                <StatusChip
                  tone={row.status === "published" ? "success" : "neutral"}
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
                  onClick={() => void collection.action(row.id, "publish")}
                >
                  Publish
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={collection.busyId === row.id}
                  onClick={() => void collection.action(row.id, "unpublish")}
                >
                  Unpublish
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={collection.busyId === row.id}
                  onClick={() => void collection.action(row.id, "archive")}
                >
                  Archive
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
                  <FormField
                    id={`faq-q-${row.id}`}
                    label="Question"
                    required
                  >
                    <TextInput
                      id={`faq-q-${row.id}`}
                      name="question"
                      value={draft.question}
                      onChange={(event) =>
                        setDraft({ ...draft, question: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField id={`faq-a-${row.id}`} label="Answer" required>
                    <TextAreaInput
                      id={`faq-a-${row.id}`}
                      name="answer"
                      rows={4}
                      value={draft.answer}
                      onChange={(event) =>
                        setDraft({ ...draft, answer: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField id={`faq-order-${row.id}`} label="Display order">
                    <TextInput
                      id={`faq-order-${row.id}`}
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
                      {collection.busyId === row.id ? "Saving..." : "Save entry"}
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
        <h2 className="text-title-sm text-primary">Add a question</h2>
        <form
          data-faq-create
          className="mt-5 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await collection.create({
              question: created.question,
              answer: created.answer,
              sortOrder: created.sortOrder === "" ? 0 : Number(created.sortOrder),
            });
            if (ok) setCreated(EMPTY_CREATE);
          }}
        >
          <FormField id="new-faq-question" label="Question" required>
            <TextInput
              id="new-faq-question"
              name="question"
              value={created.question}
              onChange={(event) =>
                setCreated({ ...created, question: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-faq-answer" label="Answer" required>
            <TextAreaInput
              id="new-faq-answer"
              name="answer"
              rows={4}
              value={created.answer}
              onChange={(event) =>
                setCreated({ ...created, answer: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-faq-order" label="Display order">
            <TextInput
              id="new-faq-order"
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
            {collection.creating ? "Creating..." : "Create entry"}
          </Button>
        </form>
      </section>
    </div>
  );
}
