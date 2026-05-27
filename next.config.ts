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
