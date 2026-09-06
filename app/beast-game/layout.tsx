import type { Metadata } from 'next';

/** Game-only metadata and visual boundary; accounting stays in its existing services. */
export const metadata: Metadata = {
  title: '神獸戰鬥｜卡片戰場與格鬥競技場',
  description: '六十張神獸卡，親手選卡、佈陣、攻擊與施放技能。五元素相剋，手機同步看戰況與操控。',
  alternates: { canonical: '/beast-game' },
  openGraph: {
    title: '神獸戰鬥｜卡片戰場與格鬥競技場',
    description: '六十張神獸卡，選三隻出戰，親手選擇攻擊、技能與切換。',
    url: '/beast-game',
    type: 'article',
    locale: 'zh_TW',
    images: [{ url: '/beast-game/stage/venues/forest-battle.webp', width: 1104, height: 621, alt: '神獸卡片戰場' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '神獸戰鬥｜卡片戰場與格鬥競技場',
    description: '六十張神獸卡，選三隻出戰，親手選擇攻擊、技能與切換。',
    images: ['/beast-game/stage/venues/forest-battle.webp'],
  },
};

export default function BeastGameLayout({ children }: { children: React.ReactNode }) {
  return <div data-game-mode="battle" className="min-h-dvh bg-slate-950 font-sans text-slate-100">{children}</div>;
}
