"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  FormField,
  INPUT_CLASS,
  SELECT_CLASS,
  TextInput,
} from "@/components/forms/FormField";
import { USER_ROLES, USER_ROLE_LABEL, USER_ROLE_SCOPE } from "@/lib/auth/roles";
import { AdminListSkeleton } from "./AdminListSkeleton";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "disabled";
  lastLoginAt: string | null;
}

interface RowDraft {
  role: string;
  status: string;
  password: string;
  saving: boolean;
  error: string | null;
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const body = await response.json().catch(() => null);
  return { ok: response.ok, body };
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const EMPTY_CREATE = { name: "", email: "", password: "", role: "editor" };

/**
 * Users & Roles (§8, §27), owner-only: team list with role and status
 * controls, password reset, and a create form. Destructive changes
 * (role, disable) ask for confirmation with the affected account named
 * (§31.35).
 */
export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  const [created, setCreated] = useState(EMPTY_CREATE);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { ok, body } = await request("/api/admin/users");
    if (ok) {
      setUsers(body?.data ?? []);
      setListError(null);
    } else {
      setListError(String(body?.error ?? "Could not load users."));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const draftFor = (user: AdminUser): RowDraft =>
    drafts[user.id] ?? {
      role: user.role,
      status: user.status,
      password: "",
      saving: false,
      error: null,
    };

  const setDraft = (user: AdminUser, patch: Partial<RowDraft>) => {
    setDrafts((current) => ({
      ...current,
      [user.id]: { ...draftFor(user), ...patch },
    }));
  };

  const saveRow = async (user: AdminUser) => {
    const draft = draftFor(user);
    const roleLabel =
      USER_ROLE_LABEL[draft.role as keyof typeof USER_ROLE_LABEL] ?? draft.role;
    if (
      draft.role !== user.role &&
      !window.confirm(
        `Change ${user.name}'s role to ${roleLabel}? This changes which modules they can manage.`,
      )
    ) {
      return;
    }
    if (
      draft.status === "disabled" &&
      user.status === "active" &&
      !window.confirm(
        `Disable ${user.name}? They will lose access on their next request.`,
      )
    ) {
      return;
    }

    setDraft(user, { saving: true, error: null });
    const patch: Record<string, unknown> = {
      role: draft.role,
      status: draft.status,
    };
    if (draft.password.length > 0) patch.password = draft.password;

    const { ok, body } = await request(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!ok) {
      const issues = Array.isArray(body?.issues)
        ? body.issues.join(" ")
        : String(body?.error ?? "Could not save the changes.");
      setDraft(user, { saving: false, error: issues });
      return;
    }
    setDrafts((current) => {
      const next = { ...current };
      delete next[user.id];
      return next;
    });
    await load();
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    const { ok, body } = await request("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(created),
    });
    if (!ok) {
      setCreateError(
        Array.isArray(body?.issues)
          ? body.issues.join(" ")
          : String(body?.error ?? "Could not create the user."),
      );
      setCreating(false);
      return;
    }
    setCreated(EMPTY_CREATE);
    setCreating(false);
    await load();
  };

  return (
    <div className="grid gap-12 xl:grid-cols-[1.7fr_1fr]">
      <section>
        <h2 className="text-title-sm text-primary">Team</h2>
        {!loaded ? (
          <AdminListSkeleton />
        ) : null}
        {listError ? (
          <p role="alert" className="mt-4 text-caption text-error">
            {listError}
          </p>
        ) : null}
        {loaded && users.length === 0 ? (
          <p className="mt-4 text-body-sm text-muted">
            No users yet. Create the first account with the form.
          </p>
        ) : null}
        <ul className="mt-4 flex flex-col">
          {users.map((user) => {
            const draft = draftFor(user);
            const changed =
              draft.role !== user.role ||
              draft.status !== user.status ||
              draft.password.length > 0;
            return (
              <li
                key={user.id}
                data-admin-user={user.email}
                className="border-b border-line py-5 first:border-t"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-primary">
                      {user.name}
                    </p>
                    <p className="mt-1 text-caption text-muted">
                      {user.email} · Last sign-in: {formatDate(user.lastLoginAt)}
                    </p>
                  </div>
                  <StatusChip
                    tone={user.status === "active" ? "success" : "neutral"}
                  >
                    {user.status === "active" ? "Active" : "Disabled"}
                  </StatusChip>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-caption text-muted">
                    Role
                    <select
                      data-user-role
                      value={draft.role}
                      onChange={(event) =>
                        setDraft(user, { role: event.target.value })
                      }
                      className={SELECT_CLASS}
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {USER_ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-caption text-muted">
                    Status
                    <select
                      data-user-status
                      value={draft.status}
                      onChange={(event) =>
                        setDraft(user, { status: event.target.value })
                      }
                      className={SELECT_CLASS}
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-caption text-muted">
                    New password
                    <input
                      data-user-password
                      type="password"
                      autoComplete="new-password"
                      placeholder="Leave empty to keep"
                      value={draft.password}
                      onChange={(event) =>
                        setDraft(user, { password: event.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </label>
                </div>
                {draft.error ? (
                  <p role="alert" className="mt-2 text-caption text-error">
                    {draft.error}
                  </p>
                ) : null}
                <div className="mt-4 flex items-center gap-4">
                  <Button
                    size="compact"
                    variant="secondary"
                    disabled={!changed || draft.saving}
                    onClick={() => void saveRow(user)}
                  >
                    {draft.saving ? "Saving..." : "Save changes"}
                  </Button>
                  {changed ? (
                    <span className="text-caption text-muted">
                      Unsaved changes
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-t border-line pt-8 xl:border-l xl:border-t-0 xl:pl-12 xl:pt-0">
        <h2 className="text-title-sm text-primary">Add a user</h2>
        <form onSubmit={createUser} data-user-create className="mt-5 flex flex-col gap-4">
          <FormField id="user-name" label="Name" required>
            <TextInput
              id="user-name"
              name="name"
              value={created.name}
              onChange={(event) =>
                setCreated((current) => ({ ...current, name: event.target.value }))
              }
            />
          </FormField>
          <FormField id="user-email" label="Email" required>
            <TextInput
              id="user-email"
              name="email"
              type="email"
              autoComplete="off"
              value={created.email}
              onChange={(event) =>
                setCreated((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </FormField>
          <div>
            <label
              htmlFor="user-role"
              className="text-label uppercase tracking-label-wide text-secondary"
            >
              Role *
            </label>
            <select
              id="user-role"
              value={created.role}
              onChange={(event) =>
                setCreated((current) => ({ ...current, role: event.target.value }))
              }
              className={`mt-2 ${SELECT_CLASS}`}
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {USER_ROLE_LABEL[role]}
                </option>
              ))}
            </select>
            <p className="mt-2 text-caption text-muted">
              {USER_ROLE_SCOPE[created.role as keyof typeof USER_ROLE_SCOPE] ??
                ""}
            </p>
          </div>
          <FormField
            id="user-password"
            label="Temporary password"
            required
            hint="At least 10 characters; share it privately and ask them to change it."
          >
            <TextInput
              id="user-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={created.password}
              onChange={(event) =>
                setCreated((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
            />
          </FormField>
          {createError ? (
            <p role="alert" className="text-caption text-error">
              {createError}
            </p>
          ) : null}
          <Button type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create user"}
          </Button>
        </form>
      </section>
    </div>
  );
}
