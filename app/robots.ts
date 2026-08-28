import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://heaven-earth-humanity-pair.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/platform-center', '/platform-control-center', '/growth-center'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
