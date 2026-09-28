"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  FormField,
  SELECT_CLASS,
  TextAreaInput,
  TextInput,
} from "@/components/forms/FormField";
import { adminRequest, issuesText, jsonInit } from "@/lib/admin-client";
import { AdminListSkeleton } from "./AdminListSkeleton";

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  author: string | null;
  publishDate: string;
  status: string;
  visibility: string;
  publishAt: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  blockCount: number;
}

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
}

interface BlockDraft {
  type: string;
  text: string;
  mediaId: string;
  referenceProjectId: string;
  /** Types the composer cannot edit yet (future modules) stay untouched. */
  locked: boolean;
}

interface EditorDraft {
  id: number;
  title: string;
  slug: string;
  categorySlug: string;
  publishDate: string;
  author: string;
  excerpt: string;
  visibility: "public" | "private";
  coverMediaId: string;
  relatedProjectId: string;
  seoMetaTitle: string;
  seoMetaDescription: string;
  blocks: BlockDraft[];
}

/** Types the block composer can create and edit (§6.10 subset). */
const COMPOSED_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "quote",
  "image",
  "video",
] as const;

const TEXT_BLOCK_TYPES = ["paragraph", "heading", "quote"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function serializeBlock(block: BlockDraft) {
  return {
    type: block.type,
    text: block.text.trim() || null,
    mediaId: block.mediaId ? Number(block.mediaId) : null,
    referenceProjectId: block.referenceProjectId
      ? Number(block.referenceProjectId)
      : null,
  };
}

/**
 * Journal Articles panel (§17): list every state, compose the editorial
 * fields plus the documented content blocks, and run the publish
 * workflow. Saved versions are recorded on the backend (§25).
 */
export function ArticlesPanel() {
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<number, string | null>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);

  const [editor, setEditor] = useState<EditorDraft | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [create, setCreate] = useState({
    title: "",
    slug: "",
    categorySlug: "",
    publishDate: todayIso(),
    excerpt: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newBlockType, setNewBlockType] = useState<string>(
    COMPOSED_BLOCK_TYPES[0],
  );

  const load = useCallback(async () => {
    const { ok, body } = await adminRequest<ArticleRow[]>("/api/admin/articles");
    if (ok) {
      setItems(body?.data ?? []);
      const meta = body?.meta as { categories?: CategoryOption[] } | undefined;
      setCategories(meta?.categories ?? []);
      setListError(null);
    } else {
      setListError(issuesText(body));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (id: number, name: string) => {
    setBusyId(id);
    setRowError((current) => ({ ...current, [id]: null }));
    const { ok, body } = await adminRequest(
      `/api/admin/articles/${id}/actions`,
      jsonInit("POST", { action: name }),
    );
    setBusyId(null);
    if (!ok) {
      setRowError((current) => ({ ...current, [id]: issuesText(body) }));
      return;
    }
    setStatusLine(`Article ${name.replace("_", " ")} complete.`);
    await load();
  };

  const removeRow = async (id: number) => {
    setBusyId(id);
    setRowError((current) => ({ ...current, [id]: null }));
    const { ok, body } = await adminRequest(`/api/admin/articles/${id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!ok) {
      setRowError((current) => ({ ...current, [id]: issuesText(body) }));
      return;
    }
    setStatusLine("Article deleted.");
    if (editor?.id === id) setEditor(null);
    await load();
  };

  const openEditor = async (row: ArticleRow) => {
    setEditorError(null);
    setStatusLine(null);
    const { ok, body } = await adminRequest<{
      article: {
        title: string;
        slug: string;
        publishDate: string;
        author: string | null;
        excerpt: string;
        visibility: "public" | "private";
        coverMediaId: number | null;
        relatedProjectId: number | null;
        seoMetaTitle: string | null;
        seoMetaDescription: string | null;
      };
      category: CategoryOption | null;
      blocks: Array<{
        blockType: string;
        textContent: string | null;
        mediaId: number | null;
        referenceProjectId: number | null;
      }>;
    }>(`/api/admin/articles/${row.id}`);
    if (!ok || !body?.data) {
      setEditorError(issuesText(body));
      return;
    }
    const detail = body.data;
    setEditor({
      id: row.id,
      title: detail.article.title,
      slug: detail.article.slug,
      categorySlug: detail.category?.slug ?? "",
      publishDate: detail.article.publishDate,
      author: detail.article.author ?? "",
      excerpt: detail.article.excerpt,
      visibility: detail.article.visibility,
      coverMediaId: detail.article.coverMediaId?.toString() ?? "",
      relatedProjectId: detail.article.relatedProjectId?.toString() ?? "",
      seoMetaTitle: detail.article.seoMetaTitle ?? "",
      seoMetaDescription: detail.article.seoMetaDescription ?? "",
      blocks: detail.blocks.map((block) => ({
        type: block.blockType,
        text: block.textContent ?? "",
        mediaId: block.mediaId?.toString() ?? "",
        referenceProjectId: block.referenceProjectId?.toString() ?? "",
        locked: !(COMPOSED_BLOCK_TYPES as readonly string[]).includes(
          block.blockType,
        ),
      })),
    });
  };

  const patchBlock = (index: number, patch: Partial<BlockDraft>) => {
    setEditor((current) =>
      current
        ? {
            ...current,
            blocks: current.blocks.map((block, position) =>
              position === index ? { ...block, ...patch } : block,
            ),
          }
        : current,
    );
  };

  const moveBlock = (index: number, delta: -1 | 1) => {
    setEditor((current) => {
      if (!current) return current;
      const target = index + delta;
      if (target < 0 || target >= current.blocks.length) return current;
      const blocks = [...current.blocks];
      const [moved] = blocks.splice(index, 1);
      blocks.splice(target, 0, moved);
      return { ...current, blocks };
    });
  };

  const removeBlock = (index: number) => {
    setEditor((current) =>
      current
        ? {
            ...current,
            blocks: current.blocks.filter((_, position) => position !== index),
          }
        : current,
    );
  };

  const addBlock = () => {
    setEditor((current) =>
      current
        ? {
            ...current,
            blocks: [
              ...current.blocks,
              {
                type: newBlockType,
                text: "",
                mediaId: "",
                referenceProjectId: "",
                locked: false,
              },
            ],
          }
        : current,
    );
  };

  const saveEditor = async () => {
    if (!editor) return;
    setSaving(true);
    setEditorError(null);
    const { ok, body } = await adminRequest(
      `/api/admin/articles/${editor.id}`,
      jsonInit("PATCH", {
        title: editor.title,
        slug: editor.slug,
        categorySlug: editor.categorySlug,
        publishDate: editor.publishDate,
        author: editor.author.trim() || null,
        excerpt: editor.excerpt,
        visibility: editor.visibility,
        coverMediaId: editor.coverMediaId ? Number(editor.coverMediaId) : null,
        relatedProjectId: editor.relatedProjectId
          ? Number(editor.relatedProjectId)
          : null,
        seoMetaTitle: editor.seoMetaTitle.trim() || null,
        seoMetaDescription: editor.seoMetaDescription.trim() || null,
        blocks: editor.blocks.map(serializeBlock),
      }),
    );
    setSaving(false);
    if (!ok) {
      setEditorError(issuesText(body));
      return;
    }
    setStatusLine("Article saved. A new version was recorded.");
    await load();
  };

  const createDraft = async () => {
    setCreating(true);
    setCreateError(null);
    const { ok, body } = await adminRequest(
      "/api/admin/articles",
      jsonInit("POST", {
        title: create.title,
        slug: create.slug,
        categorySlug: create.categorySlug || categories[0]?.slug || "",
        publishDate: create.publishDate,
        excerpt: create.excerpt,
      }),
    );
    setCreating(false);
    if (!ok) {
      setCreateError(issuesText(body));
      return;
    }
    setStatusLine("Draft created. Open it to compose the article blocks.");
    setCreate({
      title: "",
      slug: "",
      categorySlug: "",
      publishDate: todayIso(),
      excerpt: "",
    });
    await load();
  };

  if (!loaded) {
    return <AdminListSkeleton rows={5} className="mt-0" />;
  }

  return (
    <div className="flex flex-col gap-10">
      {listError ? (
        <p role="alert" className="text-caption text-error">
          {listError}
        </p>
      ) : null}
      {statusLine ? (
        <p role="status" className="text-caption text-success">
          {statusLine}
        </p>
      ) : null}

      <section data-article-create className="border-b border-line pb-8">
        <h2 className="text-title-sm font-medium text-primary">New article</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <FormField id="article-new-title" label="Title" required>
            <TextInput
              id="article-new-title"
              name="title"
              value={create.title}
              onChange={(event) =>
                setCreate((current) => ({ ...current, title: event.target.value }))
              }
            />
          </FormField>
          <FormField id="article-new-slug" label="Slug" required hint="Lowercase words with dashes.">
            <TextInput
              id="article-new-slug"
              name="slug"
              value={create.slug}
              onChange={(event) =>
                setCreate((current) => ({ ...current, slug: event.target.value }))
              }
            />
          </FormField>
          <FormField id="article-new-category" label="Category" required>
            <select
              id="article-new-category"
              name="categorySlug"
              className={SELECT_CLASS}
              value={create.categorySlug || categories[0]?.slug || ""}
              onChange={(event) =>
                setCreate((current) => ({
                  ...current,
                  categorySlug: event.target.value,
                }))
              }
            >
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="article-new-date" label="Publish date" required>
            <TextInput
              id="article-new-date"
              name="publishDate"
              type="date"
              value={create.publishDate}
              onChange={(event) =>
                setCreate((current) => ({
                  ...current,
                  publishDate: event.target.value,
                }))
              }
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField id="article-new-excerpt" label="Excerpt" required>
            <TextAreaInput
              id="article-new-excerpt"
              name="excerpt"
              rows={2}
              value={create.excerpt}
              onChange={(event) =>
                setCreate((current) => ({
                  ...current,
                  excerpt: event.target.value,
                }))
              }
            />
          </FormField>
        </div>
        {createError ? (
          <p role="alert" className="mt-3 text-caption text-error">
            {createError}
          </p>
        ) : null}
        <div className="mt-4">
          <Button
            size="compact"
            disabled={creating}
            onClick={() => void createDraft()}
          >
            {creating ? "Creating..." : "Create draft"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-title-sm font-medium text-primary">
          All articles ({items.length})
        </h2>
        <ul className="mt-4">
          {items.map((row) => (
            <li
              key={row.id}
              data-admin-article={row.slug}
              className="border-b border-line py-5 first:border-t"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-primary">
                    {row.title}
                  </p>
                  <p className="mt-1 text-caption text-muted">
                    /{row.slug} · {row.categoryName ?? "No category"} ·{" "}
                    {row.publishDate} · {row.blockCount}{" "}
                    {row.blockCount === 1 ? "block" : "blocks"}
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
              {rowError[row.id] ? (
                <p role="alert" className="mt-2 text-caption text-error">
                  {rowError[row.id]}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {editor ? (
        <section data-article-editor className="border-t border-line pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-title-sm font-medium text-primary">
              Editing: {editor.title}
            </h2>
            <Button size="compact" variant="tertiary" onClick={() => setEditor(null)}>
              Close editor
            </Button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <FormField id="article-title" label="Title" required>
              <TextInput
                id="article-title"
                name="title"
                value={editor.title}
                onChange={(event) =>
                  setEditor({ ...editor, title: event.target.value })
                }
              />
            </FormField>
            <FormField id="article-slug" label="Slug" required>
              <TextInput
                id="article-slug"
                name="slug"
                value={editor.slug}
                onChange={(event) =>
                  setEditor({ ...editor, slug: event.target.value })
                }
              />
            </FormField>
            <FormField id="article-category" label="Category" required>
              <select
                id="article-category"
                name="categorySlug"
                className={SELECT_CLASS}
                value={editor.categorySlug}
                onChange={(event) =>
                  setEditor({ ...editor, categorySlug: event.target.value })
                }
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="article-publish-date" label="Publish date" required>
              <TextInput
                id="article-publish-date"
                name="publishDate"
                type="date"
                value={editor.publishDate}
                onChange={(event) =>
                  setEditor({ ...editor, publishDate: event.target.value })
                }
              />
            </FormField>
            <FormField id="article-author" label="Author">
              <TextInput
                id="article-author"
                name="author"
                value={editor.author}
                onChange={(event) =>
                  setEditor({ ...editor, author: event.target.value })
                }
              />
            </FormField>
            <FormField id="article-visibility" label="Visibility">
              <select
                id="article-visibility"
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
            <FormField id="article-cover" label="Cover media ID" hint="Optional until the Media Library lands.">
              <TextInput
                id="article-cover"
                name="coverMediaId"
                value={editor.coverMediaId}
                onChange={(event) =>
                  setEditor({ ...editor, coverMediaId: event.target.value })
                }
              />
            </FormField>
            <FormField id="article-related-project" label="Related project ID" hint="Portfolio IDs arrive with the Portfolio module.">
              <TextInput
                id="article-related-project"
                name="relatedProjectId"
                value={editor.relatedProjectId}
                onChange={(event) =>
                  setEditor({ ...editor, relatedProjectId: event.target.value })
                }
              />
            </FormField>
            <FormField id="article-seo-title" label="SEO title">
              <TextInput
                id="article-seo-title"
                name="seoMetaTitle"
                value={editor.seoMetaTitle}
                onChange={(event) =>
                  setEditor({ ...editor, seoMetaTitle: event.target.value })
                }
              />
            </FormField>
            <FormField id="article-seo-description" label="SEO description">
              <TextInput
                id="article-seo-description"
                name="seoMetaDescription"
                value={editor.seoMetaDescription}
                onChange={(event) =>
                  setEditor({ ...editor, seoMetaDescription: event.target.value })
                }
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField id="article-excerpt" label="Excerpt" required>
              <TextAreaInput
                id="article-excerpt"
                name="excerpt"
                rows={2}
                value={editor.excerpt}
                onChange={(event) =>
                  setEditor({ ...editor, excerpt: event.target.value })
                }
              />
            </FormField>
          </div>

          <div className="mt-8">
            <h3 className="text-title-sm font-medium text-primary">
              Content blocks
            </h3>
            <p className="mt-1 text-caption text-muted">
              Paragraphs, headings, quotes, images, and films. Reorder with
              the arrows; future block types stay untouched.
            </p>
            <ul className="mt-4 flex flex-col gap-4">
              {editor.blocks.map((block, index) => (
                <li
                  key={index}
                  data-block-row
                  data-block-type={block.type}
                  className="border border-line px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-label uppercase tracking-label-wide text-muted">
                      {index + 1} · {block.type}
                      {block.locked ? " (locked)" : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <Button
                        size="compact"
                        variant="tertiary"
                        disabled={index === 0}
                        onClick={() => moveBlock(index, -1)}
                      >
                        Move up
                      </Button>
                      <Button
                        size="compact"
                        variant="tertiary"
                        disabled={index === editor.blocks.length - 1}
                        onClick={() => moveBlock(index, 1)}
                      >
                        Move down
                      </Button>
                      <Button
                        size="compact"
                        variant="tertiary"
                        onClick={() => removeBlock(index)}
                      >
                        Remove
                      </Button>
                    </span>
                  </div>
                  <div className="mt-3">
                    {block.locked ? (
                      <p className="text-caption text-muted">
                        This block type stays as-is until its module lands.
                      </p>
                    ) : TEXT_BLOCK_TYPES.includes(block.type) ? (
                      <>
                        <TextAreaInput
                          id={`block-${index}-text`}
                          name={`block-${index}-text`}
                          rows={block.type === "heading" ? 2 : 4}
                          value={block.text}
                          onChange={(event) =>
                            patchBlock(index, { text: event.target.value })
                          }
                        />
                        {block.type !== "heading" ? (
                          <p className="mt-2 text-caption text-muted">
                            Highlight words with [kata](/tujuan), for example
                            [our process](/process). Internal paths and https
                            links render; anything else stays as typed.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <TextInput
                        id={`block-${index}-media`}
                        name={`block-${index}-media`}
                                placeholder="Media asset ID"
                        value={block.mediaId}
                        onChange={(event) =>
                          patchBlock(index, { mediaId: event.target.value })
                        }
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                aria-label="New block type"
                className={SELECT_CLASS}
                value={newBlockType}
                onChange={(event) => setNewBlockType(event.target.value)}
              >
                {COMPOSED_BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <Button size="compact" variant="secondary" onClick={addBlock}>
                Add block
              </Button>
            </div>
          </div>

          {editorError ? (
            <p role="alert" className="mt-4 text-caption text-error">
              {editorError}
            </p>
          ) : null}
          <div className="mt-6" data-article-save>
            <Button
              size="compact"
              disabled={saving}
              onClick={() => void saveEditor()}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
