'use client';

import {useEffect, useMemo, useState} from 'react';
import {readCollection, subscribeCollection} from '@/lib/beast-collection';
import type {BeastCollection} from '@/lib/beast-collection-ledger';
import GrowthStakeSlots from './GrowthStakeSlots';
import {MAX_REWARD_CARDS, MAX_STAKE_CARDS} from '@/lib/beast-game/stake-rules';

type WagerCard = {id: string; name: string; thumbnail: string};

export default function BeastWagerPanel({mode}: {mode: '簡單' | '中等'}) {
  const [collection, setCollection] = useState<BeastCollection | null>(null);
  const [cards, setCards] = useState<WagerCard[]>([]);

  useEffect(() => {
    const refresh = () => setCollection(readCollection());
    refresh();
    return subscribeCollection(refresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/beast-game', {signal: controller.signal})
      .then(response => response.json())
      .then(data => {
        if (data.ok && Array.isArray(data.cards)) {
          setCards(data.cards.map((card: WagerCard) => ({id: card.id, name: card.name, thumbnail: card.thumbnail})));
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const pool = useMemo(() => new Map(cards.map(card => [card.id, card])), [cards]);
  if (!collection || !cards.length) return null;

  return (
    <section aria-label={`${mode}技術型押注`} className="mt-6 border-t border-cyan-200/20 pt-5">
      <h2 className="text-xl font-black text-cyan-100">{mode}技術型押注</h2>
      {/* 上方中等對戰固定押 1 張；這裡是另一種押注，數字取自押注規則，不寫死。 */}
      <p className="mt-1 text-sm leading-6 text-white/70">這是另一種押注，和上方「本場押 1 張」的中等對戰分開計算：可押 1～{MAX_STAKE_CARDS} 張收藏卡。技術型勝利最高獎勵 {MAX_REWARD_CARDS} 張，獎勵會按稀有度與幼子、成獸、四象分配。</p>
      <GrowthStakeSlots collection={collection} pool={pool} />
    </section>
  );
}