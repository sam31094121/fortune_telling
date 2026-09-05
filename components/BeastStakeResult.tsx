import Link from 'next/link';
import frameStyles from './BeastCardFrame.module.css';
import { COLLECTION_STORAGE_NOTICE, type Settlement } from '@/lib/beast-collection';

type Props = {
  outcome: { verdict: 'WON' | 'LOST' | 'RETURNED'; playerStakeName: string; opponentStakeName: string; gainedCardName: string | null; forfeitedCardName: string | null };
  card?: { name: string; thumbnail: string };
  settlement: Settlement | null;
  isReplay: boolean;
  retrying: boolean;
  onRetry: () => void;
};

export default function BeastStakeResult({ outcome, card, settlement, isReplay, retrying, onRetry }: Props) {
  const saved = settlement?.saved === true && !isReplay;
  const won = outcome.verdict === 'WON';
  const lost = outcome.verdict === 'LOST';
  const receipt = settlement?.receipt;
  const name = outcome.gainedCardName ?? outcome.forfeitedCardName ?? outcome.playerStakeName;
  return <section data-stake-result data-stake-verdict={outcome.verdict} data-settlement-saved={saved ? 'yes' : 'no'} aria-live="polite"
    className={`mt-3 rounded-2xl border-2 p-3 ${lost ? 'border-rose-300/50 bg-rose-300/[0.06]' : 'border-amber-300/50 bg-amber-300/[0.06]'}`}>
    <div className="flex items-center gap-3" data-stake-headline>
      {card && <div className={`${frameStyles.card} relative w-16 shrink-0 overflow-hidden border border-white/20`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.thumbnail} alt={card.name} className={`${frameStyles.art} ${saved && lost ? 'opacity-40 grayscale' : ''}`} />
        {saved && lost && <span className="absolute inset-0 grid place-items-center text-2xl font-black text-rose-200" aria-hidden="true">✕</span>}
      </div>}
      <div className="min-w-0">
        <p className={`text-2xl font-black ${lost ? 'text-rose-200' : 'text-amber-200'}`}>
          {isReplay ? '重播' : !saved ? '待保存' : won ? '獲得 ＋1' : lost ? '輸掉 −1' : '原卡退回'}
        </p>
        <h3 className="mt-1.5 text-sm font-black break-words">
          {isReplay ? `本場${won ? '贏得' : lost ? '輸掉' : '退回'}「${name}」`
            : !saved ? '結算尚未保存'
              : won ? `你多了一張「${name}」` : lost ? `「${name}」被沒收了 1 張` : `「${name}」仍屬於你`}
        </h3>
        <p className="mt-1 text-xs leading-5 text-white/70">
          {isReplay ? '本次不發獎，也不扣卡。'
            : !saved ? '尚未完成發獎或扣卡，請重試保存。'
              : won ? '已放進成長中心，你原本押的卡也保留。'
                : lost ? `已從成長中心扣除。這張還有 ${receipt?.remaining ?? 0} 張。`
                  : '這場平手，收藏張數不變。'}
        </p>
      </div>
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs leading-5">
      <div className="rounded-lg bg-black/25 px-2 py-2"><dt className="text-white/50">你押的</dt><dd>{outcome.playerStakeName}</dd></div>
      <div className="rounded-lg bg-black/25 px-2 py-2"><dt className="text-white/50">電腦押的</dt><dd>{outcome.opponentStakeName}</dd></div>
    </dl>
    {!saved && !isReplay && <button type="button" disabled={retrying} onClick={onRetry} className="mt-3 min-h-11 w-full rounded-xl bg-amber-200 px-3 py-2 text-sm font-black text-slate-950">{retrying ? '保存中…' : '重試保存這場結果'}</button>}
    <Link href="/growth-center#beast-collection" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-amber-200/40 px-3 py-2 text-sm font-bold text-amber-100">查看成長中心收藏{saved && receipt ? `（${receipt.total} 張）` : ''}</Link>
    <p className="mt-2 text-[10px] leading-4 text-white/50">{COLLECTION_STORAGE_NOTICE}</p>
  </section>;
}
