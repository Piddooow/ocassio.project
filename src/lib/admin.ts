/**
 * Admin CMS navigation tree (§8). Items without an href are documented
 * modules whose screens arrive with their own tasks, rendered muted
 * instead of linking to a dead route.
 */
export interface AdminNavItem {
  label: string;
  href?: string;
  children?: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin" },
  {
    label: "Website",
    children: [
      { label: "Homepage", href: "/admin/website/homepage" },
      { label: "Navigation", href: "/admin/website/navigation" },
      { label: "Global Settings", href: "/admin/website/settings" },
      { label: "Legal", href: "/admin/website/legal" },
    ],
  },
  {
    label: "Portfolio",
    children: [
      { label: "Projects", href: "/admin/portfolio/projects" },
      { label: "Categories" },
    ],
  },
  {
    label: "Services",
    children: [
      { label: "Services", href: "/admin/services" },
      { label: "Pricing", href: "/admin/services/pricing" },
      { label: "Process", href: "/admin/services/process" },
      { label: "FAQ", href: "/admin/services/faq" },
    ],
  },
  {
    label: "Journal",
    children: [
      { label: "Articles", href: "/admin/journal/articles" },
      { label: "Categories" },
    ],
  },
  {
    label: "Studio",
    children: [
      { label: "About", href: "/admin/studio/about" },
      { label: "Team", href: "/admin/studio/team" },
      { label: "Clients", href: "/admin/studio/clients" },
      { label: "Recognition", href: "/admin/studio/recognition" },
    ],
  },
  { label: "Current", children: [{ label: "Upcoming Projects" }] },
  { label: "Media", children: [{ label: "Library", href: "/admin/media" }] },
  {
    label: "Business",
    children: [
      { label: "Project Inquiries", href: "/admin/business/inquiries" },
    ],
  },
  {
    label: "Publishing",
    children: [
      { label: "Drafts", href: "/admin/publishing?queue=drafts" },
      { label: "Scheduled", href: "/admin/publishing?queue=scheduled" },
      { label: "Published", href: "/admin/publishing?queue=published" },
      { label: "Versions", href: "/admin/publishing/versions" },
    ],
  },
  { label: "SEO", href: "/admin/seo" },
  { label: "Users & Roles", href: "/admin/users" },
  { label: "Activity Log", href: "/admin/activity" },
  { label: "Settings" },
];
