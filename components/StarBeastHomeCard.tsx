'use client';
// 2026-09-25 star-beast i18n toggle: homepage 星宿神獸 card with a local 中｜EN switch (fixed dictionary, no API).
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import styles from './StarBeastHomeCard.module.css';

type CardLang = 'zh' | 'en';

const STORAGE_KEY = 'starBeastCardLang';
const FADE_MS = 200;

const COPY = {
  zh: {
    label: '28 星宿・四象',
    badge: '60 種',
    title: '星宿神獸卡片',
    subtitle: '本月守護獸',
    desc: '二十八星宿各有本體與幼子，另有四象守護獸。找到屬於你的星宿與守護特質。',
    chips: ['免費瀏覽', '先看再玩'],
    cta: '查看神獸',
    chipsLabel: '可核對承諾',
    time: '1 分鐘',
  },
  en: {
    label: '28 Lunar Mansions · Four Symbols Collection',
    badge: '60 Species',
    title: 'Star Mansion Divine Beast Cards',
    subtitle: 'This month\'s guardian',
    desc: "28 adult forms, 28 young forms, and 4 Four Symbols guardians, 60 divine beasts in all. Browse the cards and meet each one's guardian traits.",
    chips: ['Free to browse', '60 to explore', 'Look before you play'],
    cta: 'View all 60 beasts',
    chipsLabel: 'Verifiable promises',
    time: '1 minute',
  },
} as const;

export default function StarBeastHomeCard() {
  // Server + first paint always Chinese; saved choice is applied after mount (no hydration mismatch).
  const [lang, setLang] = useState<CardLang>('zh');
  const [fading, setFading] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'en') setLang('en');
    } catch { /* storage unavailable: stay Chinese */ }
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, []);

  const switchTo = useCallback((next: CardLang) => {
    if (next === lang) return;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* keep session usable */ }
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setLang(next); return; }
    setFading(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setLang(next);
      setFading(false);
    }, FADE_MS);
  }, [lang]);

  const t = COPY[lang];
  const isZh = lang === 'zh';
  // zh keeps HomeTranslatedText so the site-wide interface language keeps working exactly as before.
  const text = (value: string) => (isZh ? <HomeTranslatedText text={value} /> : value);
  const fade = `transition-opacity duration-200 motion-reduce:transition-none ${fading ? 'opacity-0' : 'opacity-100'}`;

  // Wrapper is flex-col so the <a> stays a blockified flex item like before (desktop collapse rule sets `display: revert` on it).
  return (
    <div className={`${styles.wrap} order-9 w-full relative flex flex-col`}>
      <Link
        href="/star-beasts"
        lang={isZh ? 'zh-Hant' : 'en'}
        className="home-feature-launch home-feature-tier-explore w-full relative group overflow-hidden rounded-3xl border border-amber-200/30 bg-[radial-gradient(circle_at_82%_22%,rgba(251,191,36,0.22),transparent_28%),linear-gradient(110deg,rgba(12,18,42,0.98),rgba(63,35,70,0.62),rgba(12,18,42,0.98))] p-5 sm:p-6 text-left shadow-[0_0_30px_rgba(251,191,36,0.13)] transition-[border-color,box-shadow,transform] duration-500 hover:border-amber-200/70 hover:shadow-[0_0_50px_rgba(251,191,36,0.25)] active:scale-[0.99] flex flex-col gap-3 sm:gap-4"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

        {/* 【年柱 — 上層】視覺識別 */}
        <div className="relative w-full grid grid-cols-2 gap-3 sm:gap-4 items-center">
          <div className="justify-self-start grid h-12 w-12 place-items-center rounded-2xl border border-amber-100/35 bg-amber-200/10 font-serif text-2xl font-black text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.15)]" aria-hidden="true">宿</div>
          <div className="justify-self-end inline-block rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-[9px] font-bold tracking-widest text-amber-100">
            <span className={fade}>{text(t.badge)}</span>
          </div>
        </div>

        {/* 【月柱 — 上中層】名稱層 */}
        <div className="relative w-full grid grid-cols-2 gap-3 sm:gap-4 items-center pt-1">
          <div className="justify-self-start">
            <span className={`${styles.label} text-[10px] font-bold tracking-widest text-amber-100`}><span className={fade}>{text(t.label)}</span></span>
          </div>
          <h2 className="justify-self-end font-serif text-lg sm:text-xl font-black text-amber-50 tracking-tight text-right">
            <span className={fade}>{text(t.title)}</span>
          </h2>
        </div>

        {/* 【日柱 — 下中層】動態內容 */}
        <div className="relative w-full grid grid-cols-2 gap-3 sm:gap-4 items-center pt-1">
          <p className="justify-self-start text-[11px] font-semibold text-amber-200">
            <span className={fade}>{text(t.subtitle)}</span>
          </p>
          <span className="justify-self-end text-[10px] font-bold text-amber-100/70 px-2.5 py-1 rounded-full border border-amber-200/25 bg-amber-950/30">
            <span className={fade}>{text(t.time)}</span>
          </span>
        </div>

        {/* 【時柱 — 下層】行動層 */}
        <div className="relative w-full pt-2">
          <div className="home-feature-cta flex items-center justify-center gap-2 rounded-2xl border border-amber-200/40 bg-amber-300/15 px-6 py-4 text-sm font-bold text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.15)] transition group-hover:bg-amber-300/25 active:scale-95">
            <span className={fade}>{text(t.cta)}</span><span className="transition-transform group-hover:translate-x-1.5">➜</span>
          </div>
        </div>
      </Link>

      {/* Sibling of the <a>, not nested: clicking only switches language, never navigates. */}
      <div
        role="group"
        aria-label="卡片語言 Card language"
        className="absolute right-2.5 top-2 z-10 flex items-center rounded-full border border-amber-200/30 bg-slate-950/70 p-0.5 text-[11px] font-bold text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.12)] backdrop-blur-sm"
      >
        {(['zh', 'en'] as const).map((code, index) => {
          const active = lang === code;
          return (
            <span key={code} className="flex items-center">
              {index === 1 && <span aria-hidden="true" className="px-0.5 text-amber-200/40">｜</span>}
              <button
                type="button"
                lang={code === 'zh' ? 'zh-Hant' : 'en'}
                aria-pressed={active}
                aria-label={code === 'zh' ? '切換為中文' : 'Switch to English'}
                onClick={() => switchTo(code)}
                className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-full px-2 leading-none transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${active ? 'bg-amber-300/25 text-amber-50 shadow-[inset_0_0_0_1px_rgba(253,230,138,0.35)]' : 'bg-transparent text-amber-100/60 hover:bg-amber-300/10 hover:text-amber-100'}`}
              >
                {code === 'zh' ? '中' : 'EN'}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
