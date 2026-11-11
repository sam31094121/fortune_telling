'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import modeStyles from './GameModes.module.css';
import CatalogBeastCard from '@/components/battlefield/CatalogBeastCard';
import starBeastsData from '@/data/star-beasts.json';
import SelfStarBeastEntry from '@/components/SelfStarBeastEntry';
import Match3ElementGlyph from '@/components/battlefield/Match3ElementGlyph';
import match3Styles from '@/components/battlefield/Match3Board.module.css';
import type { BeastElement } from '@/lib/beast-game/elements';

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

// 卡片戰鬥統一闖關；寶珠戰保持獨立入口。
const GAME_MODES = [
  { id: 'campaign', step: '卡片闖關', iconPath: 'm4 3 3 1 12 13-2 2L4 6 4 3Z M3 17l4 4 M5 19l-2 2 M17 3l3 1-1 3-5 5 M10 15l-3 4 M17 17l4 4 M17 21l4-4', title: '神獸戰鬥', desc: '合體培養、五對五押卡，勝利後逐關挑戰', href: '/beast-game/battlefield' },
  { id: 'bead-hard', step: '⑤ 寶珠困難', iconPath: 'M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M6 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M18 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8', title: '寶石捷連線', desc: '56 顆寶珠、數字累加、盾牌清場，逐關挑戰', href: '/beast-game/match3-hard' },
] as const;

// Decorative 7×8 board artwork; no game state, rewards or customer progress.
const ORB_ENTRY_BOARD = [
  '空風水火地風空', '火地空水火水地', '風空地火水水空', '風水水水地水水',
  '地水空水水水地', '空水火地風火地', '水地空風水火空', '風火地水空地風',
] as const;
const ENTRY_ELEMENTS: Record<string, BeastElement> = { 空: 'SPACE', 風: 'AIR', 水: 'WATER', 火: 'FIRE', 地: 'EARTH' };
const ENTRY_GEMS = { 空: match3Styles.space, 風: match3Styles.air, 水: match3Styles.water, 火: match3Styles.fire, 地: match3Styles.earth } as const;

// 2026-11-09 perf：示意盤 56 格是固定內容，建一次重複使用；選卡／關卡時 React 直接略過，不再重建。
const ORB_ENTRY_CELLS = ORB_ENTRY_BOARD.flatMap((row, y) => [...row].map((element, x) => (
  <span key={`${x}-${y}`} data-entry-element={ENTRY_ELEMENTS[element]} data-entry-shield={y === 6 && [1, 3, 5].includes(x) || undefined} className={`${match3Styles.orb} ${ENTRY_GEMS[element as ProductElement]} ${modeStyles.orbCell} ${y === 6 && [1, 3, 5].includes(x) ? `${match3Styles.magic} ${match3Styles.shieldCell}` : ''}`}>
    <span className={match3Styles.gem} />
    {y === 6 && [1, 3, 5].includes(x) ? <img className={match3Styles.shieldOrb} src="/pwa/save-shield-080.png" alt="" draggable={false} /> : <Match3ElementGlyph element={ENTRY_ELEMENTS[element]} className={match3Styles.elementGlyph} />}
  </span>
)));

export default function StarBeastsPage() {
  const [season, setSeason] = useState<Season>('all');
  const [form, setForm] = useState<Form>('awakened');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const visibleBeasts = useMemo(() => BEASTS
    .filter((beast) => season === 'all' || beast.season === season)
    .toSorted((a, b) => SEASON_ORDER[a.season] - SEASON_ORDER[b.season] || a.id - b.id), [season]);
  const selected = selectedId === null ? null : BEASTS.find((beast) => beast.id === selectedId) ?? null;
  // 2026-11-09 perf：詳細卡對話框常駐 DOM，開／關只切 display，內容沿用最後一次開啟的卡。
  // 全站樣式表有大量 body:has()／[class*=] 規則，整個對話框插入或移除時瀏覽器要整頁重算樣式（約 1,800 節點，
  // CPU 4× 降速下單次 250ms 以上）；改成切換顯示後只重算對話框本身。畫面與操作不變。
  const [shownId, setShownId] = useState<number>(BEASTS[0].id);
  const shown = BEASTS.find((beast) => beast.id === shownId) ?? BEASTS[0];
  const openBeast = (id: number) => {
    setShownId(id);
    setSelectedId(id);
  };
  // 2026-11-09 perf round2：對話框第一次從 display:none 變成顯示時要整塊排版（4× 降速下約 100–150ms）。
  // 頁面閒置後先把「關閉中的對話框」改成 visibility:hidden（仍排版、不繪製、不可點、不在無障礙樹），
  // 之後開卡只剩切換可見度與換內容，畫面、版面完全不變。
  const [dialogWarm, setDialogWarm] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const idleId = w.requestIdleCallback(() => setDialogWarm(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(idleId);
    }
    const timerId = window.setTimeout(() => setDialogWarm(true), 600);
    return () => window.clearTimeout(timerId);
  }, []);
  // 對話框常駐後，內文捲動位置會保留。只有使用者真的捲過內文時，才在「關閉後」下一個畫格把它捲回頂端，
  // 讓下次開卡和原本重新顯示時一樣從頂端開始；上一張／下一張照舊保留。開卡當下完全不碰排版。
  const dialogArticleRef = useRef<HTMLElement>(null);
  const dialogScrolledRef = useRef(false);
  useEffect(() => {
    if (selectedId !== null || !dialogScrolledRef.current) return;
    const frameId = window.requestAnimationFrame(() => {
      if (dialogArticleRef.current) dialogArticleRef.current.scrollTop = 0;
      dialogScrolledRef.current = false;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedId]);
  const closedDialogStyle: CSSProperties = dialogWarm
    ? { visibility: 'hidden', pointerEvents: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none' }
    : { display: 'none' };

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
    openBeast(visibleBeasts[nextIndex].id);
  };

  const selectSeason = (nextSeason: Season) => {
    setSeason(nextSeason);
    setSelectedId(null);
  };


  return (
    <main data-perf-quiet-body className="min-h-screen overflow-x-hidden bg-[#050612] px-4 pb-16 pt-5 text-white sm:px-6 sm:pt-8">
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
          <nav className="mt-5" aria-label="選擇遊戲玩法" data-beast-chooser>
            <p className="text-xs font-black tracking-[0.22em] text-amber-200/85">選一種玩法開始</p>
            <ul className={modeStyles.list}>
              {GAME_MODES.filter((mode) => !['bead', 'orb'].includes(mode.id)).map((mode) => (
                <li key={mode.id} className={modeStyles.item}>
                  <Link href={mode.href} data-difficulty-choice={mode.id} className={`${modeStyles.card} ${mode.id === 'bead-hard' ? modeStyles.orbGameCard : modeStyles.duelGameCard}`}>
                    {mode.id === 'bead-hard' ? <>
                      <span className={modeStyles.orbArtwork} aria-hidden="true">
                        <span className={modeStyles.orbBoard}>
                          {ORB_ENTRY_CELLS}
                          <svg className={`${modeStyles.orbConnection} ${match3Styles.water}`} viewBox="0 0 7 8" fill="none">
                            <path data-entry-chain d="M .5 6.5 L 1.5 5.5 L 1.5 4.5 L 1.5 3.5 L 2.5 3.5 L 3.5 3.5 L 3.5 4.5 L 4.5 4.5 L 5.5 4.5 L 6.5 3.5 L 5.5 2.5 L 4.5 2.5 L 3.5 1.5 L 2.5 .5" />
                            <circle className={modeStyles.chainStart} cx=".5" cy="6.5" r=".13" />
                            <path className={modeStyles.chainDirections} d="M 1.34 4.15 L 1.5 3.97 L 1.66 4.15 M 2.85 3.34 L 3.03 3.5 L 2.85 3.66 M 3.34 3.9 L 3.5 4.08 L 3.66 3.9 M 5.15 2.34 L 4.97 2.5 L 5.15 2.66" />
                            <circle cx="2.5" cy=".5" r=".39" />
                          </svg>
                        </span>
                      </span>
                      <strong className={modeStyles.orbGameTitle}>{mode.title}<span aria-hidden="true">↗</span></strong>
                    </> : <>
                      <span className={modeStyles.duelArtwork} aria-hidden="true">
                        <img className={modeStyles.duelTiger} src="/beast-game/rig/baihu/pounce-open.v2.webp" alt="" draggable={false} />
                        <img className={modeStyles.duelPhoenix} src="/beast-game/rig/zhuque/pounce-open.webp" alt="" draggable={false} />
                      </span>
                      <strong className={modeStyles.duelTitle}>{mode.title}<span aria-hidden="true">↗</span></strong>
                    </>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <SelfStarBeastEntry onFound={(id) => { setForm('awakened'); setSeason('all'); openBeast(id); }} />
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
              <button key={beast.id} type="button" onClick={() => openBeast(beast.id)} className="group relative text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
                <CatalogBeastCard id={`beast_${form === 'young' ? 'y' : 'a'}${String(beast.id).padStart(2, '0')}`} />
                <p className="mt-1 truncate text-[11px] text-amber-100/80">{beast.coreMeaning}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-md sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`${shown.name}詳細資料`} aria-hidden={selected ? undefined : true} style={selected ? undefined : closedDialogStyle}>
        <button type="button" aria-label="關閉詳細資料" onClick={() => setSelectedId(null)} className="absolute inset-0 cursor-default" />
        <article ref={dialogArticleRef} onScroll={() => { dialogScrolledRef.current = true; }} className="relative z-10 max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] border border-white/15 bg-[#0a1025] shadow-2xl sm:rounded-[2rem]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a1025]/95 px-5 py-4 backdrop-blur sm:px-7">
            <p className="text-xs font-black tracking-[0.18em] text-amber-200">CARD {String(shown.id).padStart(2, '0')} ・ {FORM_LABELS[form]} ・ {SEASON_NAMES[shown.season]}</p>
            <button type="button" onClick={() => setSelectedId(null)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-white/40 hover:text-white">關閉 ✕</button>
          </div>
          <div className="grid gap-6 p-5 sm:grid-cols-[minmax(230px,0.8fr)_minmax(0,1.2fr)] sm:p-7">
            <div className="mx-auto w-full max-w-[330px] overflow-hidden rounded-2xl border border-amber-200/25 bg-slate-950 shadow-[0_18px_45px_rgba(0,0,0,0.38)]">
              <CatalogBeastCard id={`beast_${form === 'young' ? 'y' : 'a'}${String(shown.id).padStart(2, '0')}`} />
            </div>
            <div className="flex min-w-0 flex-col justify-center">
              <p className="text-sm font-bold text-slate-400">{shown.animal}・{shown.symbolicPart}</p>
              <h2 className="mt-2 font-serif text-4xl font-black text-white">{shown.name}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5">{PRODUCT_ELEMENT[elementForBeast(shown.name)]}元素</span>
                <span className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1.5 text-emerald-100">生・{PRODUCT_ELEMENT[ELEMENT_RULES[elementForBeast(shown.name)].generates]}</span>
                <span className="rounded-full border border-rose-200/25 bg-rose-300/10 px-3 py-1.5 text-rose-100">剋・{PRODUCT_ELEMENT[ELEMENT_RULES[elementForBeast(shown.name)].overcomes]}</span>
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
                <p className="mt-2 font-serif text-2xl font-black text-amber-50">{shown.coreMeaning}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-xs font-black tracking-[0.16em] text-cyan-100/75">性格與命運特質</p>
                <p className="mt-2 text-sm leading-7 text-slate-200">{shown.traits}</p>
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
    </main>
  );
}
