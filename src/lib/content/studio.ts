import type { ContentStatus, PublishVisibility } from "./types";

/**
 * Studio identity content (Admin → Studio → About / Team / Clients /
 * Recognition). Client names, team members, and recognition entries are
 * withheld until the studio provides the real lists (R-38: no invented
 * brands or awards).
 */

export interface Client {
  name: string;
  featured: boolean;
  status: ContentStatus;
}

export const CLIENTS: Client[] = [];

export const RECOGNITION_TYPES = [
  "Publication",
  "Award",
  "Feature",
  "Exhibition",
] as const;

export type RecognitionType = (typeof RECOGNITION_TYPES)[number];

export interface Recognition {
  title: string;
  organization: string;
  year: number;
  type: RecognitionType;
  status: ContentStatus;
  visibility: PublishVisibility;
}

export const RECOGNITION: Recognition[] = [];

export interface StudioAbout {
  heading: string;
  paragraphs: string[];
  philosophy: string[];
}

export const STUDIO_ABOUT: StudioAbout = {
  heading: "A small studio for lasting images",
  paragraphs: [
    "Ocassio.Project is a digital creative studio working across [photography and film](/services). The studio photographs weddings, celebrations, portraits, and commissioned stories.",
    "The studio stays deliberately small. The person who plans your project is the person who shoots it, and the person who finishes it. Nothing is outsourced to strangers mid-way.",
  ],
  philosophy: [
    "Work at the speed of attention, not the speed of the calendar.",
    "Photograph what is actually there, not a version arranged for the camera.",
    "Deliver calm: clear plans, honest timelines, finished files you can keep.",
  ],
};

/**
 * Placeholder roster (owner-approved for the current build). The names,
 * roles, and bios below are stand-ins so the Team section and its hover
 * cards can be reviewed; the studio replaces them with the real people
 * before launch. No portrait files are referenced.
 */
export interface TeamMemberSeed {
  name: string;
  roleTitle: string;
  bio: string;
  sortOrder: number;
}

export const TEAM_MEMBERS: TeamMemberSeed[] = [
  {
    name: "Mara Whitfield",
    roleTitle: "Photographer",
    bio: "Mara photographs weddings, portraits, and commissioned stories. She works slowly on purpose, because the good frames tend to happen after people stop posing.",
    sortOrder: 1,
  },
  {
    name: "Jonas Reyes",
    roleTitle: "Film Director",
    bio: "Jonas directs the studio's wedding films and short documentaries. He plans each film around a handful of scenes worth keeping, then shoots the parts nobody planned.",
    sortOrder: 2,
  },
  {
    name: "Selin Aydin",
    roleTitle: "Editor",
    bio: "Selin cuts the films and finishes the photo sets. She trusts long takes and honest color, and she archives every project so it can be reopened years later.",
    sortOrder: 3,
  },
  {
    name: "Theo Lambert",
    roleTitle: "Producer",
    bio: "Theo writes the schedules, permits, and shot plans the crew actually uses. When a plan changes mid-week, he answers the phone and rebuilds the day.",
    sortOrder: 4,
  },
];

/**
 * Labeled placeholders for About sections whose real content is still
 * being written by the studio (R-38: no invented clients or awards).
 */
export const ABOUT_PLACEHOLDERS = {
  team: "Team and collaborator details are being prepared.",
  clients: "The client list is being prepared.",
  recognition: "Recognition and publication details are being prepared.",
} as const;

/** Founder introduction (studio-supplied): real name, role and portrait. */
export const FOUNDER = {
  name: "Yehuda Alfa",
  role: "Head Director",
  bio: "Head Director of Ocassio.Project, a photography and film studio working as one team from direction and production to finishing in a single flow.",
  photoId: "yehuda-alfa",
} as const;
