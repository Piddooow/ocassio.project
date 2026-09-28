import { cn } from "@/lib/utils";

interface AdminListSkeletonProps {
  /** Number of placeholder rows. */
  rows?: number;
  className?: string;
}

/**
 * Loading placeholder for admin collections (studio request): quiet
 * skeleton rows in the same rhythm as the real list items, so the panel
 * does not jump when data arrives.
 */
export function AdminListSkeleton({
  rows = 4,
  className,
}: AdminListSkeletonProps) {
  return (
    <ul
      aria-hidden
      data-admin-skeleton
      className={cn("mt-4 flex flex-col", className)}
    >
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="flex flex-col gap-2 border-b border-line py-5 first:border-t"
        >
          <span className="skeleton-bone block h-3.5 w-40 max-w-full" />
          <span className="skeleton-bone block h-3 w-64 max-w-full" />
        </li>
      ))}
    </ul>
  );
}
