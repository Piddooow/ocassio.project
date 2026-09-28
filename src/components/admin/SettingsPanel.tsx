"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  FormField,
  TextAreaInput,
  TextInput,
} from "@/components/forms/FormField";
import { adminRequest, issuesText, jsonInit } from "@/lib/admin-client";

interface SettingsPayload {
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialLinks: { platform: string; url: string }[] | null;
  globalMeta: {
    studioName?: string;
    tagline?: string;
    defaultCta?: { label: string; href: string };
    copyright?: string;
    defaultSocialImage?: string | null;
    seo?: { title?: string; description?: string };
  } | null;
}

interface FormState {
  contactEmail: string;
  contactPhone: string;
  address: string;
  instagram: string;
  vimeo: string;
  youtube: string;
  studioName: string;
  tagline: string;
  copyright: string;
  ctaLabel: string;
  ctaHref: string;
  seoTitle: string;
  seoDescription: string;
  socialImage: string;
}

const EMPTY: FormState = {
  contactEmail: "",
  contactPhone: "",
  address: "",
  instagram: "",
  vimeo: "",
  youtube: "",
  studioName: "",
  tagline: "",
  copyright: "",
  ctaLabel: "",
  ctaHref: "",
  seoTitle: "",
  seoDescription: "",
  socialImage: "",
};

/**
 * Global Settings panel (§10.3): studio identity, contact channels,
 * socials, the default CTA, copyright, social image, and default SEO.
 * Values are the single public source once saved.
 */
export function SettingsPanel() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { ok, body } = await adminRequest<SettingsPayload | null>(
      "/api/admin/settings",
    );
    if (!ok) {
      setError(issuesText(body));
      setLoaded(true);
      return;
    }
    const data = body?.data;
    const social = (platform: string) =>
      data?.socialLinks?.find((link) => link.platform === platform)?.url ?? "";
    setForm({
      contactEmail: data?.contactEmail ?? "",
      contactPhone: data?.contactPhone ?? "",
      address: data?.address ?? "",
      instagram: social("instagram"),
      vimeo: social("vimeo"),
      youtube: social("youtube"),
      studioName: data?.globalMeta?.studioName ?? "",
      tagline: data?.globalMeta?.tagline ?? "",
      copyright: data?.globalMeta?.copyright ?? "",
      ctaLabel: data?.globalMeta?.defaultCta?.label ?? "",
      ctaHref: data?.globalMeta?.defaultCta?.href ?? "",
      seoTitle: data?.globalMeta?.seo?.title ?? "",
      seoDescription: data?.globalMeta?.seo?.description ?? "",
      socialImage: data?.globalMeta?.defaultSocialImage ?? "",
    });
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (patch: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...patch }));

  const save = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    const socialLinks = [
      { platform: "instagram", url: form.instagram.trim() },
      { platform: "vimeo", url: form.vimeo.trim() },
      { platform: "youtube", url: form.youtube.trim() },
    ].filter((link) => link.url.length > 0);

    const { ok, body } = await adminRequest(
      "/api/admin/settings",
      jsonInit("PATCH", {
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        address: form.address.trim() || null,
        socialLinks,
        globalMeta: {
          studioName: form.studioName.trim() || null,
          tagline: form.tagline.trim() || null,
          copyright: form.copyright.trim() || null,
          defaultSocialImage: form.socialImage.trim() || null,
          ...(form.ctaLabel.trim() && form.ctaHref.trim()
            ? {
                defaultCta: {
                  label: form.ctaLabel.trim(),
                  href: form.ctaHref.trim(),
                },
              }
            : {}),
          seo: {
            title: form.seoTitle.trim() || null,
            description: form.seoDescription.trim() || null,
          },
        },
      }),
    );
    setSaving(false);
    if (!ok) {
      setError(issuesText(body));
      return;
    }
    setStatus("Settings saved. The public site reads them immediately.");
    await load();
  };

  if (!loaded) {
    return <p className="text-body-sm text-muted">Loading settings...</p>;
  }

  return (
    <form
      data-settings-form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="flex max-w-3xl flex-col gap-8"
    >
      <section>
        <h2 className="text-title-sm font-medium text-primary">Identity</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormField id="settings-studio-name" label="Studio name">
            <TextInput
              id="settings-studio-name"
              name="studioName"
              value={form.studioName}
              onChange={(event) => set({ studioName: event.target.value })}
            />
          </FormField>
          <FormField id="settings-copyright" label="Copyright">
            <TextInput
              id="settings-copyright"
              name="copyright"
              value={form.copyright}
              onChange={(event) => set({ copyright: event.target.value })}
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField id="settings-tagline" label="Tagline">
            <TextInput
              id="settings-tagline"
              name="tagline"
              value={form.tagline}
              onChange={(event) => set({ tagline: event.target.value })}
            />
          </FormField>
        </div>
      </section>

      <section>
        <h2 className="text-title-sm font-medium text-primary">Contact</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormField id="settings-email" label="Email">
            <TextInput
              id="settings-email"
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(event) => set({ contactEmail: event.target.value })}
            />
          </FormField>
          <FormField id="settings-phone" label="WhatsApp">
            <TextInput
              id="settings-phone"
              name="contactPhone"
              value={form.contactPhone}
              onChange={(event) => set({ contactPhone: event.target.value })}
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField id="settings-address" label="Location">
            <TextInput
              id="settings-address"
              name="address"
              value={form.address}
              onChange={(event) => set({ address: event.target.value })}
            />
          </FormField>
        </div>
      </section>

      <section>
        <h2 className="text-title-sm font-medium text-primary">Social</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <FormField id="settings-instagram" label="Instagram URL">
            <TextInput
              id="settings-instagram"
              name="instagram"
              value={form.instagram}
              onChange={(event) => set({ instagram: event.target.value })}
            />
          </FormField>
          <FormField id="settings-vimeo" label="Vimeo URL">
            <TextInput
              id="settings-vimeo"
              name="vimeo"
              value={form.vimeo}
              onChange={(event) => set({ vimeo: event.target.value })}
            />
          </FormField>
          <FormField id="settings-youtube" label="YouTube URL">
            <TextInput
              id="settings-youtube"
              name="youtube"
              value={form.youtube}
              onChange={(event) => set({ youtube: event.target.value })}
            />
          </FormField>
        </div>
      </section>

      <section>
        <h2 className="text-title-sm font-medium text-primary">
          Default CTA
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormField id="settings-cta-label" label="CTA label">
            <TextInput
              id="settings-cta-label"
              name="ctaLabel"
              value={form.ctaLabel}
              onChange={(event) => set({ ctaLabel: event.target.value })}
            />
          </FormField>
          <FormField id="settings-cta-href" label="CTA destination">
            <TextInput
              id="settings-cta-href"
              name="ctaHref"
              value={form.ctaHref}
              onChange={(event) => set({ ctaHref: event.target.value })}
            />
          </FormField>
        </div>
      </section>

      <section>
        <h2 className="text-title-sm font-medium text-primary">
          Default SEO
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormField id="settings-seo-title" label="SEO title">
            <TextInput
              id="settings-seo-title"
              name="seoTitle"
              value={form.seoTitle}
              onChange={(event) => set({ seoTitle: event.target.value })}
            />
          </FormField>
          <FormField id="settings-social-image" label="Default social image URL">
            <TextInput
              id="settings-social-image"
              name="socialImage"
              value={form.socialImage}
              onChange={(event) => set({ socialImage: event.target.value })}
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField id="settings-seo-description" label="SEO description">
            <TextAreaInput
              id="settings-seo-description"
              name="seoDescription"
              rows={3}
              value={form.seoDescription}
              onChange={(event) => set({ seoDescription: event.target.value })}
            />
          </FormField>
        </div>
      </section>

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
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
