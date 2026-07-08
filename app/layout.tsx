import type { Metadata } from 'next';
import { Noto_Sans_TC, Noto_Serif_TC, Outfit } from 'next/font/google';
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
    : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '☯️ 天宿星軌 · 3D 命理雙星引力核心',
  description: '自動換算農國曆雙向對照，精密算出生日主星，為你與伴侶解鎖【殺破狼】等尊榮天格與前世今生因果配對！',
  openGraph: {
    title: '☯️ 天宿星軌 · 3D 命理雙星引力核心',
    description: '自動換算農國曆雙向對照，精密算出生日主星，為你與伴侶解鎖【殺破狼】等尊榮天格與前世今生因果配對！',
    url: siteUrl,
    siteName: '天宿星軌命理系統',
    images: [
      {
        url: '/images/og-taichi-preview.png',
        width: 1200,
        height: 630,
        alt: '天宿 3D 命理太極雙星圖騰',
      },
    ],
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '☯️ 天宿星軌 · 3D 命理雙星引力核心',
    description: '自動換算農國曆雙向對照，精密算出生日主星，為你與伴侶解鎖【殺破狼】等尊榮天格與前世今生因果配對！',
    images: ['/images/og-taichi-preview.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className={`${sans.variable} ${serif.variable} ${outfit.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
