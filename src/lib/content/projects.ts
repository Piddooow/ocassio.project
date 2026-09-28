import { getProjectMedia } from "./media";
import type { Project, ProjectCredit, WorkCategory } from "./types";

/**
 * Real portfolio projects (studio content, Aug 2026).
 * Editorial fields live here; photos and videos are loaded from the
 * generated media manifest so nothing can go missing or get mixed up.
 */

interface ProjectSeed {
  slug: string;
  title: string;
  date: string;
  year: number;
  category: WorkCategory;
  shortDescription: string;
  credits: ProjectCredit[];
  relatedSlugs: string[];
}

const SEEDS: ProjectSeed[] = [
  {
    slug: "dean-and-deb",
    title: "Dean & Deb",
    date: "2026-07-26",
    year: 2026,
    category: "Photography",
    shortDescription:
      "A full wedding day in [photographs](/services/photography), from the first quiet minutes of preparation to the last dance, told in honest, unhurried frames.",
    credits: [{ role: "Photography", name: "Ocassio.Project" }],
    relatedSlugs: ["tere-and-chris", "sunday-school"],
  },
  {
    slug: "sunday-school",
    title: "Sunday School",
    date: "2026-01-28",
    year: 2026,
    category: "Event",
    shortDescription:
      "A Sunday School morning, photographed as it happened, small gestures, big expressions, and light through classroom windows.",
    credits: [{ role: "Photography", name: "Ocassio.Project" }],
    relatedSlugs: ["dean-and-deb", "adifa-and-adila"],
  },
  {
    slug: "tere-and-chris",
    title: "The Wedding of Tere & Chris",
    date: "2025-10-28",
    year: 2025,
    category: "Film",
    shortDescription:
      "The wedding of Tere & Chris in motion, one story told in several cuts: a full film, a portrait version, and a short teaser.",
    credits: [{ role: "Production", name: "Ocassio.Project" }],
    relatedSlugs: ["nisa-and-taffy", "dean-and-deb"],
  },
  {
    slug: "nisa-and-taffy",
    title: "The Engagement of Nisa & Taffy",
    date: "2023-07-03",
    year: 2023,
    category: "Film",
    shortDescription:
      "An engagement day told in motion, the story cut in three lengths, from a short preview to the full film.",
    credits: [{ role: "Production", name: "Ocassio.Project" }],
    relatedSlugs: ["tere-and-chris", "adifa-and-adila"],
  },
  {
    slug: "adifa-and-adila",
    title: "Adifa & Adila Birthday",
    date: "2023-06-23",
    year: 2023,
    category: "Event",
    shortDescription:
      "A birthday celebration in motion, one film, cut to keep every important moment intact.",
    credits: [{ role: "Production", name: "Ocassio.Project" }],
    relatedSlugs: ["sunday-school", "nisa-and-taffy"],
  },
];

export const PROJECTS: Project[] = SEEDS.map((seed) => {
  const media = getProjectMedia(seed.slug);
  return {
    ...seed,
    photos: media?.photos ?? [],
    videos: media?.videos ?? [],
    status: "published",
    visibility: "public",
  };
});

/** Featured film for the homepage, the latest project that carries video. */
export function getFeaturedFilm(): { project: Project; videoIndex: number } | null {
  const withVideo = PROJECTS.filter((project) => project.videos.length > 0).sort(
    (a, b) => b.date.localeCompare(a.date),
  );
  const project = withVideo[0];
  if (!project) return null;
  const teaserIndex = project.videos.findIndex((video) =>
    video.id.includes("teaser"),
  );
  return { project, videoIndex: teaserIndex >= 0 ? teaserIndex : 0 };
}
