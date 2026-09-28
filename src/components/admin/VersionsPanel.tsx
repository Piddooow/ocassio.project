"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { SELECT_CLASS, TextInput } from "@/components/forms/FormField";
import { adminRequest, issuesText, jsonInit } from "@/lib/admin-client";

interface VersionRow {
  id: number;
  entityType: string;
  entityId: number;
  versionNo: number;
  createdAt: string;
}

const ENTITY_TYPES = ["article", "service", "pricing", "studio_about"] as const;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().replace("T", " ").slice(0, 16);
}

/**
 * Version history (§25): View, Compare, and Restore for any versioned
 * entity. Restores write the old content back and append a new version.
 */
export function VersionsPanel() {
  const [entityType, setEntityType] = useState<string>(ENTITY_TYPES[0]);
  const [entityId, setEntityId] = useState("");
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [compare, setCompare] = useState<{ from: string; to: string } | null>(null);

  const id = Number(entityId);

  const load = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    setSnapshot(null);
    setCompare(null);
    const { ok, body } = await adminRequest<VersionRow[]>(
      `/api/admin/versions?entityType=${entityType}&entityId=${entityId}`,
    );
    setBusy(false);
    if (!ok) {
      setError(issuesText(body));
      setLoaded(false);
      return;
    }
    setVersions(body?.data ?? []);
    setLoaded(true);
  };

  const view = async (version: VersionRow) => {
    const { ok, body } = await adminRequest<{ snapshot: unknown }>(
      `/api/admin/versions/${version.id}`,
    );
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setCompare(null);
    setSnapshot(JSON.stringify(body?.data?.snapshot ?? null, null, 2));
  };

  const compareWithPrevious = async (index: number) => {
    const current = versions[index];
    const previous = versions[index + 1];
    if (!previous) return;
    const { ok, body } = await adminRequest<{
      from: { snapshot: unknown };
      to: { snapshot: unknown };
    }>(`/api/admin/versions/${current.id}/compare?with=${previous.id}`);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setSnapshot(null);
    setCompare({
      from: JSON.stringify(body?.data?.from?.snapshot ?? null, null, 2),
      to: JSON.stringify(body?.data?.to?.snapshot ?? null, null, 2),
    });
  };

  const restore = async (version: VersionRow) => {
    setBusy(true);
    setError(null);
    setStatus(null);
    const { ok, body } = await adminRequest(
      `/api/admin/versions/${version.id}/restore`,
      { method: "POST" },
    );
    setBusy(false);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setStatus("Version restored. A new version was appended to the log.");
    await load();
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-caption text-muted">
          Entity
          <select
            id="versions-entity-type"
            className={SELECT_CLASS}
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-32 flex-col gap-1 text-caption text-muted">
          Entity id
          <TextInput
            id="versions-entity-id"
            name="entityId"
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
          />
        </label>
        <Button
          size="compact"
          variant="secondary"
          disabled={busy || !Number.isInteger(id) || id <= 0}
          onClick={() => void load()}
        >
          {busy ? "Loading..." : "Load versions"}
        </Button>
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

      {loaded ? (
        versions.length === 0 ? (
          <p className="text-body-sm text-secondary">
            No versions recorded for this entity yet.
          </p>
        ) : (
          <ul data-version-list>
            {versions.map((version, index) => (
              <li
                key={version.id}
                data-version-row
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4 first:border-t"
              >
                <div className="flex items-center gap-3">
                  <StatusChip>v{version.versionNo}</StatusChip>
                  <span className="text-body-sm text-secondary">
                    {formatDate(version.createdAt)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="compact"
                    variant="tertiary"
                    onClick={() => void view(version)}
                  >
                    View
                  </Button>
                  <Button
                    size="compact"
                    variant="tertiary"
                    disabled={index === versions.length - 1}
                    onClick={() => void compareWithPrevious(index)}
                  >
                    Compare with previous
                  </Button>
                  <Button
                    size="compact"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void restore(version)}
                  >
                    Restore
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="text-body-sm text-muted">
          Pick an entity and id to inspect its recorded versions.
        </p>
      )}

      {snapshot ? (
        <pre
          data-version-snapshot
          className="max-h-96 overflow-auto border border-line bg-surface p-4 text-caption text-secondary"
        >
          {snapshot}
        </pre>
      ) : null}

      {compare ? (
        <div className="grid gap-4 lg:grid-cols-2" data-version-compare>
          <div>
            <p className="text-label uppercase tracking-label-wide text-muted">
              Newer snapshot
            </p>
            <pre className="mt-2 max-h-96 overflow-auto border border-line bg-surface p-4 text-caption text-secondary">
              {compare.from}
            </pre>
          </div>
          <div>
            <p className="text-label uppercase tracking-label-wide text-muted">
              Older snapshot
            </p>
            <pre className="mt-2 max-h-96 overflow-auto border border-line bg-surface p-4 text-caption text-secondary">
              {compare.to}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
