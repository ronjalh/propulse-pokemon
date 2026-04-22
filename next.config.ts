import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "propulse.ams3.digitaloceanspaces.com",
      },
    ],
  },
};

export default nextConfig;
