import type { ContentStatus, PublishVisibility } from "./types";

/** Service types (§6.4), separate taxonomy from Work filters (§5.2). */
export const SERVICE_TYPES = [
  "Photography",
  "Film & Motion",
  "Commercial Campaign",
  "Portrait",
  "Product",
  "Event",
  "Creative Production",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface Service {
  slug: string;
  name: ServiceType;
  /** The taxonomy value from §26.2 `services.service_type` (kept explicit
   *  so a future display name can differ from the type). */
  serviceType: ServiceType;
  /** Display order (§26.2 `services.sort_order`). */
  sortOrder: number;
  shortDescription: string;
  /** Long-form description paragraphs (§6.5). */
  description: string[];
  whoItIsFor: string[];
  deliverables: string[];
  /**
   * No public pricing is published yet, so this stays null and pages show
   * "Quote on request" instead of invented numbers (R-17).
   */
  startingPrice: string | null;
  /** Cover resolved from a real project's lead photo or film poster. */
  coverProjectSlug?: string;
  relatedProjectSlugs: string[];
  /** Real FAQ entries only; empty means the section is not rendered (R-28). */
  faq: ServiceFaq[];
  status: ContentStatus;
  visibility: PublishVisibility;
}

/**
 * Studio services. Cover imagery comes from real commissioned work;
 * services without matching work yet use a typographic card instead.
 */
export const SERVICES: Service[] = [
  {
    slug: "photography",
    name: "Photography",
    serviceType: "Photography",
    sortOrder: 1,
    shortDescription:
      "Full coverage photography for weddings, celebrations, and commissioned stories.",
    description: [
      "A quiet, documentary approach to photographing a day: we follow the light and the people, and stay out of the way.",
      "Every commission includes [planning](/process), a full shoot day, and a finished set of images, edited in the studio.",
    ],
    whoItIsFor: [
      "Couples who want their day recorded honestly",
      "Families and communities marking a milestone",
      "Brands that need a story told in stills",
    ],
    deliverables: [
      "Pre-production conversation and shot plan",
      "Shoot day coverage",
      "Studio-edited final set",
      "High-resolution delivery",
    ],
    startingPrice: null,
    coverProjectSlug: "dean-and-deb",
    relatedProjectSlugs: ["dean-and-deb", "sunday-school"],
    faq: [],
    status: "published",
    visibility: "public",
  },
  {
    slug: "film-and-motion",
    name: "Film & Motion",
    serviceType: "Film & Motion",
    sortOrder: 2,
    shortDescription:
      "Wedding films and short documentaries, cut to keep the feeling of the day.",
    description: [
      "We film days as they happen: the preparations, the quiet moments between events, and the parts nobody notices until they watch the film.",
      "Each project is delivered in several cuts, from a short teaser to the full film.",
    ],
    whoItIsFor: [
      "Couples who want more than a highlight reel",
      "Families documenting a once-in-a-lifetime day",
      "Studios and organisations needing a story in motion",
    ],
    deliverables: [
      "Concept and shot planning",
      "Shoot days with a small crew",
      "Edit, sound, and grade",
      "Delivery in multiple lengths",
    ],
    startingPrice: null,
    coverProjectSlug: "tere-and-chris",
    relatedProjectSlugs: ["tere-and-chris", "nisa-and-taffy"],
    faq: [],
    status: "published",
    visibility: "public",
  },
  {
    slug: "commercial-campaign",
    name: "Commercial Campaign",
    serviceType: "Commercial Campaign",
    sortOrder: 3,
    shortDescription:
      "Campaign imagery and motion built around a brand's story and scope.",
    description: [
      "Commercial work starts with the brief: what the campaign needs to say, where it will run, and what the usage requires.",
      "We build the treatment, the production, and the final assets as one coordinated package.",
    ],
    whoItIsFor: [
      "Brands preparing a seasonal campaign",
      "Agencies needing a production partner",
      "Businesses commissioning their first serious shoot",
    ],
    deliverables: [
      "Creative treatment",
      "Production planning and crew",
      "Stills and motion as scoped",
      "Usage-aware final delivery",
    ],
    startingPrice: null,
    relatedProjectSlugs: [],
    faq: [],
    status: "published",
    visibility: "public",
  },
  {
    slug: "portrait",
    name: "Portrait",
    serviceType: "Portrait",
    sortOrder: 4,
    shortDescription:
      "Considered portrait sessions, photographed in real light and unhurried.",
    description: [
      "Portrait sessions are deliberately slow. We spend the first minutes talking, and the camera stops feeling like a camera.",
      "Sessions can happen in the studio or at a location that means something to you.",
    ],
    whoItIsFor: [
      "Individuals updating a professional profile",
      "Families wanting a proper portrait session",
      "Anyone who has been putting off being photographed",
    ],
    deliverables: [
      "Session planning and location scouting",
      "Guided direction throughout",
      "Studio-edited selects",
      "High-resolution delivery",
    ],
    startingPrice: null,
    coverProjectSlug: "sunday-school",
    relatedProjectSlugs: ["sunday-school", "dean-and-deb"],
    faq: [],
    status: "published",
    visibility: "public",
  },
  {
    slug: "product",
    name: "Product",
    serviceType: "Product",
    sortOrder: 5,
    shortDescription:
      "Product and still-life photography for catalogs and campaigns.",
    description: [
      "Product work is about control: light, surface, and consistency across every frame.",
      "We photograph in the studio, in real environments, or both, depending on how the product wants to be seen.",
    ],
    whoItIsFor: [
      "Product teams preparing a catalog",
      "Small labels launching a first collection",
      "Brands needing consistent visuals across SKUs",
    ],
    deliverables: [
      "Reference and direction review",
      "Studio lighting setup",
      "Consistent edited set",
      "Delivery formats for print and web",
    ],
    startingPrice: null,
    relatedProjectSlugs: [],
    faq: [],
    status: "published",
    visibility: "public",
  },
  {
    slug: "event",
    name: "Event",
    serviceType: "Event",
    sortOrder: 6,
    shortDescription:
      "Still and motion coverage for celebrations, launches, and gatherings.",
    description: [
      "Events move fast. Our job is to read the room, stay ready, and catch the moments a schedule cannot plan.",
      "Coverage can be stills, motion, or both, across single or multi-day events.",
    ],
    whoItIsFor: [
      "Families celebrating a milestone",
      "Companies hosting a launch or gathering",
      "Organisers who need one team for stills and motion",
    ],
    deliverables: [
      "Event coverage plan",
      "Shoot team on site",
      "Same-day highlights when required",
      "Full edited delivery after the event",
    ],
    startingPrice: null,
    coverProjectSlug: "adifa-and-adila",
    relatedProjectSlugs: ["adifa-and-adila", "sunday-school"],
    faq: [],
    status: "published",
    visibility: "public",
  },
  {
    slug: "creative-production",
    name: "Creative Production",
    serviceType: "Creative Production",
    sortOrder: 7,
    shortDescription:
      "Concept, crew, and production support for complex creative projects.",
    description: [
      "Some projects need a producer before they need a photographer. We handle concept development, scheduling, locations, and crew.",
      "Creative Production can run as a standalone service or wrap around a photography or film commission.",
    ],
    whoItIsFor: [
      "Projects with many moving parts",
      "Teams without an in-house producer",
      "Commissions that combine stills and motion",
    ],
    deliverables: [
      "Concept and treatment development",
      "Production scheduling and logistics",
      "Crew and vendor coordination",
      "On-set production management",
    ],
    startingPrice: null,
    relatedProjectSlugs: ["nisa-and-taffy", "tere-and-chris"],
    faq: [],
    status: "published",
    visibility: "public",
  },
];

/** Resolve a service by display name, used for project to service relations. */
export function getServiceByName(name: string): Service | undefined {
  return SERVICES.find((service) => service.name === name);
}

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
