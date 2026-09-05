'use client';
import { useState } from 'react';
import BeastDuelRitual from '@/components/BeastDuelRitual';
import type { PairResult } from '@/lib/beast-game/series';
type Card = { id: string; name: string; element: string; thumbnail: string };
export default function Preview({ player, opponent, pairs }: { player: Card[]; opponent: Card[]; pairs: PairResult[] }) {
  const [open, setOpen] = useState(true);
  return <main className="min-h-screen bg-slate-950 p-6 text-amber-100">
    {open ? <BeastDuelRitual player={player} opponent={opponent} pairs={pairs} onComplete={() => setOpen(false)} onCancel={() => setOpen(false)} /> : <>
      <h1 className="text-xl font-bold">演示完成・比分 {pairs[2].score.player} : {pairs[2].score.opponent}</h1>
      <p>演示不扣收藏卡</p>
      <button className="mt-6 rounded-xl bg-amber-200 px-6 py-3 text-black" onClick={() => setOpen(true)}>再看一次</button>
    </>}
  </main>;
}
