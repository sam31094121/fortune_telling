import { notFound } from 'next/navigation';
import { ritualReviewPageData } from '@/lib/server/beast-review';
import Preview from '../preview/Preview';

export const dynamic = 'force-dynamic';

/** Developer-only display; the server module owns the real series and data preparation. */
export default async function RitualReview({ searchParams }: { searchParams: Promise<{ beast?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { beast } = await searchParams;
  const data = ritualReviewPageData(beast);
  return <>
    <p>開發驗收・真實三局運算・不押卡、不改收藏</p>
    <nav>{['baihu', 'qinglong', 'zhuque', 'xuanwu'].map((id, index) => <a key={id} href={'?beast=' + id} style={{ marginRight: 16 }}>{['白虎', '青龍', '朱雀', '玄武'][index]}</a>)}</nav>
    <Preview {...data} />
  </>;
}
