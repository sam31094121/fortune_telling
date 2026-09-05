'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import starBeastsData from '@/data/star-beasts.json';

type Season = 'all' | 'spring' | 'summer' | 'autumn' | 'winter';
type Form = 'young' | 'awakened';

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
  { id: 'awakened', label: '本命神獸', detail: '先認識與你共鳴的成年守護神獸' },
  { id: 'young', label: '神獸幼子', detail: '查看同血統的幼子與守護延續' },
];

const FORM_LABELS: Record<Form, string> = {
  young: '神獸幼子',
  awakened: '本命神獸',
};

export default function StarBeastsPage() {
  const [season, setSeason] = useState<Season>('all');
  const [form, setForm] = useState<Form>('awakened');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [savedGuardianId, setSavedGuardianId] = useState<number | null>(null);
  const visibleBeasts = useMemo(() => BEASTS
    .filter((beast) => season === 'all' || beast.season === season)
    .toSorted((a, b) => SEASON_ORDER[a.season] - SEASON_ORDER[b.season] || a.id - b.id), [season]);
  const selected = selectedId === null ? null : BEASTS.find((beast) => beast.id === selectedId) ?? null;

  useEffect(() => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith('star-beast-guardian:')) continue;
      const savedName = window.localStorage.getItem(key);
      const guardian = BEASTS.find((beast) => beast.name === savedName);
      if (guardian) {
        setSavedGuardianId(guardian.id);
        break;
      }
    }
  }, []);

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

  const cardImage = (beast: StarBeast, targetForm = form) => targetForm === 'young' ? beast.youngDivineImage : beast.image;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050612] px-4 pb-16 pt-5 text-white sm:px-6 sm:pt-8">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-amber-200/50 hover:text-amber-100">
          <span aria-hidden="true">←</span> 回到主畫面
        </Link>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-amber-200/25 bg-[radial-gradient(circle_at_82%_20%,rgba(251,191,36,0.22),transparent_24%),radial-gradient(circle_at_12%_110%,rgba(34,211,238,0.18),transparent_35%),linear-gradient(135deg,rgba(25,20,56,0.96),rgba(6,12,30,0.96))] px-5 py-8 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute right-5 top-5 font-serif text-7xl font-black text-amber-100/[0.06] sm:right-10 sm:text-9xl">28</div>
          <p className="text-xs font-black tracking-[0.28em] text-amber-200/85">THE TWENTY-EIGHT MANSIONS</p>
          <h1 className="mt-3 font-serif text-4xl font-black tracking-wide text-white sm:text-6xl">星宿神獸卡片</h1>
          <p className="mt-4 text-sm text-slate-300">先遇見專屬於你的守護神獸。</p>
          {savedGuardianId ? (
            <button type="button" onClick={() => setSelectedId(savedGuardianId)} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-amber-100/55 bg-amber-300/20 px-6 text-sm font-black text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.18)] transition hover:bg-amber-300/30">
              查看我的本命神獸
            </button>
          ) : (
            <Link href="/bazi" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-amber-100/55 bg-amber-300/20 px-6 text-sm font-black text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.18)] transition hover:bg-amber-300/30">
              找出我的本命神獸
            </Link>
          )}
          <details className="mt-4 max-w-2xl text-xs text-slate-400">
            <summary className="cursor-pointer font-bold text-slate-300">這裡有什麼？</summary>
            <p className="mt-2 leading-6">二十八星宿分為春夏秋冬，每隻都有本命神獸與同血統幼子。</p>
          </details>
        </header>

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

        <section className="mt-4" aria-label="選擇本命神獸或神獸幼子">
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
            {visibleBeasts.map((beast) => {
              const hasLeatherCardSurface = form === 'awakened';
              // 第 28 張來源圖比例較窄；只在本命網格內下移影像，避免頭部被固定內框裁掉。
              const hasLoweredBeastImage = hasLeatherCardSurface && beast.id === 28;

              return (
                <button
                  key={beast.id}
                  type="button"
                  onClick={() => setSelectedId(beast.id)}
                  data-card-surface={hasLeatherCardSurface ? 'leather' : undefined}
                  data-card-interior={hasLeatherCardSurface ? 'leather-layered' : undefined}
                  className={`group relative overflow-hidden rounded-2xl border text-left shadow-lg transition duration-300 hover:-translate-y-1 hover:border-amber-200/55 hover:shadow-[0_14px_35px_rgba(0,0,0,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200 ${hasLeatherCardSurface
                    ? 'border-[#bb8854]/75 bg-[radial-gradient(ellipse_at_18%_12%,rgba(255,224,174,0.18),transparent_34%),radial-gradient(circle_at_80%_92%,rgba(32,15,9,0.35),transparent_42%),repeating-linear-gradient(105deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_5px),linear-gradient(135deg,#5a3825,#2e1b16_50%,#68442a)] p-1 shadow-[0_16px_32px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,229,184,0.2)]'
                    : 'border-white/10 bg-slate-900/70'}`}
                >
                  <div className={hasLeatherCardSurface ? 'relative overflow-hidden rounded-[0.72rem] border border-[#704329]/80 bg-[#100f19] shadow-[inset_0_0_0_1px_rgba(35,17,10,0.85)]' : ''}>
                    <div data-card-image-frame={hasLeatherCardSurface ? 'leather-cropped' : undefined} className={hasLeatherCardSurface ? 'relative m-[3px] aspect-[53/79] overflow-hidden rounded-[0.5rem] bg-[#24140d] p-[2px] ring-1 ring-inset ring-[#9a6238]/75 shadow-[inset_0_0_0_1px_rgba(20,10,6,0.75)]' : 'relative aspect-[53/79] overflow-hidden bg-slate-950'}>
                      <div className={hasLeatherCardSurface ? 'relative h-full overflow-hidden rounded-[0.32rem] bg-slate-950' : 'h-full'}>
                        <img src={cardImage(beast)} alt={`${beast.name}${FORM_LABELS[form]}神獸卡`} className={`h-full w-full object-cover object-center transition duration-500 ${hasLeatherCardSurface ? `scale-[1.42] group-hover:scale-[1.455]${hasLoweredBeastImage ? ' translate-y-[6%]' : ''}` : 'object-contain group-hover:scale-[1.035]'}`} />
                      </div>
                      {!hasLeatherCardSurface && (
                        <span data-card-season-accent="young" className={`absolute left-2 top-2 h-1.5 w-8 rounded-full bg-gradient-to-r ${SEASON_ACCENTS[beast.season]}`} />
                      )}
                      {!hasLeatherCardSurface && (
                        <span className="absolute right-2 top-2 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-black text-white backdrop-blur">{String(beast.id).padStart(2, '0')}</span>
                      )}
                      {!hasLeatherCardSurface && (
                        <span data-card-form-overlay="young" className="absolute bottom-2 left-2 rounded-full border border-white/15 bg-slate-950/75 px-2 py-1 text-[10px] font-black text-amber-100 backdrop-blur">{FORM_LABELS[form]}</span>
                      )}
                    </div>
                    <div className={hasLeatherCardSurface ? 'relative mx-[3px] mb-[3px] rounded-b-[0.5rem] border border-[#e8bd7a]/35 border-t-[#e8bd7a]/55 bg-[linear-gradient(100deg,rgba(92,56,35,0.95),rgba(36,20,17,0.98),rgba(91,56,35,0.95))] p-2 shadow-[inset_0_1px_0_rgba(255,229,184,0.1)] sm:p-2.5' : 'p-2 sm:p-2.5'}>
                      {hasLeatherCardSurface ? (
                        <div className="flex items-center gap-1 whitespace-nowrap text-[10px] font-bold leading-4 text-amber-100/65">
                          <span data-card-info-number className="text-[#f2ca83]">{String(beast.id).padStart(2, '0')}</span>
                          <p>{SEASON_NAMES[beast.season].split('・')[0]}</p>
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-400">{SEASON_NAMES[beast.season].split('・')[0]}</p>
                      )}
                      <h3 className="mt-0.5 font-serif text-base font-black text-white sm:text-lg">{beast.name}</h3>
                      <p className="mt-0.5 truncate text-[11px] text-amber-100/80">{beast.coreMeaning}</p>
                    </div>
                  </div>
                </button>
              );
            })}
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
                <img src={cardImage(selected)} alt={`${selected.name}${FORM_LABELS[form]}神獸卡完整圖`} className="block h-auto w-full" />
              </div>
              <div className="flex min-w-0 flex-col justify-center">
                <p className="text-sm font-bold text-slate-400">{selected.animal}・{selected.symbolicPart}</p>
                <h2 className="mt-2 font-serif text-4xl font-black text-white">{selected.name}</h2>
                <div className="mt-4 flex w-full max-w-full rounded-xl border border-white/10 bg-white/[0.04] p-1 sm:w-fit">
                  {FORMS.map((item) => (
                    <button key={item.id} type="button" onClick={() => setForm(item.id)} aria-pressed={form === item.id}
                      className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-xs font-black transition sm:flex-none sm:px-3 ${form === item.id ? 'bg-amber-300/20 text-amber-50' : 'text-slate-400 hover:text-white'}`}>
                      查看{item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-400">本命神獸是你的成年守護象徵；神獸幼子承接相同物種、元素與星宿血統，供你查看、收藏與守護。</p>
                <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-300/[0.07] p-4">
                  <p className="text-xs font-black tracking-[0.16em] text-amber-200/80">核心意義</p>
                  <p className="mt-2 font-serif text-2xl font-black text-amber-50">{selected.coreMeaning}</p>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-xs font-black tracking-[0.16em] text-cyan-100/75">性格與命運特質</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">{selected.traits}</p>
                </div>
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
