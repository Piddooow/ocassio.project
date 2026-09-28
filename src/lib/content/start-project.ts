import { SERVICE_TYPES } from "./services";
import { WORK_CATEGORIES } from "./types";

/**
 * Start a Project form options (§6.13).
 * Content-owned later by the services taxonomy + admin settings.
 */
export const SERVICE_OPTIONS = SERVICE_TYPES;

export const PROJECT_TYPE_OPTIONS = WORK_CATEGORIES;

/** Attachment constraints (§6.13): PDF, JPG, JPEG, PNG, max 10 MB. */
export const ATTACHMENT = {
  acceptedTypes: ["application/pdf", "image/jpeg", "image/png"],
  acceptedLabels: "PDF, JPG, JPEG, or PNG",
  maxBytes: 10 * 1024 * 1024,
  maxLabel: "10 MB",
} as const;
