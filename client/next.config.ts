import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow importing demo data that lives in the shared seed-data folder.
    externalDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
};

export default nextConfig;
