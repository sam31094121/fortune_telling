import type { Metadata, Viewport } from 'next';
import { Noto_Sans_TC, Noto_Serif_TC, Outfit } from 'next/font/google';
import AppStabilityGuard from '@/components/AppStabilityGuard';
import './globals.css';

const sans = Noto_Sans_TC({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

const serif = Noto_Serif_TC({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:8888';

const shareImage = '/images/line-share-taichi.jpg?v=20260715-3';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050612',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '☯ 太極命理 AI｜天地人智慧分析系統',
  description: 'AI 紫微斗數、八字、數字論吉凶、天地人智慧分析，一站式命理智慧平台。',
  openGraph: {
    title: '☯ 太極命理 AI｜智慧命理分析平台',
    description: '輸入出生資料，立即體驗 AI 紫微斗數、八字、數字論吉凶與天地人智慧分析。',
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
    description: 'AI 紫微斗數｜八字｜數字論吉凶｜天地人智慧分析',
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
      <body className={`${sans.variable} ${serif.variable} ${outfit.variable} font-sans antialiased`}>
        <AppStabilityGuard />
        {children}
      </body>
    </html>
  );
}
