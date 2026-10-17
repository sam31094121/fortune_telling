import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import AppStabilityGuard from '@/components/AppStabilityGuard';
import { InterfaceLanguageProvider } from '@/components/InterfaceLanguage';
import I18nDisplayLayer from '@/components/I18nDisplayLayer';
import ScreenArrowReview from '@/components/ScreenArrowReview';
import InstallShield080 from '@/components/InstallShield080';
import ViewportZoomReset from '@/components/ViewportZoomReset';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { TEXT_SIZE_INIT_SCRIPT } from '@/lib/text-size';
import { TAROT_CARD_BACK_CSS_IMAGE } from '@/features/tarot/constants/cardBack';
import {
  SHARE_DESCRIPTION,
  SHARE_OG_IMAGES,
  SHARE_TITLE,
  SHARE_TWITTER_IMAGES,
} from '@/lib/share-preview';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:8888';

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
  themeColor: '#08070d',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  appleWebApp: { capable: true, title: '太極命理', statusBarStyle: 'black-translucent' },
  icons: { apple: '/pwa/apple-icon-180.png' },
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
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    url: siteUrl,
    siteName: '太極命理 易經',
    images: SHARE_OG_IMAGES,
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: SHARE_TWITTER_IMAGES,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning：載入前腳本會在 <html> 加 data-text-size（客戶自選字體大小），React 不必為這個屬性報不一致。
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        {/* 客戶自選的手機字體大小：頁面畫出來之前就套用，不會先閃一下標準大小。設定見 lib/text-size.ts */}
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_INIT_SCRIPT }} />
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
        <ServiceWorkerRegister />
        <InstallShield080 />
        <ViewportZoomReset />
        <InterfaceLanguageProvider><I18nDisplayLayer />{children}</InterfaceLanguageProvider>
      </body>
    </html>
  );
}
