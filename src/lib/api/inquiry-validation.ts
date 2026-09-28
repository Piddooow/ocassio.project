import { SERVICE_TYPES } from "@/lib/content/services";
import { WORK_CATEGORIES } from "@/lib/content/types";
import type { InquiryAttachment } from "@/lib/db/schema";

/**
 * Server-side validation for the public project brief (§6.13, §31.21).
 * Messages identify the field, explain what is wrong, and say how to
 * fix it, mirroring the frontend copy so both layers agree.
 */

export interface InquiryInput {
  fullName: string;
  company: string | null;
  email: string;
  whatsapp: string | null;
  service: string;
  projectType: string;
  description: string;
  desiredDate: string | null;
  location: string | null;
  budgetRange: string | null;
  expectedDeliverables: string | null;
  referenceUrl: string | null;
  attachments: InquiryAttachment[];
}

export type InquiryValidation =
  | { ok: true; value: InquiryInput }
  | { ok: false; issues: string[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalText = (
  raw: unknown,
  field: string,
  maxLength: number,
  issues: string[],
): string | null => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    issues.push(`${field} must be text.`);
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    issues.push(`${field} must be ${maxLength} characters or fewer.`);
    return null;
  }
  return trimmed;
};

export function validateInquiryBody(
  body: Record<string, unknown>,
  attachments: InquiryAttachment[],
): InquiryValidation {
  const issues: string[] = [];

  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (!fullName) {
    issues.push("Enter your full name so we know who to reply to.");
  } else if (fullName.length > 120) {
    issues.push("Full name must be 120 characters or fewer.");
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    issues.push("Enter your email address, we reply to every brief here.");
  } else if (!EMAIL_PATTERN.test(email)) {
    issues.push(
      "Enter a valid email address, for example name@studio.com.",
    );
  } else if (email.length > 160) {
    issues.push("Email must be 160 characters or fewer.");
  }

  const service = typeof body.service === "string" ? body.service.trim() : "";
  if (!service) {
    issues.push("Choose the service closest to your project.");
  } else if (!SERVICE_TYPES.includes(service as (typeof SERVICE_TYPES)[number])) {
    issues.push(
      `Service must be one of: ${SERVICE_TYPES.join(", ")}.`,
    );
  }

  const projectType =
    typeof body.projectType === "string" ? body.projectType.trim() : "";
  if (!projectType) {
    issues.push("Choose a project type.");
  } else if (
    !WORK_CATEGORIES.includes(projectType as (typeof WORK_CATEGORIES)[number])
  ) {
    issues.push(`Project type must be one of: ${WORK_CATEGORIES.join(", ")}.`);
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    issues.push("Describe the project in a sentence or two.");
  } else if (description.length < 20) {
    issues.push(
      "Add a little more detail, at least 20 characters helps us understand the scope.",
    );
  } else if (description.length > 5000) {
    issues.push("Project description must be 5000 characters or fewer.");
  }

  const referenceUrl = optionalText(
    body.referenceUrl,
    "Reference URL",
    500,
    issues,
  );
  if (referenceUrl && !/^https?:\/\//i.test(referenceUrl)) {
    issues.push(
      "Enter a full URL starting with https://, or leave the field empty.",
    );
  }

  const desiredDate = optionalText(
    body.desiredDate,
    "Desired date",
    40,
    issues,
  );
  if (desiredDate && Number.isNaN(Date.parse(desiredDate))) {
    issues.push("Desired date must be a real date.");
  }

  const company = optionalText(body.company, "Company", 120, issues);
  const whatsapp = optionalText(body.whatsapp, "WhatsApp", 40, issues);
  const location = optionalText(body.location, "Location", 160, issues);
  const budgetRange = optionalText(body.budgetRange, "Budget range", 160, issues);
  const expectedDeliverables = optionalText(
    body.expectedDeliverables,
    "Expected deliverables",
    500,
    issues,
  );

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: {
      fullName,
      company,
      email,
      whatsapp,
      service,
      projectType,
      description,
      desiredDate,
      location,
      budgetRange,
      expectedDeliverables,
      referenceUrl,
      attachments,
    },
  };
}
