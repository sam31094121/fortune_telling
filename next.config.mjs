/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  outputFileTracingRoot: process.cwd(),
  // ZiWei's published runtime bundles its own module loader. It is only used by
  // the server-side insight API, so let Node load it instead of re-bundling it.
  serverExternalPackages: ['@ziweijs/core', 'tyme4ts'],

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
  async rewrites() {
    return [
      // Keep the number fortune experience as the home modal while giving it a shareable URL.
      { source: '/numerology', destination: '/' },
    ];
  },

  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
    ];

    const noStorePageHeaders = [
      ...securityHeaders,
      { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
    ];

    return [
      {
        source: '/',
        headers: noStorePageHeaders,
      },
      {
        source: '/insight',
        headers: noStorePageHeaders,
      },
      {
        source: '/match',
        headers: noStorePageHeaders,
      },
      {
        source: '/music',
        headers: noStorePageHeaders,
      },
      {
        source: '/nameology',
        headers: noStorePageHeaders,
      },
      {
        source: '/numerology',
        headers: noStorePageHeaders,
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        source: '/internal/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
