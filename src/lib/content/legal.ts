import type { ContentStatus } from "./types";

/** Structured legal body blocks, headings and paragraphs only (§6.14). */
export interface LegalBlock {
  type: "heading" | "paragraph";
  text: string;
}

export interface LegalPage {
  slug: "privacy" | "terms";
  title: string;
  /** ISO date shown as “Last updated”. */
  updatedDate: string;
  blocks: LegalBlock[];
  status: ContentStatus;
}

/**
 * Legal content stub, owned later by Admin → Website → Legal.
 * Copy is placeholder policy text until the studio supplies final wording.
 */
export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    updatedDate: "2026-01-15",
    status: "published",
    blocks: [
      {
        type: "paragraph",
        text: "Ocassio.Project respects your privacy. This policy explains what information we collect when you use this website or send a project brief, how we use it, and the choices you have.",
      },
      { type: "heading", text: "Information We Collect" },
      {
        type: "paragraph",
        text: "We collect the information you provide directly: your name, company, email address, and optional details such as WhatsApp number, production plans, references, and attachments submitted through the Start a Project form.",
      },
      {
        type: "paragraph",
        text: "We also collect basic technical information, such as browser type and pages visited, to understand how the site is used and to keep it secure.",
      },
      { type: "heading", text: "How We Use Information" },
      {
        type: "paragraph",
        text: "Your information is used to respond to project inquiries, prepare proposals, deliver commissioned work, and maintain our business records. We do not sell personal information.",
      },
      { type: "heading", text: "Sharing" },
      {
        type: "paragraph",
        text: "We share information only with collaborators who help us deliver a project, for example production partners or accountants, and only to the extent needed. We may disclose information when required by law.",
      },
      { type: "heading", text: "Retention" },
      {
        type: "paragraph",
        text: "Project briefs and related correspondence are kept for as long as needed to evaluate and deliver work, and afterwards for a reasonable period for legal and administrative purposes.",
      },
      { type: "heading", text: "Your Choices" },
      {
        type: "paragraph",
        text: "You may request access to, correction of, or deletion of the personal information you have shared with us by emailing our team through the Contact page. We will respond within a reasonable period.",
      },
      { type: "heading", text: "Cookies" },
      {
        type: "paragraph",
        text: "This site uses only the cookies needed for it to function. If analytics are introduced later, this policy will be updated before they are enabled.",
      },
      { type: "heading", text: "Contact" },
      {
        type: "paragraph",
        text: "Questions about this policy can be sent through the Contact page. We are happy to clarify anything that is unclear.",
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Use",
    updatedDate: "2026-01-15",
    status: "published",
    blocks: [
      {
        type: "paragraph",
        text: "These terms govern the use of the Ocassio.Project website. By using this site you agree to them.",
      },
      { type: "heading", text: "Content" },
      {
        type: "paragraph",
        text: "All photographs, films, and text on this site are the property of Ocassio.Project or its clients and may not be reproduced without written permission.",
      },
      { type: "heading", text: "Project Briefs" },
      {
        type: "paragraph",
        text: "Submitting a project brief does not create a contract. Engagements begin only when a written proposal is agreed by both parties.",
      },
      { type: "heading", text: "Liability" },
      {
        type: "paragraph",
        text: "This website is provided as-is. We aim for accuracy but do not guarantee that every detail is current or complete.",
      },
    ],
  },
];
