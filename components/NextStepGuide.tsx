'use client';

import Link from 'next/link';

// 全站友善導引：看完任一系統的結果後，溫暖地帶使用者前往另外兩個系統。
// 文案簡單、全年齡（年輕人 / 長輩）都看得懂。

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
    emoji: '🎵',
    title: '人格主題曲',
    desc: '把你的生日、血型、姓名與時辰，變成一首專屬於你的歌。',
    tone: 'violet',
  },
  match: {
    href: '/match',
    emoji: '💕',
    title: '緣分配對',
    desc: '輸入兩個人的資料，看你們的人格契合度與相處之道。',
    tone: 'rose',
  },
  insight: {
    href: '/insight',
    emoji: '✨',
    title: '深度洞察',
    desc: '把潛力、盲點與下一步方向整理成白話建議。',
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

export default function NextStepGuide({ current }: { current: SystemKey }) {
  const others = (Object.keys(SYSTEMS) as SystemKey[]).filter((key) => key !== current);

  return (
    <div className="fortune-card p-6 sm:p-8">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">下一步</p>
        <h3 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">再多認識自己一點</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-sub)]">
          依照你現在最想知道的方向，選一個繼續看。
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
                <span className="text-3xl" aria-hidden>{s.emoji}</span>
                <div>
                  <p className="text-lg font-bold text-[color:var(--text-main)]">{s.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--text-sub)]">{s.desc}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold tracking-wide transition-transform group-hover:translate-x-1 ${tone.cta}`}>
                下一個 →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
