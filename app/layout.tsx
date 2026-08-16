import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import AppStabilityGuard from '@/components/AppStabilityGuard';
import { TAROT_CARD_BACK_CSS_IMAGE } from '@/features/tarot/constants/cardBack';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:8888';

const shareImage = '/images/line-share-taichi.jpg?v=20260715-3';
const rootStyle = { '--tarot-card-back-image': TAROT_CARD_BACK_CSS_IMAGE } as CSSProperties;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050612',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '☯ 太極命理 AI｜天地人智慧分析系統',
  description: 'AI 紫微斗數、八字、數字論好壞、天地人智慧分析，一站式命理智慧平台。',
  openGraph: {
    title: '☯ 太極命理 AI｜智慧命理分析平台',
    description: '輸入出生資料，立即體驗 AI 紫微斗數、八字、數字論好壞與天地人智慧分析。',
    url: siteUrl,
    siteName: '太極命理 AI',
    images: [
      {
        url: shareImage,
        secureUrl: shareImage,
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: '太極命理 AI 智慧分析系統',
      },
    ],
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '☯ 太極命理 AI',
    description: 'AI 紫微斗數｜八字｜數字論好壞｜天地人智慧分析',
    images: [shareImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="font-sans antialiased" style={rootStyle}>
        <AppStabilityGuard />
        {children}
      </body>
    </html>
  );
}
