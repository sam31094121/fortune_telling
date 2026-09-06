import { notFound } from 'next/navigation';
import Production from './Production';
export const dynamic = 'force-dynamic';
export const metadata = { title: '六十神獸・影片製作進度', robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <Production />;
}
