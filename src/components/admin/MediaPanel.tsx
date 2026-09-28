"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { SELECT_CLASS, TextInput } from "@/components/forms/FormField";
import { adminRequest, issuesText, jsonInit } from "@/lib/admin-client";
import { AdminListSkeleton } from "./AdminListSkeleton";

interface MediaRow {
  id: number;
  filename: string;
  mediaType: "image" | "video";
  width: number;
  height: number;
  fileSize: number;
  altText: string | null;
  credit: string | null;
  usageState: "used" | "unused";
  variantCount: number;
  previewUrl: string | null;
}

function formatKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Media Library panel (§20): filter and search assets, edit alt text and
 * credit, mark usage state, and delete safely (the backend refuses while
 * an asset is referenced and lists exactly where it is used).
 */
export function MediaPanel() {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<
    Record<number, { altText: string; credit: string }>
  >({});

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (search.trim()) params.set("search", search.trim());
    const query = params.toString();
    const { ok, body } = await adminRequest<MediaRow[]>(
      `/api/admin/media${query ? `?${query}` : ""}`,
    );
    if (ok) {
      const rows = body?.data ?? [];
      setItems(rows);
      setDrafts(
        Object.fromEntries(
          rows.map((row) => [
            row.id,
            { altText: row.altText ?? "", credit: row.credit ?? "" },
          ]),
        ),
      );
      setError(null);
    } else {
      setError(issuesText(body));
    }
    setLoaded(true);
  }, [search, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (id: number, payload: unknown, message: string) => {
    setBusyId(id);
    setError(null);
    setStatus(null);
    const { ok, body } = await adminRequest(
      `/api/admin/media/${id}`,
      jsonInit("PATCH", payload),
    );
    setBusyId(null);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setStatus(message);
    await load();
  };

  const remove = async (id: number) => {
    setBusyId(id);
    setError(null);
    setStatus(null);
    const { ok, body } = await adminRequest(`/api/admin/media/${id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setStatus("Asset deleted.");
    await load();
  };

  if (!loaded) {
    return <AdminListSkeleton rows={6} className="mt-0" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-caption text-muted">
          Type
          <select
            id="media-type-filter"
            className={SELECT_CLASS}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
        </label>
        <label className="flex min-w-[14rem] flex-col gap-1 text-caption text-muted">
          Search filename
          <TextInput
            id="media-search"
            name="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

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

      <section data-media-list>
        <h2 className="text-title-sm font-medium text-primary">
          Assets ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 text-body-sm text-secondary">
            No media assets yet. Uploads from Now and the admin modules
            appear here as soon as they exist.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {items.map((row) => (
              <li
                key={row.id}
                data-media-item={row.id}
                className="flex flex-wrap gap-4 border border-line px-4 py-3"
              >
                <div className="h-20 w-28 shrink-0 overflow-hidden bg-surface">
                  {row.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex min-w-[16rem] flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="truncate text-body-sm font-medium text-primary">
                      {row.filename}
                    </p>
                    <StatusChip
                      tone={row.usageState === "used" ? "success" : "neutral"}
                    >
                      {row.usageState}
                    </StatusChip>
                  </div>
                  <p className="text-caption text-muted">
                    {row.mediaType} · {row.width}x{row.height} ·{" "}
                    {formatKb(row.fileSize)} · {row.variantCount} variants
                  </p>
                  <div className="grid gap-2 lg:grid-cols-2">
                    <TextInput
                      id={`media-alt-${row.id}`}
                      name="altText"
                      placeholder="Alt text"
                      value={drafts[row.id]?.altText ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: {
                            altText: event.target.value,
                            credit:
                              current[row.id]?.credit ?? row.credit ?? "",
                          },
                        }))
                      }
                    />
                    <TextInput
                      id={`media-credit-${row.id}`}
                      name="credit"
                      placeholder="Credit"
                      value={drafts[row.id]?.credit ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: {
                            altText:
                              current[row.id]?.altText ?? row.altText ?? "",
                            credit: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="compact"
                      variant="secondary"
                      disabled={busyId === row.id}
                      onClick={() =>
                        void patch(
                          row.id,
                          {
                            altText: drafts[row.id]?.altText ?? "",
                            credit: drafts[row.id]?.credit ?? "",
                          },
                          "Metadata saved.",
                        )
                      }
                    >
                      Save metadata
                    </Button>
                    <Button
                      size="compact"
                      variant="tertiary"
                      disabled={busyId === row.id}
                      onClick={() =>
                        void patch(
                          row.id,
                          {
                            usageState:
                              row.usageState === "used" ? "unused" : "used",
                          },
                          "Usage state updated.",
                        )
                      }
                    >
                      {row.usageState === "used" ? "Mark unused" : "Mark used"}
                    </Button>
                    <Button
                      size="compact"
                      variant="tertiary"
                      disabled={busyId === row.id}
                      onClick={() => void remove(row.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
