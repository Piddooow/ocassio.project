"use client";

export interface AdminApiBody<T> {
  data?: T;
  error?: string;
  issues?: string[];
  meta?: unknown;
}

export interface AdminApiResponse<T> {
  ok: boolean;
  body: AdminApiBody<T> | null;
}

/** Small same-origin JSON client for the admin panels (cookies included). */
export async function adminRequest<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<AdminApiResponse<T>> {
  try {
    const response = await fetch(path, init);
    const body = (await response.json().catch(() => null)) as
      | AdminApiBody<T>
      | null;
    return { ok: response.ok, body };
  } catch {
    return {
      ok: false,
      body: { error: "Could not reach the server. Try again." },
    };
  }
}

export function jsonInit(method: string, payload: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

/** One readable message from an admin API failure. */
export function issuesText(body: AdminApiBody<unknown> | null): string {
  if (!body) return "The request failed. Try again.";
  if (Array.isArray(body.issues) && body.issues.length > 0) {
    return body.issues.join(" ");
  }
  return body.error ?? "The request failed. Try again.";
}

/** Textarea lines to a clean string list. */
export function toLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function fromLines(list: string[] | null | undefined): string {
  return (list ?? []).join("\n");
}
