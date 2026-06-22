/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  optimizeFonts: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: [
      '@google/genai',
    ],
  },
};

export default nextConfig;
