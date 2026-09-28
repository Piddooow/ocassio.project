type Tone = "neutral" | "success" | "warning" | "error" | "info";

const TONES: Record<Tone, string> = {
  neutral: "border-line-strong text-secondary",
  success: "border-success/40 text-success",
  warning: "border-warning/40 text-warning",
  error: "border-error/40 text-error",
  info: "border-info/40 text-info",
};

interface StatusChipProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

/**
 * Status chip (§31.34): neutral by default for lifecycle states.
 * Semantic tones only when urgency truly exists.
 */
export function StatusChip({
  children,
  tone = "neutral",
  className,
}: StatusChipProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-pill border px-2.5 py-1 text-label uppercase ${TONES[tone]}${className ? ` ${className}` : ""}`}
    >
      {children}
    </span>
  );
}
