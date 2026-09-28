interface BrandLogoProps {
  variant?: "mark" | "lockup";
  className?: string;
  imgClassName?: string;
}

const SOURCES = {
  mark: {
    light: "/brand/logo-black.svg",
    dark: "/brand/logo-white.svg",
  },
  lockup: {
    light: "/brand/logo-letter-black.svg",
    dark: "/brand/logo-letter-white.svg",
  },
} as const;

/**
 * Theme-aware brand art: the black variant on light surfaces, the white
 * variant on dark surfaces, switching purely via [data-theme] CSS so it
 * is correct on first paint (no JS, no flash). "lockup" carries the
 * lettering next to the mark.
 */
export function BrandLogo({
  variant = "mark",
  className,
  imgClassName,
}: BrandLogoProps) {
  const sources = SOURCES[variant];
  return (
    <span className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources.light}
        alt="Ocassio.Project"
        className={`brand-on-light${imgClassName ? ` ${imgClassName}` : ""}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources.dark}
        alt=""
        aria-hidden
        className={`brand-on-dark${imgClassName ? ` ${imgClassName}` : ""}`}
      />
    </span>
  );
}
