import { SiteShell } from "@/components/site/SiteShell";

/**
 * Portfolio pages follow the global theme (dark by default),
 * visitor-toggleable from the top navigation.
 */
export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}
