'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BaziCustomerView } from './adapter';
import { CustomerEvidenceDrawer } from './CustomerAccordion';
import { WaterTreasureOrb } from './WaterTreasureOrb';

type TeacherMode = 'CHART' | 'HORROR_GHOST';

const TEACHERS: Array<{ id: TeacherMode; title: string; subtitle: string }> = [
  { id: 'CHART', title: 'Google 老師解盤', subtitle: 'Google 交叉白話解說・結構、用神、運勢' },
  { id: 'HORROR_GHOST', title: '鬼魅老師解盤', subtitle: '壓力訊號、象徵意境與當下時間' },
];

/**
 * A tap must never feel like nothing happened. These stages rotate while the
 * reading is in flight so the wait always reads as "the system is working",
 * never as a frozen screen — even when the API answers in under a second.
 */
const GOOGLE_RITUAL_STAGES = [
  'Google 老師正在整理命盤重點…',
  '正在比對日主、格局與十神…',
  '正在校對五行、用神與大運流年…',
  '正在把結構整理成白話…',
];
const HORROR_RITUAL_STAGES = [
  '鬼魅正在翻開封印的第一頁…',
  '殘影與警報正在對齊同一張命盤…',
  '最後一盞燈正在被點亮…',
  '正在寫下這一集的回應…',
];
const MIN_RITUAL_MS = 3200;
const RITUAL_STAGE_INTERVAL_MS = 1100;

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

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

const BAZI_TREASURE_RITUALS: Record<'空' | '風' | '水' | '火' | '地', { title: string; scenes: [string, string, string, string] }> = {
  空: { title: '星淵虛空珠・解封儀式', scenes: ['第一幕・黑暗把雜訊吞沒，封印中央只剩一個安靜的空位。', '第二幕・細微光點開始校正漂移的方向，混亂慢慢退到邊緣。', '第三幕・空位化成定軸，讓真正重要的選擇重新對焦。', '終幕・虛空珠入背包；下一步，留給你親自踏出去。'] },
  風: { title: '蒼嵐御風珠・解封儀式', scenes: ['第一幕・封印裡的風停在原地，像一句沒有說完的話。', '第二幕・第一道氣流穿過裂縫，卡住的節奏開始有了出口。', '第三幕・風把雜亂吹成一條可走的路，只留下最小的一步。', '終幕・御風珠入背包；今天，先完成那一步。'] },
  水: { title: '深海潮汐珠・解封儀式', scenes: ['第一幕・潮聲被封在珠心，表面安靜得不自然。', '第二幕・深淺水紋開始推移，沒有說出口的感受逐漸浮起。', '第三幕・潮汐把混亂帶回節奏，讓回應不再只是衝動。', '終幕・潮汐珠入背包；先接住感受，再做選擇。'] },
  火: { title: '燼星業火珠・解封儀式', scenes: ['第一幕・火光被壓在封印下，只有微弱餘溫還在呼吸。', '第二幕・火線穿過裂縫，猶豫與衝動被照得無處可藏。', '第三幕・火焰收束成穩定的光，照出清楚的一句行動。', '終幕・業火珠入背包；把熱度放在真正要做的事上。'] },
  地: { title: '地脈琥珀珠・解封儀式', scenes: ['第一幕・地脈沉睡在琥珀深處，封印仍緊緊壓住核心。', '第二幕・金色紋理開始流動，散掉的節奏重新沉回地面。', '第三幕・琥珀裂開一道光，讓承諾與界線重新站穩。', '終幕・地脈珠入背包；下一步，真正落地。'] },
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
  const [ritualStage, setRitualStage] = useState<number | null>(null);
  const [treasurePulse, setTreasurePulse] = useState(0);
  const ritualTimersRef = useRef<number[]>([]);
  const [googleReading, setGoogleReading] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleRun, setGoogleRun] = useState(0);
  const [googleStage, setGoogleStage] = useState(0);
  const [horrorReading, setHorrorReading] = useState<string | null>(null);
  const [horrorLoading, setHorrorLoading] = useState(false);
  const [horrorError, setHorrorError] = useState<string | null>(null);
  const [horrorRun, setHorrorRun] = useState(0);
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

  const [horrorStage, setHorrorStage] = useState(0);
  const primaryLuck = currentLuck(view);
  const shortName = view.name.trim().slice(-2) || '你';
  const ageLabel = view.timeContext.age === null ? '年齡待確認' : `${view.timeContext.age} 歲`;
  const previousAgeLabel = view.timeContext.age === null ? '前一歲' : `${view.timeContext.age - 1} 歲`;
  const nextAgeLabel = view.timeContext.age === null ? '下一歲' : `${view.timeContext.age + 1} 歲`;
  const elementTreasure = useMemo(() => getBaziElementTreasure(view), [view]);
  const treasureRitual = BAZI_TREASURE_RITUALS[elementTreasure.element];
  const ghostReply = `「${shortName}，以前沒有回答完的問題沒有消失；它只是藏在你現在的門縫裡，等你決定要不要先跨出那一步。」`;
  const episodeTitle = '鬼魅老師解封暗示提醒';

  useEffect(() => () => ritualTimersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  const collectTreasure = () => {
    if (treasureOpening) return;
    ritualTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    setTreasureCollected(false);
    setTreasureOpening(true);
    setRitualStage(0);
    // Re-mounting only this small visual restarts the short 3D release.
    setTreasurePulse((value) => value + 1);
    ritualTimersRef.current = [
      window.setTimeout(() => setRitualStage(1), 3000),
      window.setTimeout(() => setRitualStage(2), 6000),
      window.setTimeout(() => setRitualStage(3), 9000),
      window.setTimeout(() => {
        setTreasureCollected(true);
        setTreasureOpening(false);
        setRitualStage(null);
        ritualTimersRef.current = [];
      }, 12_000),
    ];
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
    let cancelled = false;
    setGoogleLoading(true);
    setGoogleError(null);
    setGoogleStage(0);
    const stageTimer = window.setInterval(() => {
      setGoogleStage((stage) => (stage + 1) % GOOGLE_RITUAL_STAGES.length);
    }, RITUAL_STAGE_INTERVAL_MS);
    const request = fetch('/api/bazi/google-reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: googleRequestKey,
      signal: controller.signal,
    }).then(async (response) => {
      const json = await response.json() as { ok?: boolean; reading?: string; message?: string };
      if (!response.ok || !json.ok || !json.reading) throw new Error(json.message || 'Google 老師解盤未返回內容。');
      return json.reading;
    });
    // A tap must always visibly "run" for at least MIN_RITUAL_MS, even when
    // the API answers instantly — otherwise a fast reply reads as no reaction at all.
    Promise.allSettled([request, delay(MIN_RITUAL_MS)]).then(([result]) => {
      window.clearInterval(stageTimer);
      if (cancelled) return;
      if (result.status === 'fulfilled') {
        setGoogleReading(result.value);
        setGoogleError(null);
      } else if (!(result.reason instanceof DOMException && result.reason.name === 'AbortError')) {
        setGoogleReading(null);
        setGoogleError(result.reason instanceof Error ? result.reason.message : 'Google 老師解盤暫時無法完成。');
      }
      setGoogleLoading(false);
    });
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(stageTimer);
    };
  }, [active, googleRequestKey, googleRun]);

  useEffect(() => {
    if (active !== 'HORROR_GHOST') return;
    const controller = new AbortController();
    let cancelled = false;
    setHorrorLoading(true);
    setHorrorError(null);
    setHorrorStage(0);
    const stageTimer = window.setInterval(() => {
      setHorrorStage((stage) => (stage + 1) % HORROR_RITUAL_STAGES.length);
    }, RITUAL_STAGE_INTERVAL_MS);
    const request = fetch('/api/bazi/horror-reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: googleRequestKey,
      signal: controller.signal,
    }).then(async (response) => {
      const json = await response.json() as { ok?: boolean; reading?: string; message?: string };
      if (!response.ok || !json.ok || !json.reading) throw new Error(json.message || '恐怖鬼魅解盤未返回內容。');
      return json.reading;
    });
    Promise.allSettled([request, delay(MIN_RITUAL_MS)]).then(([result]) => {
      window.clearInterval(stageTimer);
      if (cancelled) return;
      if (result.status === 'fulfilled') {
        setHorrorReading(result.value);
        setHorrorError(null);
      } else if (!(result.reason instanceof DOMException && result.reason.name === 'AbortError')) {
        setHorrorReading(null);
        setHorrorError(result.reason instanceof Error ? result.reason.message : '恐怖鬼魅解盤暫時無法完成。');
      }
      setHorrorLoading(false);
    });
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(stageTimer);
    };
  }, [active, googleRequestKey, horrorRun]);

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
                  if (teacher.id === 'HORROR_GHOST') setHorrorRun((value) => value + 1);
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
          <article className="flex flex-col rounded-[20px] border-2 border-cyan-200/55 bg-[linear-gradient(135deg,rgba(8,47,73,0.54),rgba(15,23,42,0.78))] p-4 shadow-[0_0_22px_rgba(34,211,238,0.12)]" aria-label="Google 老師八字解盤">
            <div className="order-1 flex items-center justify-between gap-3">
              <p className="text-[11px] font-black tracking-[0.16em] text-cyan-100">Google 老師解盤・全盤白話翻譯</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${googleLoading ? 'border-amber-100/55 bg-amber-300/10 text-amber-50' : googleReading ? 'border-emerald-100/55 bg-emerald-300/10 text-emerald-50' : 'border-cyan-100/35 bg-cyan-300/10 text-cyan-50/80'}`}>
                {googleLoading ? '正在生成' : googleReading ? 'Google 老師已完成' : '等待解盤'}
              </span>
            </div>
            <p className="order-2 mt-2 rounded-xl border border-cyan-100/20 bg-cyan-950/35 px-3 py-2 text-xs font-bold leading-5 text-cyan-50/75">Google 老師會以姓名後兩字與目前年齡開場，按「前一歲／現在／下一歲」白話解說日主、格局、十神、五行、大運與流年；讀完提醒後，解開你的五元素寶石，讓今天的行動有一個明確起點。</p>
            {googleLoading && (
              <div className="order-3 mt-3 rounded-xl border border-cyan-100/25 bg-cyan-950/40 px-3 py-3" aria-live="polite">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-cyan-100/25 border-t-cyan-100" />
                  <p className="text-sm font-semibold leading-6 text-cyan-50/90">{GOOGLE_RITUAL_STAGES[googleStage]}</p>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/40">
                  <div className="ritual-progress-sweep h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-cyan-100 to-transparent" />
                </div>
              </div>
            )}
            {googleError && (
              <div className="order-3 mt-2">
                <p className="text-sm font-semibold leading-6 text-rose-100">Google 老師解盤暫時未完成：{googleError}</p>
                <button type="button" onClick={() => setGoogleRun((value) => value + 1)} className="mt-2 rounded-xl border-2 border-cyan-100/70 bg-cyan-300/12 px-3 py-2 text-xs font-black text-cyan-50">重新請 Google 老師解盤</button>
              </div>
            )}
            {googleReading && <p className="order-5 mt-4 rounded-2xl border border-cyan-100/30 bg-black/20 p-3 text-sm font-semibold leading-7 text-cyan-50/90">{googleReading}</p>}
            {googleReading && (
              <section className="five-element-treasure-card order-4 mt-4 overflow-hidden rounded-[1.45rem] border-2 border-amber-200/70 p-5" aria-label="今日五元素寶物行動">
                <p className="text-[10px] font-black tracking-[0.18em] text-amber-100">依老師提醒・解開五元素寶石</p>
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
                  {treasureOpening ? '寶石正在解封・能量釋放中…' : treasureCollected ? '寶石已解封・把今天的一步做完' : `依提醒解開${elementTreasure.element}元素寶石`}
                </button>
              </section>
            )}
          </article>
        </>
      )}

      {active === 'HORROR_GHOST' && (
        <article className="relative overflow-hidden rounded-[24px] border border-rose-300/35 bg-[radial-gradient(circle_at_82%_6%,rgba(190,24,93,0.28),transparent_31%),linear-gradient(145deg,rgba(69,10,10,0.58),rgba(46,16,101,0.42),rgba(2,6,23,0.82))] p-5 shadow-[0_0_50px_rgba(190,24,93,0.14)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 top-10 h-36 w-36 animate-pulse rounded-full border border-rose-200/15 bg-rose-500/5 blur-[1px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 bottom-16 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-rose-100/60 to-transparent" />
          <div className="relative flex items-center justify-between gap-3">
            <p className="text-xs font-black tracking-[0.18em] text-rose-200">恐怖鬼魅解命盤・集數式沉浸劇情</p>
            <span className="rounded-full border border-rose-200/25 bg-rose-500/10 px-2 py-1 text-[10px] font-black tracking-[0.12em] text-rose-100">原創恐怖遊戲</span>
          </div>
          <p className="mt-2 rounded-xl border border-violet-200/15 bg-black/25 px-3 py-2 text-xs font-bold leading-5 text-violet-100/80">戲劇化命盤遊戲情境：以同一張八字盤與當下時間層創作，不代表已發生的真實事件。</p>
          <h4 className="relative mt-3 font-serif text-[1.38rem] font-black leading-8 text-white">{episodeTitle}</h4>
          <p className="relative mt-1 text-sm font-black leading-6 text-rose-100/90">{shortName}，你現在 {ageLabel}。這次解盤會用以前、現在、未來的生活節奏，陪你看懂眼前的訊號。</p>
          <div className="relative mt-3 flex items-center gap-2 rounded-xl border border-rose-200/30 bg-black/35 px-3 py-2 shadow-[inset_0_0_20px_rgba(190,24,93,0.08)]">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-rose-300 shadow-[0_0_12px_rgba(253,164,175,0.95)]" />
            <p className="text-xs font-black tracking-[0.12em] text-rose-100">劇情壓力正在累積・每一幕都比前一幕更靠近</p>
          </div>
          <p className="relative mt-2 text-sm font-bold leading-6 text-rose-100/80">這是原創虛構的恐怖遊戲，不是事件預言。本集先讓異常出現，再讓壓力逼近，最後由鬼魅回應前面留下的八字線索；每一段都能回到同一張盤核對。</p>
          <div className="relative mt-4 grid grid-cols-3 gap-2" aria-label="恐怖鬼魅劇情結構">
            {[
              ['第 01 段', '殘影開場', '八字伏筆開始失真'],
              ['第 02 段', '警報深處', '當下壓力逐步逼近'],
              ['第 03 段', '鬼魅回應', '封印決定下一幕'],
            ].map(([time, title, detail], index) => (
              <div key={time} className={`rounded-xl border p-3 ${index === 1 ? 'border-rose-200/35 bg-rose-500/10' : 'border-white/10 bg-black/20'}`}>
                <p className="text-[10px] font-black tracking-[0.16em] text-rose-200/80">{time}</p>
                <p className="mt-1 text-sm font-black text-white">{title}</p>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-white/55">{detail}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-3 rounded-2xl border border-rose-200/15 bg-black/25 p-3" aria-label="劇情因果鏈">
            <p className="text-[10px] font-black tracking-[0.16em] text-rose-200/80">本集命盤腳本・不是隨機故事</p>
            <p className="mt-1 text-sm font-bold leading-6 text-white/75">
              後端會用已鎖定的八字資料建立伏筆；客戶端只看以前的你留下的殘影、{shortName}現在的警報與未來的你面前的門縫。你不必先懂術語，照著這三段就能走完本集。
            </p>
          </div>
          <section className="relative mt-3 rounded-2xl border-2 border-violet-200/35 bg-[linear-gradient(135deg,rgba(76,5,25,0.42),rgba(30,27,75,0.52))] p-4" aria-label="正式恐怖鬼魅八字解盤">
            <div className="flex items-center justify-between gap-3">
              <p className="ghost-reply-title">鬼魅正式解盤・同盤回應</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${horrorLoading ? 'border-amber-100/55 bg-amber-300/10 text-amber-50' : horrorReading ? 'border-emerald-100/55 bg-emerald-300/10 text-emerald-50' : 'border-rose-100/35 bg-rose-300/10 text-rose-100/80'}`}>{horrorLoading ? '正在生成' : horrorReading ? '鬼魅已回應' : '等待回應'}</span>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-violet-100/75">和 Google 老師解盤使用完全相同的八字資料與五元素寶石；鬼魅老師會用故事給你一個暗示提醒，最後引導你解開對應的寶石，不會塞進看不懂的術語。</p>
            <button
              type="button"
              onClick={collectTreasure}
              disabled={treasureOpening}
              className={`mt-3 w-full rounded-xl border-2 px-3 py-3 text-sm font-black transition disabled:cursor-wait disabled:opacity-90 ${treasureCollected ? 'border-emerald-200/75 bg-emerald-400/15 text-emerald-50' : 'border-amber-100/85 bg-amber-300/20 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.2)]'}`}
            >
              {treasureOpening ? '寶石正在解封・能量釋放中…' : treasureCollected ? '寶石已解封・繼續閱讀鬼魅老師提醒' : `第一步・解開${elementTreasure.element}元素寶石`}
            </button>
            {horrorLoading && (
              <div className="mt-3 rounded-xl border border-rose-100/25 bg-black/35 px-3 py-3" aria-live="polite">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-rose-100/25 border-t-rose-200" />
                  <p className="text-sm font-semibold leading-6 text-rose-100/90">{HORROR_RITUAL_STAGES[horrorStage]}</p>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/40">
                  <div className="ritual-progress-sweep h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
                </div>
              </div>
            )}
            {horrorError && <div className="mt-3"><p className="text-sm font-semibold leading-6 text-rose-100">鬼魅回應暫時未完成：{horrorError}</p><button type="button" onClick={() => setHorrorRun((value) => value + 1)} className="mt-2 rounded-xl border-2 border-rose-100/70 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-50">重新請鬼魅回應</button></div>}
            {horrorReading && <p className="ghost-reply-copy mt-3 rounded-xl border border-rose-100/20 bg-black/25 p-3">{horrorReading}</p>}
          </section>
          <section className="five-element-treasure-card five-element-treasure-card--horror relative mt-3 overflow-hidden rounded-2xl border-2 border-amber-200/70 p-5" aria-label="五元素寶物關卡">
            <p className="text-[10px] font-black tracking-[0.18em] text-amber-100">依鬼魅老師提醒・解開五元素寶石</p>
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
              {treasureOpening ? `封印儀式進行中・${ritualStage! + 1}/4` : treasureCollected ? '再次喚醒寶物・下一幕由你的選擇推進' : '解開封印・開始十二秒儀式'}
            </button>
            {treasureOpening && ritualStage !== null && (
              <section className="mt-3 rounded-xl border border-amber-100/25 bg-black/25 px-3 py-3" aria-live="polite">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black tracking-[0.12em] text-amber-100">{treasureRitual.title}</p>
                  <p className="text-[10px] font-bold text-amber-50/65">十二秒儀式</p>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-amber-50">{treasureRitual.scenes[ritualStage]}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-gradient-to-r from-amber-200 via-amber-50 to-cyan-100 transition-[width] duration-[2800ms] ease-linear" style={{ width: `${(ritualStage + 1) * 25}%` }} /></div>
              </section>
            )}
            {treasureCollected && (
              <div className="mt-3 rounded-xl border-2 border-cyan-100/50 bg-cyan-950/35 p-3">
              <p className="text-xs font-black tracking-[0.14em] text-cyan-100">寶石已解封・選擇下一步</p>
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
              <p className="text-xs font-black tracking-[0.14em] text-rose-100">以前的你・第 01 段・殘影開場</p>
              <p className="mt-2">{shortName}，鏡頭回到那些還沒被好好處理的小事：一個拖延的決定、一段沒說清楚的話，或一件總覺得「明天再做」的事。畫面裡沒有怪物搶先現身，只有反覆跳出的雜訊、忽明忽滅的光，和一個始終不肯被回答的問題。你以為它早已過去，鏡頭卻把每次失衡都剪回同一個角落；殘影沒有離開，它只是在等你叫出它的名字。</p>
            </section>
            <section className="relative overflow-hidden rounded-2xl border border-rose-200/25 bg-rose-950/30 p-4 shadow-[inset_0_0_28px_rgba(127,29,29,0.18)]">
              <span aria-hidden="true" className="absolute right-3 top-2 text-3xl font-black text-rose-100/15">02</span>
              <p className="text-xs font-black tracking-[0.14em] text-rose-100">{shortName}，你現在 {ageLabel}・第 02 段・警報深處</p>
              <p className="mt-2">{shortName}，現在輪到你的關卡。警報從那個最容易被忽略的缺口亮起：每一次延後、每一次用忙碌蓋過真正想處理的事，畫面就更暗一格。鏡頭不再停在遠處，而是把每個看似平常的選擇推到門前。</p>
              <p className="mt-2">這一段不是說壞事會發生，而是提醒你：現在最能改變劇情的，不是繼續猜，而是選一件小事立刻做完。</p>
            </section>
            <section className="relative overflow-hidden rounded-2xl border border-violet-200/20 bg-violet-950/30 p-4 shadow-[inset_0_0_28px_rgba(76,29,149,0.16)]">
              <span aria-hidden="true" className="absolute right-3 top-2 text-3xl font-black text-violet-100/15">03</span>
              <p className="text-xs font-black tracking-[0.14em] text-violet-100">未來的你・第 03 段・最後一盞燈</p>
              <p className="mt-2">{shortName}，未來不是唯一結局，而是兩條尚未選定的岔路：一條是把現在的問題繼續留在門外；另一條是從今天開始，把一件該做的事完成。鏡頭停在門縫前，最後一盞燈正在晃動，影子比你先動了一步。下一幕，不由黑暗決定，而由你現在做出的選擇決定。</p>
              <p className="mt-2 border-t border-violet-100/10 pt-2 text-sm font-black text-violet-100/85">鬼魅不是另一位老師；它是本集最後依八字線索開口的回應。</p>
            </section>
          </div>
          <CustomerEvidenceDrawer items={evidence} />
          <section className="relative mt-3 overflow-hidden rounded-2xl border-2 border-rose-100/65 bg-[radial-gradient(circle_at_78%_16%,rgba(190,24,93,0.3),transparent_30%),linear-gradient(135deg,rgba(76,5,25,0.78),rgba(30,27,75,0.66),rgba(2,6,23,0.94))] p-5 shadow-[0_0_34px_rgba(190,24,93,0.23),inset_0_0_30px_rgba(190,24,93,0.16)]" aria-label="鬼魅回應">
            <span aria-hidden="true" className="absolute right-3 top-1 font-serif text-6xl font-black text-rose-100/[0.08]">答</span>
            <div className="relative flex items-center justify-between gap-2">
            <p className="ghost-reply-title">鬼魅老師解封暗示提醒</p>
              <span className="ghost-reply-status">不要回頭</span>
            </div>
            <p className="ghost-reply-lead relative mt-4">「{shortName}，門外的聲音停了。不是它離開，而是它已經站在封印的另一邊，等你開口。」</p>
            <p className="ghost-reply-copy relative mt-2">{ghostReply}</p>
            <p className="relative mt-5 border-l-2 border-rose-200/80 pl-3 text-sm font-black leading-6 text-rose-50">這不是預言，而是鬼魅老師給你的暗示提醒：現在解開五元素寶石，帶著它的行動方向往下一步走。</p>
          </section>
        </article>
      )}
    </section>
  );
}
