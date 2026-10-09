import type { Metadata } from 'next';
import { SHARE_DESCRIPTION, SHARE_OG_IMAGES, SHARE_TITLE, SHARE_TWITTER_IMAGES } from '@/lib/share-preview';

/** Game-only metadata and visual boundary; accounting stays in its existing services. */
export const metadata: Metadata = {
  title: '神獸戰鬥｜卡片戰場與格鬥競技場',
  description: '六十張神獸卡，親手選卡、佈陣、攻擊與施放技能。五元素相剋，手機同步看戰況與操控。',
  alternates: { canonical: '/beast-game' },
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    url: '/beast-game',
    type: 'article',
    locale: 'zh_TW',
    images: SHARE_OG_IMAGES,
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: SHARE_TWITTER_IMAGES,
  },
};

export default function BeastGameLayout({ children }: { children: React.ReactNode }) {
  return <div data-game-mode="battle" className="min-h-dvh bg-slate-950 font-sans text-slate-100">{children}</div>;
}
