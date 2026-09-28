/**
 * Role vocabulary (§27), safe to import from client components:
 * no database imports live here.
 */

export const USER_ROLES = ["owner", "editor", "media_manager", "sales"] as const;

export const USER_STATUSES = ["active", "disabled"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  editor: "Editor",
  media_manager: "Media Manager",
  sales: "Sales",
};

/** What each role may manage (§27), used by the Users screen copy. */
export const USER_ROLE_SCOPE: Record<UserRole, string> = {
  owner: "Full access, including users and roles.",
  editor: "Website, portfolio, services, journal, studio, current, publishing.",
  media_manager: "Media library only.",
  sales: "Project inquiries only.",
};
