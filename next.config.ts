import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async headers() {
    /** Variant-addressed media never changes content, so it is immutable. */
    const immutable = [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ];
    return [
      { source: "/media/:path*", headers: immutable },
      { source: "/brand/:path*", headers: immutable },
    ];
  },
};

export default nextConfig;
