"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  FormField,
  TextAreaInput,
  TextInput,
} from "@/components/forms/FormField";
import {
  adminRequest,
  fromLines,
  issuesText,
  jsonInit,
  toLines,
} from "@/lib/admin-client";

interface AboutRow {
  id: number;
  heading: string;
  body: { paragraphs: string[]; philosophy: string[] } | null;
}

/**
 * Studio About singleton panel (§18, §6.8): heading, prose, philosophy.
 * Every save records a version (§25) on the backend.
 */
export function AboutPanel() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [heading, setHeading] = useState("");
  const [paragraphs, setParagraphs] = useState("");
  const [philosophy, setPhilosophy] = useState("");

  useEffect(() => {
    void (async () => {
      const { ok, body } = await adminRequest<AboutRow | null>(
        "/api/admin/studio/about",
      );
      if (!ok) {
        setError(issuesText(body));
      } else if (body?.data) {
        setHeading(body.data.heading);
        setParagraphs(fromLines(body.data.body?.paragraphs));
        setPhilosophy(fromLines(body.data.body?.philosophy));
      }
      setLoaded(true);
    })();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    const { ok, body } = await adminRequest(
      "/api/admin/studio/about",
      jsonInit("PATCH", {
        heading,
        body: {
          paragraphs: toLines(paragraphs),
          philosophy: toLines(philosophy),
        },
      }),
    );
    setSaving(false);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setStatus("About saved. The public page updates immediately.");
  };

  if (!loaded) {
    return <p className="text-body-sm text-muted">Loading About...</p>;
  }

  return (
    <form data-about-form onSubmit={save} className="flex max-w-3xl flex-col gap-5">
      <FormField id="about-heading" label="Heading" required>
        <TextInput
          id="about-heading"
          name="heading"
          value={heading}
          onChange={(event) => setHeading(event.target.value)}
        />
      </FormField>
      <FormField
        id="about-paragraphs"
        label="About Ocassio"
        hint="One paragraph per line."
      >
        <TextAreaInput
          id="about-paragraphs"
          name="paragraphs"
          rows={5}
          value={paragraphs}
          onChange={(event) => setParagraphs(event.target.value)}
        />
      </FormField>
      <FormField
        id="about-philosophy"
        label="Philosophy"
        hint="One line per principle."
      >
        <TextAreaInput
          id="about-philosophy"
          name="philosophy"
          rows={4}
          value={philosophy}
          onChange={(event) => setPhilosophy(event.target.value)}
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
          {saving ? "Saving..." : "Save About"}
        </Button>
      </div>
    </form>
  );
}
