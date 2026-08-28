import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://heaven-earth-humanity-pair.vercel.app';

const routes = [
  { path: '', priority: 1, changeFrequency: 'daily' as const },
  { path: '/bazi', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/insight', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/match', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/music', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/nameology', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/numerology', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/star-beasts', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/tarot', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/zodiac', priority: 0.7, changeFrequency: 'weekly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
