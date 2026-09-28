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
import { toLines, fromLines, adminRequest, issuesText, jsonInit } from "@/lib/admin-client";
import { SERVICE_TYPES } from "@/lib/content/services";
import { useAdminCollection } from "./useAdminCollection";
import { AdminListSkeleton } from "./AdminListSkeleton";

interface ServiceRow {
  id: number;
  name: string;
  slug: string;
  serviceType: string;
  shortDescription: string;
  sortOrder: number;
  status: string;
}

interface ServiceDraft {
  name: string;
  serviceType: string;
  shortDescription: string;
  sortOrder: string;
  paragraphs: string;
  whoItIsFor: string;
  deliverables: string;
  projects: string;
}

const EMPTY_CREATE = {
  name: "",
  slug: "",
  serviceType: SERVICE_TYPES[0] as string,
  shortDescription: "",
  sortOrder: "1",
};

/**
 * Services module panel (§14): list, create, edit core + details +
 * selected work, and run the publish workflow. Backend enforces the
 * owner/editor roles (§27).
 */
export function ServicesPanel() {
  const collection = useAdminCollection<ServiceRow>("/api/admin/services");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [created, setCreated] = useState(EMPTY_CREATE);

  const openEditor = async (row: ServiceRow) => {
    setEditingId(row.id);
    setEditorError(null);
    setLoadingEditor(true);
    const [detail, relations] = await Promise.all([
      adminRequest<{
        details: { paragraphs: string[]; whoItIsFor: string[] } | null;
        detailsDeliverables: string[];
      }>(`/api/admin/services/${row.id}`),
      adminRequest<{ projects: string[] }>(
        `/api/admin/services/${row.id}/relations`,
      ),
    ]);
    setLoadingEditor(false);
    if (!detail.ok || !relations.ok) {
      setEditorError(
        issuesText(detail.body) || issuesText(relations.body) || "Could not load the editor.",
      );
      return;
    }
    setDraft({
      name: row.name,
      serviceType: row.serviceType,
      shortDescription: row.shortDescription,
      sortOrder: String(row.sortOrder),
      paragraphs: fromLines(detail.body?.data?.details?.paragraphs),
      whoItIsFor: fromLines(detail.body?.data?.details?.whoItIsFor),
      deliverables: fromLines(detail.body?.data?.detailsDeliverables),
      projects: (relations.body?.data?.projects ?? []).join("\n"),
    });
  };

  const saveEditor = async (row: ServiceRow) => {
    if (!draft) return;
    setEditorError(null);
    const updated = await collection.update(row.id, {
      name: draft.name,
      serviceType: draft.serviceType,
      shortDescription: draft.shortDescription,
      sortOrder: Number(draft.sortOrder),
      details: {
        bodyBlocks: {
          paragraphs: toLines(draft.paragraphs),
          whoItIsFor: toLines(draft.whoItIsFor),
        },
        deliverables: toLines(draft.deliverables),
      },
    });
    if (!updated) return;
    const relations = await adminRequest(
      `/api/admin/services/${row.id}/relations`,
      jsonInit("PUT", { projects: toLines(draft.projects) }),
    );
    if (!relations.ok) {
      setEditorError(issuesText(relations.body));
      return;
    }
    setEditingId(null);
    setDraft(null);
    await collection.load();
  };

  return (
    <div className="grid gap-12 xl:grid-cols-[1.8fr_1fr]">
      <section>
        <h2 className="text-title-sm text-primary">Services</h2>
        {!collection.loaded ? (
          <AdminListSkeleton />
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
              data-admin-service={row.slug}
              className="border-b border-line py-5 first:border-t"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-primary">
                    {row.name}
                  </p>
                  <p className="mt-1 text-caption text-muted">
                    /{row.slug} · {row.serviceType} · order {row.sortOrder}
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
                  onClick={() => void openEditor(row)}
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
                  {loadingEditor ? (
                    <p className="text-caption text-muted">
                      Loading details...
                    </p>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id={`svc-name-${row.id}`} label="Name" required>
                      <TextInput
                        id={`svc-name-${row.id}`}
                        name="name"
                        value={draft.name}
                        onChange={(event) =>
                          setDraft({ ...draft, name: event.target.value })
                        }
                      />
                    </FormField>
                    <div>
                      <label
                        htmlFor={`svc-type-${row.id}`}
                        className="text-label uppercase tracking-label-wide text-secondary"
                      >
                        Service type *
                      </label>
                      <select
                        id={`svc-type-${row.id}`}
                        value={draft.serviceType}
                        onChange={(event) =>
                          setDraft({ ...draft, serviceType: event.target.value })
                        }
                        className={`mt-2 ${SELECT_CLASS}`}
                      >
                        {SERVICE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <FormField
                    id={`svc-short-${row.id}`}
                    label="Short description"
                    required
                  >
                    <TextAreaInput
                      id={`svc-short-${row.id}`}
                      name="shortDescription"
                      rows={3}
                      value={draft.shortDescription}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          shortDescription: event.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField
                    id={`svc-paragraphs-${row.id}`}
                    label="Description paragraphs"
                    hint="One paragraph per line. Highlight words with [kata](/tujuan)."
                  >
                    <TextAreaInput
                      id={`svc-paragraphs-${row.id}`}
                      name="paragraphs"
                      value={draft.paragraphs}
                      onChange={(event) =>
                        setDraft({ ...draft, paragraphs: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    id={`svc-audience-${row.id}`}
                    label="Who this is for"
                    hint="One line per audience."
                  >
                    <TextAreaInput
                      id={`svc-audience-${row.id}`}
                      name="whoItIsFor"
                      rows={4}
                      value={draft.whoItIsFor}
                      onChange={(event) =>
                        setDraft({ ...draft, whoItIsFor: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    id={`svc-deliverables-${row.id}`}
                    label="Deliverables"
                    hint="One deliverable per line."
                  >
                    <TextAreaInput
                      id={`svc-deliverables-${row.id}`}
                      name="deliverables"
                      rows={4}
                      value={draft.deliverables}
                      onChange={(event) =>
                        setDraft({ ...draft, deliverables: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    id={`svc-projects-${row.id}`}
                    label="Selected work"
                    hint="Project slugs, one per line; the first is the cover."
                  >
                    <TextAreaInput
                      id={`svc-projects-${row.id}`}
                      name="projects"
                      rows={3}
                      value={draft.projects}
                      onChange={(event) =>
                        setDraft({ ...draft, projects: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField id={`svc-order-${row.id}`} label="Display order">
                    <TextInput
                      id={`svc-order-${row.id}`}
                      name="sortOrder"
                      inputMode="text"
                      value={draft.sortOrder}
                      onChange={(event) =>
                        setDraft({ ...draft, sortOrder: event.target.value })
                      }
                    />
                  </FormField>
                  {editorError ? (
                    <p role="alert" className="text-caption text-error">
                      {editorError}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="compact"
                      disabled={collection.busyId === row.id}
                      onClick={() => void saveEditor(row)}
                    >
                      {collection.busyId === row.id ? "Saving..." : "Save service"}
                    </Button>
                    <Button
                      size="compact"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(null);
                        setDraft(null);
                        setEditorError(null);
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
        <h2 className="text-title-sm text-primary">Add a service</h2>
        <form
          data-service-create
          className="mt-5 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await collection.create({
              name: created.name,
              slug: created.slug,
              serviceType: created.serviceType,
              shortDescription: created.shortDescription,
              sortOrder: Number(created.sortOrder),
            });
            if (ok) setCreated(EMPTY_CREATE);
          }}
        >
          <FormField id="new-service-name" label="Name" required>
            <TextInput
              id="new-service-name"
              name="name"
              value={created.name}
              onChange={(event) =>
                setCreated({ ...created, name: event.target.value })
              }
            />
          </FormField>
          <FormField
            id="new-service-slug"
            label="Slug"
            required
            hint="Lowercase words with dashes, e.g. creative-production."
          >
            <TextInput
              id="new-service-slug"
              name="slug"
              value={created.slug}
              onChange={(event) =>
                setCreated({ ...created, slug: event.target.value })
              }
            />
          </FormField>
          <div>
            <label
              htmlFor="new-service-type"
              className="text-label uppercase tracking-label-wide text-secondary"
            >
              Service type *
            </label>
            <select
              id="new-service-type"
              value={created.serviceType}
              onChange={(event) =>
                setCreated({ ...created, serviceType: event.target.value })
              }
              className={`mt-2 ${SELECT_CLASS}`}
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <FormField
            id="new-service-short"
            label="Short description"
            required
          >
            <TextAreaInput
              id="new-service-short"
              name="shortDescription"
              rows={3}
              value={created.shortDescription}
              onChange={(event) =>
                setCreated({ ...created, shortDescription: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-service-order" label="Display order">
            <TextInput
              id="new-service-order"
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
            {collection.creating ? "Creating..." : "Create service"}
          </Button>
        </form>
      </section>
    </div>
  );
}
