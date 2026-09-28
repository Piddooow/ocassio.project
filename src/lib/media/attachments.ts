import { randomUUID } from "node:crypto";
import { deleteStoredFile, saveStorageOnlyFile } from "./storage";

/**
 * Inquiry attachment pipeline (§6.13): PDF, JPG, JPEG, or PNG up to
 * 10 MB per file. Attachments are reference material for the studio,
 * so they are stored storage-only and never served publicly.
 */

export const INQUIRY_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_INQUIRY_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ATTACHMENT_STORAGE_DIR = "data/uploads/inquiries";

export interface StoredInquiryAttachment {
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
}

/** Thrown with a message safe to surface to the submitter. */
export class AttachmentValidationError extends Error {}

function sanitizeFilename(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return base.replace(/^-+|-+$/g, "") || "attachment";
}

/**
 * Magic-byte check so a spoofed mime type cannot smuggle other content
 * into storage under an accepted label.
 */
function matchesSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 4).toString("latin1") === "%PDF";
  }
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  return false;
}

export async function storeInquiryAttachment({
  buffer,
  filename,
  mimeType,
}: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<StoredInquiryAttachment> {
  if (
    !INQUIRY_ATTACHMENT_MIME_TYPES.includes(
      mimeType as (typeof INQUIRY_ATTACHMENT_MIME_TYPES)[number],
    )
  ) {
    throw new AttachmentValidationError(
      "Attachments must be PDF, JPG, JPEG, or PNG.",
    );
  }
  if (buffer.byteLength === 0) {
    throw new AttachmentValidationError("The attachment file is empty.");
  }
  if (buffer.byteLength > MAX_INQUIRY_ATTACHMENT_BYTES) {
    throw new AttachmentValidationError(
      "Attachments must be 10 MB or smaller.",
    );
  }
  if (!matchesSignature(buffer, mimeType)) {
    throw new AttachmentValidationError(
      "The attachment content does not match its file type (PDF, JPG, JPEG, or PNG).",
    );
  }

  const token = randomUUID().replace(/-/g, "");
  const storedName = `${token}-${sanitizeFilename(filename)}`;
  const storageKey = await saveStorageOnlyFile(
    `uploads/inquiries/${storedName}`,
    buffer,
  );

  return {
    filename: storedName,
    mimeType,
    size: buffer.byteLength,
    storageKey,
  };
}

export async function removeInquiryAttachment(storageKey: string) {
  await deleteStoredFile(storageKey);
}
