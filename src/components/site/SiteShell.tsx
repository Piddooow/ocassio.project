import { Footer } from "./Footer";
import { TopNav } from "./TopNav";
import { PageTrail } from "./PageTrail";
import { FloatingPathsBackground } from "@/components/ui/floating-paths";
import { getPublicSiteSettings } from "@/lib/db/queries/settings";
import { listPublicNavigation } from "@/lib/db/queries/navigation-admin";
import { buildContactChannels, NAV_ITEMS, SITE } from "@/lib/site";

interface SiteShellProps {
  children: React.ReactNode;
}

/**
 * Wraps every public page with the global theme, the floating paths
 * backdrop, the top navigation (§31.13) and the footer. The theme lives
 * on <html> (dark by default, visitor-toggleable); viewer and admin
 * surfaces keep their own nested [data-theme]. Real contact channels from
 * Global Settings feed the menu info block.
 */
export async function SiteShell({ children }: SiteShellProps) {
  const settings = await getPublicSiteSettings();
  const channels = buildContactChannels(settings).filter(
    (channel) => channel.available,
  );
  const menuContacts = channels.filter(
    (channel) =>
      channel.label === "General email" || channel.label === "WhatsApp",
  );
  const menuSocials = channels.filter((channel) =>
    ["Instagram", "Vimeo", "YouTube"].includes(channel.label),
  );
  const menuTagline = settings?.globalMeta?.tagline ?? SITE.tagline;
  const navigation = await listPublicNavigation();
  const menuItems = navigation.length > 0 ? navigation : NAV_ITEMS;

  return (
    <div className="min-h-dvh text-primary">
      <FloatingPathsBackground />
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-pill focus:bg-cta focus:px-4 focus:py-2 focus:text-cta-foreground"
      >
        Skip to content
      </a>
      <TopNav
        menuContacts={menuContacts}
        menuSocials={menuSocials}
        menuTagline={menuTagline}
        menuItems={menuItems}
      />
      <PageTrail />
      <main id="content">{children}</main>
      <Footer />
    </div>
  );
}
