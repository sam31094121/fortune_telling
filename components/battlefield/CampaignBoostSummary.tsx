'use client';
/** PLAN-v2 B10：收藏頁顯示寶珠闖關的永久強化（只讀；開關 NEXT_PUBLIC_M3_FEED_CHAIN 關閉時不顯示）。 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCard } from '@/lib/beast-game/registry';
import { readCampaign } from '@/lib/beast-game/match3/hard-campaign-store';
import { campaignAvailableIds, enhancementUnlockProgress } from '@/lib/beast-game/match3/hard-campaign';
import { campaignBattleStats } from '@/lib/beast-game/match3/feed-chain';
import { feedChainEnabled } from '@/lib/beast-game/match3/merge-balance';

type Row = { id: string; name: string; face: number; attack: number; bonus: number; cap: number };
export default function CampaignBoostSummary() {
  const [state, setState] = useState<{ rows: Row[]; wins: number; remaining: number } | null>(null);
  useEffect(() => {
    if (!feedChainEnabled()) return;
    const r = readCampaign('self');
    if (!r.ok || !r.profile || !r.profile.heroId) return;
    const p = r.profile, ids = campaignAvailableIds(p).filter(id => getCard(id)?.form !== 'YOUNG');
    const rows = campaignBattleStats(p, ids).filter(s => s.bonus > 0).sort((a, b) => b.attack - a.attack).map(s => ({ id: s.cardId, name: getCard(s.cardId)?.name ?? s.cardId, face: s.faceAttack, attack: s.attack, bonus: s.bonus, cap: s.faceAttack + s.cap }));
    setState({ rows, wins: p.wins, remaining: enhancementUnlockProgress(p).winsRemaining });
  }, []);
  if (!state) return null;
  return <section data-testid="collection-boost-summary" aria-label="寶珠闖關永久強化" className="mt-5 max-w-2xl rounded-2xl border border-amber-200/30 bg-black/30 p-4 text-sm text-amber-50">
    <p className="text-xs font-black tracking-[0.18em] text-amber-200/85">寶珠闖關・我的強化（已贏 {state.wins} 場）</p>
    {state.rows.length ? <ul className="mt-2 grid gap-1">{state.rows.slice(0, 6).map(r => <li key={r.id} className="flex justify-between gap-3 tabular-nums"><span>{r.name}</span><span>攻 {r.face} → <b className="text-amber-200">{r.attack}</b> <span className="text-emerald-300">▲{r.bonus}</span>{r.attack >= r.cap ? '・已滿' : `・上限 ${r.cap}`}</span></li>)}</ul>
      : <p className="mt-2 text-slate-300">{state.remaining > 0 ? `再贏 ${state.remaining} 場解鎖永久強化。` : '還沒有強化過的卡，打完一關就能一鍵吃到封頂。'}</p>}
    <Link href="/beast-game/match3-hard?owner=self" className="mt-3 inline-flex min-h-[44px] items-center font-bold text-amber-200 underline">去寶石捷連線強化 →</Link>
  </section>;
}
