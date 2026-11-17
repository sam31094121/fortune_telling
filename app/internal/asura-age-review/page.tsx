import { notFound } from 'next/navigation';
import { AsuraAgeTimeline } from '@/features/ghost-asura/components/AsuraAgeTimeline';
import type { AsuraAgeTimeline as Timeline } from '@/lib/ghost-asura-display-contract';

export const dynamic = 'force-dynamic';

export default async function AgeReview({ searchParams }: { searchParams: Promise<{ count?: string; current?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const query = await searchParams;
  const count = query.count === '12' ? 12 : query.count === '1' ? 1 : 6;
  const current = query.current === '0' ? 0 : Math.min(4, count - 1);
  const data: Timeline = {
    title: '年齡導覽・合成資料預覽',
    viewerLine: '視覺測試資料，非客戶命盤。',
    guide: { hereLabel: '你現在在這段，往下看', toPast: '點這裡看上一段', toFuture: '點這裡看下一段', endLine: '預覽結束' },
    premiumTitles: [],
    segments: Array.from({ length: count }, (_, i) => ({
      ageLabel: `約虛歲 ${4 + i * 10}–${13 + i * 10}`,
      tense: i === current ? '現在' : i < current ? '過去' : '未來',
      isCurrent: i === current,
      opening: { headline: `第 ${i + 1} 段・定位測試`, text: '' },
      lines: [`合成資料第 ${i + 1} 段：僅驗證導覽對應，沒有命理解讀。`],
      depth: [], bridge: null,
    })),
  };
  return <main style={{ maxWidth: 860, margin: '0 auto', padding: '12px', color: '#edf3e6', background: '#0c140d', minHeight: '100vh' }}>
    <p>本機視覺預覽 · 合成資料 · 不呼叫命盤 API、不儲存資料</p>
    <AsuraAgeTimeline data={data} />
  </main>;
}
