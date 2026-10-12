import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '太極命理',
    short_name: '太極命理',
    description: '紫微斗數、八字、易經與天地人智慧命理平台',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050612',
    theme_color: '#050612',
    lang: 'zh-Hant',
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
