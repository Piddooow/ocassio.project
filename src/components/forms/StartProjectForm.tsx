"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfettiButton } from "@/components/site/confetti-button";
import {
  FormField,
  TextAreaInput,
  TextInput,
  SelectInput,
} from "./FormField";
import { AttachmentInput } from "./AttachmentInput";
import {
  ATTACHMENT,
  PROJECT_TYPE_OPTIONS,
  SERVICE_OPTIONS,
} from "@/lib/content/start-project";

interface FormValues {
  fullName: string;
  company: string;
  email: string;
  whatsapp: string;
  service: string;
  projectType: string;
  description: string;
  desiredDate: string;
  location: string;
  budgetRange: string;
  expectedDeliverables: string;
  referenceUrl: string;
}

const EMPTY_VALUES: FormValues = {
  fullName: "",
  company: "",
  email: "",
  whatsapp: "",
  service: "",
  projectType: "",
  description: "",
  desiredDate: "",
  location: "",
  budgetRange: "",
  expectedDeliverables: "",
  referenceUrl: "",
};

type FieldKey = keyof FormValues;
type Errors = Partial<Record<FieldKey | "attachment", string>>;

/**
 * Maps server-side validation issues back onto their fields so the
 * submitter sees problems next to the input, with anything unmapped
 * surfaced in the summary alert (defense in depth with §31.21).
 */
function mapServerIssuesToFields(issues: string[]): {
  errors: Errors;
  unmatched: string[];
} {
  const errors: Errors = {};
  const unmatched: string[] = [];
  for (const issue of issues) {
    const text = issue.toLowerCase();
    if (text.includes("attachment")) errors.attachment ??= issue;
    else if (text.includes("full name")) errors.fullName ??= issue;
    else if (text.includes("email")) errors.email ??= issue;
    else if (text.includes("project type")) errors.projectType ??= issue;
    else if (text.includes("service")) errors.service ??= issue;
    else if (
      text.includes("description") ||
      text.includes("describe") ||
      text.includes("detail")
    )
      errors.description ??= issue;
    else if (text.includes("url")) errors.referenceUrl ??= issue;
    else if (text.includes("date")) errors.desiredDate ??= issue;
    else unmatched.push(issue);
  }
  return { errors, unmatched };
}

const REQUIRED_ORDER: FieldKey[] = [
  "fullName",
  "email",
  "service",
  "projectType",
  "description",
];

/** Explicit field-id map, ids use kebab-case, form keys stay camelCase. */
const FIELD_IDS: Record<FieldKey, string> = {
  fullName: "sp-full-name",
  company: "sp-company",
  email: "sp-email",
  whatsapp: "sp-whatsapp",
  service: "sp-service",
  projectType: "sp-project-type",
  description: "sp-description",
  desiredDate: "sp-desired-date",
  location: "sp-location",
  budgetRange: "sp-budget",
  expectedDeliverables: "sp-deliverables",
  referenceUrl: "sp-reference-url",
};

/**
 * Start a Project form (§6.13, §31.22), one coherent workflow with four
 * grouped sections. Frontend-only stage: validation runs locally and the
 * submit lands on the documented success state; the backend arrives later.
 */
export function StartProjectForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [serverIssues, setServerIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const update =
    (key: FieldKey) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const value = event.target.value;
      setValues((current) => ({ ...current, [key]: value }));
      // Fixing a field clears its message immediately (§31.21).
      setErrors((current) => {
        if (!current[key]) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    };

  const validateAttachment = (file: File | null): string | undefined => {
    if (!file) return undefined;
    if (
      !ATTACHMENT.acceptedTypes.includes(
        file.type as (typeof ATTACHMENT.acceptedTypes)[number],
      )
    ) {
      return `Attachments must be ${ATTACHMENT.acceptedLabels}.`;
    }
    if (file.size > ATTACHMENT.maxBytes) {
      return `Attachments must be ${ATTACHMENT.maxLabel} or smaller.`;
    }
    return undefined;
  };

  const onAttachmentChange = (file: File | null) => {
    setAttachment(file);
    setErrors((current) => {
      const next = { ...current };
      const message = validateAttachment(file);
      if (message) {
        next.attachment = message;
      } else {
        delete next.attachment;
      }
      return next;
    });
  };

  const validate = (): Errors => {
    const next: Errors = {};

    if (!values.fullName.trim()) {
      next.fullName = "Enter your full name so we know who to reply to.";
    }

    if (!values.email.trim()) {
      next.email = "Enter your email address, we reply to every brief here.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      next.email =
        "Enter a valid email address, for example name@studio.com.";
    }

    if (!values.service) {
      next.service = "Choose the service closest to your project.";
    }

    if (!values.projectType) {
      next.projectType = "Choose a project type.";
    }

    if (!values.description.trim()) {
      next.description = "Describe the project in a sentence or two.";
    } else if (values.description.trim().length < 20) {
      next.description =
        "Add a little more detail, at least 20 characters helps us understand the scope.";
    }

    if (
      values.referenceUrl.trim() &&
      !/^https?:\/\//i.test(values.referenceUrl.trim())
    ) {
      next.referenceUrl =
        "Enter a full URL starting with https://, or leave the field empty.";
    }

    if (attachment) {
      const attachmentError = validateAttachment(attachment);
      if (attachmentError) {
        next.attachment = attachmentError;
      }
    }

    return next;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Resubmit guard: ignore repeat submits while sending or after success.
    if (submitting || submitted) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    setServerIssues([]);

    // Any local error blocks submission, required fields first, then the
    // attachment, then optional-field format issues (§31.21).
    if (Object.keys(nextErrors).length > 0) {
      const focusKey: FieldKey | "attachment" =
        REQUIRED_ORDER.find((key) => nextErrors[key]) ??
        (nextErrors.attachment ? "attachment" : "referenceUrl");
      const focusId =
        focusKey === "attachment" ? "sp-attachment" : FIELD_IDS[focusKey];
      document.getElementById(focusId)?.focus();
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.set("fullName", values.fullName.trim());
    formData.set("company", values.company.trim());
    formData.set("email", values.email.trim());
    formData.set("whatsapp", values.whatsapp.trim());
    formData.set("service", values.service);
    formData.set("projectType", values.projectType);
    formData.set("description", values.description.trim());
    formData.set("desiredDate", values.desiredDate);
    formData.set("location", values.location.trim());
    formData.set("budgetRange", values.budgetRange.trim());
    formData.set("expectedDeliverables", values.expectedDeliverables.trim());
    formData.set("referenceUrl", values.referenceUrl.trim());
    if (attachment) formData.set("attachment", attachment, attachment.name);

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        issues?: unknown;
        error?: string;
      } | null;

      if (response.ok) {
        setSubmitted(true);
        return;
      }

      if (response.status === 400) {
        const issues = Array.isArray(payload?.issues)
          ? (payload.issues as string[])
          : payload?.error
            ? [payload.error]
            : [];
        if (issues.length > 0) {
          const { errors: mapped, unmatched } =
            mapServerIssuesToFields(issues);
          setErrors(mapped);
          setServerIssues(unmatched);
          const focusKey: FieldKey | "attachment" | undefined =
            REQUIRED_ORDER.find((key) => mapped[key]) ??
            (mapped.attachment
              ? "attachment"
              : mapped.referenceUrl
                ? "referenceUrl"
                : undefined);
          if (focusKey) {
            const focusId =
              focusKey === "attachment"
                ? "sp-attachment"
                : FIELD_IDS[focusKey];
            document.getElementById(focusId)?.focus();
          }
          return;
        }
      }

      setServerIssues([
        "We could not send your brief right now. Please try again in a moment.",
      ]);
    } catch {
      setServerIssues([
        "We could not reach the studio server. Check your connection and try again.",
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setValues(EMPTY_VALUES);
    setAttachment(null);
    setErrors({});
    setServerIssues([]);
    setSubmitting(false);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div
        data-start-project-success
        className="border-y border-line py-20 text-center"
      >
        <p className="text-label uppercase tracking-label-wide text-muted">
          Brief received
        </p>
        <h2 className="mt-6 font-display text-display-lg">Thank you.</h2>
        <p className="mt-4 text-body text-secondary">
          Your project brief has been received.
        </p>
        <p className="mt-1 text-body text-secondary">
          Ocassio.Project will review your request.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          <Button href="/work" variant="secondary">
            View Work
          </Button>
          <Button onClick={resetForm} variant="tertiary">
            Send another brief
          </Button>
          <Button href="/" variant="tertiary" arrow>
            Back Home
          </Button>
          <ConfettiButton hint="that felt good." />
        </div>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      data-start-project-form
      className="flex flex-col gap-12"
    >
      <fieldset data-section="contact" className="border-t border-line pt-8">
        <legend className="text-label uppercase tracking-label-wide text-muted">
          01 · Contact
        </legend>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <FormField
            id="sp-full-name"
            label="Full Name"
            required
            error={errors.fullName}
          >
            <TextInput
              id="sp-full-name"
              name="full-name"
              autoComplete="name"
              value={values.fullName}
              onChange={update("fullName")}
              error={errors.fullName}
            />
          </FormField>
          <FormField id="sp-company" label="Company">
            <TextInput
              id="sp-company"
              name="company"
              autoComplete="organization"
              value={values.company}
              onChange={update("company")}
            />
          </FormField>
          <FormField id="sp-email" label="Email" required error={errors.email}>
            <TextInput
              id="sp-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.email}
              onChange={update("email")}
              error={errors.email}
            />
          </FormField>
          <FormField id="sp-whatsapp" label="WhatsApp">
            <TextInput
              id="sp-whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.whatsapp}
              onChange={update("whatsapp")}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset data-section="project" className="border-t border-line pt-8">
        <legend className="text-label uppercase tracking-label-wide text-muted">
          02 · Project
        </legend>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <FormField
            id="sp-service"
            label="Service"
            required
            error={errors.service}
          >
            <SelectInput
              id="sp-service"
              name="service"
              value={values.service}
              onChange={update("service")}
              options={SERVICE_OPTIONS}
              placeholder="Select a service…"
              error={errors.service}
            />
          </FormField>
          <FormField
            id="sp-project-type"
            label="Project Type"
            required
            error={errors.projectType}
          >
            <SelectInput
              id="sp-project-type"
              name="project-type"
              value={values.projectType}
              onChange={update("projectType")}
              options={PROJECT_TYPE_OPTIONS}
              placeholder="Select a project type…"
              error={errors.projectType}
            />
          </FormField>
          <FormField
            id="sp-description"
            label="Project Description"
            required
            error={errors.description}
            className="sm:col-span-2"
          >
            <TextAreaInput
              id="sp-description"
              name="description"
              value={values.description}
              onChange={update("description")}
              error={errors.description}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset data-section="production" className="border-t border-line pt-8">
        <legend className="text-label uppercase tracking-label-wide text-muted">
          03 · Production
        </legend>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <FormField
            id="sp-desired-date"
            label="Desired Date"
            hint="An approximate date is fine."
          >
            <TextInput
              id="sp-desired-date"
              name="desired-date"
              type="date"
              value={values.desiredDate}
              onChange={update("desiredDate")}
            />
          </FormField>
          <FormField id="sp-location" label="Location">
            <TextInput
              id="sp-location"
              name="location"
              value={values.location}
              onChange={update("location")}
            />
          </FormField>
          <FormField
            id="sp-budget"
            label="Budget Range"
            hint="A range or a short note helps us right-size the proposal."
          >
            <TextInput
              id="sp-budget"
              name="budget-range"
              value={values.budgetRange}
              onChange={update("budgetRange")}
            />
          </FormField>
          <FormField
            id="sp-deliverables"
            label="Expected Deliverables"
            hint="For example: 15 retouched photographs, one 60-second film."
          >
            <TextInput
              id="sp-deliverables"
              name="expected-deliverables"
              value={values.expectedDeliverables}
              onChange={update("expectedDeliverables")}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset data-section="references" className="border-t border-line pt-8">
        <legend className="text-label uppercase tracking-label-wide text-muted">
          04 · References
        </legend>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <FormField
            id="sp-reference-url"
            label="Reference URL"
            error={errors.referenceUrl}
          >
            <TextInput
              id="sp-reference-url"
              name="reference-url"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={values.referenceUrl}
              onChange={update("referenceUrl")}
              error={errors.referenceUrl}
            />
          </FormField>
          <FormField
            id="sp-attachment"
            label="Attachment"
            error={errors.attachment}
            hint={`${ATTACHMENT.acceptedLabels}, up to ${ATTACHMENT.maxLabel}.`}
          >
            <AttachmentInput
              id="sp-attachment"
              file={attachment}
              onChange={onAttachmentChange}
              error={errors.attachment}
              hint={`${ATTACHMENT.acceptedLabels}, up to ${ATTACHMENT.maxLabel}.`}
            />
          </FormField>
        </div>
      </fieldset>

      {serverIssues.length > 0 ? (
        <div
          role="alert"
          data-form-server-issues
          className="rounded-md border border-error/40 bg-surface px-4 py-3 text-body-sm text-error"
        >
          <ul className="flex flex-col gap-1">
            {serverIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {errorCount > 0 ? (
        <div
          role="alert"
          data-form-error-summary
          className="rounded-md border border-error/40 bg-surface px-4 py-3 text-body-sm text-error"
        >
          We could not send your brief yet, please fix the {errorCount}{" "}
          highlighted {errorCount === 1 ? "field" : "fields"} below.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-8">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Sending…" : "Submit Project Brief"}
        </Button>
        <p className="text-caption text-muted">* Required fields</p>
      </div>
    </form>
  );
}
