'use client';

import Link from 'next/link';

type SystemKey = 'music' | 'match' | 'insight';

interface SystemMeta {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  tone: 'violet' | 'rose' | 'cyan';
}

const SYSTEMS: Record<SystemKey, SystemMeta> = {
  music: {
    href: '/music',
    emoji: '歌',
    title: 'AI 生成一首歌',
    desc: '用文字或錄音整理你的狀態，生成更貼近自己的專屬音樂。',
    tone: 'violet',
  },
  match: {
    href: '/match',
    emoji: '配',
    title: '靈魂配對',
    desc: '輸入兩個人的資料，分析相處節奏、互補方向與關係功課。',
    tone: 'rose',
  },
  insight: {
    href: '/insight',
    emoji: '紫',
    title: '紫微斗數',
    desc: '從年度命盤、宮位重點與人生主軸，整理更長期的方向。',
    tone: 'cyan',
  },
};

const TONE_STYLE: Record<SystemMeta['tone'], { card: string; cta: string }> = {
  violet: {
    card: 'border-violet-400/25 hover:border-violet-400/55 hover:bg-violet-500/10',
    cta: 'text-violet-300',
  },
  rose: {
    card: 'border-rose-400/25 hover:border-rose-400/55 hover:bg-rose-500/10',
    cta: 'text-rose-300',
  },
  cyan: {
    card: 'border-cyan-400/25 hover:border-cyan-400/55 hover:bg-cyan-500/10',
    cta: 'text-cyan-300',
  },
};

export default function NextStepGuide({ current, hideDestinations = [] }: { current: SystemKey; hideDestinations?: SystemKey[] }) {
  const others = (Object.keys(SYSTEMS) as SystemKey[]).filter((key) => key !== current && !hideDestinations.includes(key));

  if (others.length === 0) return null;

  return (
    <div className="fortune-card p-6 sm:p-8">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">下一步</p>
        <h3 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">繼續完成更多分析</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-sub)]">
          每完成一張卡片，AI 個人成長中心就會多一份資料，最後統整出本週行動與本月能量色。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {others.map((key) => {
          const s = SYSTEMS[key];
          const tone = TONE_STYLE[s.tone];
          return (
            <Link
              key={key}
              href={s.href}
              className={`group flex flex-col gap-4 rounded-2xl border bg-white/5 p-5 transition-all sm:p-6 ${tone.card}`}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/15 text-lg font-black" aria-hidden>{s.emoji}</span>
                <div>
                  <p className="text-lg font-bold text-[color:var(--text-main)]">{s.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--text-sub)]">{s.desc}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold tracking-wide transition-transform group-hover:translate-x-1 ${tone.cta}`}>
                開始分析
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4 text-center">
        <Link
          href="/growth-center"
          className="inline-flex items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-3 text-xs font-black tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/15"
        >
          查看 AI 個人成長中心
        </Link>
      </div>
    </div>
  );
}
