'use client';
import { useHomeVote } from './useHomeTrust';
export default function AiTrustFeedback({ className = '' }: { className?: string }) {
  const { counts, message, busy, vote } = useHomeVote();
  return (
    <section className={`${className} home-ai-feedback-card home-ai-feedback-card--feedback`}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 text-left">
          <p className="text-[10px] font-black uppercase leading-none tracking-[0.16em] text-amber-100/95 sm:text-xs">回饋校準</p>
          <p className="mt-1 text-[9px] font-medium leading-tight text-[color:var(--text-sub)] sm:text-[10px]">認同或不認同，擇一送出即可</p>
        </div>
      </div>
      <div className="mt-2 grid min-w-0 grid-cols-2 gap-1 sm:gap-1.5">
        <div className="home-ai-feedback-stat home-ai-feedback-stat--like">
          <p className="text-[9px] font-bold leading-none text-amber-100/80">認同</p>
          <p className="top-feedback-count relative mt-1 text-sm font-bold leading-tight text-amber-100">{counts ? counts.agreeCount : message ? '暫時無法取得' : '載入中'}</p>
        </div>
        <div className="home-ai-feedback-stat home-ai-feedback-stat--disagree">
          <p className="text-[9px] font-bold leading-none text-cyan-100/80">不認同</p>
          <p className="top-feedback-count relative mt-1 text-sm font-bold leading-tight text-cyan-100">{counts ? counts.disagreeCount : message ? '暫時無法取得' : '載入中'}</p>
        </div>
      </div>
      <div className="mt-2 grid min-w-0 grid-cols-2 gap-1 sm:gap-1.5">
        <button type="button" disabled={busy || !counts} onClick={() => void vote('agree')} aria-label="我認同" className="home-ai-feedback-action home-ai-feedback-action--like"><span aria-hidden="true">👍</span><span>我認同</span></button>
        <button type="button" disabled={busy || !counts} onClick={() => void vote('disagree')} aria-label="我不認同" className="home-ai-feedback-action home-ai-feedback-action--disagree"><span aria-hidden="true">👎</span><span>我不認同</span></button>
      </div>
      {message && <p role="status" className="mt-2 text-xs">{message}</p>}
    </section>
  );
}
