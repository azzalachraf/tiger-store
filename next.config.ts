import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/products/:path*.png", destination: "/products/:path*.webp", permanent: true },
      { source: "/hero/:path*.png", destination: "/hero/:path*.webp", permanent: true },
      { source: "/logo/:path*.png", destination: "/logo/:path*.webp", permanent: true },
      { source: "/logos/:path*.png", destination: "/logos/:path*.webp", permanent: true },
    ];
  },
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
