import type { NextConfig } from "next";

/*
 * Derive is a static site, built by GitHub Actions and served by GitHub Pages
 * at https://arnav-raja.github.io/Derive. Each page is a shell; its content
 * comes from Derive's server (src/server), which runs as a Supabase Edge
 * Function. GitHub Pages sends no custom headers, so the security policy is a
 * meta tag in the root layout.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  reactStrictMode: true,
  poweredByHeader: false,
  // The development badge sits over the phone tab bar.
  devIndicators: false,
  images: { unoptimized: true },
};

export default nextConfig;
