/**
 * Homepage copy (§6.1), owned later by Admin → Website → Homepage.
 * Section order and themes are fixed by the architecture (§31.14).
 */

export interface HeroLine {
  text: string;
  italic?: boolean;
}

export const HOME_HERO = {
  eyebrow: "Digital creative studio for photography and film",
  headlineLines: [
    { text: "Stories held" },
    { text: "in light & time", italic: true },
  ] as HeroLine[],
  statement:
    "A photography and film studio for days that deserve more than snapshots: weddings, celebrations, portraits, and stories worth keeping.",
} as const;

export const HOME_INTRO = {
  label: "Introduction",
  statement:
    "We photograph what matters before it passes: the day, the people, the small unplanned moments.",
  body: "From first inquiry to final delivery, Ocassio.Project works as one studio: direction, production, and finishing in a single flow. Quiet where it should be quiet, precise where it counts.",
} as const;

export const HOME_SHOWREEL = {
  label: "Showreel",
  title: "One selected film, motion, edited to a single rhythm.",
  caption: "Selected cut, teaser",
} as const;

/**
 * Homepage section registry (§10.1, §26.2 homepage_sections).
 * Order and themes follow §31.14; Hero and the final CTA are mandatory
 * and cannot be removed.
 */
export interface HomeSection {
  key: string;
  label: string;
  theme: "dark" | "light";
  required: boolean;
}

export const HOME_SECTIONS: HomeSection[] = [
  { key: "hero", label: "Hero", theme: "dark", required: true },
  { key: "selected_work", label: "Selected Work", theme: "dark", required: false },
  { key: "introduction", label: "Introduction", theme: "light", required: false },
  { key: "featured_project", label: "Featured Project", theme: "dark", required: false },
  { key: "services", label: "Services", theme: "light", required: false },
  { key: "showreel", label: "Showreel", theme: "dark", required: false },
  { key: "process", label: "Process", theme: "light", required: false },
  { key: "clients_recognition", label: "Clients / Recognition", theme: "light", required: false },
  { key: "currently", label: "Currently", theme: "dark", required: false },
  { key: "journal", label: "Journal", theme: "light", required: false },
  { key: "final_cta", label: "Start a Project (CTA)", theme: "light", required: true },
];
