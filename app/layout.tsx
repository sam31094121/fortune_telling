import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import AppStabilityGuard from '@/components/AppStabilityGuard';
import ScreenArrowReview from '@/components/ScreenArrowReview';
import { TAROT_CARD_BACK_CSS_IMAGE } from '@/features/tarot/constants/cardBack';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:8888';

const shareImage = '/images/og-taichi-preview.jpg?v=20260817-1';
const rootStyle = { '--tarot-card-back-image': TAROT_CARD_BACK_CSS_IMAGE } as CSSProperties;
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_ID;

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '太極命理 易經',
  alternateName: '天地人智慧分析系統',
  url: siteUrl,
  description: '易經紫微斗數、八字、易經論數字、天地人智慧分析，一站式命理智慧平台。',
  inLanguage: 'zh-TW',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050612',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '☯ 太極命理 易經｜天地人智慧分析系統',
  description: '易經紫微斗數、八字、易經論數字、天地人智慧分析，一站式命理智慧平台。',
  keywords: ['太極命理', '紫微斗數', '八字', '易經論數字', '古老塔羅牌', '命理分析', '天地人智慧'],
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  openGraph: {
    title: '☯ 太極命理 易經｜智慧命理分析平台',
    description: '輸入出生資料，立即體驗 易經紫微斗數、八字、易經論數字與天地人智慧分析。',
    url: siteUrl,
    siteName: '太極命理 易經',
    images: [
      {
        url: shareImage,
        secureUrl: shareImage,
        width: 1024,
        height: 1024,
        type: 'image/jpeg',
        alt: '太極命理 易經智慧分析系統',
      },
    ],
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '☯ 太極命理 易經',
    description: '易經紫微斗數｜八字｜易經論數字｜天地人智慧分析',
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
      <head>
        {/* 古老符咒毛筆字體：只用來畫魔珠封印上的「封」字，營造邪氣靈異的神秘感。 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="font-sans antialiased" style={rootStyle}>
        {gaMeasurementId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>
          </>
        ) : null}
        <AppStabilityGuard />
        <ScreenArrowReview />
        {children}
      </body>
    </html>
  );
}
