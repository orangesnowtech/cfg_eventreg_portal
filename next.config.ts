import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Event banners are served from the project's public Cloud Storage bucket.
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
};

export default nextConfig;
