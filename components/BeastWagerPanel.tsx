'use client';

import {useEffect, useMemo, useState} from 'react';
import {readCollection, subscribeCollection} from '@/lib/beast-collection';
import type {BeastCollection} from '@/lib/beast-collection-ledger';
import GrowthStakeSlots from './GrowthStakeSlots';

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
      <p className="mt-1 text-sm leading-6 text-white/70">最多押 20 張。技術型勝利最高獎勵 100 張，獎勵會按稀有度與幼子、成獸、四象分配。</p>
      <GrowthStakeSlots collection={collection} pool={pool} />
    </section>
  );
}