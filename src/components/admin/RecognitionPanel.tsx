"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  FormField,
  SELECT_CLASS,
  TextAreaInput,
  TextInput,
} from "@/components/forms/FormField";
import { useAdminCollection } from "./useAdminCollection";

interface RecognitionRow {
  id: number;
  title: string;
  organization: string | null;
  year: number;
  url: string | null;
  recognitionType: string;
  description: string | null;
  sortOrder: number;
  status: string;
}

const RECOGNITION_TYPE_OPTIONS = [
  { value: "publication", label: "Publication" },
  { value: "award", label: "Award" },
  { value: "feature", label: "Feature" },
  { value: "exhibition", label: "Exhibition" },
] as const;

const EMPTY_CREATE = {
  title: "",
  organization: "",
  year: "",
  url: "",
  recognitionType: "publication",
  description: "",
  sortOrder: "",
};

/** Studio Recognition panel (§18): publications, awards, features. */
export function RecognitionPanel() {
  const collection = useAdminCollection<RecognitionRow>(
    "/api/admin/studio/recognition",
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [created, setCreated] = useState(EMPTY_CREATE);

  const openEditor = (row: RecognitionRow) => {
    if (editingId === row.id) {
      setEditingId(null);
      setDraft(null);
      return;
    }
    setEditingId(row.id);
    setDraft({
      title: row.title,
      organization: row.organization ?? "",
      year: String(row.year),
      url: row.url ?? "",
      recognitionType: row.recognitionType,
      description: row.description ?? "",
      sortOrder: String(row.sortOrder),
    });
  };

  const saveEditor = async (row: RecognitionRow) => {
    if (!draft) return;
    const ok = await collection.update(row.id, {
      title: draft.title,
      organization: draft.organization.trim() === "" ? null : draft.organization,
      year: Number(draft.year),
      url: draft.url.trim() === "" ? null : draft.url,
      recognitionType: draft.recognitionType,
      description: draft.description.trim() === "" ? null : draft.description,
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
        <h2 className="text-title-sm text-primary">Recognition</h2>
        {!collection.loaded ? (
          <p className="mt-4 text-body-sm text-muted">Loading entries...</p>
        ) : null}
        {collection.listError ? (
          <p role="alert" className="mt-4 text-caption text-error">
            {collection.listError}
          </p>
        ) : null}
        {collection.loaded && collection.items.length === 0 ? (
          <p className="mt-4 text-body-sm text-muted">
            No entries yet. The public page shows its labeled placeholder
            until the first entry is published.
          </p>
        ) : null}
        <ul className="mt-4 flex flex-col">
          {collection.items.map((row) => (
            <li
              key={row.id}
              data-admin-recognition={row.id}
              className="border-b border-line py-5 first:border-t"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-primary">
                    {row.title}
                  </p>
                  <p className="mt-1 text-caption text-muted">
                    {row.organization ?? "No organization"} ·{" "}
                    {row.recognitionType} · {row.year}
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id={`rc-title-${row.id}`} label="Title" required>
                      <TextInput
                        id={`rc-title-${row.id}`}
                        name="title"
                        value={draft.title}
                        onChange={(event) =>
                          setDraft({ ...draft, title: event.target.value })
                        }
                      />
                    </FormField>
                    <FormField
                      id={`rc-org-${row.id}`}
                      label="Organization"
                    >
                      <TextInput
                        id={`rc-org-${row.id}`}
                        name="organization"
                        value={draft.organization}
                        onChange={(event) =>
                          setDraft({ ...draft, organization: event.target.value })
                        }
                      />
                    </FormField>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField id={`rc-year-${row.id}`} label="Year" required>
                      <TextInput
                        id={`rc-year-${row.id}`}
                        name="year"
                        value={draft.year}
                        onChange={(event) =>
                          setDraft({ ...draft, year: event.target.value })
                        }
                      />
                    </FormField>
                    <div>
                      <label
                        htmlFor={`rc-type-${row.id}`}
                        className="text-label uppercase tracking-label-wide text-secondary"
                      >
                        Type *
                      </label>
                      <select
                        id={`rc-type-${row.id}`}
                        value={draft.recognitionType}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            recognitionType: event.target.value,
                          })
                        }
                        className={`mt-2 ${SELECT_CLASS}`}
                      >
                        {RECOGNITION_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <FormField id={`rc-order-${row.id}`} label="Display order">
                      <TextInput
                        id={`rc-order-${row.id}`}
                        name="sortOrder"
                        value={draft.sortOrder}
                        onChange={(event) =>
                          setDraft({ ...draft, sortOrder: event.target.value })
                        }
                      />
                    </FormField>
                  </div>
                  <FormField
                    id={`rc-url-${row.id}`}
                    label="Link"
                    hint="Full https:// URL."
                  >
                    <TextInput
                      id={`rc-url-${row.id}`}
                      name="url"
                      type="url"
                      value={draft.url}
                      onChange={(event) =>
                        setDraft({ ...draft, url: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField id={`rc-desc-${row.id}`} label="Description">
                    <TextAreaInput
                      id={`rc-desc-${row.id}`}
                      name="description"
                      rows={2}
                      value={draft.description}
                      onChange={(event) =>
                        setDraft({ ...draft, description: event.target.value })
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
        <h2 className="text-title-sm text-primary">Add an entry</h2>
        <form
          data-recognition-create
          className="mt-5 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await collection.create({
              title: created.title,
              organization:
                created.organization.trim() === "" ? null : created.organization,
              year: Number(created.year),
              url: created.url.trim() === "" ? null : created.url,
              recognitionType: created.recognitionType,
              description:
                created.description.trim() === "" ? null : created.description,
              sortOrder: created.sortOrder === "" ? 0 : Number(created.sortOrder),
            });
            if (ok) setCreated(EMPTY_CREATE);
          }}
        >
          <FormField id="new-recognition-title" label="Title" required>
            <TextInput
              id="new-recognition-title"
              name="title"
              value={created.title}
              onChange={(event) =>
                setCreated({ ...created, title: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-recognition-organization" label="Organization">
            <TextInput
              id="new-recognition-organization"
              name="organization"
              value={created.organization}
              onChange={(event) =>
                setCreated({ ...created, organization: event.target.value })
              }
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="new-recognition-year" label="Year" required>
              <TextInput
                id="new-recognition-year"
                name="year"
                value={created.year}
                onChange={(event) =>
                  setCreated({ ...created, year: event.target.value })
                }
              />
            </FormField>
            <div>
              <label
                htmlFor="new-recognition-type"
                className="text-label uppercase tracking-label-wide text-secondary"
              >
                Type *
              </label>
              <select
                id="new-recognition-type"
                value={created.recognitionType}
                onChange={(event) =>
                  setCreated({ ...created, recognitionType: event.target.value })
                }
                className={`mt-2 ${SELECT_CLASS}`}
              >
                {RECOGNITION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <FormField
            id="new-recognition-url"
            label="Link"
            hint="Full https:// URL."
          >
            <TextInput
              id="new-recognition-url"
              name="url"
              type="url"
              value={created.url}
              onChange={(event) =>
                setCreated({ ...created, url: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-recognition-description" label="Description">
            <TextAreaInput
              id="new-recognition-description"
              name="description"
              rows={2}
              value={created.description}
              onChange={(event) =>
                setCreated({ ...created, description: event.target.value })
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
