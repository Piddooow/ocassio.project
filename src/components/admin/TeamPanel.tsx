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
import { AdminListSkeleton } from "./AdminListSkeleton";

interface TeamRow {
  id: number;
  name: string;
  roleTitle: string;
  bio: string | null;
  sortOrder: number;
  status: string;
  visibility: string;
}

const EMPTY_CREATE = {
  name: "",
  roleTitle: "",
  bio: "",
  sortOrder: "",
  visibility: "public",
};

/** Studio Team panel (§18): people and collaborators with visibility. */
export function TeamPanel() {
  const collection = useAdminCollection<TeamRow>("/api/admin/studio/team");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [created, setCreated] = useState(EMPTY_CREATE);

  const openEditor = (row: TeamRow) => {
    if (editingId === row.id) {
      setEditingId(null);
      setDraft(null);
      return;
    }
    setEditingId(row.id);
    setDraft({
      name: row.name,
      roleTitle: row.roleTitle,
      bio: row.bio ?? "",
      sortOrder: String(row.sortOrder),
      visibility: row.visibility,
    });
  };

  const saveEditor = async (row: TeamRow) => {
    if (!draft) return;
    const ok = await collection.update(row.id, {
      name: draft.name,
      roleTitle: draft.roleTitle,
      bio: draft.bio.trim() === "" ? null : draft.bio,
      sortOrder: Number(draft.sortOrder),
      visibility: draft.visibility,
    });
    if (ok) {
      setEditingId(null);
      setDraft(null);
    }
  };

  return (
    <div className="grid gap-12 xl:grid-cols-[1.8fr_1fr]">
      <section>
        <h2 className="text-title-sm text-primary">Team</h2>
        {!collection.loaded ? (
          <AdminListSkeleton />
        ) : null}
        {collection.listError ? (
          <p role="alert" className="mt-4 text-caption text-error">
            {collection.listError}
          </p>
        ) : null}
        {collection.loaded && collection.items.length === 0 ? (
          <p className="mt-4 text-body-sm text-muted">
            No team members yet. The public page shows its labeled
            placeholder until the first member is published.
          </p>
        ) : null}
        <ul className="mt-4 flex flex-col">
          {collection.items.map((row) => (
            <li
              key={row.id}
              data-admin-member={row.id}
              className="border-b border-line py-5 first:border-t"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-primary">
                    {row.name}
                  </p>
                  <p className="mt-1 text-caption text-muted">
                    {row.roleTitle} · {row.visibility} · order {row.sortOrder}
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
                    <FormField id={`tm-name-${row.id}`} label="Name" required>
                      <TextInput
                        id={`tm-name-${row.id}`}
                        name="name"
                        value={draft.name}
                        onChange={(event) =>
                          setDraft({ ...draft, name: event.target.value })
                        }
                      />
                    </FormField>
                    <FormField
                      id={`tm-role-${row.id}`}
                      label="Role title"
                      required
                    >
                      <TextInput
                        id={`tm-role-${row.id}`}
                        name="roleTitle"
                        value={draft.roleTitle}
                        onChange={(event) =>
                          setDraft({ ...draft, roleTitle: event.target.value })
                        }
                      />
                    </FormField>
                  </div>
                  <FormField id={`tm-bio-${row.id}`} label="Short bio">
                    <TextAreaInput
                      id={`tm-bio-${row.id}`}
                      name="bio"
                      rows={3}
                      value={draft.bio}
                      onChange={(event) =>
                        setDraft({ ...draft, bio: event.target.value })
                      }
                    />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`tm-vis-${row.id}`}
                        className="text-label uppercase tracking-label-wide text-secondary"
                      >
                        Visibility
                      </label>
                      <select
                        id={`tm-vis-${row.id}`}
                        value={draft.visibility}
                        onChange={(event) =>
                          setDraft({ ...draft, visibility: event.target.value })
                        }
                        className={`mt-2 ${SELECT_CLASS}`}
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <FormField id={`tm-order-${row.id}`} label="Display order">
                      <TextInput
                        id={`tm-order-${row.id}`}
                        name="sortOrder"
                        value={draft.sortOrder}
                        onChange={(event) =>
                          setDraft({ ...draft, sortOrder: event.target.value })
                        }
                      />
                    </FormField>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="compact"
                      disabled={collection.busyId === row.id}
                      onClick={() => void saveEditor(row)}
                    >
                      {collection.busyId === row.id ? "Saving..." : "Save member"}
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
        <h2 className="text-title-sm text-primary">Add a member</h2>
        <form
          data-member-create
          className="mt-5 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await collection.create({
              name: created.name,
              roleTitle: created.roleTitle,
              bio: created.bio.trim() === "" ? null : created.bio,
              sortOrder: created.sortOrder === "" ? 0 : Number(created.sortOrder),
              visibility: created.visibility,
            });
            if (ok) setCreated(EMPTY_CREATE);
          }}
        >
          <FormField id="new-member-name" label="Name" required>
            <TextInput
              id="new-member-name"
              name="name"
              value={created.name}
              onChange={(event) =>
                setCreated({ ...created, name: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-member-role" label="Role title" required>
            <TextInput
              id="new-member-role"
              name="roleTitle"
              value={created.roleTitle}
              onChange={(event) =>
                setCreated({ ...created, roleTitle: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-member-bio" label="Short bio">
            <TextAreaInput
              id="new-member-bio"
              name="bio"
              rows={3}
              value={created.bio}
              onChange={(event) =>
                setCreated({ ...created, bio: event.target.value })
              }
            />
          </FormField>
          <div>
            <label
              htmlFor="new-member-visibility"
              className="text-label uppercase tracking-label-wide text-secondary"
            >
              Visibility
            </label>
            <select
              id="new-member-visibility"
              value={created.visibility}
              onChange={(event) =>
                setCreated({ ...created, visibility: event.target.value })
              }
              className={`mt-2 ${SELECT_CLASS}`}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          {collection.createError ? (
            <p role="alert" className="text-caption text-error">
              {collection.createError}
            </p>
          ) : null}
          <Button type="submit" disabled={collection.creating}>
            {collection.creating ? "Creating..." : "Create member"}
          </Button>
        </form>
      </section>
    </div>
  );
}
