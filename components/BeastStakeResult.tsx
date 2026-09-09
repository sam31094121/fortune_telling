'use client';

import frameStyles from './BeastCardFrame.module.css';
import { COLLECTION_STORAGE_NOTICE, type Settlement } from '@/lib/beast-collection';
import { stakeReceiptSummary, type NamedStakeOutcome } from '@/lib/beast-stake-presentation';
import BeastBattleVoice from './BeastBattleVoice';

type Props = {
  outcome: NamedStakeOutcome;
  card?: { name: string; thumbnail: string };
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
  const movement = changes?.map(change => `${nameOf(change.cardId)}${change.gained ? `贏得 ${change.gained} 張` : `輸掉 ${change.lost} 張`}，${change.after > 0 ? `剩餘 ${change.after} 張` : '已無剩餘'}`).join('；');
  const retained = summary && !lost ? `原押注卡保留 ${summary.retained} 張。` : '';
  const spoken = summary ? `${won ? '恭喜獲勝！' : lost ? '本場對手獲勝。' : '本場平手。'}你押了 ${summary.staked} 張，贏得 ${summary.gained} 張，輸掉 ${summary.lost} 張。${movement || (won ? `獎賞是${name}。` : `押注卡${stakeNames}。`)}${retained}結算已保存，共持有 ${summary.total} 張。${lost ? '可以先查看相剋，再調整陣容。' : ''}` : '';

  const iching = outcome.ichingJudgment;
  return <section data-stake-result data-stake-verdict={outcome.verdict} data-settlement-saved={saved ? 'yes' : 'no'} aria-label="押注卡片結算"
    className={`mt-3 rounded-2xl border-2 p-3 ${lost ? 'border-rose-300/50 bg-rose-300/[0.06]' : 'border-amber-300/50 bg-amber-300/[0.06]'}`}>
    <div className="flex items-center gap-3" data-stake-headline role="status">
      {card && <div className={`${frameStyles.card} relative w-16 shrink-0 overflow-hidden border border-white/20`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.thumbnail} alt={card.name} className={`${frameStyles.art} ${saved && lost ? 'opacity-40 grayscale' : ''}`} />
        {saved && lost && <span className="absolute inset-0 grid place-items-center text-2xl font-black text-rose-200" aria-hidden="true">✕</span>}
      </div>}
      <div className="min-w-0">
        <p className={`text-2xl font-black ${lost ? 'text-rose-200' : 'text-amber-200'}`}>
          {isReplay ? '重播' : !summary ? '待保存' : won ? `獲得 ＋${summary.gained} 張` : lost ? `輸掉 −${summary.lost} 張` : '平手・增減 0 張'}
        </p>
        <h3 className="mt-1.5 text-sm font-black break-words">
          {isReplay ? '觀看原場戰果' : !summary ? '結算尚未保存'
            : won ? `你多了一張「${name}」` : lost ? `本場押注卡已扣除 ${summary.lost} 張` : `原押注 ${summary.staked} 張全部保留`}
        </h3>
        <p className="mt-1 text-sm leading-6 text-white/80">
          {isReplay ? '本次不發獎，也不扣卡。贏得 0 張・輸掉 0 張。'
            : !summary ? '尚未完成發獎或扣卡，請重試保存。'
              : won ? `原本 ${summary.retained} 張保留＋獎勵 ${summary.gained} 張，本場共 ${summary.retained + summary.gained} 張。`
                : lost ? '已從持有卡片扣除。其他卡片保留；可先查看相剋，再調整陣容。'
                  : '這場平手，持有張數不變。'}
        </p>
      </div>
    </div>
    {iching && won && <div className="mt-3 rounded-xl bg-black/30 p-3" data-iching-judgment>
      <p className="text-xs text-white/60 mb-1">易經技術判斷</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-amber-200">{iching.symbol} {iching.hexagram}卦</span>
        <span className="text-xs text-white/70">第 {iching.tier} 等</span>
      </div>
      <p className="mt-1 text-sm font-bold text-amber-100">{iching.fullName}</p>
      <p className="mt-1 text-xs leading-5 text-white/80">{iching.verdict}</p>
      <p className="mt-1 text-xs text-amber-300/80 italic">「{iching.quote}」</p>
      <p className="mt-2 text-base font-black text-amber-200">易經裁定：額外獎勵 +{iching.bonusCards} 張</p>
    </div>}
    {summary && <dl className="mt-3 grid grid-cols-3 gap-2 text-center" data-stake-counts>
      {[['本場押注', summary.staked], ['贏得', summary.gained], ['輸掉', summary.lost]].map(([label, count]) =>
        <div key={label} className="rounded-xl bg-black/30 px-1 py-2"><dt className="text-xs text-white/70">{label}</dt><dd className="mt-1 text-lg font-black">{count} 張</dd></div>)}
    </dl>}
    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs leading-5">
      <div className="rounded-lg bg-black/25 px-2 py-2"><dt className="text-white/60">你的押注籌碼・{staked} 張</dt><dd className="break-words">{stakeNames}</dd></div>
      <div className="rounded-lg bg-black/25 px-2 py-2"><dt className="text-white/60">對手押注・1 張</dt><dd>{outcome.opponentStakeName} ×1</dd></div>
    </dl>
    {summary && <div className="mt-3 text-sm leading-6" data-card-movements>
      {changes?.length ? changes.map(change => <p key={change.cardId}>
        <strong>{nameOf(change.cardId)}</strong>：{change.gained ? `贏得 ${change.gained} 張` : `輸掉 ${change.lost} 張`}<br />
        持有 {change.before} → {change.after} 張（{change.after > 0 ? `剩餘 ${change.after} 張` : '已無剩餘'}）
      </p>) : !changes && receipt?.cardId ? <p>{name}：還有 {receipt.remaining} 張。</p> : null}
      {!lost && <p>原押注卡保留 {summary.retained} 張。</p>}
      <p className="mt-2 font-bold text-amber-100" data-held-card-total>持有總數 {summary.before} → {summary.total} 張<br />目前持有 {summary.total} 張卡片</p>
      {lost && summary.total === 0 && <p>目前沒有可押卡片，可先到卡片體驗戰免押練習。</p>}
      <p className="text-xs text-white/55">以上是這一場結算完成時的張數。</p>
    </div>}
    {!saved && !isReplay && <>
      {settlement?.error && <p role="alert" className="mt-2 text-sm text-rose-200">{settlement.error}</p>}
      <button type="button" disabled={retrying} onClick={onRetry} className="mt-3 min-h-11 w-full rounded-xl bg-amber-200 px-3 py-2 text-sm font-black text-slate-950">{retrying ? '保存中…' : '重試保存這場結果'}</button>
    </>}
    {summary && settlement && <BeastBattleVoice id={settlement.matchId} text={spoken} reward={won} />}
    <p className="mt-2 text-xs leading-5 text-white/50">{COLLECTION_STORAGE_NOTICE}</p>
  </section>;
}
