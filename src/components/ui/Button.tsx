import Link from "next/link";

type Variant = "primary" | "secondary" | "tertiary";
type Size = "default" | "compact";

interface ButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
  href?: string;
  newTab?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}

const BASE =
  "group inline-flex min-h-11 items-center justify-center gap-2 rounded-pill text-button font-medium transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary: "px-5 bg-cta text-cta-foreground hover:bg-cta-hover",
  secondary:
    "px-5 border border-line-strong text-primary hover:bg-surface-hover",
  tertiary: "text-primary hover:opacity-70",
};

const SIZES: Record<Size, string> = {
  default: "",
  compact: "min-h-0 px-4 py-2 text-caption",
};

/** Action button, matching ButtonLink geometry (40-44px, pill, Inter 15/500). */
export function Button({
  children,
  variant = "primary",
  size = "default",
  arrow = false,
  className,
  href,
  newTab = false,
  onClick,
  type = "button",
  disabled = false,
}: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]}${SIZES[size] ? ` ${SIZES[size]}` : ""}${className ? ` ${className}` : ""}`;

  const content = (
    <>
      {children}
      {arrow ? (
        <span
          aria-hidden
          className="inline-block transition-transform duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noreferrer" : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </button>
  );
}
