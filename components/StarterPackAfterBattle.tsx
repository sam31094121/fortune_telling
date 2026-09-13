'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { claimStarterPack, readCollection } from '@/lib/beast-collection';
import { getAnonymousProfileId } from '@/lib/growth-center-client';

const StarterPackPhotonRitual = dynamic(() => import('./StarterPackPhotonRitual'), { ssr: false });

type GiftState = 'checking' | 'sending' | 'sent' | 'already' | 'failed';

/** Render only after a finished battle; never promise cards before a saved receipt exists. */
export default function StarterPackAfterBattle({ completed }: { completed: 'battlefield' | 'stake-duel' }) {
  const [state, setState] = useState<GiftState>('checking');
  const [error, setError] = useState('');

  const sendGift = useCallback(async () => {
    const collection = readCollection();
    if (collection.starterPack) { setState('already'); return; }
    if (collection.storageError) { setError(collection.storageError); setState('failed'); return; }
    setState('sending');
    setError('');
    try {
      await claimStarterPack(completed, getAnonymousProfileId());
      if (!readCollection().starterPack) throw new Error('卡片尚未入庫，請重試。');
      setState('sent');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '卡片尚未入庫，請重試。');
      setState('failed');
    }
  }, [completed]);

  useEffect(() => { void sendGift(); }, [sendGift]);

  if (state === 'checking' || state === 'already') return null;
  return <aside className="mt-3 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-center text-amber-100" aria-label="首次遊戲贈卡">
    {state === 'sent' && <div className="relative mb-2 flex min-h-28 items-center justify-center gap-1 overflow-hidden rounded-lg bg-slate-950/40" aria-hidden="true">
      <StarterPackPhotonRitual />
      {[1, 2, 3].map((number) => <Image key={number} src={`/beast-game/thumb/young-${String(number).padStart(2, '0')}.webp`} alt="" width={42} height={56} unoptimized className="relative z-10 h-14 w-[42px] rounded-md object-cover shadow-lg" />)}
      <span className="relative z-10 ml-1 text-xl font-black">× 28</span>
    </div>}
    <p role="status" className="text-sm font-bold">{state === 'sent' ? '🎁 28 張神獸幼子卡已送入收藏！' : state === 'sending' ? '正在送出 28 張神獸幼子卡…' : '28 張卡尚未入庫'}</p>
    {state === 'sent' && <p className="mt-1 text-xs">點一下看卡片，再選卡繼續玩。</p>}
    {state === 'sent' && <Link href="/growth-center#beast-collection" className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-200 px-4 font-bold text-slate-950">查看我的卡片</Link>}
    {state === 'failed' && <><p role="alert" className="mt-1 text-xs">{error}</p><button type="button" className="mt-2 min-h-11 rounded-lg border border-amber-200/50 px-4 font-bold" onClick={() => void sendGift()}>重試領卡</button></>}
  </aside>;
}
