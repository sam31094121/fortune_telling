import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '血型生日配對分析',
  description: '輸入兩人的血型與生日，由 AI 命理老師分析配對程度',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
