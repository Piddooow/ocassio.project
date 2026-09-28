/**
 * Client notes (studio request): placeholder notes written per project
 * until the real client quotes arrive. Replace the `message` values, keep
 * the shape. Initials render in the avatar chip.
 */

export interface ProjectReview {
  author: string;
  initials: string;
  /** Short context line under the name. */
  role: string;
  message: string;
}

export const PROJECT_REVIEWS: Record<string, ProjectReview[]> = {
  "dean-and-deb": [
    {
      author: "Dean & Deb",
      initials: "DD",
      role: "Wedding, July 2026",
      message:
        "The day felt easy. Nobody rushed us, and by the reception everyone forgot the camera was even there. Our favourite frames are from the last hour, when the light went orange.",
    },
    {
      author: "Ruth Ellison",
      initials: "RE",
      role: "Mother of the groom, July 2026",
      message:
        "I have been to a lot of weddings where the photographer runs the whole day. This was the opposite. Someone was always in the right place, and I never once saw them ask anyone to stop and pose.",
    },
    {
      author: "Maya Okafor",
      initials: "MO",
      role: "Maid of honour, July 2026",
      message:
        "They covered the getting-ready chaos, my speech, and the dance floor, and none of it looks staged. I cried at the preview, and I was not even the one getting married.",
    },
  ],
  "tere-and-chris": [
    {
      author: "Tere & Chris",
      initials: "TC",
      role: "Wedding film, 2025",
      message:
        "We watched the film with my parents last week. My dad did not cry at the wedding, but he did at the film, right around the part with my grandmother dancing. Thank you for catching that.",
    },
    {
      author: "Cindy Halim",
      initials: "CH",
      role: "Sister of the bride, 2025",
      message:
        "Tere asked me to keep an eye on the schedule, and I quickly gave up because the team had it handled. The film is the first wedding video I have ever rewatched on purpose.",
    },
  ],
  "nisa-and-taffy": [
    {
      author: "Nisa & Taffy",
      initials: "NT",
      role: "Engagement film, 2023",
      message:
        "There is a shot of us laughing at something we do not even remember saying. Three years on, it is still our favourite clip.",
    },
    {
      author: "Devon Pratama",
      initials: "DP",
      role: "Friend of the couple, 2023",
      message:
        "I drove them to the location and ended up staying for the shoot. It took under an hour, it rained a little, and the video looks like it took a week.",
    },
  ],
  "adifa-and-adila": [
    {
      author: "Nadia Kusuma",
      initials: "NK",
      role: "Family friend, 2023",
      message:
        "Halfway through the party I realised nobody had posed for anything. The film is the afternoon as it happened, including my terrible singing, and the kids ask to watch it almost every weekend.",
    },
    {
      author: "Adifa & Adila",
      initials: "AA",
      role: "Birthday film, 2023",
      message:
        "The kids have watched their birthday film more than any cartoon. Adila knows her entrance by heart and asks for it on repeat.",
    },
    {
      author: "Sari Wibowo",
      initials: "SW",
      role: "Aunt, 2023",
      message:
        "Twenty children running through one small house, and every single one of them still ended up in the film, smiling. I do not know how.",
    },
  ],
};

export function getReviewsForProject(slug: string): ProjectReview[] {
  return PROJECT_REVIEWS[slug] ?? [];
}

/** Four notes surfaced on the Home page. */
export const FEATURED_REVIEW_SLUGS = [
  "dean-and-deb",
  "tere-and-chris",
  "nisa-and-taffy",
  "adifa-and-adila",
] as const;

export function getFeaturedReviews(): {
  projectSlug: string;
  review: ProjectReview;
}[] {
  return FEATURED_REVIEW_SLUGS.flatMap((projectSlug) => {
    const review = getReviewsForProject(projectSlug)[0];
    return review ? [{ projectSlug, review }] : [];
  });
}
