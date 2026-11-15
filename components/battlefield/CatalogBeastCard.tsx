'use client';
import { memo, useEffect, useState } from 'react';
import { BeastCardFace } from './BeastCardTile';
import { GuideBookProvider, useGuideBook } from './GuideBookContext';
import type { GuideBook } from '@/lib/beast-game/guide-book';
let request: Promise<GuideBook | null> | null = null;
/** Catalog portraits use the same backend identity and full face as the battlefield. */
function CatalogBeastCard({ id, name, young = false, className, attackOverride }: { id?: string; name?: string; young?: boolean; className?: string; attackOverride?: string }) {
 const parent = useGuideBook();
 const [loaded, setLoaded] = useState<GuideBook | null>(null);
 const [settled, setSettled] = useState(false); // 圖鑑資料回來了（不論成功失敗）；沒回來之前顯示「載入中」，不要先寫「暫時無法取得」
 useEffect(() => {
  if (parent) return;
  let active = true;
  request ??= fetch('/api/beast-game/guide-book', {signal: AbortSignal.timeout(20000)}).then(r => r.ok ? r.json() : null).then(d => d?.ok ? d.book : null).catch(() => null);
  void request.then(book => { if (active) { setLoaded(book); setSettled(true); } if (!book) request = null; });
  return () => { active = false; };
 }, [parent]);
 const book = parent ?? loaded;
 const card = id ? book?.cards[id] : Object.values(book?.cards ?? {}).find(c => c.name === (young ? name + '・幼子' : name));
 return <span className={className} style={{display:'block', aspectRatio:'63 / 88'}} aria-label={card?.name}>
  {card ? <GuideBookProvider value={book}><BeastCardFace card={attackOverride ? { ...card, attackOverride } : card} /></GuideBookProvider> : <span role="status">{parent || settled ? '暫時無法取得' : '卡面載入中…'}</span>}
 </span>;
}
// 2026-11-09 perf：props 只有字串，開／關詳細卡時父頁重繪不必重畫 28 張完整卡面。
export default memo(CatalogBeastCard);
