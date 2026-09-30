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
    formats: ["image/webp"],
    deviceSizes: [360, 390, 640, 750, 828, 1080, 1200, 1440],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
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
