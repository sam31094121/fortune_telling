'use client';

import type { TarotStatsSnapshot } from '@/features/tarot/services/api';

const STATUS_CLASS = {
  true: 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-50',
  false: 'border-rose-300/25 bg-rose-400/[0.08] text-rose-50',
} as const;

type TarotSystemStatsProps = {
  stats: TarotStatsSnapshot | null;
  error?: string;
};

function formatDate(value?: string) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('zh-TW');
  } catch {
    return value;
  }
}

export default function TarotSystemStats({ stats, error }: TarotSystemStatsProps) {
  const topCards = stats
    ? Object.entries(stats.cardCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];
  const readiness = stats?.readiness;

  return (
    <section className="fortune-card tarot-system-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">SYSTEM</p>
          <h2 className="mt-2 font-serif text-2xl font-black text-cyan-50">塔羅牌後端引擎</h2>
        </div>
        {readiness && (
          <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black ${readiness.productionReady ? STATUS_CLASS.true : STATUS_CLASS.false}`}>
            {readiness.productionReady ? '功能完整' : '禁止上線'}
          </span>
        )}
      </div>

      {error && <p className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-950/25 px-4 py-3 text-xs font-semibold leading-6 text-rose-100">{error}</p>}
      {!stats ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
          正在讀取塔羅牌資料庫、洗牌統計與完整度檢查。
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.07] p-4">
            <p className="text-xs font-black text-cyan-100">牌庫完整度</p>
            <p className="mt-2 text-sm font-black text-[color:var(--text-main)]">
              {stats.deckIntegrity.total} 張牌 · 大阿爾克那 {stats.deckIntegrity.major} · 小阿爾克那 {stats.deckIntegrity.minor}
            </p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-sub)]">
              {stats.deckIntegrity.complete ? '易經卜卦判定：78 張牌庫完整。' : '易經卜卦判定：牌庫不完整，塔羅牌禁止上線。'}
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

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-black text-cyan-100">正逆位統計</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-black text-[color:var(--text-sub)]">
              <span className="rounded-xl bg-white/[0.04] px-3 py-2">正位 {stats.orientation.upright}</span>
              <span className="rounded-xl bg-white/[0.04] px-3 py-2">逆位 {stats.orientation.reversed}</span>
            </div>
          </div>

          {readiness && (
            <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs font-black text-cyan-100">上線完整度檢查</p>
              <div className="mt-3 space-y-2">
                {readiness.checklist.map((item) => (
                  <div key={item.id} className={`rounded-xl border px-3 py-2 ${item.complete ? STATUS_CLASS.true : STATUS_CLASS.false}`}>
                    <p className="text-xs font-black">{item.complete ? '✓' : '!'} {item.title}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-5 opacity-80">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topCards.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-black text-cyan-100">抽牌熱度 Top 3</p>
              <div className="mt-3 space-y-2">
                {topCards.map(([cardId, count]) => (
                  <p key={cardId} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2 text-xs font-black text-[color:var(--text-sub)]">
                    <span className="truncate">{cardId}</span>
                    <span>{count}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">
            {stats.lastUpdatedAt ? `最後更新：${formatDate(stats.lastUpdatedAt)}` : stats.engineVersion}
          </p>
        </div>
      )}
    </section>
  );
}