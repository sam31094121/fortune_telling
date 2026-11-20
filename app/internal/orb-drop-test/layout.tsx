import { notFound } from 'next/navigation';

/** 落珠內部測試頁只在開發環境開放，正式站直接 404。 */
export default function OrbDropTestLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  return children;
}
