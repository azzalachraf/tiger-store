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
  },
};

export default nextConfig;
