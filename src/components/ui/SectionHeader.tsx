import { ButtonLink } from "./ButtonLink";

interface SectionHeaderProps {
  label: string;
  title: React.ReactNode;
  action?: { label: string; href: string };
}

/** Shared editorial section heading: label, display title, tertiary action. */
export function SectionHeader({ label, title, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
      <div>
        <p className="text-label uppercase tracking-label-wide text-muted">
          {label}
        </p>
        <h2 className="mt-4 font-display text-display-lg">{title}</h2>
      </div>
      {action ? (
        <ButtonLink href={action.href} variant="tertiary" arrow>
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}
