import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    // Temporary mitigation: do not expose the vulnerable AVIF decoder endpoint.
    // Remove only after both Next and sharp advisory patches are installable.
    unoptimized: true,
    localPatterns: [
      {
        pathname: "/hero/**",
      },
      {
        pathname: "/products/**",
      },
      {
        pathname: "/logo/**",
      },
      {
        pathname: "/logos/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oredqraaneamlduupxmt.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
