import Link from "next/link";

type Variant = "primary" | "secondary" | "tertiary";

interface ButtonLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  /** Tertiary actions may show a trailing arrow (§31.12). */
  arrow?: boolean;
  className?: string;
}

const BASE =
  "group inline-flex min-h-11 items-center justify-center gap-2 rounded-pill text-button font-medium transition-colors duration-300";

const VARIANTS: Record<Variant, string> = {
  primary: "h-11 px-5 bg-cta text-cta-foreground hover:bg-cta-hover",
  secondary:
    "h-11 px-5 border border-line-strong text-primary hover:bg-surface-hover",
  tertiary: "text-primary hover:opacity-70",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  arrow = false,
  className,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`${BASE} ${VARIANTS[variant]}${className ? ` ${className}` : ""}`}
    >
      {children}
      {arrow ? (
        <span
          aria-hidden
          className="inline-block transition-transform duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      ) : null}
    </Link>
  );
}
