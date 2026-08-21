'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BaziCustomerView } from './adapter';
import { TeacherSummary } from './TeacherSummary';
import { CustomerEvidenceDrawer } from './CustomerAccordion';
import { WaterTreasureOrb } from './WaterTreasureOrb';

type TeacherMode = 'CHART' | 'HORROR_GHOST';

const TEACHERS: Array<{ id: TeacherMode; title: string; subtitle: string }> = [
  { id: 'CHART', title: 'Google 解盤', subtitle: 'Google 交叉白話解說・結構、用神、運勢' },
  { id: 'HORROR_GHOST', title: '恐怖鬼魅解命盤', subtitle: '壓力訊號、象徵意境與當下時間' },
];

/**
 * Customer-facing five-element vocabulary is permanently the product system:
 * 空、風、水、火、地. Bazi can still calculate with traditional 五行 internally,
 * but no teacher or treasure may expose a competing 金、木、土 reward system.
 */
const TRADITIONAL_TO_PRODUCT_ELEMENT: Record<string, '空' | '風' | '水' | '火' | '地'> = {
  金: '空',
  木: '風',
  水: '水',
  火: '火',
  土: '地',
  空: '空',
  風: '風',
  地: '地',
};

const ELEMENT_TREASURES: Record<'空' | '風' | '水' | '火' | '地', { name: string; power: string }> = {
  空: { name: '星界定軸環', power: '提醒你先騰出空間，讓真正重要的選擇回到中心。' },
  風: { name: '迴風續行符', power: '提醒你把卡住的事拆成下一個可執行的小步。' },
  水: { name: '潮汐回聲珠', power: '提醒你先接住感受，再決定如何回應。' },
  火: { name: '燼火定心燈', power: '提醒你把衝動收成清楚的表達與行動。' },
  地: { name: '地脈守界印', power: '提醒你先守住作息、界線與能承擔的承諾。' },
};

function getBaziElementTreasure(view: BaziCustomerView) {
  const weakest = view.fiveElementOrbit.items
    .filter((item) => item.status === 'AVAILABLE' && typeof item.strength === 'number')
    .sort((a, b) => (a.strength ?? Number.POSITIVE_INFINITY) - (b.strength ?? Number.POSITIVE_INFINITY))[0]?.label;
  const sourceElement = weakest ?? view.dayMaster.element;
  const element = TRADITIONAL_TO_PRODUCT_ELEMENT[sourceElement] ?? '空';
  return { element, ...ELEMENT_TREASURES[element] };
}

function currentLuck(view: BaziCustomerView) {
  return view.timeContext.activeDaYun ?? view.teacher.daYun[0] ?? null;
}

/**
 * 兩位老師只讀同一張 BaziCustomerView；不重算四柱、不改動既有核心。
 * 目前先提供可驗證的本地解讀模組，底層獨立 AI 服務會在後續任務另行接入。
 */
export function BaziTeacherModes({ view, onOpenFull }: { view: BaziCustomerView; onOpenFull: () => void }) {
  const [active, setActive] = useState<TeacherMode>('CHART');
  const [treasureCollected, setTreasureCollected] = useState(false);
  const [treasureOpening, setTreasureOpening] = useState(false);
  const [treasurePulse, setTreasurePulse] = useState(0);
  const [googleReading, setGoogleReading] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleRun, setGoogleRun] = useState(0);
  const evidence = useMemo(() => {
    const luck = currentLuck(view);
    const timing = view.timeContext;
    return [
      { label: '日主', value: `${view.dayMaster.stem}${view.dayMaster.element}（${view.dayMaster.level}）` },
      { label: '格局', value: view.structurePattern.primaryPattern },
      { label: '用神／忌神', value: `${view.gods.usefulGod}／${view.gods.avoidGod}` },
      { label: '當前大運', value: luck ? `${luck.ageRange}｜${luck.pillar}` : '核心未提供可對應的大運' },
      { label: '流年', value: view.teacher.annual[0] ? `${view.teacher.annual[0].year}｜${view.teacher.annual[0].pillar}` : '核心未提供流年資料' },
      { label: '當下情境', value: `${timing.age === null ? '年齡未能換算' : `${timing.age} 歲`}｜${timing.currentYear}｜${timing.dayNight}` },
    ];
  }, [view]);

  const pressureFactors = view.teacher.strengthFactors.filter((factor) => factor.status === 'pressure');
  const missing = view.teacher.tenGodsMissing.length > 0 ? view.teacher.tenGodsMissing.join('、') : '未見明顯缺位';
  const primaryLuck = currentLuck(view);
  const shortName = view.name.trim().slice(-2) || '你';
  const ageLabel = view.timeContext.age === null ? '年齡待確認' : `${view.timeContext.age} 歲`;
  const previousAgeLabel = view.timeContext.age === null ? '前一歲' : `${view.timeContext.age - 1} 歲`;
  const nextAgeLabel = view.timeContext.age === null ? '下一歲' : `${view.timeContext.age + 1} 歲`;
  const elementTreasure = useMemo(() => getBaziElementTreasure(view), [view]);
  const collectTreasure = () => {
    if (treasureOpening) return;
    setTreasureOpening(true);
    // Re-mounting only this small visual restarts the short 3D release.
    setTreasurePulse((value) => value + 1);
    window.setTimeout(() => {
      setTreasureCollected(true);
      setTreasureOpening(false);
    }, 12_000);
  };
  const treasureActive = treasureCollected || treasureOpening;
  const googleRequest = useMemo(() => ({
    shortName,
    age: ageLabel,
    previousAge: previousAgeLabel,
    nextAge: nextAgeLabel,
    dayMaster: `${view.dayMaster.stem}${view.dayMaster.element}（${view.dayMaster.level}）`,
    structure: view.structurePattern.primaryPattern,
    usefulGod: view.gods.usefulGod,
    avoidGod: view.gods.avoidGod,
    activeLuck: primaryLuck ? `${primaryLuck.ageRange}・${primaryLuck.pillar}` : '',
    annualLuck: view.teacher.annual[0] ? `${view.teacher.annual[0].year}・${view.teacher.annual[0].pillar}` : '',
    elementFocus: view.teacher.signals.elementFocus,
    chartSummary: view.teacher.chartSummary,
    structureSignal: view.teacher.signals.structure,
    dominantTenGods: view.teacher.tenGodsDominant.join('、') || '分布平均',
    missingTenGods: view.teacher.tenGodsMissing.join('、') || '未見明顯缺位',
    strengthFactors: view.teacher.strengthFactors.map((factor) => `${factor.label}：${factor.detail}`).join('；'),
    plainSections: view.teacher.sections.slice(0, 7).map((section) => `${section.title}：${section.content}`).join('；'),
    treasureElement: elementTreasure.element,
    treasureName: elementTreasure.name,
    treasurePower: elementTreasure.power,
  }), [shortName, ageLabel, previousAgeLabel, nextAgeLabel, view, primaryLuck, elementTreasure]);
  const googleRequestKey = JSON.stringify(googleRequest);

  useEffect(() => {
    if (active !== 'CHART') return;
    const controller = new AbortController();
    setGoogleLoading(true);
    setGoogleError(null);
    fetch('/api/bazi/google-reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: googleRequestKey,
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = await response.json() as { ok?: boolean; reading?: string; message?: string };
        if (!response.ok || !json.ok || !json.reading) throw new Error(json.message || 'Google 解盤未返回內容。');
        setGoogleReading(json.reading);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setGoogleReading(null);
        setGoogleError(error instanceof Error ? error.message : 'Google 解盤暫時無法完成。');
      })
      .finally(() => {
        if (!controller.signal.aborted) setGoogleLoading(false);
      });
    return () => controller.abort();
  }, [active, googleRequestKey, googleRun]);

  return (
    <section className="space-y-4" aria-label="AI 八字老師解盤">
      <div className="rounded-[22px] border-2 border-amber-200/60 bg-[linear-gradient(135deg,rgba(120,53,15,0.2),rgba(2,6,23,0.62))] p-3 shadow-[0_0_26px_rgba(251,191,36,0.16)]">
        <p className="rounded-xl border-2 border-amber-100/60 bg-amber-300/12 px-3 py-2 text-[11px] font-black tracking-[0.16em] text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.12)]">友善引導・先選一位老師開始解盤</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEACHERS.map((teacher) => {
            const selected = active === teacher.id;
            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => {
                  setActive(teacher.id);
                  // The Google card is intentionally never collapsible. A tap is an
                  // explicit request for a fresh reading, including when it is already selected.
                  if (teacher.id === 'CHART') setGoogleRun((value) => value + 1);
                }}
                aria-pressed={selected}
                className={`rounded-2xl border-2 px-4 py-3 text-left transition ${selected ? 'border-amber-100/90 bg-amber-300/[0.16] text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.2)] ring-1 ring-amber-100/35' : 'border-violet-200/45 bg-white/[0.05] text-white/80 shadow-[0_0_12px_rgba(139,92,246,0.08)] hover:border-violet-100/75 hover:bg-violet-400/[0.1]'}`}
              >
                <span className="block text-sm font-black">{teacher.title}</span>
                <span className="mt-1 block text-xs font-semibold opacity-65">{teacher.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="rounded-[20px] border border-cyan-200/20 bg-cyan-950/20 px-4 py-3">
        <p className="text-[11px] font-black tracking-[0.16em] text-cyan-100">當下時間層・不改本命盤</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-white/75">
          {view.timeContext.age === null ? '年齡資料待確認' : `目前 ${view.timeContext.age} 歲`}・{view.timeContext.currentYear} 年・{view.timeContext.dayNight}閱讀
          {view.timeContext.activeDaYun ? `・正在走 ${view.timeContext.activeDaYun.ageRange} 的 ${view.timeContext.activeDaYun.pillar} 大運` : '・大運區間未能對應'}
          {view.timeContext.annualLuck ? `・流年 ${view.timeContext.annualLuck.pillar}` : ''}
        </p>
      </section>

      {active === 'CHART' && (
        <>
          <article className="flex flex-col rounded-[20px] border-2 border-cyan-200/55 bg-[linear-gradient(135deg,rgba(8,47,73,0.54),rgba(15,23,42,0.78))] p-4 shadow-[0_0_22px_rgba(34,211,238,0.12)]" aria-label="Google 八字解盤">
            <div className="order-1 flex items-center justify-between gap-3">
              <p className="text-[11px] font-black tracking-[0.16em] text-cyan-100">Google Gemini・全盤白話翻譯</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${googleLoading ? 'border-amber-100/55 bg-amber-300/10 text-amber-50' : googleReading ? 'border-emerald-100/55 bg-emerald-300/10 text-emerald-50' : 'border-cyan-100/35 bg-cyan-300/10 text-cyan-50/80'}`}>
                {googleLoading ? '正在生成' : googleReading ? 'Google 已完成' : '等待解盤'}
              </span>
            </div>
            <p className="order-2 mt-2 rounded-xl border border-cyan-100/20 bg-cyan-950/35 px-3 py-2 text-xs font-bold leading-5 text-cyan-50/75">Google 會以姓名後兩字與目前年齡開場，按「前一歲／現在／下一歲」白話解說日主、格局、十神、五行、大運與流年；第一步先取得五元素寶物，再閱讀完整解盤。</p>
            {googleLoading && <p className="order-3 mt-3 text-sm font-semibold leading-6 text-cyan-50/80">Google 正在依已鎖定的八字結構生成解盤…</p>}
            {googleError && (
              <div className="order-3 mt-2">
                <p className="text-sm font-semibold leading-6 text-rose-100">Google 解盤暫時未完成：{googleError}</p>
                <button type="button" onClick={() => setGoogleRun((value) => value + 1)} className="mt-2 rounded-xl border-2 border-cyan-100/70 bg-cyan-300/12 px-3 py-2 text-xs font-black text-cyan-50">重新請 Google 解盤</button>
              </div>
            )}
            {googleReading && <p className="order-5 mt-4 rounded-2xl border border-cyan-100/30 bg-black/20 p-3 text-sm font-semibold leading-7 text-cyan-50/90">{googleReading}</p>}
            {googleReading && (
              <section className="five-element-treasure-card order-4 mt-4 overflow-hidden rounded-[1.45rem] border-2 border-amber-200/70 p-5" aria-label="今日五元素寶物行動">
                <p className="text-[10px] font-black tracking-[0.18em] text-amber-100">第一步・五元素寶物封印</p>
                <div className="mt-3 grid grid-cols-1 items-center gap-5 rounded-2xl border-2 border-amber-100/55 bg-black/25 p-5 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                  <div key={`google-treasure-${treasurePulse}`} className={`treasure-reveal-stage treasure-reveal-stage--${elementTreasure.element === '水' ? 'water' : 'standard'} treasure-reveal-stage--hero justify-self-center scale-[1.78] ${treasureCollected ? 'treasure-reveal-stage--collected' : ''} ${treasureOpening ? 'treasure-reveal-stage--opening' : ''}`} aria-hidden="true">
                    <WaterTreasureOrb element={elementTreasure.element} released={treasureActive} />
                  </div>
                  <div className="min-w-0 text-center sm:text-left">
                    <p className="text-[10px] font-black tracking-[0.2em] text-cyan-100/80">命盤專屬補強方向</p>
                    <h5 className="mt-1 font-serif text-2xl font-black leading-8 text-amber-50">{elementTreasure.element}元素・{elementTreasure.name}</h5>
                    <p className="mt-2 text-sm font-bold leading-6 text-amber-50/80">{elementTreasure.power}</p>
                    <p className={`mt-2 text-xs font-black tracking-[0.1em] ${treasureCollected ? 'text-emerald-100' : 'text-amber-100'}`}>{treasureOpening ? '封印正在鬆動・寶物即將入背包' : treasureCollected ? '已收下・今天的練習已啟動' : '未收下也可以直接執行這項練習'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={collectTreasure}
                  aria-pressed={treasureCollected}
                  disabled={treasureOpening}
                  className={`mt-3 w-full rounded-xl border-2 px-3 py-3 text-sm font-black transition disabled:cursor-wait disabled:opacity-90 ${treasureCollected ? 'border-emerald-200/75 bg-emerald-400/15 text-emerald-50' : 'border-amber-100/85 bg-amber-300/20 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.2)]'}`}
                >
                  {treasureOpening ? '封印正在解開・寶物釋放中…' : treasureCollected ? '再次喚醒寶物・把今天的一步做完' : `第一步・解開${elementTreasure.element}元素封印`}
                </button>
              </section>
            )}
          </article>
          <TeacherSummary view={view} />
        </>
      )}

      {active === 'HORROR_GHOST' && (
        <article className="relative overflow-hidden rounded-[24px] border border-rose-300/35 bg-[radial-gradient(circle_at_82%_6%,rgba(190,24,93,0.28),transparent_31%),linear-gradient(145deg,rgba(69,10,10,0.58),rgba(46,16,101,0.42),rgba(2,6,23,0.82))] p-5 shadow-[0_0_50px_rgba(190,24,93,0.14)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 top-10 h-36 w-36 animate-pulse rounded-full border border-rose-200/15 bg-rose-500/5 blur-[1px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 bottom-16 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-rose-100/60 to-transparent" />
          <div className="relative flex items-center justify-between gap-3">
            <p className="text-xs font-black tracking-[0.18em] text-rose-200">恐怖鬼魅解命盤・沉浸式劇情模式</p>
            <span className="rounded-full border border-rose-200/25 bg-rose-500/10 px-2 py-1 text-[10px] font-black tracking-[0.12em] text-rose-100">原創恐怖遊戲</span>
          </div>
          <p className="mt-2 rounded-xl border border-violet-200/15 bg-black/25 px-3 py-2 text-xs font-bold leading-5 text-violet-100/80">戲劇化命盤遊戲情境：以同一張八字盤與當下時間層創作，不代表已發生的真實事件。</p>
          <h4 className="relative mt-3 text-xl font-black text-white">{shortName}，你現在 {ageLabel}；命盤的陰影已經開始靠近。</h4>
          <div className="relative mt-3 flex items-center gap-2 rounded-xl border border-rose-200/30 bg-black/35 px-3 py-2 shadow-[inset_0_0_20px_rgba(190,24,93,0.08)]">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-rose-300 shadow-[0_0_12px_rgba(253,164,175,0.95)]" />
            <p className="text-xs font-black tracking-[0.12em] text-rose-100">劇情壓力正在累積・每一幕都比前一幕更靠近</p>
          </div>
          <p className="relative mt-2 text-sm font-bold leading-6 text-rose-100/80">這不是預言，而是一場以你的命盤節奏展開的恐怖遊戲；先有看不見的異常，再有靠近的壓力，最後才讓鬼魅的畫面從命盤的裂縫裡浮現。</p>
          <div className="relative mt-4 grid grid-cols-3 gap-2" aria-label="恐怖鬼魅劇情結構">
            {[
              ['過去', '命盤伏筆', '恐怖的起點'],
              ['當下', '時間警報', '壓力正在靠近'],
              ['未來', '鬼魅岔路', '選擇決定下一幕'],
            ].map(([time, title, detail], index) => (
              <div key={time} className={`rounded-xl border p-3 ${index === 1 ? 'border-rose-200/35 bg-rose-500/10' : 'border-white/10 bg-black/20'}`}>
                <p className="text-[10px] font-black tracking-[0.16em] text-rose-200/80">{time}</p>
                <p className="mt-1 text-sm font-black text-white">{title}</p>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-white/55">{detail}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-3 rounded-2xl border border-rose-200/15 bg-black/25 p-3" aria-label="劇情因果鏈">
            <p className="text-[10px] font-black tracking-[0.16em] text-rose-200/80">劇情因果鏈・不是隨機故事</p>
            <p className="mt-1 text-sm font-bold leading-6 text-white/75">
              命盤根據「{view.structurePattern.primaryPattern}」與忌神「{view.gods.avoidGod}」建立伏筆 → 以 {view.timeContext.currentYear} 年、{ageLabel} 與當前大運推進警報 → 用日主與五行焦點收束成未來的選擇岔路。
            </p>
          </div>
          <section className="five-element-treasure-card five-element-treasure-card--horror relative mt-3 overflow-hidden rounded-2xl border-2 border-amber-200/70 p-5" aria-label="五元素寶物關卡">
            <p className="text-[10px] font-black tracking-[0.18em] text-amber-100">五元素寶物關・命盤推導</p>
            <div className="mt-3 grid grid-cols-1 items-center gap-5 rounded-2xl border-2 border-amber-100/50 bg-black/25 p-5 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
              <div key={`horror-treasure-${treasurePulse}`} className={`treasure-reveal-stage treasure-reveal-stage--${elementTreasure.element === '水' ? 'water' : 'standard'} treasure-reveal-stage--hero justify-self-center scale-[1.78] ${treasureCollected ? 'treasure-reveal-stage--collected' : ''} ${treasureOpening ? 'treasure-reveal-stage--opening' : ''}`} aria-hidden="true">
                <WaterTreasureOrb element={elementTreasure.element} released={treasureActive} />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-[10px] font-black tracking-[0.2em] text-cyan-100/80">命盤專屬補強方向</p>
                <h5 className="mt-1 font-serif text-2xl font-black text-amber-50">{elementTreasure.element}元素・{elementTreasure.name}</h5>
                <p className={`mt-1 text-xs font-black tracking-[0.12em] ${treasureCollected ? 'text-emerald-100' : 'text-amber-100'}`}>{treasureOpening ? '封印鬆動中・寶物正在釋放' : treasureCollected ? '封印已解除・寶物已入背包' : '封印守護中・尚未收下'}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-amber-50/85">{elementTreasure.power} 這是依命盤五行強弱得到的遊戲線索；收下它代表你願意練習這個方向，不是保證任何結果。</p>
            <button
              type="button"
              onClick={collectTreasure}
              aria-pressed={treasureCollected}
              disabled={treasureOpening}
              className={`mt-3 w-full rounded-xl border-2 px-3 py-2 text-sm font-black transition disabled:cursor-wait disabled:opacity-90 ${treasureCollected ? 'border-emerald-200/75 bg-emerald-400/15 text-emerald-50' : 'border-amber-100/80 bg-amber-300/15 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.18)]'}`}
            >
              {treasureOpening ? '封印正在解開・寶物釋放中…' : treasureCollected ? '再次喚醒寶物・下一幕由你的選擇推進' : '解開封印・收下這件五元素寶物'}
            </button>
            {treasureCollected && (
              <div className="mt-3 rounded-xl border-2 border-cyan-100/50 bg-cyan-950/35 p-3">
                <p className="text-xs font-black tracking-[0.14em] text-cyan-100">寶物已入背包・選擇下一個畫面</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => setActive('CHART')} className="rounded-xl border-2 border-violet-100/50 bg-violet-300/10 px-3 py-2 text-sm font-black text-violet-50">回到老師解盤</button>
                  <button type="button" onClick={onOpenFull} className="rounded-xl border-2 border-amber-100/70 bg-amber-300/14 px-3 py-2 text-sm font-black text-amber-50">進入完整命盤</button>
                </div>
              </div>
            )}
          </section>
          <div className="mt-4 space-y-3 text-base font-semibold leading-7 text-white/75">
            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4">
              <span aria-hidden="true" className="absolute right-3 top-2 text-3xl font-black text-rose-100/10">01</span>
              <p className="text-xs font-black tracking-[0.14em] text-rose-100">第一幕・異常已經出現</p>
              <p className="mt-2">{shortName}，鏡頭回到命盤主軸「{view.structurePattern.primaryPattern}」第一次失去平衡的時刻。忌神「{view.gods.avoidGod}」一被壓力放大，畫面裡沒有怪物先現身，只有燈光一明一滅、關不掉的雜訊，和那道始終落在身後、卻不肯回頭的腳步聲。你以為只是巧合，鏡頭卻把每一次失衡都剪回同一個陰暗角落；異常沒有離開，它只是在等你注意到它。</p>
            </section>
            <section className="relative overflow-hidden rounded-2xl border border-rose-200/25 bg-rose-950/30 p-4 shadow-[inset_0_0_28px_rgba(127,29,29,0.18)]">
              <span aria-hidden="true" className="absolute right-3 top-2 text-3xl font-black text-rose-100/15">02</span>
              <p className="text-xs font-black tracking-[0.14em] text-rose-100">第二幕・警報逼近・{view.timeContext.currentYear} 年・{view.timeContext.dayNight}</p>
              <p className="mt-2">現在輪到 {shortName}，{ageLabel} 的關卡。遊戲裡的警報從缺口「{missing}」開始亮起；每一次忽略，都讓畫面更暗一格。{primaryLuck ? `你正走 ${primaryLuck.ageRange} 的「${primaryLuck.pillar}」大運；鏡頭不再停在遠處，而是跟著你走近那扇門，讓每一個看似平常的選擇都帶著逼近感。` : '核心未提供可對應的大運，因此這一幕只保留盤面已能證明的壓力訊號。'}</p>
              {pressureFactors.length > 0 ? <p className="mt-2">命盤已標記的壓力證據：{pressureFactors.map((factor) => `${factor.label}（${factor.detail}）`).join('；')}。</p> : <p className="mt-2">核心目前未標出直接壓力因子；不把氛圍敘事誤當作真實風險。</p>}
            </section>
            <section className="relative overflow-hidden rounded-2xl border border-violet-200/20 bg-violet-950/30 p-4 shadow-[inset_0_0_28px_rgba(76,29,149,0.16)]">
              <span aria-hidden="true" className="absolute right-3 top-2 text-3xl font-black text-violet-100/15">03</span>
              <p className="text-xs font-black tracking-[0.14em] text-violet-100">第三幕・最後一盞燈</p>
              <p className="mt-2">前方不是唯一結局，而是兩條黑暗的岔路。「{view.dayMaster.stem}{view.dayMaster.element}」留下的訊號是：{view.teacher.signals.dayMaster}。五行焦點「{view.teacher.signals.elementFocus}」把關係、工作與選擇推向不同出口；鏡頭停在門縫前，最後一盞燈正在晃動，牆上的影子比你先動了一步。黑暗沒有替你做決定，真正決定下一幕的仍是你的選擇。</p>
              <p className="mt-2 border-t border-violet-100/10 pt-2 text-sm font-black text-violet-100/85">鬼魅不是另一位老師，而是這條恐怖主線最後浮現的象徵畫面。</p>
            </section>
          </div>
          <CustomerEvidenceDrawer items={evidence} />
        </article>
      )}
    </section>
  );
}
