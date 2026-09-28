"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { FormField, TextInput } from "@/components/forms/FormField";
import { useAdminCollection } from "./useAdminCollection";

interface ClientRow {
  id: number;
  name: string;
  website: string | null;
  featured: boolean;
  sortOrder: number;
  status: string;
}

const EMPTY_CREATE = { name: "", website: "", featured: "false", sortOrder: "" };

/** Studio Clients panel (§18): names, links, and the featured flag. */
export function ClientsPanel() {
  const collection = useAdminCollection<ClientRow>("/api/admin/studio/clients");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [created, setCreated] = useState(EMPTY_CREATE);

  const openEditor = (row: ClientRow) => {
    if (editingId === row.id) {
      setEditingId(null);
      setDraft(null);
      return;
    }
    setEditingId(row.id);
    setDraft({
      name: row.name,
      website: row.website ?? "",
      featured: row.featured ? "true" : "false",
      sortOrder: String(row.sortOrder),
    });
  };

  const saveEditor = async (row: ClientRow) => {
    if (!draft) return;
    const ok = await collection.update(row.id, {
      name: draft.name,
      website: draft.website.trim() === "" ? null : draft.website,
      featured: draft.featured === "true",
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
        <h2 className="text-title-sm text-primary">Clients</h2>
        {!collection.loaded ? (
          <p className="mt-4 text-body-sm text-muted">Loading clients...</p>
        ) : null}
        {collection.listError ? (
          <p role="alert" className="mt-4 text-caption text-error">
            {collection.listError}
          </p>
        ) : null}
        {collection.loaded && collection.items.length === 0 ? (
          <p className="mt-4 text-body-sm text-muted">
            No clients yet. The public page shows its labeled placeholder
            until the first client is published.
          </p>
        ) : null}
        <ul className="mt-4 flex flex-col">
          {collection.items.map((row) => (
            <li
              key={row.id}
              data-admin-client={row.id}
              className="border-b border-line py-5 first:border-t"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-primary">
                    {row.name}
                  </p>
                  <p className="mt-1 text-caption text-muted">
                    {row.website ?? "No website"} ·{" "}
                    {row.featured ? "Featured" : "Not featured"} · order{" "}
                    {row.sortOrder}
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
                  <FormField id={`cl-name-${row.id}`} label="Client name" required>
                    <TextInput
                      id={`cl-name-${row.id}`}
                      name="name"
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    id={`cl-website-${row.id}`}
                    label="Website"
                    hint="Full https:// URL."
                  >
                    <TextInput
                      id={`cl-website-${row.id}`}
                      name="website"
                      type="url"
                      value={draft.website}
                      onChange={(event) =>
                        setDraft({ ...draft, website: event.target.value })
                      }
                    />
                  </FormField>
                  <div className="flex items-center gap-2">
                    <input
                      id={`cl-featured-${row.id}`}
                      type="checkbox"
                      checked={draft.featured === "true"}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          featured: event.target.checked ? "true" : "false",
                        })
                      }
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor={`cl-featured-${row.id}`}
                      className="text-body-sm text-secondary"
                    >
                      Featured on Home and About
                    </label>
                  </div>
                  <FormField id={`cl-order-${row.id}`} label="Display order">
                    <TextInput
                      id={`cl-order-${row.id}`}
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
                      {collection.busyId === row.id ? "Saving..." : "Save client"}
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
        <h2 className="text-title-sm text-primary">Add a client</h2>
        <form
          data-client-create
          className="mt-5 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await collection.create({
              name: created.name,
              website: created.website.trim() === "" ? null : created.website,
              featured: created.featured === "true",
              sortOrder: created.sortOrder === "" ? 0 : Number(created.sortOrder),
            });
            if (ok) setCreated(EMPTY_CREATE);
          }}
        >
          <FormField id="new-client-name" label="Client name" required>
            <TextInput
              id="new-client-name"
              name="name"
              value={created.name}
              onChange={(event) =>
                setCreated({ ...created, name: event.target.value })
              }
            />
          </FormField>
          <FormField
            id="new-client-website"
            label="Website"
            hint="Full https:// URL."
          >
            <TextInput
              id="new-client-website"
              name="website"
              type="url"
              value={created.website}
              onChange={(event) =>
                setCreated({ ...created, website: event.target.value })
              }
            />
          </FormField>
          <div className="flex items-center gap-2">
            <input
              id="new-client-featured"
              type="checkbox"
              checked={created.featured === "true"}
              onChange={(event) =>
                setCreated({
                  ...created,
                  featured: event.target.checked ? "true" : "false",
                })
              }
              className="h-4 w-4"
            />
            <label
              htmlFor="new-client-featured"
              className="text-body-sm text-secondary"
            >
              Featured on Home and About
            </label>
          </div>
          {collection.createError ? (
            <p role="alert" className="text-caption text-error">
              {collection.createError}
            </p>
          ) : null}
          <Button type="submit" disabled={collection.creating}>
            {collection.creating ? "Creating..." : "Create client"}
          </Button>
        </form>
      </section>
    </div>
  );
}
