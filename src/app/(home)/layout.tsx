import { SiteShell } from "@/components/site/SiteShell";

/**
 * Home follows the global theme now (dark by default, visitor-toggleable);
 * the sections no longer force their own art direction.
 */
export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}
