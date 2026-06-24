import type { Metadata } from 'next';
import { Noto_Sans_TC, Noto_Serif_TC } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'AI 總機人格分析系統',
  description: '輸入基本資料後，由系統整合八字、紫微斗數與 AI 總機分析，只呈現清楚好懂的重點結果。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className={`${sans.variable} ${serif.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
