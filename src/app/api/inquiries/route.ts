import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  validateInquiryBody,
} from "@/lib/api/inquiry-validation";
import { createInquiry } from "@/lib/db/queries/inquiries";
import type { InquiryAttachment } from "@/lib/db/schema";
import {
  AttachmentValidationError,
  storeInquiryAttachment,
} from "@/lib/media/attachments";

/**
 * Public project brief submission (PRD §6.13).
 * POST /api/inquiries
 *
 * Accepts multipart form data (with an optional single attachment) or
 * JSON (no attachment). Validates server-side, stores the brief with
 * pipeline stage NEW, and never echoes the brief back.
 */
export const dynamic = "force-dynamic";

function toTextRecord(form: FormData): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") record[key] = value;
  }
  return record;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let body: Record<string, unknown>;
  let attachments: InquiryAttachment[] = [];

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      body = toTextRecord(form);

      const fileEntries = [...form.entries()].filter(
        ([, value]) =>
          typeof value !== "string" &&
          typeof (value as Blob).size === "number" &&
          (value as Blob).size > 0,
      );
      if (fileEntries.length > 1) {
        return NextResponse.json(
          { error: "Only one attachment is supported per brief." },
          { status: 400 },
        );
      }
      const fileEntry = fileEntries[0]?.[1];
      if (fileEntry && typeof fileEntry !== "string") {
        const file = fileEntry as File;
        const stored = await storeInquiryAttachment({
          buffer: Buffer.from(await file.arrayBuffer()),
          filename: file.name || "attachment",
          mimeType: file.type,
        });
        attachments = [stored];
      }
    } else if (contentType.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    } else {
      return NextResponse.json(
        {
          error:
            "Unsupported content type. Use multipart/form-data or application/json.",
        },
        { status: 415 },
      );
    }
  } catch (error) {
    if (error instanceof AttachmentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Request body could not be read." },
      { status: 400 },
    );
  }

  const validated = validateInquiryBody(body, attachments);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const created = await createInquiry(validated.value);

  return NextResponse.json(
    {
      data: {
        id: created.id,
        status: created.status,
        receivedAt: created.createdAt,
        message:
          "Your project brief has been received. Ocassio.Project will review your request.",
      },
    },
    { status: 201 },
  );
}
