"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  FormField,
  SELECT_CLASS,
  TextAreaInput,
  TextInput,
} from "@/components/ui/../forms/FormField";
import { adminRequest, issuesText, jsonInit, toLines } from "@/lib/admin-client";
import { AdminListSkeleton } from "./AdminListSkeleton";

interface ProjectRow {
  id: number;
  title: string;
  slug: string;
  client: string | null;
  category: string;
  year: number;
  projectDate: string;
  status: string;
  visibility: string;
  mediaCount: number;
}

interface EditorDraft {
  id: number;
  title: string;
  slug: string;
  client: string;
  projectType: string;
  category: string;
  year: string;
  projectDate: string;
  location: string;
  shortDescription: string;
  coverMediaId: string;
  heroMediaId: string;
  mediaIds: string;
  credits: string;
  relatedSlugs: string;
  seoMetaTitle: string;
  seoMetaDescription: string;
  visibility: "public" | "private";
}

function parseCredits(text: string) {
  return toLines(text)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return null;
      const role = line.slice(0, separator).trim();
      const name = line.slice(separator + 1).trim();
      return role && name ? { role, name } : null;
    })
    .filter((entry): entry is { role: string; name: string } => Boolean(entry));
}

/**
 * Portfolio Projects panel (§11, §12): list every state, edit the basic
 * fields, credits, relations, attached uploads, SEO, and publishing.
 */
export function ProjectsPanel() {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editor, setEditor] = useState<EditorDraft | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { ok, body } = await adminRequest<ProjectRow[]>("/api/admin/projects");
    if (ok) {
      setItems(body?.data ?? []);
      const meta = body?.meta as { categories?: string[] } | undefined;
      setCategories(meta?.categories ?? []);
      setError(null);
    } else {
      setError(issuesText(body));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (id: number, name: string) => {
    setBusyId(id);
    setError(null);
    const { ok, body } = await adminRequest(
      `/api/admin/projects/${id}/actions`,
      jsonInit("POST", { action: name }),
    );
    setBusyId(null);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setStatus(`Project ${name.replace("_", " ")} complete.`);
    await load();
  };

  const removeRow = async (id: number) => {
    setBusyId(id);
    setError(null);
    const { ok, body } = await adminRequest(`/api/admin/projects/${id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setStatus("Project deleted.");
    if (editor?.id === id) setEditor(null);
    await load();
  };

  const openEditor = async (row: ProjectRow) => {
    setEditorError(null);
    setStatus(null);
    const { ok, body } = await adminRequest<{
      project: Record<string, unknown>;
      media: Array<{ mediaId: number }>;
    }>(`/api/admin/projects/${row.id}`);
    if (!ok || !body?.data) {
      setEditorError(issuesText(body));
      return;
    }
    const project = body.data.project as unknown as EditorDraft & {
      credits?: { role: string; name: string }[];
      relatedSlugs?: string[];
    };
    setEditor({
      id: row.id,
      title: String(project.title ?? ""),
      slug: String(project.slug ?? ""),
      client: String(project.client ?? ""),
      projectType: String(project.projectType ?? ""),
      category: String(project.category ?? categories[0] ?? ""),
      year: String(project.year ?? ""),
      projectDate: String(project.projectDate ?? ""),
      location: String(project.location ?? ""),
      shortDescription: String(project.shortDescription ?? ""),
      coverMediaId: project.coverMediaId ? String(project.coverMediaId) : "",
      heroMediaId: project.heroMediaId ? String(project.heroMediaId) : "",
      mediaIds: body.data.media.map((entry) => entry.mediaId).join("\n"),
      credits: (project.credits ?? [])
        .map((entry) => `${entry.role}: ${entry.name}`)
        .join("\n"),
      relatedSlugs: (project.relatedSlugs ?? []).join("\n"),
      seoMetaTitle: String(project.seoMetaTitle ?? ""),
      seoMetaDescription: String(project.seoMetaDescription ?? ""),
      visibility: project.visibility === "private" ? "private" : "public",
    });
  };

  const saveEditor = async () => {
    if (!editor) return;
    setSaving(true);
    setEditorError(null);
    const { ok, body } = await adminRequest(
      `/api/admin/projects/${editor.id}`,
      jsonInit("PATCH", {
        title: editor.title,
        slug: editor.slug,
        client: editor.client.trim() || null,
        projectType: editor.projectType,
        category: editor.category,
        year: editor.year ? Number(editor.year) : undefined,
        projectDate: editor.projectDate,
        location: editor.location.trim() || null,
        shortDescription: editor.shortDescription,
        coverMediaId: editor.coverMediaId ? Number(editor.coverMediaId) : null,
        heroMediaId: editor.heroMediaId ? Number(editor.heroMediaId) : null,
        mediaIds: toLines(editor.mediaIds)
          .map((line) => Number(line))
          .filter((value) => Number.isInteger(value) && value > 0),
        credits: parseCredits(editor.credits),
        relatedSlugs: toLines(editor.relatedSlugs),
        seoMetaTitle: editor.seoMetaTitle.trim() || null,
        seoMetaDescription: editor.seoMetaDescription.trim() || null,
        visibility: editor.visibility,
      }),
    );
    setSaving(false);
    if (!ok) {
      setEditorError(issuesText(body));
      return;
    }
    setStatus("Project saved. A new version was recorded.");
    await load();
  };

  if (!loaded) {
    return <AdminListSkeleton rows={5} className="mt-0" />;
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="text-caption text-success">
          {status}
        </p>
      ) : null}

      <section>
        <h2 className="text-title-sm font-medium text-primary">
          Projects ({items.length})
        </h2>
        <ul className="mt-4">
          {items.map((row) => (
            <li
              key={row.id}
              data-admin-project={row.slug}
              className="border-b border-line py-5 first:border-t"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-primary">
                    {row.title}
                  </p>
                  <p className="mt-1 text-caption text-muted">
                    /{row.slug} · {row.category} · {row.year} · {row.mediaCount}{" "}
                    uploaded · attached
                  </p>
                </div>
                <StatusChip tone={row.status === "published" ? "success" : "neutral"}>
                  {row.status}
                </StatusChip>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  size="compact"
                  variant="secondary"
                  onClick={() => void openEditor(row)}
                >
                  {editor?.id === row.id ? "Editing" : "Edit"}
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={busyId === row.id}
                  onClick={() => void runAction(row.id, "publish")}
                >
                  Publish
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={busyId === row.id}
                  onClick={() => void runAction(row.id, "unpublish")}
                >
                  Unpublish
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={busyId === row.id}
                  onClick={() => void runAction(row.id, "archive")}
                >
                  Archive
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={busyId === row.id}
                  onClick={() => void removeRow(row.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {editor ? (
        <section data-project-editor className="border-t border-line pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-title-sm font-medium text-primary">
              Editing: {editor.title}
            </h2>
            <Button size="compact" variant="tertiary" onClick={() => setEditor(null)}>
              Close editor
            </Button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <FormField id="project-title" label="Title" required>
              <TextInput
                id="project-title"
                name="title"
                value={editor.title}
                onChange={(event) =>
                  setEditor({ ...editor, title: event.target.value })
                }
              />
            </FormField>
            <FormField id="project-slug" label="Slug" required>
              <TextInput
                id="project-slug"
                name="slug"
                value={editor.slug}
                onChange={(event) =>
                  setEditor({ ...editor, slug: event.target.value })
                }
              />
            </FormField>
            <FormField id="project-client" label="Client">
              <TextInput
                id="project-client"
                name="client"
                value={editor.client}
                onChange={(event) =>
                  setEditor({ ...editor, client: event.target.value })
                }
              />
            </FormField>
            <FormField id="project-type" label="Project type" required>
              <TextInput
                id="project-type"
                name="projectType"
                value={editor.projectType}
                onChange={(event) =>
                  setEditor({ ...editor, projectType: event.target.value })
                }
              />
            </FormField>
            <FormField id="project-category" label="Category" required>
              <select
                id="project-category"
                name="category"
                className={SELECT_CLASS}
                value={editor.category}
                onChange={(event) =>
                  setEditor({ ...editor, category: event.target.value })
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="project-year" label="Year" required>
              <TextInput
                id="project-year"
                name="year"
                value={editor.year}
                onChange={(event) =>
                  setEditor({ ...editor, year: event.target.value })
                }
              />
            </FormField>
            <FormField id="project-date" label="Project date" required>
              <TextInput
                id="project-date"
                name="projectDate"
                type="date"
                value={editor.projectDate}
                onChange={(event) =>
                  setEditor({ ...editor, projectDate: event.target.value })
                }
              />
            </FormField>
            <FormField id="project-location" label="Location">
              <TextInput
                id="project-location"
                name="location"
                value={editor.location}
                onChange={(event) =>
                  setEditor({ ...editor, location: event.target.value })
                }
              />
            </FormField>
            <FormField
              id="project-cover"
              label="Cover media ID"
              hint="Optional; uploaded images lead the gallery."
            >
              <TextInput
                id="project-cover"
                name="coverMediaId"
                value={editor.coverMediaId}
                onChange={(event) =>
                  setEditor({ ...editor, coverMediaId: event.target.value })
                }
              />
            </FormField>
            <FormField id="project-hero" label="Hero media ID" hint="Optional; leads over the cover.">
              <TextInput
                id="project-hero"
                name="heroMediaId"
                value={editor.heroMediaId}
                onChange={(event) =>
                  setEditor({ ...editor, heroMediaId: event.target.value })
                }
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField
              id="project-short-description"
              label="Short description"
              required
              hint="Highlight words with [kata](/tujuan), e.g. [our process](/process)."
            >
              <TextAreaInput
                id="project-short-description"
                name="shortDescription"
                rows={3}
                value={editor.shortDescription}
                onChange={(event) =>
                  setEditor({ ...editor, shortDescription: event.target.value })
                }
              />
            </FormField>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <FormField
              id="project-credits"
              label="Credits"
              hint="One per line as Role: Name."
            >
              <TextAreaInput
                id="project-credits"
                name="credits"
                rows={4}
                value={editor.credits}
                onChange={(event) =>
                  setEditor({ ...editor, credits: event.target.value })
                }
              />
            </FormField>
            <FormField
              id="project-related"
              label="Related project slugs"
              hint="One slug per line."
            >
              <TextAreaInput
                id="project-related"
                name="relatedSlugs"
                rows={4}
                value={editor.relatedSlugs}
                onChange={(event) =>
                  setEditor({ ...editor, relatedSlugs: event.target.value })
                }
              />
            </FormField>
            <FormField
              id="project-media-ids"
              label="Attached media IDs"
              hint="Uploaded image ids from the Media Library, one per line."
            >
              <TextAreaInput
                id="project-media-ids"
                name="mediaIds"
                rows={4}
                value={editor.mediaIds}
                onChange={(event) =>
                  setEditor({ ...editor, mediaIds: event.target.value })
                }
              />
            </FormField>
            <FormField id="project-visibility" label="Visibility">
              <select
                id="project-visibility"
                name="visibility"
                className={SELECT_CLASS}
                value={editor.visibility}
                onChange={(event) =>
                  setEditor({
                    ...editor,
                    visibility: event.target.value as "public" | "private",
                  })
                }
              >
                <option value="public">public</option>
                <option value="private">private</option>
              </select>
            </FormField>
            <FormField id="project-seo-title" label="SEO title">
              <TextInput
                id="project-seo-title"
                name="seoMetaTitle"
                value={editor.seoMetaTitle}
                onChange={(event) =>
                  setEditor({ ...editor, seoMetaTitle: event.target.value })
                }
              />
            </FormField>
            <FormField id="project-seo-description" label="SEO description">
              <TextInput
                id="project-seo-description"
                name="seoMetaDescription"
                value={editor.seoMetaDescription}
                onChange={(event) =>
                  setEditor({ ...editor, seoMetaDescription: event.target.value })
                }
              />
            </FormField>
          </div>

          {editorError ? (
            <p role="alert" className="mt-4 text-caption text-error">
              {editorError}
            </p>
          ) : null}
          <div className="mt-6" data-project-save>
            <Button size="compact" disabled={saving} onClick={() => void saveEditor()}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
