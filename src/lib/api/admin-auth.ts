import { NextResponse } from "next/server";
import { getSessionUserByToken, SESSION_COOKIE } from "@/lib/auth/sessions";
import { USER_ROLES } from "@/lib/auth/roles";
import type { User } from "@/lib/db/schema";

/**
 * Admin auth (§27): every admin API accepts either a signed-in user
 * session (cookie) or the automation service token. Permissions are
 * enforced here, on the backend; hiding buttons in the UI is not
 * authorization.
 *
 * The service token (OCASSIO_ADMIN_TOKEN) stays as the machine path
 * used by seeds, CI, and the verification suites; it carries owner
 * authority. The token path still fails CLOSED when unconfigured.
 */

export type AdminRole = (typeof USER_ROLES)[number];

/** Role groups from §27: which modules each role may manage. */
export const OWNER_ROLES = ["owner"] as const;
export const EDITOR_ROLES = ["owner", "editor"] as const;
export const SALES_ROLES = ["owner", "sales"] as const;
export const MEDIA_ROLES = ["owner", "editor", "media_manager"] as const;

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

/** The signed-in user for a request, or null. Used by session reads. */
export async function getSessionUser(request: Request): Promise<User | null> {
  const token = readSessionCookie(request);
  if (!token) return null;
  return getSessionUserByToken(token);
}

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Interim machine guard. Kept for the service-token path and the guard
 * tests: fails closed (503) when OCASSIO_ADMIN_TOKEN is not configured.
 */
export function requireAdminToken(request: Request): NextResponse | null {
  const expected = process.env.OCASSIO_ADMIN_TOKEN;

  if (!expected) {
    return NextResponse.json(
      {
        error:
          "Admin API is disabled: OCASSIO_ADMIN_TOKEN is not configured.",
      },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token.length === 0 || token !== expected) {
    return unauthorized(
      "Unauthorized: a valid admin bearer token is required.",
    );
  }

  return null;
}

/**
 * Full admin guard: bearer service token (owner-equivalent) or a valid
 * user session whose role is allowed for the module. Returns a response
 * to short-circuit with, or null when the request may proceed.
 */
export async function requireAdmin(
  request: Request,
  options?: { roles?: readonly AdminRole[] },
): Promise<NextResponse | null> {
  const expected = process.env.OCASSIO_ADMIN_TOKEN;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (bearer.length > 0) {
    if (!expected) {
      return NextResponse.json(
        {
          error:
            "Admin API is disabled: OCASSIO_ADMIN_TOKEN is not configured.",
        },
        { status: 503 },
      );
    }
    if (bearer !== expected) {
      return unauthorized(
        "Unauthorized: a valid admin bearer token is required.",
      );
    }
    return null;
  }

  const user = await getSessionUser(request);
  if (!user) {
    return unauthorized(
      "Unauthorized: sign in to the Admin CMS or present a service token.",
    );
  }
  if (options?.roles && !options.roles.includes(user.role)) {
    return NextResponse.json(
      {
        error: `Forbidden: ${user.role} may not manage this module. Allowed roles: ${options.roles.join(", ")}.`,
      },
      { status: 403 },
    );
  }
  return null;
}
