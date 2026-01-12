import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
