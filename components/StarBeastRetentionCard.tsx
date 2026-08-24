'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import starBeastsData from '@/data/star-beasts.json';
import type { FiveElementKey } from '@/lib/five-element-engine';

type Beast = { id: number; name: string; image: string; youngDivineImage: string; coreMeaning: string; season: 'spring' | 'summer' | 'autumn' | 'winter' };
type Element = FiveElementKey | 'wood' | 'fire' | 'earth' | 'metal' | 'water';

const BEASTS = starBeastsData.items as Beast[];
const SEASON_BY_ELEMENT: Record<Exclude<Element, 'earth'>, Beast['season']> = { wood: 'spring', fire: 'summer', metal: 'autumn', water: 'winter' };
const ELEMENT_LABEL: Record<Element, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

function stableNumber(value: string) {
  return [...value].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function seasonFor(element: Element, secondary: Element) {
  if (element !== 'earth') return SEASON_BY_ELEMENT[element];
  return secondary !== 'earth' ? SEASON_BY_ELEMENT[secondary] : 'winter';
}

export function StarBeastRetentionCard({
  source,
  primaryElement,
  secondaryElement,
  stableSeed,
  weeklySeed,
  evidence,
}: {
  source: '紫微斗數' | '八字命盤';
  primaryElement: Element;
  secondaryElement: Element;
  stableSeed: string;
  weeklySeed: string;
  evidence: string;
}) {
  const [saved, setSaved] = useState(false);
  const season = seasonFor(primaryElement, secondaryElement);
  const candidates = useMemo(() => BEASTS.filter((beast) => beast.season === season), [season]);
  const guardian = candidates[stableNumber(stableSeed) % candidates.length];
  const weekly = candidates[stableNumber(`${weeklySeed}:${primaryElement}`) % candidates.length];
  const storageKey = `star-beast-guardian:${stableSeed}`;

  useEffect(() => setSaved(localStorage.getItem(storageKey) === guardian.name), [guardian.name, storageKey]);
  const save = () => {
    localStorage.setItem(storageKey, guardian.name);
    setSaved(true);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-200/25 bg-[radial-gradient(circle_at_85%_15%,rgba(251,191,36,0.18),transparent_28%),linear-gradient(135deg,rgba(20,17,48,0.96),rgba(8,15,31,0.96))] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
      <div className="relative flex gap-4">
        <img src={guardian.youngDivineImage} alt={`${guardian.name}星宿幼體`} className="h-28 w-[4.9rem] shrink-0 rounded-xl border border-amber-100/25 object-cover object-center" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black tracking-[0.18em] text-amber-200">你的星宿守護</p>
          <h3 className="mt-1 font-serif text-2xl font-black text-white">{guardian.name}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-300">{guardian.coreMeaning}・由{source}的{ELEMENT_LABEL[primaryElement]}元素補強方向對應。</p>
          <p className="mt-2 text-[11px] leading-5 text-cyan-100/75">判定依據：{evidence}</p>
        </div>
      </div>
      <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
        <p className="text-[11px] font-black tracking-[0.14em] text-cyan-200">本週行動卡・{weekly.name}</p>
        <p className="mt-1 text-xs leading-5 text-slate-200">本週先練習「{weekly.coreMeaning}」，下次回來可查看新的流年行動提示。</p>
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={save} className="rounded-full border border-amber-200/35 bg-amber-300/15 px-4 py-2 text-xs font-black text-amber-50 transition hover:bg-amber-300/25">{saved ? '已收藏守護神獸' : '收藏我的守護神獸'}</button>
        <Link href="/star-beasts" className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-white/35">查看 28 張神獸卡</Link>
      </div>
    </section>
  );
}
