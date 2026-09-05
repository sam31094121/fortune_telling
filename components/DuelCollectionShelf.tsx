'use client';

/**
 * 成長中心・決鬥收藏格
 * ============================================================================
 *
 * 業主定調：「贏要有獎勵，獎勵要很清楚地告知。會分配在哪裡？
 * 遊戲的定義就是會獲得獎勵，再指引到我的成長。
 * ……在成長中心裡面，要有一個可以放卡片的格子。」
 *
 * 這就是那個格子。決鬥贏來的神獸卡放在這裡——
 * 不是分數、不是徽章，是一張看得到的卡。
 *
 * 【三件必須誠實的事】
 *
 * 1 收藏存在這台裝置，不是雲端。換手機、清除資料就沒了。
 *   這句話要顯示在格子上，不是藏在說明裡。
 *
 * 2 被沒收的卡也要看得到紀錄。
 *   客戶要能回頭查「我什麼時候失去了哪一張」，
 *   而不是某天發現卡變少卻查不到原因。靜悄悄拿走東西就是作假。
 *
 * 3 空的時候要說得出怎麼拿到第一張，不能只顯示「尚無收藏」。
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import frameStyles from '@/components/BeastCardFrame.module.css';
import {
  COLLECTION_STORAGE_NOTICE,
  countByCard,
  readCollection,
  type BeastCollection,
} from '@/lib/beast-collection';

type PoolCard = { id: string; name: string; thumbnail: string; element: string; cost: number };

const ELEMENT_LABEL: Record<string, string> = {
  SPACE: '空', AIR: '風', WATER: '水', FIRE: '火', EARTH: '地',
};

export default function DuelCollectionShelf() {
  const [collection, setCollection] = useState<BeastCollection>({ cards: [], history: [] });
  const [pool, setPool] = useState<Map<string, PoolCard>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCollection(readCollection());

    let cancelled = false;
    // 卡片的圖與名字仍然由後端卡池提供，收藏本身只存 id——
    // 這樣卡片資料改版時，收藏會自動跟著更新，不會留著一份過期的副本。
    fetch('/api/beast-game')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.ok || !Array.isArray(data.cards)) return;
        setPool(new Map((data.cards as PoolCard[]).map((card) => [card.id, card])));
      })
      .catch(() => { /* 卡池載不到就只顯示張數與紀錄，不讓整個格子壞掉。 */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const counts = countByCard(collection);
  const unique = [...counts.entries()];
  const forfeited = collection.history.filter((item) => item.kind === 'FORFEITED');

  return (
    <section
      aria-label="決鬥收藏"
      data-duel-collection
      className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-black text-amber-100">決鬥收藏</h3>
        <span className="text-xs font-bold text-white/50" data-collection-count>
          {collection.cards.length} 張
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-5 text-white/50">
        神獸決鬥贏來的卡放在這裡。贏一場多一張，輸一場被沒收一張。
      </p>

      {collection.cards.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-white/20 px-3 py-5 text-center">
          <p className="text-xs font-bold text-white/60">還沒有贏來的卡</p>
          <p className="mt-1.5 text-[11px] leading-5 text-white/45">
            去神獸決鬥挑三隻布陣、押上一張賭注卡，贏了就會多一張放進這裡。
          </p>
          <Link
            href="/beast-game"
            className="mt-3 inline-block min-h-11 rounded-xl bg-amber-300 px-5 py-3 text-xs font-black text-slate-950"
          >
            去贏第一張
          </Link>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {unique.map(([cardId, count]) => {
            const card = pool.get(cardId);
            return (
              <li key={cardId} className="min-w-0" data-collected-card={cardId}>
                <div className={`${frameStyles.card} relative overflow-hidden border border-amber-200/30`}>
                  {card ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.thumbnail}
                      alt={card.name}
                      loading="lazy"
                      decoding="async"
                      className={frameStyles.art}
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[9px] text-white/35">
                      {loaded ? '卡片資料待載' : '載入中'}
                    </span>
                  )}
                  {count > 1 && (
                    <span className="absolute right-1 top-1 rounded-full bg-black/80 px-1.5 py-0.5 text-[10px] font-black">
                      ×{count}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-center text-[10px] font-bold text-white/70">
                  {card?.name ?? cardId}
                  {card && <span className="ml-1 text-white/35">{ELEMENT_LABEL[card.element] ?? ''}</span>}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {/* 被沒收的也要看得到——靜悄悄拿走東西就是作假。 */}
      {forfeited.length > 0 && (
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer text-[11px] font-bold text-rose-200/80">
            被沒收的紀錄（{forfeited.length}）
          </summary>
          <ul className="mt-1.5 space-y-1">
            {forfeited.slice(0, 10).map((item, index) => (
              <li key={index} className="text-[11px] leading-5 text-white/50">
                {new Date(item.at).toLocaleDateString('zh-TW')}・{item.note}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-3 text-[10px] leading-4 text-white/35">{COLLECTION_STORAGE_NOTICE}</p>
    </section>
  );
}
