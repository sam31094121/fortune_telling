'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import modeStyles from './GameModes.module.css';
import CatalogBeastCard from '@/components/battlefield/CatalogBeastCard';
import starBeastsData from '@/data/star-beasts.json';
import SelfStarBeastEntry from '@/components/SelfStarBeastEntry';
import { MAX_STAKE_CARDS } from '@/lib/beast-game/stake-rules';

type Season = 'all' | 'spring' | 'summer' | 'autumn' | 'winter';
type Form = 'young' | 'awakened';
type Element = '木' | '火' | '土' | '金' | '水';
type ProductElement = '空' | '風' | '水' | '火' | '地';

type StarBeast = {
  id: number;
  name: string;
  animal: string;
  season: Exclude<Season, 'all'>;
  image: string;
  youngDivineImage: string;
  symbolicPart: string;
  coreMeaning: string;
  traits: string;
};

const BEASTS = starBeastsData.items as StarBeast[];

const FOUR_GUARDIANS = [
  { name: '青龍', direction: '東', season: '春', element: '木', accent: 'text-emerald-100' },
  { name: '朱雀', direction: '南', season: '夏', element: '火', accent: 'text-rose-100' },
  { name: '白虎', direction: '西', season: '秋', element: '金', accent: 'text-amber-100' },
  { name: '玄武', direction: '北', season: '冬', element: '水', accent: 'text-cyan-100' },
] as const;

const ELEMENT_RULES: Record<Element, { generates: Element; overcomes: Element }> = {
  木: { generates: '火', overcomes: '土' },
  火: { generates: '土', overcomes: '金' },
  土: { generates: '金', overcomes: '水' },
  金: { generates: '水', overcomes: '木' },
  水: { generates: '木', overcomes: '火' },
};

const PRODUCT_ELEMENT: Record<Element, ProductElement> = {
  金: '空', 木: '風', 水: '水', 火: '火', 土: '地',
};

const elementForBeast = (name: string): Element => {
  const luminary = name[1];
  if (luminary === '日') return '火';
  if (luminary === '月') return '水';
  return (['木', '火', '土', '金', '水'].includes(luminary) ? luminary : '土') as Element;
};

const SEASON_ORDER: Record<Exclude<Season, 'all'>, number> = {
  spring: 0,
  summer: 1,
  autumn: 2,
  winter: 3,
};

const SEASONS: Array<{ id: Season; label: string; guardian: string; detail: string; className: string }> = [
  { id: 'all', label: '全覽', guardian: '二十八宿', detail: '28 隻完整收藏', className: 'border-white/20 bg-white/10 text-white' },
  { id: 'spring', label: '春', guardian: '東方蒼龍', detail: '七宿', className: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100' },
  { id: 'summer', label: '夏', guardian: '南方朱雀', detail: '七宿', className: 'border-rose-300/35 bg-rose-400/10 text-rose-100' },
  { id: 'autumn', label: '秋', guardian: '西方白虎', detail: '七宿', className: 'border-amber-300/35 bg-amber-400/10 text-amber-100' },
  { id: 'winter', label: '冬', guardian: '北方玄武', detail: '七宿', className: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100' },
];

const SEASON_ACCENTS: Record<Exclude<Season, 'all'>, string> = {
  spring: 'from-emerald-300/80 to-lime-200/80',
  summer: 'from-rose-300/80 to-orange-200/80',
  autumn: 'from-amber-300/80 to-yellow-100/80',
  winter: 'from-cyan-300/80 to-blue-200/80',
};

const SEASON_NAMES: Record<Exclude<Season, 'all'>, string> = {
  spring: '東方蒼龍・春',
  summer: '南方朱雀・夏',
  autumn: '西方白虎・秋',
  winter: '北方玄武・冬',
};

const FORMS: Array<{ id: Form; label: string; detail: string }> = [
  { id: 'awakened', label: '本體神獸', detail: '二十八張成年守護神獸' },
  { id: 'young', label: '神獸幼子', detail: '查看同血統的幼子與守護延續' },
];

const FORM_LABELS: Record<Form, string> = {
  young: '神獸幼子',
  awakened: '本體神獸',
};

// 2026-10-17 beast card：進到這頁就看到三種玩法，點一下直接開始；沿用既有三個遊戲入口，不新增遊戲邏輯。
const GAME_MODES = [
  { id: 'easy', step: '① 簡單', iconPath: 'M13 2 4 14h7l-1 8 10-13h-7l1-7Z', title: '三卡免費戰場', desc: '選 3 張卡開戰，不扣收藏卡', href: '/beast-game?mode=easy' },
  { id: 'medium', step: '② 中度', iconPath: 'M20 12a8 8 0 1 1-8-8 M16 12a4 4 0 1 1-4-4 M12 12l9-9 M16 3h5v5', title: '單卡押注', desc: '押 1 張收藏卡；輸了失去 1 張', href: '/beast-game/lineup' },
  { id: 'hard', step: '③ 困難', iconPath: 'm4 3 3 1 12 13-2 2L4 6 4 3Z M3 17l4 4 M5 19l-2 2 M17 3l3 1-1 3-5 5 M10 15l-3 4 M17 17l4 4 M17 21l4-4', title: '五卡押注戰場', desc: `押 1～${MAX_STAKE_CARDS} 張收藏卡；輸了只失去押上的卡`, href: '/beast-game/battlefield' },
  { id: 'bead', step: '④ 寶珠', iconPath: 'M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M6 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M18 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8', title: '寶珠戰鬥', desc: '自選五張卡，拖曳連珠出招', href: '/beast-game/match3' },
  { id: 'bead-hard', step: '⑤ 寶珠困難', iconPath: 'M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M6 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M18 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8', title: '寶珠戰・困難', desc: '49 顆寶珠、數字累加、盾牌清場，逐關挑戰', href: '/beast-game/match3-hard' },
] as const;

export default function StarBeastsPage() {
  const [season, setSeason] = useState<Season>('all');
  const [form, setForm] = useState<Form>('awakened');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const visibleBeasts = useMemo(() => BEASTS
    .filter((beast) => season === 'all' || beast.season === season)
    .toSorted((a, b) => SEASON_ORDER[a.season] - SEASON_ORDER[b.season] || a.id - b.id), [season]);
  const selected = selectedId === null ? null : BEASTS.find((beast) => beast.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
      if (event.key === 'ArrowLeft') moveSelected(-1);
      if (event.key === 'ArrowRight') moveSelected(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const moveSelected = (direction: -1 | 1) => {
    if (!selected) return;
    const currentIndex = visibleBeasts.findIndex((beast) => beast.id === selected.id);
    const nextIndex = (currentIndex + direction + visibleBeasts.length) % visibleBeasts.length;
    setSelectedId(visibleBeasts[nextIndex].id);
  };

  const selectSeason = (nextSeason: Season) => {
    setSeason(nextSeason);
    setSelectedId(null);
  };


  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050612] px-4 pb-16 pt-5 text-white sm:px-6 sm:pt-8">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <Link href="/" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-amber-200/50 hover:text-amber-100">
          <span aria-hidden="true">←</span> 回到主畫面
        </Link>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-amber-200/25 bg-[radial-gradient(circle_at_82%_20%,rgba(251,191,36,0.22),transparent_24%),radial-gradient(circle_at_12%_110%,rgba(34,211,238,0.18),transparent_35%),linear-gradient(135deg,rgba(25,20,56,0.96),rgba(6,12,30,0.96))] px-5 py-8 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute right-5 top-5 font-serif text-7xl font-black text-amber-100/[0.06] sm:right-10 sm:text-9xl">28</div>
          <p className="text-xs font-black tracking-[0.28em] text-amber-200/85">THE TWENTY-EIGHT MANSIONS</p>
          <h1 className="mt-3 font-serif text-4xl font-black tracking-wide text-white sm:text-6xl">星宿神獸卡片</h1>
          <p className="mt-4 text-sm text-slate-300">二十八星宿分類，各有本體與幼子形態；另有四隻四象守護獸。</p>
          {/* 2026-10-17 beast card：原本的「開始 →」換成三選一並放在「找出我的本體神獸」上面，手機第一屏就看得到三個選項，客人不用再多點一層。 */}
          <nav className="mt-5" aria-label="選擇遊戲難度" data-beast-chooser>
            <p className="text-xs font-black tracking-[0.22em] text-amber-200/85">選一種玩法開始</p>
            <ul className={modeStyles.list}>
              {GAME_MODES.map((mode) => (
                <li key={mode.id} className={modeStyles.item}>
                  <Link href={mode.href} data-difficulty-choice={mode.id} className={modeStyles.card}>
                    <span aria-hidden="true" className={modeStyles.emblem}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d={mode.iconPath} /></svg>
                    </span>
                    <span className={modeStyles.content}>
                      <span className={modeStyles.level}>{mode.step}</span>
                      <strong className={modeStyles.title}>{mode.title}</strong>
                      <span className={modeStyles.description}>{mode.desc}</span>
                    </span>
                    <span aria-hidden="true" className={modeStyles.arrow}>↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <SelfStarBeastEntry onFound={(id) => { setForm('awakened'); setSeason('all'); setSelectedId(id); }} />
          <details className="mt-4 max-w-2xl text-xs text-slate-400">
            <summary className="min-h-[44px] cursor-pointer py-3 font-bold text-slate-300">這裡有什麼？</summary>
            <p className="mt-2 leading-6">二十八星宿分為春夏秋冬，每一宿都有本體神獸與神獸幼子。</p>
          </details>
        </header>

        <section className="mt-7" aria-labelledby="four-guardians-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-amber-200/75">FOUR GUARDIANS</p>
              <h2 id="four-guardians-title" className="mt-1 font-serif text-2xl font-black">紫微四大神獸</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">四方守護</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FOUR_GUARDIANS.map((guardian) => (
              <article key={guardian.name} className="group overflow-hidden rounded-2xl border border-amber-200/20 bg-slate-950/70 shadow-lg">
                <div className="aspect-[63/88] overflow-hidden bg-black">
                  <CatalogBeastCard name={guardian.name} />
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-3">
                  <h3 className={`font-serif text-lg font-black ${guardian.accent}`}>{guardian.name}</h3>
                  <div className="text-right text-[11px] font-bold text-slate-400">
                    <p>{guardian.direction}・{guardian.season}・{PRODUCT_ELEMENT[guardian.element]}</p>
                    <p className="mt-0.5 text-amber-100/70">生{PRODUCT_ELEMENT[ELEMENT_RULES[guardian.element].generates]}・剋{PRODUCT_ELEMENT[ELEMENT_RULES[guardian.element].overcomes]}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-7" aria-label="依四象篩選神獸卡片">
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {SEASONS.map((item) => (
              <button key={item.id} type="button" onClick={() => selectSeason(item.id)} aria-pressed={season === item.id}
                className={`min-w-[112px] rounded-2xl border px-4 py-3 text-left transition ${season === item.id ? `${item.className} shadow-[0_0_24px_rgba(255,255,255,0.1)]` : 'border-white/10 bg-slate-950/45 text-slate-400 hover:border-white/25 hover:text-white'}`}>
                <span className="block text-sm font-black">{item.label}・{item.guardian}</span>
                <span className="mt-1 block text-[11px] opacity-75">{item.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4" aria-label="選擇本體神獸或神獸幼子">
          <div className="flex w-full rounded-2xl border border-white/10 bg-slate-950/55 p-1.5 shadow-lg sm:inline-flex sm:w-auto">
            {FORMS.map((item) => (
              <button key={item.id} type="button" onClick={() => setForm(item.id)} aria-pressed={form === item.id}
                className={`min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left transition sm:flex-none sm:px-5 ${form === item.id ? 'bg-amber-300/15 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.12)]' : 'text-slate-400 hover:text-white'}`}>
                <span className="block text-sm font-black">{item.label}</span>
                <span className="mt-0.5 block text-[10px] font-medium opacity-75">{item.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5" aria-live="polite">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-amber-200/75">CARD COLLECTION</p>
              <h2 className="mt-1 font-serif text-2xl font-black text-white">{FORM_LABELS[form]}・{season === 'all' ? '全部神獸' : SEASON_NAMES[season]}</h2>
            </div>
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-slate-300">{visibleBeasts.length} 張{FORM_LABELS[form]}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {visibleBeasts.map((beast) => (
              <button key={beast.id} type="button" onClick={() => setSelectedId(beast.id)} className="group relative text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
                <CatalogBeastCard id={`beast_${form === 'young' ? 'y' : 'a'}${String(beast.id).padStart(2, '0')}`} />
                <p className="mt-1 truncate text-[11px] text-amber-100/80">{beast.coreMeaning}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-md sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`${selected.name}詳細資料`}>
          <button type="button" aria-label="關閉詳細資料" onClick={() => setSelectedId(null)} className="absolute inset-0 cursor-default" />
          <article className="relative z-10 max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] border border-white/15 bg-[#0a1025] shadow-2xl sm:rounded-[2rem]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a1025]/95 px-5 py-4 backdrop-blur sm:px-7">
              <p className="text-xs font-black tracking-[0.18em] text-amber-200">CARD {String(selected.id).padStart(2, '0')} ・ {FORM_LABELS[form]} ・ {SEASON_NAMES[selected.season]}</p>
              <button type="button" onClick={() => setSelectedId(null)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-white/40 hover:text-white">關閉 ✕</button>
            </div>
            <div className="grid gap-6 p-5 sm:grid-cols-[minmax(230px,0.8fr)_minmax(0,1.2fr)] sm:p-7">
              <div className="mx-auto w-full max-w-[330px] overflow-hidden rounded-2xl border border-amber-200/25 bg-slate-950 shadow-[0_18px_45px_rgba(0,0,0,0.38)]">
                <CatalogBeastCard id={`beast_${form === 'young' ? 'y' : 'a'}${String(selected.id).padStart(2, '0')}`} />
              </div>
              <div className="flex min-w-0 flex-col justify-center">
                <p className="text-sm font-bold text-slate-400">{selected.animal}・{selected.symbolicPart}</p>
                <h2 className="mt-2 font-serif text-4xl font-black text-white">{selected.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5">{PRODUCT_ELEMENT[elementForBeast(selected.name)]}元素</span>
                  <span className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1.5 text-emerald-100">生・{PRODUCT_ELEMENT[ELEMENT_RULES[elementForBeast(selected.name)].generates]}</span>
                  <span className="rounded-full border border-rose-200/25 bg-rose-300/10 px-3 py-1.5 text-rose-100">剋・{PRODUCT_ELEMENT[ELEMENT_RULES[elementForBeast(selected.name)].overcomes]}</span>
                </div>
                <div className="mt-4 flex w-full max-w-full rounded-xl border border-white/10 bg-white/[0.04] p-1 sm:w-fit">
                  {FORMS.map((item) => (
                    <button key={item.id} type="button" onClick={() => setForm(item.id)} aria-pressed={form === item.id}
                      className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-xs font-black transition sm:flex-none sm:px-3 ${form === item.id ? 'bg-amber-300/20 text-amber-50' : 'text-slate-400 hover:text-white'}`}>
                      查看{item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-400">本體神獸與神獸幼子是兩張獨立收藏卡，彼此共享星宿血統。</p>
                <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-300/[0.07] p-4">
                  <p className="text-xs font-black tracking-[0.16em] text-amber-200/80">核心意義</p>
                  <p className="mt-2 font-serif text-2xl font-black text-amber-50">{selected.coreMeaning}</p>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-xs font-black tracking-[0.16em] text-cyan-100/75">性格與命運特質</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">{selected.traits}</p>
                </div>
                <Link href="/beast-game" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-cyan-100/40 bg-cyan-300/15 px-4 py-3 text-sm font-black text-cyan-50">開始 →</Link>
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={() => moveSelected(-1)} className="flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-black text-white transition hover:border-cyan-200/55 hover:bg-cyan-300/10">← 上一張</button>
                  <button type="button" onClick={() => moveSelected(1)} className="flex-1 rounded-xl border border-amber-200/35 bg-amber-300/15 px-4 py-3 text-sm font-black text-amber-50 transition hover:border-amber-100 hover:bg-amber-300/25">下一張 →</button>
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-500">可使用鍵盤 ← → 切換，Esc 關閉</p>
              </div>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
