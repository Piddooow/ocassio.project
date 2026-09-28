import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/site/ThemeProvider";
import { NavigationLoader } from "@/components/site/NavigationLoader";
import { getPublicSiteSettings } from "@/lib/db/queries/settings";
import { GLOBAL_SETTINGS } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

/** Default SEO reads Global Settings (§10.3) with the static fallback. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  const seo = settings?.globalMeta?.seo;
  const socialImage = settings?.globalMeta?.defaultSocialImage;
  return {
    title: {
      default: seo?.title ?? GLOBAL_SETTINGS.defaultSeo.title,
      template: `%s · ${GLOBAL_SETTINGS.studioName}`,
    },
    description: seo?.description ?? GLOBAL_SETTINGS.defaultSeo.description,
    // Brand mark as the site icon: SVG first (crisp at any size), PNG
    // fallback for browsers without SVG favicon support.
    icons: {
      icon: [
        { url: "/icon.svg?v=2", type: "image/svg+xml" },
        { url: "/icon.png?v=2", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/apple-icon.png?v=2", sizes: "180x180", type: "image/png" }],
    },
    ...(socialImage ? { openGraph: { images: [socialImage] } } : {}),
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${garamond.variable}`}
    >
      <body>
        <ThemeProvider>
          {children}
          <NavigationLoader />
        </ThemeProvider>
      </body>
    </html>
  );
}
