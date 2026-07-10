/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  outputFileTracingRoot: process.cwd(),

  // 性能优化
  poweredByHeader: false,
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    optimizePackageImports: [
      '@google/genai',
    ],
    // 启用 Concurrent 特性
    ppr: false,
  },

  // Keep Next.js defaults: HTML is revalidated while hashed static assets
  // remain immutable. A global one-hour cache made phones retain old UI.
};

export default nextConfig;
