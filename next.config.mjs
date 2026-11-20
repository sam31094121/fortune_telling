import { readFileSync } from 'node:fs';
const retiredBeastArt = JSON.parse(readFileSync(new URL('./data/retired-beast-art.json', import.meta.url), 'utf8'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production builds isolated from the live development server. Sharing
  // `.next` lets a build replace dev manifests while the page is open, which
  // causes apparent freezes and "clientReferenceManifest" runtime failures.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  // The development badge covers mobile navigation (e.g. Asura's home link).
  // Disable only the dev indicator; keep product layout and error reporting intact.
  devIndicators: false,
  compress: true,
  // Old bookmarks and image fields resolve to the same current 60-card set.
  // 2026-11-20 /orb-battle 下架（可還原）：舊寶珠原型（public/orb-battle 靜態檔，含舊卡圖與「待平衡／一鍵自檢」開發字樣）
  // 沒有任何頁面連到它。正式環境一律暫時導向現行寶石捷連線（/beast-game/match3-hard，與舊 /beast-game/orb 同一去處）；
  // 開發環境（next dev）照舊可開。原始檔不刪；要恢復只要拿掉 retiredOrbPrototype 這段。
  async redirects() {
    const retiredOrbPrototype = process.env.NODE_ENV === 'production' ? [
      { source: '/orb-battle', destination: '/beast-game/match3-hard', permanent: false },
      { source: '/orb-battle/:path*', destination: '/beast-game/match3-hard', permanent: false },
    ] : [];
    return [...retiredBeastArt, ...retiredOrbPrototype];
  },
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

    // 2026-11-20 阿修羅卡片健檢：首頁卡圖（檔名已帶 -v1／-v2 版本號，改圖必換檔名）與阿修羅字型，
    // 原本 Cache-Control 是 max-age=0 → 每次回訪、每張圖都要向伺服器確認一輪（xuanwu 一張就 1.9MB）。
    // 改成一天內直接用快取、之後背景更新；不是 immutable，且只套在版本化檔名，不會讓手機留舊畫面。
    const versionedAssetHeaders = [
      ...securityHeaders,
      { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
    ];

    return [
      {
        source: '/home-entry/:file(.*-v[0-9]+\\.png)',
        headers: versionedAssetHeaders,
      },
      {
        source: '/fonts/asura-brand/:file(.*\\.woff2)',
        headers: versionedAssetHeaders,
      },
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
