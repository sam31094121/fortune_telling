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
  title: '天地人 AI 人格解碼系統™',
  description: '全球命理大數據 × AI人格分析 × 姓名能量模型，建立你的專屬人格模型。',
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
