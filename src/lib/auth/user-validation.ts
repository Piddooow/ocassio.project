import { USER_ROLES, USER_STATUSES } from "./roles";
import {
  MIN_PASSWORD_LENGTH,
  type UserCreateInput,
  type UserRole,
  type UserUpdateInput,
} from "./users";

/**
 * Validation for the Users & Roles admin (§27). Messages say exactly
 * what is wrong and how to fix it, mirroring the other modules.
 */

export type UserValidation<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function validEmail(value: unknown, errors: string[]): string | undefined {
  if (!isNonEmptyString(value)) {
    errors.push("email must be a non-empty string.");
    return undefined;
  }
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    errors.push("email must be a valid email address.");
    return undefined;
  }
  if (email.length > 160) {
    errors.push("email must be 160 characters or fewer.");
    return undefined;
  }
  return email;
}

export function validateUserCreate(raw: unknown): UserValidation<UserCreateInput> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];

  let name: string | undefined;
  if (!isNonEmptyString(body.name)) {
    errors.push("name must be a non-empty string.");
  } else if (body.name.trim().length > 120) {
    errors.push("name must be 120 characters or fewer.");
  } else {
    name = body.name.trim();
  }

  const email = validEmail(body.email, errors);

  let password: string | undefined;
  if (typeof body.password !== "string") {
    errors.push("password must be a string.");
  } else if (body.password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  } else if (body.password.length > 200) {
    errors.push("password must be 200 characters or fewer.");
  } else {
    password = body.password;
  }

  let role: UserRole | undefined;
  if (!USER_ROLES.includes(body.role as UserRole)) {
    errors.push(`role must be one of: ${USER_ROLES.join(", ")}.`);
  } else {
    role = body.role as UserRole;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name: name!, email: email!, password: password!, role: role! } };
}

export function validateUserUpdate(raw: unknown): UserValidation<UserUpdateInput> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: UserUpdateInput = {};

  if (
    body.name === undefined &&
    body.email === undefined &&
    body.role === undefined &&
    body.status === undefined &&
    body.password === undefined
  ) {
    errors.push("Provide at least one field to update.");
  }

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) {
      errors.push("name must be a non-empty string.");
    } else if (body.name.trim().length > 120) {
      errors.push("name must be 120 characters or fewer.");
    } else {
      value.name = body.name.trim();
    }
  }

  if (body.email !== undefined) {
    const email = validEmail(body.email, errors);
    if (email) value.email = email;
  }

  if (body.role !== undefined) {
    if (!USER_ROLES.includes(body.role as UserRole)) {
      errors.push(`role must be one of: ${USER_ROLES.join(", ")}.`);
    } else {
      value.role = body.role as UserRole;
    }
  }

  if (body.status !== undefined) {
    if (!USER_STATUSES.includes(body.status as (typeof USER_STATUSES)[number])) {
      errors.push(`status must be one of: ${USER_STATUSES.join(", ")}.`);
    } else {
      value.status = body.status as (typeof USER_STATUSES)[number];
    }
  }

  if (body.password !== undefined) {
    if (typeof body.password !== "string") {
      errors.push("password must be a string.");
    } else if (body.password.length < MIN_PASSWORD_LENGTH) {
      errors.push(
        `password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    } else if (body.password.length > 200) {
      errors.push("password must be 200 characters or fewer.");
    } else {
      value.password = body.password;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}
