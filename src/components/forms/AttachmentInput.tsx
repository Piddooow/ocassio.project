"use client";

import type { ChangeEvent } from "react";
import { StatusChip } from "@/components/ui/StatusChip";

interface AttachmentInputProps {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  hint?: string;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Attachment control with a selected-file row and an explicit remove action. */
export function AttachmentInput({
  id,
  file,
  onChange,
  error,
  hint,
}: AttachmentInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0] ?? null);
  };

  const clear = () => {
    onChange(null);
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  return (
    <div>
      <input
        id={id}
        name="attachment"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleChange}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        className={`block w-full text-body-sm text-secondary file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-pill file:border-0 file:bg-surface-hover file:px-4 file:text-button file:font-medium file:text-primary${error ? " rounded-md border border-error p-2" : ""}`}
      />
      {file ? (
        <div
          data-attachment-selected
          role="status"
          className="mt-3 flex items-center justify-between gap-4 rounded-md border border-line bg-surface px-4 py-2"
        >
          <div className="flex min-w-0 items-center gap-3">
            <p className="min-w-0 truncate text-body-sm text-secondary">
              {file.name}, {formatSize(file.size)}
            </p>
            {!error ? <StatusChip tone="success">File ready</StatusChip> : null}
          </div>
          <button
            type="button"
            onClick={clear}
            className="min-h-11 shrink-0 text-label uppercase tracking-label-wide text-muted transition-colors duration-300 hover:text-primary"
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
