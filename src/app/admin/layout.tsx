import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s, Admin, Ocassio.Project",
  },
  robots: { index: false, follow: false },
};

/**
 * Admin CMS surface (§31.29-§31.30), light-first, compact, predictable.
 * Session enforcement lives in the (dashboard) layout so the sign-in
 * screen can share this theme wrapper without the shell.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="light" className="min-h-dvh bg-background text-primary">
      {children}
    </div>
  );
}
