'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import frameStyles from '@/components/BeastCardFrame.module.css';
import { COLLECTION_STORAGE_NOTICE, countByCard, readCollection, subscribeCollection, type BeastCollection } from '@/lib/beast-collection';

type PoolCard = { id: string; name: string; thumbnail: string; element: string };
const ELEMENT_LABEL: Record<string, string> = { SPACE: '空', AIR: '風', WATER: '水', FIRE: '火', EARTH: '地' };

export default function DuelCollectionShelf({ revision = 0 }: { revision?: number }) {
  const [collection, setCollection] = useState<BeastCollection>({ cards: [], history: [] });
  const [pool, setPool] = useState<Map<string, PoolCard>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (window.location.hash === '#beast-collection') document.getElementById('beast-collection')?.scrollIntoView({ block: 'start' });
  }, []);
  useEffect(() => {
    const refresh = () => setCollection(readCollection());
    refresh();
    return subscribeCollection(refresh);
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let cancelled = false;
    setLoaded(false);
    fetch('/api/beast-game', { signal: controller.signal })
      .then((res) => res.json()).then((data) => {
        if (!cancelled && data?.ok && Array.isArray(data.cards)) setPool(new Map((data.cards as PoolCard[]).map((card) => [card.id, card])));
      }).catch(() => { /* Inventory remains visible even when artwork cannot load. */ })
      .finally(() => { clearTimeout(timer); if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [retry]);

  const counts = countByCard(collection);
  const nameOf = (id: string | null) => id ? pool.get(id)?.name ?? id : '押注卡';
  return <section id="beast-collection" aria-label="我的神獸收藏" data-duel-collection className="mt-4 scroll-mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4">
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-lg font-black text-amber-100">我的神獸收藏</h2>
      <span className="text-sm font-bold text-white/70" data-collection-count>目前 {collection.cards.length} 張</span>
    </div>
    <p className="mt-1 text-xs leading-5 text-white/60">成長獎勵與對戰贏來的卡，都在這裡。</p>
    {collection.storageError ? <p role="alert" className="mt-3 text-sm text-amber-200">{collection.storageError}</p>
      : collection.cards.length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-white/20 px-3 py-4 text-center">
        <p className="text-sm font-bold">目前沒有可押注的卡</p>
        <p className="mt-1 text-xs leading-5 text-white/60">完成首頁探索，或累計四次每日任務，領取一組神獸。</p>
        <Link href="/#home-eight-card-route" className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-amber-200/40 px-4 text-sm text-amber-100">去首頁探索</Link>
      </div> : <>
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[...counts.entries()].map(([cardId, count]) => {
            const card = pool.get(cardId);
            const growth = collection.cards.filter((entry) => entry.cardId === cardId && entry.source === 'GROWTH').length;
            return <li key={cardId} className="min-w-0" data-collected-card={cardId}>
              <div className={`${frameStyles.card} relative overflow-hidden border border-amber-200/30`}>
                {card ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.thumbnail} alt={card.name} loading="lazy" decoding="async" className={frameStyles.art} />
                ) : <span className="grid h-full place-items-center text-xs text-white/50">{loaded ? '圖片待載' : '載入中'}</span>}
                <span className="absolute right-1 top-1 rounded-full bg-black/85 px-1.5 text-xs font-bold">×{count}</span>
              </div>
              <p className="mt-1 text-center text-xs font-bold leading-5 break-words">{card?.name ?? cardId}{card && <span className="ml-1 text-white/50">·{ELEMENT_LABEL[card.element]}</span>}</p>
              <p className="text-center text-[10px] leading-4 text-white/50">{growth > 0 ? `成長 ${growth}` : ''}{growth > 0 && count > growth ? ' · ' : ''}{count > growth ? `對戰 ${count - growth}` : ''}</p>
            </li>;
          })}
        </ul>
        <Link href="/beast-game" className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-amber-200 px-4 text-sm font-black text-slate-950">選一張收藏卡去對戰</Link>
      </>}
    {loaded && pool.size === 0 && <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 min-h-11 text-sm text-amber-200 underline">重新載入卡片圖片與名稱</button>}
    {collection.history.length > 0 && <details className="mt-3" open>
      <summary className="min-h-11 cursor-pointer text-sm font-bold text-amber-100">獲得與被沒收的紀錄</summary>
      <ul className="space-y-2">
        {collection.history.slice(0, 10).map((item, index) => <li key={index} className={`rounded-lg px-3 py-2 text-xs leading-5 ${item.kind === 'FORFEITED' ? 'bg-rose-300/[0.08] text-rose-100' : 'bg-white/[0.04] text-amber-100'}`}>
          <p className="font-bold">{item.kind === 'WON' ? '贏得 ＋1' : item.kind === 'FORFEITED' ? '輸掉 −1・已沒收' : '平手・原卡退回'} · {nameOf(item.cardId)}</p>
          <p className="text-white/50">{new Date(item.at).toLocaleDateString('zh-TW')}{item.remaining !== undefined ? ` · 當時剩餘 ${item.remaining} 張` : ' · 舊版紀錄'}</p>
        </li>)}
      </ul>
    </details>}
    <p className="mt-3 text-[10px] leading-4 text-white/50">{COLLECTION_STORAGE_NOTICE}</p>
  </section>;
}
