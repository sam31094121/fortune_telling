'use client';

import { TAROT_CATEGORY_LABELS, type TarotCard, type TarotReading } from '@/features/tarot/types';

type TarotReadingHistoryProps = {
  history: TarotReading[];
  cardsById: Map<string, TarotCard>;
  selectedId?: string;
  error?: string;
  onView: (reading: TarotReading) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '時間不明';
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function TarotReadingHistory({ history, cardsById, selectedId, error, onView, onDelete, onClear }: TarotReadingHistoryProps) {
  return (
    <section className="fortune-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">HISTORY</p>
          <h2 className="mt-2 font-serif text-2xl font-black text-amber-50">塔羅歷史紀錄</h2>
        </div>
        {history.length > 0 && (
          <button type="button" onClick={onClear} className="rounded-full border border-rose-300/25 bg-rose-950/20 px-4 py-2 text-xs font-black text-rose-100 transition hover:border-rose-200/45">
            清除全部紀錄
          </button>
        )}
      </div>
      {error && <p className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-950/25 px-4 py-3 text-sm font-semibold text-rose-100">{error}</p>}
      {history.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
          目前還沒有塔羅紀錄。完成第一次親手選牌後，會自動保留最近 20 筆。
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {history.map((reading) => {
            const card = cardsById.get(reading.cardId);
            return (
              <article key={reading.id} className={`rounded-2xl border p-4 transition ${selectedId === reading.id ? 'border-sky-200/45 bg-sky-300/12' : 'border-white/10 bg-white/[0.04]'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[color:var(--text-muted)]">{formatDate(reading.createdAt)} · {TAROT_CATEGORY_LABELS[reading.category]} · {reading.scope === 'self' ? '自己' : '親友'}</p>
                    <p className="mt-1 text-sm font-black text-[color:var(--text-main)]">{card ? `${card.nameZh}｜${reading.orientation === 'upright' ? '正位' : '逆位'}` : '牌面資料已更新'}</p>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{reading.question}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => onView(reading)} className="rounded-full border border-sky-200/30 bg-sky-300/12 px-3 py-2 text-xs font-black text-sky-100">
                      查看結果
                    </button>
                    <button type="button" onClick={() => onDelete(reading.id)} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-black text-[color:var(--text-sub)]">
                      刪除
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
