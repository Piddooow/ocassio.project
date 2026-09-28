"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminRequest,
  issuesText,
  jsonInit,
  type AdminApiBody,
} from "@/lib/admin-client";

export interface AdminEntity {
  id: number;
}

export type PublishAction = "publish" | "unpublish" | "archive" | "save_draft";

/**
 * Shared list/CRUD/action state for the admin module panels. Endpoints
 * follow the REST pattern: collection for list+create, /[id] for
 * update+delete, /[id]/actions for the publish workflow.
 */
export function useAdminCollection<T extends AdminEntity>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<number, string | null>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { ok, body } = await adminRequest<T[]>(endpoint);
    if (ok) {
      setItems(body?.data ?? []);
      setListError(null);
    } else {
      setListError(issuesText(body));
    }
    setLoaded(true);
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (id: number, path: string, init: RequestInit) => {
      setBusyId(id);
      setRowError((current) => ({ ...current, [id]: null }));
      const { ok, body } = await adminRequest(path, init);
      setBusyId(null);
      if (!ok) {
        setRowError((current) => ({ ...current, [id]: issuesText(body) }));
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  const update = (id: number, patch: unknown) =>
    run(id, `${endpoint}/${id}`, jsonInit("PATCH", patch));

  const action = (id: number, name: PublishAction) =>
    run(id, `${endpoint}/${id}/actions`, jsonInit("POST", { action: name }));

  const remove = (id: number) =>
    run(id, `${endpoint}/${id}`, { method: "DELETE" });

  const create = useCallback(
    async (payload: unknown): Promise<boolean> => {
      setCreating(true);
      setCreateError(null);
      const { ok, body } = await adminRequest(endpoint, jsonInit("POST", payload));
      setCreating(false);
      if (!ok) {
        setCreateError(issuesText(body));
        return false;
      }
      await load();
      return true;
    },
    [endpoint, load],
  );

  return {
    items,
    loaded,
    listError,
    rowError,
    busyId,
    createError,
    creating,
    clearCreateError: () => setCreateError(null),
    load,
    update,
    action,
    remove,
    create,
  };
}

export function statusIssuesForPublish(
  body: AdminApiBody<unknown> | null,
): string {
  return issuesText(body);
}
