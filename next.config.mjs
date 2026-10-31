/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production builds isolated from the live development server. Sharing
  // `.next` lets a build replace dev manifests while the page is open, which
  // causes apparent freezes and "clientReferenceManifest" runtime failures.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  // 10/31 dev-only: Next.js dev indicator (the floating N) overlapped the fixed bottom action bar; production builds never show it.
  devIndicators: false,
  compress: true,
  productionBrowserSourceMaps: false,
  outputFileTracingRoot: process.cwd(),
  // tyme4ts 只在伺服器端農曆換算使用，交給 Node 載入、不重新打包。
  // （@ziweijs/core 已從 npm 下架，真太陽時改用專案內 lib/true-solar-time.ts，2026-09-16。）
  serverExternalPackages: ['tyme4ts'],

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

    // 2026-10-17 穩定性：首頁改 no-cache（每次仍向伺服器確認是否有新版，不會留舊畫面），
    // 但不再用 no-store，讓「返回上一頁」可以用瀏覽器的前進後退快取（bfcache）瞬間還原、狀態不丟。
    const homePageHeaders = [
      ...securityHeaders,
      { key: 'Cache-Control', value: 'no-cache, max-age=0, must-revalidate' },
    ];

    return [
      {
        source: '/',
        headers: homePageHeaders,
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
        source: '/bazi',
        headers: noStorePageHeaders,
      },
      {
        source: '/zodiac',
        headers: noStorePageHeaders,
      },
      {
        source: '/tarot',
        headers: noStorePageHeaders,
      },
      {
        source: '/growth-center',
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
