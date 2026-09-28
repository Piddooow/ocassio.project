import Link from "next/link";
import {
  FOOTER_LEGAL,
  FOOTER_MORE,
  GLOBAL_SETTINGS,
  NAV_ITEMS,
  PRIMARY_CTA,
  SITE,
  socialLabel,
} from "@/lib/site";
import { getPublicSiteSettings } from "@/lib/db/queries/settings";
import { getFooterAvatars, thumbnailVariant } from "@/lib/content/media";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { AvatarStack, type AvatarPerson } from "@/components/ui/avatar-stack";
import { BrandLogo } from "@/components/site/BrandLogo";
import { CopyEmail } from "@/components/ui/copy-email";
import { ThemeToggle } from "@/components/site/ThemeToggle";

export async function Footer() {
  const year = new Date().getFullYear();
  const settings = await getPublicSiteSettings();
  const tagline = settings?.globalMeta?.tagline ?? SITE.tagline;
  const copyright =
    settings?.globalMeta?.copyright ?? GLOBAL_SETTINGS.copyright;
  const contactEmail = settings?.contactEmail ?? null;
  const socials = (settings?.socialLinks ?? []).filter(
    (link) => link.platform && link.url,
  );
  // The strip stays anonymous on purpose (studio request): portraits only.
  const avatars: AvatarPerson[] = getFooterAvatars().map((photo) => ({
    id: photo.id,
    name: "Anonim",
    src: thumbnailVariant(photo),
  }));

  return (
    <footer className="border-t border-line">
      <div className="container-editorial grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-16 lg:py-20">
        <div>
          <BrandLogo
            variant="lockup"
            className="block"
            imgClassName="h-14 w-auto"
          />
          <p className="mt-5 max-w-xs text-body-sm text-secondary">
            {tagline}
          </p>
          <div className="mt-8">
            <ButtonLink href={PRIMARY_CTA.href} variant="primary" arrow>
              {PRIMARY_CTA.label}
            </ButtonLink>
          </div>

          {contactEmail ? (
            <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-caption text-muted">Say hello at</span>
              <CopyEmail email={contactEmail} />
            </div>
          ) : null}

          {avatars.length > 0 ? (
            <div className="mt-8" data-footer-avatars>
              <AvatarStack people={avatars} label="Faces from the archive" />
            </div>
          ) : null}
        </div>

        <nav aria-label="Footer, explore">
          <p className="text-label uppercase tracking-label-wide text-muted">
            Explore
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-body-sm text-secondary transition-colors duration-300 hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {socials.length > 0 ? (
            <nav aria-label="Footer, social" className="mt-8">
              <p className="text-label uppercase tracking-label-wide text-muted">
                Elsewhere
              </p>
              <ul className="mt-5 flex flex-col gap-3">
                {socials.map((link) => (
                  <li key={link.platform}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-body-sm text-secondary transition-colors duration-300 hover:text-primary"
                    >
                      {socialLabel(link.platform)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </nav>

        <nav aria-label="Footer, more">
          <p className="text-label uppercase tracking-label-wide text-muted">
            More
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {FOOTER_MORE.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-body-sm text-secondary transition-colors duration-300 hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer, legal">
          <p className="text-label uppercase tracking-label-wide text-muted">
            Legal
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {FOOTER_LEGAL.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-body-sm text-secondary transition-colors duration-300 hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="container-editorial flex flex-wrap items-center justify-between gap-4 py-6">
          <p className="text-caption text-muted">
            © {year} {copyright}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <Link
              href="/contact"
              className="text-label uppercase tracking-label-wide text-muted transition-colors duration-300 hover:text-primary"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
