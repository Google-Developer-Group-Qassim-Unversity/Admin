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
      {
        protocol: 'https',
        hostname: '*.albrrak773.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-f5984f635d2f4f58ac4cef365a6e4ada.r2.dev'
      }
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
