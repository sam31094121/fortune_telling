'use client';
import { useEffect, useRef } from 'react';
import { newHomeTrustEventId, useHomeTrust } from './useHomeTrust';
export default function FeatureVisitorCounter({ className = '', compact = false }: {
  featureKey: 'home'; className?: string; compact?: boolean; deferMs?: number; permanent?: boolean;
}) {
  const { counts, message, submit } = useHomeTrust();
  const visitId = useRef<string | null>(null);
  useEffect(() => {
    visitId.current ??= newHomeTrustEventId();
    const id = visitId.current;
    let confirmed = false;
    let inFlight = false;
    const record = async () => {
      if (confirmed || inFlight || document.hidden) return;
      inFlight = true;
      try { confirmed = await submit('view', id); } finally { inFlight = false; }
    };
    void record();
    const timer = window.setInterval(() => void record(), 15000);
    window.addEventListener('online', record);
    return () => { clearInterval(timer); window.removeEventListener('online', record); };
  }, [submit]);
  return (
    <aside data-visitor-counter="home" className={`inline-flex w-fit flex-col border border-amber-300/30 bg-white/[0.08] text-[color:var(--text-main)] shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl ${compact ? 'items-center justify-center rounded-xl px-2.5 py-2 text-center' : 'rounded-2xl px-[18px] py-[14px]'} ${className}`} aria-label="累計瀏覽次數">
      <div className={`visitor-counter-label ${compact ? 'text-[13px] leading-tight sm:text-[14px]' : 'text-[14px]'} font-bold text-[color:var(--text-main)] opacity-90`}>累計瀏覽次數</div>
      <div data-visitor-counter-count className="top-feedback-count visitor-counter-count mt-1 text-sm font-bold leading-tight text-amber-300">{counts ? counts.viewCount : message ? '暫時無法取得' : '載入中'}</div>
      {counts && message && <p role="status" className="mt-1 text-xs">等待更新</p>}
    </aside>
  );
}
