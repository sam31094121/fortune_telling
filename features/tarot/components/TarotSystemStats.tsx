'use client';

import type { TarotStatsSnapshot } from '@/features/tarot/services/api';

type TarotSystemStatsProps = {
  stats: TarotStatsSnapshot | null;
  error?: string;
};

export default function TarotSystemStats({ stats, error }: TarotSystemStatsProps) {
  return (
    <section className="fortune-card p-5 sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">SYSTEM</p>
      <h2 className="mt-2 font-serif text-2xl font-black text-cyan-50">塔羅系統統計</h2>
      {error && <p className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-950/25 px-4 py-3 text-xs font-semibold leading-6 text-rose-100">{error}</p>}
      {!stats ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
          正在讀取後端塔羅系統狀態。
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-black text-cyan-100">牌庫完整度</p>
            <p className="mt-2 text-sm font-black text-[color:var(--text-main)]">
              {stats.deckIntegrity.total} 張｜大牌 {stats.deckIntegrity.major}｜小牌 {stats.deckIntegrity.minor}
            </p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-sub)]">
              {stats.deckIntegrity.complete ? '完整 78 張，可進行後端洗牌。' : '牌庫尚未完整，後端會拒絕洗牌。'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs font-black text-[color:var(--text-muted)]">洗牌</p>
              <p className="mt-2 text-2xl font-black text-cyan-50">{stats.totals.shuffles}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs font-black text-[color:var(--text-muted)]">解讀</p>
              <p className="mt-2 text-2xl font-black text-cyan-50">{stats.totals.readings}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs font-black text-[color:var(--text-muted)]">自己</p>
              <p className="mt-2 text-2xl font-black text-emerald-50">{stats.totals.selfReadings}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs font-black text-[color:var(--text-muted)]">親友</p>
              <p className="mt-2 text-2xl font-black text-amber-50">{stats.totals.otherReadings}</p>
            </div>
          </div>
          <p className="text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">
            {stats.lastUpdatedAt ? `最後更新：${new Date(stats.lastUpdatedAt).toLocaleString('zh-TW')}` : stats.engineVersion}
          </p>
        </div>
      )}
    </section>
  );
}