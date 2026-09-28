import { SiteShell } from "@/components/site/SiteShell";

/**
 * Information pages follow the global theme (dark by default),
 * visitor-toggleable from the top navigation.
 */
export default function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}
