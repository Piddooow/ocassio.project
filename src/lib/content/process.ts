/**
 * Process steps (§6.7), each step carries only number, title, explanation.
 * Owned later by Admin → Services → Process.
 */
export interface ProcessStep {
  number: string;
  title: string;
  explanation: string;
  status: "visible" | "hidden";
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    number: "01",
    title: "Inquiry",
    explanation:
      "You send a brief through Start a Project, scope, timing, and references.",
    status: "visible",
  },
  {
    number: "02",
    title: "Discovery",
    explanation:
      "We talk through the story, the audience, and what success looks like.",
    status: "visible",
  },
  {
    number: "03",
    title: "Creative Direction",
    explanation:
      "A clear visual direction: references, treatment, mood, and approach.",
    status: "visible",
  },
  {
    number: "04",
    title: "Proposal",
    explanation:
      "Scope, timeline, crew, and budget, one document, no surprises.",
    status: "visible",
  },
  {
    number: "05",
    title: "Pre-production",
    explanation:
      "Locations, casting, schedules, and logistics locked before the shoot.",
    status: "visible",
  },
  {
    number: "06",
    title: "Production",
    explanation:
      "The shoot itself, small crew, considered pace, precise execution.",
    status: "visible",
  },
  {
    number: "07",
    title: "Post-production",
    explanation:
      "Selection, retouching, color, and edit, finished to a consistent standard.",
    status: "visible",
  },
  {
    number: "08",
    title: "Review",
    explanation:
      "You review the work and we refine together until it is right.",
    status: "visible",
  },
  {
    number: "09",
    title: "Delivery",
    explanation:
      "Final files, formats, and usage, delivered organized and ready.",
    status: "visible",
  },
];
