"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { FormField, TextInput } from "@/components/forms/FormField";
import { adminRequest, issuesText, jsonInit } from "@/lib/admin-client";

interface NavRow {
  id: number;
  label: string;
  href: string;
  visible: boolean;
  sortOrder: number;
}

/**
 * Navigation panel (§10.2): edit labels and destinations, reorder, and
 * show/hide items. With no rows saved the public site uses the built-in
 * documented menu, so the list is honest about being empty.
 */
export function NavigationPanel() {
  const [items, setItems] = useState<NavRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { label: string; href: string }>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [create, setCreate] = useState({ label: "", href: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { ok, body } = await adminRequest<NavRow[]>("/api/admin/navigation");
    if (ok) {
      const rows = body?.data ?? [];
      setItems(rows);
      setDrafts(
        Object.fromEntries(
          rows.map((row) => [row.id, { label: row.label, href: row.href }]),
        ),
      );
      setError(null);
    } else {
      setError(issuesText(body));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (id: number, path: string, init: RequestInit) => {
    setBusyId(id);
    setError(null);
    const { ok, body } = await adminRequest(path, init);
    setBusyId(null);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    await load();
  };

  const createItem = async () => {
    setCreating(true);
    setCreateError(null);
    const { ok, body } = await adminRequest(
      "/api/admin/navigation",
      jsonInit("POST", { label: create.label, href: create.href }),
    );
    setCreating(false);
    if (!ok) {
      setCreateError(issuesText(body));
      return;
    }
    setStatus("Navigation item added.");
    setCreate({ label: "", href: "" });
    await load();
  };

  if (!loaded) {
    return <p className="text-body-sm text-muted">Loading navigation...</p>;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
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

      <section className="border-b border-line pb-8">
        <h2 className="text-title-sm font-medium text-primary">
          Add menu item
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormField id="nav-new-label" label="Label" required>
            <TextInput
              id="nav-new-label"
              name="label"
              value={create.label}
              onChange={(event) =>
                setCreate((current) => ({ ...current, label: event.target.value }))
              }
            />
          </FormField>
          <FormField id="nav-new-href" label="Destination" required hint="Internal path like /work, or a full URL.">
            <TextInput
              id="nav-new-href"
              name="href"
              value={create.href}
              onChange={(event) =>
                setCreate((current) => ({ ...current, href: event.target.value }))
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
            onClick={() => void createItem()}
          >
            {creating ? "Adding..." : "Add item"}
          </Button>
        </div>
      </section>

      <section data-navigation-list>
        <h2 className="text-title-sm font-medium text-primary">
          Menu items ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 text-body-sm text-secondary">
            No navigation items yet. The built-in studio menu is in use
            until the first item is saved.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {items.map((row) => (
              <li
                key={row.id}
                data-nav-item={row.id}
                className="border border-line px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusChip tone={row.visible ? "success" : "neutral"}>
                    {row.visible ? "visible" : "hidden"}
                  </StatusChip>
                  <span className="flex flex-wrap items-center gap-2">
                    <Button
                      size="compact"
                      variant="tertiary"
                      disabled={busyId === row.id}
                      onClick={() => void run(row.id, `/api/admin/navigation/${row.id}/move`, jsonInit("POST", { direction: "up" }))}
                    >
                      Move up
                    </Button>
                    <Button
                      size="compact"
                      variant="tertiary"
                      disabled={busyId === row.id}
                      onClick={() => void run(row.id, `/api/admin/navigation/${row.id}/move`, jsonInit("POST", { direction: "down" }))}
                    >
                      Move down
                    </Button>
                    <Button
                      size="compact"
                      variant="tertiary"
                      disabled={busyId === row.id}
                      onClick={() =>
                        void run(
                          row.id,
                          `/api/admin/navigation/${row.id}`,
                          jsonInit("PATCH", { visible: !row.visible }),
                        )
                      }
                    >
                      {row.visible ? "Hide" : "Show"}
                    </Button>
                    <Button
                      size="compact"
                      variant="tertiary"
                      disabled={busyId === row.id}
                      onClick={() =>
                        void run(row.id, `/api/admin/navigation/${row.id}`, {
                          method: "DELETE",
                        })
                      }
                    >
                      Delete
                    </Button>
                  </span>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                  <TextInput
                    id={`nav-label-${row.id}`}
                    name="label"
                    value={drafts[row.id]?.label ?? row.label}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.id]: {
                          label: event.target.value,
                          href: current[row.id]?.href ?? row.href,
                        },
                      }))
                    }
                  />
                  <TextInput
                    id={`nav-href-${row.id}`}
                    name="href"
                    value={drafts[row.id]?.href ?? row.href}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.id]: {
                          label: current[row.id]?.label ?? row.label,
                          href: event.target.value,
                        },
                      }))
                    }
                  />
                  <Button
                    size="compact"
                    variant="secondary"
                    disabled={busyId === row.id}
                    onClick={() =>
                      void run(
                        row.id,
                        `/api/admin/navigation/${row.id}`,
                        jsonInit("PATCH", {
                          label: drafts[row.id]?.label ?? row.label,
                          href: drafts[row.id]?.href ?? row.href,
                        }),
                      )
                    }
                  >
                    Save
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
