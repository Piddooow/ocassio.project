"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, TextInput } from "@/components/forms/FormField";
import { adminRequest, issuesText, jsonInit } from "@/lib/admin-client";

/**
 * Self-service password change (§27): any signed-in admin can rotate
 * their own password; other sessions are revoked server-side.
 */
export function AccountPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    const { ok, body } = await adminRequest(
      "/api/admin/account/password",
      jsonInit("POST", { currentPassword, newPassword }),
    );
    setSaving(false);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setStatus("Password changed. Other sessions of this account were signed out.");
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <form
      data-account-form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="flex max-w-md flex-col gap-5"
    >
      <FormField id="account-current-password" label="Current password" required>
        <TextInput
          id="account-current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </FormField>
      <FormField
        id="account-new-password"
        label="New password"
        required
        hint="At least 10 characters."
      >
        <TextInput
          id="account-new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </FormField>
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
      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Change password"}
        </Button>
      </div>
    </form>
  );
}
