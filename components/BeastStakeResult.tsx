'use client';

import frameStyles from './BeastCardFrame.module.css';
import { BeastCardFace } from './battlefield/BeastCardTile';
import { COLLECTION_STORAGE_NOTICE, type Settlement } from '@/lib/beast-collection';
import { stakeReceiptSummary, type NamedStakeOutcome } from '@/lib/beast-stake-presentation';
import BeastBattleVoice from './BeastBattleVoice';

type Props = {
  outcome: NamedStakeOutcome;
  card?: { id?: string; name: string; thumbnail: string };
  cards?: Array<{ id: string; name: string; thumbnail: string }>;
  settlement: Settlement | null;
  isReplay: boolean;
  retrying: boolean;
  onRetry: () => void;
};

export default function BeastStakeResult({ outcome, card, cards = [], settlement, isReplay, retrying, onRetry }: Props) {
  const receipt = settlement?.receipt;
  const saved = settlement?.saved === true && Boolean(receipt) && !isReplay;
  const summary = saved && receipt ? stakeReceiptSummary(outcome, receipt) : null;
  const won = outcome.verdict === 'WON', lost = outcome.verdict === 'LOST';
  const name = outcome.gainedCardName ?? outcome.forfeitedCardName ?? outcome.playerStakeName;
  const nameOf = (id: string) => cards.find(item => item.id === id)?.name
    ?? (id === outcome.stakes?.player ? outcome.playerStakeName : id === outcome.stakes?.opponent ? outcome.opponentStakeName : '神獸卡');
  const staked = summary?.staked ?? outcome.selectedEntries?.length ?? 1;
  const stakes = outcome.selectedEntries?.map(entry => nameOf(entry.cardId)) ?? [outcome.playerStakeName];
  const counts = new Map<string, number>();
  for (const label of stakes) counts.set(label, (counts.get(label) ?? 0) + 1);
  const stakeNames = [...counts].map(([label, count]) => `${label} ×${count}`).join('、');
  const changes = receipt?.cardChanges;
  const byType = (ids: string[]) => { const m = new Map<string, number>(); for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1); return [...m]; };
  const stakedGroups = byType(outcome.selectedEntries?.map(entry => entry.cardId) ?? []);
  const gainedGroups: Array<[string, number]> = (changes ?? []).filter(change => change.gained > 0).map(change => [change.cardId, change.gained]);
  const gainedKinds = new Set(changes?.filter(change => change.gained > 0).map(change => change.cardId)).size;
  const movement = changes?.map(change => `${nameOf(change.cardId)}${change.gained ? `贏得 ${change.gained} 張` : `輸掉 ${change.lost} 張`}，${change.after > 0 ? `剩餘 ${change.after} 張` : '已無剩餘'}`).join('；');
  const retained = summary && !lost ? `原押注卡保留 ${summary.retained} 張。` : '';
  const spoken = summary ? `${won ? '恭喜獲勝！' : lost ? '本場阿修羅獲勝。' : '本場平手。'}你押了 ${summary.staked} 張，贏得 ${summary.gained} 張，輸掉 ${summary.lost} 張。${movement || (won ? `獎賞是${name}。` : `押注卡${stakeNames}。`)}${retained}結算已保存，共持有 ${summary.total} 張。${lost ? '可以先查看相剋，再調整陣容。' : ''}` : '';

  return <section data-stake-result data-stake-verdict={outcome.verdict} data-settlement-saved={saved ? 'yes' : 'no'} aria-label="押注卡片結算"
    className={`mt-3 rounded-2xl border-2 p-3 ${lost ? 'border-rose-300/50 bg-rose-300/[0.06]' : 'border-amber-300/50 bg-amber-300/[0.06]'}`}>
    <div className="flex items-center gap-3" data-stake-headline role="status">
      {card && <div className={`${frameStyles.card} relative w-16 shrink-0 overflow-hidden border border-white/20`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className={saved && lost ? 'opacity-40 grayscale' : undefined}><BeastCardFace card={{...card, id: card.id ?? ''}} /></span>
        {saved && lost && <span className="absolute inset-0 grid place-items-center text-2xl font-black text-rose-200" aria-hidden="true">✕</span>}
      </div>}
      <div className="min-w-0">
        <p className={`text-2xl font-black ${lost ? 'text-rose-200' : 'text-amber-200'}`}>
          {isReplay ? '重播' : !summary ? '待保存' : won ? `獲得 ＋${summary.gained} 張` : lost ? `輸掉 −${summary.lost} 張` : '平手'}
        </p>
        <h3 className="mt-1.5 text-sm font-black break-words">
          {isReplay ? '觀看原場戰果' : !summary ? '結算尚未保存'
            : won ? gainedKinds > 1 ? `你多了 ${summary.gained} 張神獸卡（${gainedKinds} 種）` : `你多了 ${summary.gained} 張「${name}」` : lost ? `本場押注卡已扣除 ${summary.lost} 張` : `原押注 ${summary.staked} 張全部保留`}
        </h3>
        <p className="mt-1 text-sm leading-6 text-white/80">
          {isReplay ? '本次不發獎，也不扣卡。贏得 0 張・輸掉 0 張。'
            : !summary ? '尚未完成發獎或扣卡，請重試保存。'
              : won ? null
                : lost ? '已從持有卡片扣除。其他卡片保留；可先查看相剋，再調整陣容。'
                  : null}
        </p>
      </div>
    </div>
    {/* 2026-11-12 業主：贏的時候不再顯示《易經》卜卦判斷（易經判斷現在只屬於對手阿修羅）。獎勵張數仍由後端算，這裡只顯示結果。 */}
    {summary && <dl className="mt-3 grid grid-cols-3 gap-2 text-center" data-stake-counts>
      {[['本場押注', summary.staked], ['贏得', summary.gained], ['輸掉', summary.lost]].map(([label, count]) =>
        <div key={label} className="rounded-xl bg-black/30 px-1 py-2"><dt className="text-xs text-white/70">{label}</dt><dd className="mt-1 text-lg font-black">{count} 張</dd></div>)}
    </dl>}
    {summary && <div className="mt-3 grid gap-3" data-card-movements data-stake-distribution>
      <section aria-label={lost ? '輸掉的卡片' : '保留的卡片'}>
        <p className={`mb-1.5 inline-block rounded-full px-3 py-1 text-sm font-black ${lost ? 'bg-rose-300/25 text-rose-100' : won ? 'bg-emerald-300/25 text-emerald-100' : 'bg-white/15 text-white'}`}>
          {lost ? `✕ 輸掉 ${summary.lost} 張（你押的）` : won ? `✓ 你押的 ${summary.staked} 張，全部保留` : `你押的 ${summary.staked} 張，全部退回`}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {stakedGroups.map(([id, count]) => <StakeChip key={id} id={id} name={nameOf(id)} cards={cards} count={count} tone={lost ? 'lost' : 'kept'} />)}
        </div>
      </section>
      {won && gainedGroups.length > 0 && <section aria-label="新得的卡片">
        <p className="mb-1.5 inline-block rounded-full bg-amber-300/25 px-3 py-1 text-sm font-black text-amber-100">＋ 新得 {summary.gained} 張</p>
        <div className="grid max-h-[440px] grid-cols-3 gap-2 overflow-y-auto overscroll-contain pr-0.5" data-gained-scroll>
          {gainedGroups.map(([id, count]) => <StakeChip key={id} id={id} name={nameOf(id)} cards={cards} count={count} tone="gain" />)}
        </div>
      </section>}
      {lost && <p className="text-sm font-bold text-white/80">其他卡片都還在。</p>}
      <p className="font-bold text-amber-100" data-held-card-total>持有 {summary.before} → {summary.total} 張</p>
      {lost && summary.total === 0 && <p className="text-sm">目前沒有可押卡片，可先到體驗戰免押練習。</p>}
    </div>}
    {!saved && !isReplay && <>
      {settlement?.error && <p role="alert" className="mt-2 text-sm text-rose-200">{settlement.error}</p>}
      <button type="button" disabled={retrying} onClick={onRetry} className="mt-3 min-h-11 w-full rounded-xl bg-amber-200 px-3 py-2 text-sm font-black text-slate-950">{retrying ? '保存中…' : '重試保存這場結果'}</button>
    </>}
    {summary && settlement && <BeastBattleVoice id={settlement.matchId} text={spoken} reward={won} />}
    <p className="mt-2 text-xs leading-5 text-white/50">{COLLECTION_STORAGE_NOTICE}</p>
  </section>;
}

function StakeChip({ id, name, cards, count, tone }: { id: string; name: string; cards: Array<{ id: string; name: string; thumbnail: string }>; count: number; tone: 'kept' | 'lost' | 'gain' }) {
  const card = cards.find(item => item.id === id);
  const border = tone === 'lost' ? 'border-rose-300/60' : tone === 'gain' ? 'border-amber-300/80' : 'border-emerald-300/50';
  const color = tone === 'lost' ? 'text-rose-200' : tone === 'gain' ? 'text-amber-200' : 'text-emerald-200';
  return <div className={`rounded-lg border p-1 text-center ${border}`} data-stake-chip data-tone={tone}>
    <div className={`overflow-hidden rounded ${tone === 'lost' ? 'opacity-45 grayscale' : ''}`} aria-label={name}>
      {card ? <BeastCardFace card={{ ...card }} /> : <span className="block aspect-[63/88] bg-black/40" />}
    </div>
    <p className={`mt-1 text-base font-black leading-none ${color}`}>{tone === 'lost' ? '−' : tone === 'gain' ? '＋' : '×'}{count}</p>
  </div>;
}
