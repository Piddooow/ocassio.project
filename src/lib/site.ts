/**
 * Global Settings (§10.3), the single source for studio identity and
 * default SEO. Contact channels live in the settings table (§10.3) and
 * are served by buildContactChannels; null values render as labeled
 * placeholders instead of invented data (R-38).
 */
export const GLOBAL_SETTINGS = {
  studioName: "Ocassio.Project",
  tagline: "Digital creative studio for photography and film.",
  defaultCta: { label: "Start a Project", href: "/start-project" },
  copyright: "Ocassio.Project",
  /** Reserved until a default social image exists (§10.3). */
  defaultSocialImage: null as string | null,
  defaultSeo: {
    title: "Ocassio.Project · Digital Creative Studio",
    description:
      "Ocassio.Project is a digital creative studio for professional photography and film, covering selected work, services, process, journal, and project inquiries.",
  },
} as const;

export interface NavItem {
  label: string;
  href: string;
}

export const SITE = {
  name: GLOBAL_SETTINGS.studioName,
  tagline: GLOBAL_SETTINGS.tagline,
} as const;

/** Primary navigation (§31.13), Pricing and Now stay contextual. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "Process", href: "/process" },
  { label: "About", href: "/about" },
  { label: "Journal", href: "/journal" },
  { label: "Contact", href: "/contact" },
];

/** Secondary links surfaced through the footer. */
export const FOOTER_MORE: NavItem[] = [
  { label: "Pricing", href: "/pricing" },
  { label: "Now", href: "/now" },
];

/**
 * Work dropdown children (studio request): the sitemap children of the
 * Work section (§4). Categories are filters on /work, not separate
 * pages, so the deep links carry the filter query and WorkBrowser reads
 * it on load.
 */
export const WORK_MENU: NavItem[] = [
  { label: "All Work", href: "/work" },
  { label: "Photography", href: "/work?filter=Photography" },
  { label: "Film", href: "/work?filter=Film" },
];

/** Legal pages (§6.14), owned by Website -> Legal. */
export const FOOTER_LEGAL: NavItem[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export const PRIMARY_CTA: NavItem = {
  label: GLOBAL_SETTINGS.defaultCta.label,
  href: GLOBAL_SETTINGS.defaultCta.href,
};

/**
 * Contact channels (§6.12), served from Global Settings (§10.3).
 * Channels without a value yet are labeled "Coming soon" on the page;
 * location and availability are plain informational lines, never a
 * booking feature.
 */
export interface ContactChannel {
  label: string;
  value: string | null;
  href?: string;
  available: boolean;
}

/** The contact subset of Global Settings used by the public site. */
export interface ContactChannelSettings {
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialLinks: { platform: string; url: string }[];
}

export const CONTACT_AVAILABILITY =
  "Confirmed per project and shared together with the quote.";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  vimeo: "Vimeo",
  youtube: "YouTube",
};

/** Social platform -> display label, shared by Contact and the footer. */
export function socialLabel(platform: string): string {
  return SOCIAL_LABELS[platform] ?? platform;
}

function whatsappHref(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : undefined;
}

/** Builds the documented contact channel rows from Global Settings. */
export function buildContactChannels(
  settings: ContactChannelSettings | null,
): ContactChannel[] {
  const email = settings?.contactEmail ?? null;
  const phone = settings?.contactPhone ?? null;
  const address = settings?.address ?? null;
  const socialLinks = settings?.socialLinks ?? [];
  const social = (platform: string) =>
    socialLinks.find((link) => link.platform === platform);

  return [
    {
      /* Project requests route to Start a Project (§6.12), which is live now. */
      label: "New projects",
      value: "Start a Project",
      href: "/start-project",
      available: true,
    },
    {
      label: "General email",
      value: email,
      href: email ? `mailto:${email}` : undefined,
      available: email !== null,
    },
    {
      label: "WhatsApp",
      value: phone,
      href: phone ? whatsappHref(phone) : undefined,
      available: phone !== null,
    },
    ...(["instagram", "vimeo", "youtube"] as const).map((platform) => {
      const link = social(platform);
      return {
        label: SOCIAL_LABELS[platform],
        value: link?.url ?? null,
        href: link?.url,
        available: Boolean(link?.url),
      };
    }),
    {
      label: "Location",
      value:
        address ?? "The studio shares its location with the project quote.",
      available: true,
    },
    {
      label: "Availability",
      value: CONTACT_AVAILABILITY,
      available: true,
    },
  ];
}

/** Baseline channels before Global Settings are connected. */
export const CONTACT_CHANNELS: ContactChannel[] = buildContactChannels(null);

export const CONTACT_NOTE =
  "Direct channels are being connected to this site. Until they are live, submit a project brief and the studio will reply personally.";
