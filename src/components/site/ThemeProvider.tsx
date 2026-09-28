"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Global theme provider: dark is the default for every public page,
 * light is one toggle away, and the choice persists per visitor.
 * The theme lands as [data-theme] on <html> before first paint.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="ocassio-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
