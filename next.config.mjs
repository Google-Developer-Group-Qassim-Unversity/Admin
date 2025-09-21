/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Improve Clerk SSR compatibility
    esmExternals: false,
  },
  webpack: (config, { dev, isServer }) => {
    // Optimize webpack cache for development
    if (dev && !isServer) {
      config.cache = {
        type: 'filesystem',
        maxMemoryGenerations: 1,
      };
      
      // Suppress the serialization warning
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    
    // Handle Clerk's ESM modules properly
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
}

export default nextConfig
