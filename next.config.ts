import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: 'standalone',
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
      },
      {
        protocol: 'https',
        hostname: 'pub-02b17ea2dc194ea9ac917c5e8f1caa7e.r2.dev',
        pathname: '/**',
      }
    ],
    dangerouslyAllowLocalIP: true,
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
