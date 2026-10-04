/**
 * 鬼魅阿修羅 — 後端顯示組裝（server-only）
 *
 * 客戶生辰 → calculateDualChart（既有八字／紫微／神煞後端，未改）
 * → buildGhostAsuraReading（既有 adapter → registry → translator → narrative → battle → guard，未改）
 * → 本檔只把管線輸出原樣搬進可直接顯示的文字契約（四柱欄位分組沿用原卡片規則），不改寫、不摘要。
 *
 * 前端不得引用本檔；`server-only` 會讓任何 client bundle 引用直接編譯失敗。
 * features/ghost-asura 本身仍被 node 測試直接載入，故不在那裡加 server-only，改由本包裝層守門。
 */

import 'server-only';
import { Solar } from 'lunar-typescript';
import { calculateDualChart, type DualChartResult } from '@/lib/dual-chart';
import { buildFlowYearShenSha } from '@/lib/dual-chart-iching-shensha';
import { asuraDeepScrub } from '@/lib/asura-display-alias';
import { ASURA_WORDINGS } from '@/features/ghost-asura/wordings';
import { ASURA_PLAIN, ASURA_TIMELINE, ASURA_VOICE, composeTime, type AsuraPillarKey, type AsuraWhen, voiceLead } from '@/lib/server/ghost-asura-voice';
import {
  buildGhostAsuraReading,
  GHOST_ASURA_UI,
  PILLAR_UI,
  type GhostAsuraDisplayItem,
  type GhostAsuraPillarKey,
  type GhostAsuraReading,
} from '@/features/ghost-asura';
import {
  ASURA_DISPLAY_CONTRACT,
  type AsuraDisplay,
  type AsuraDisplaySection,
  type AsuraDisplayColumn,
  type AsuraDisplayRestGroup,
  type AsuraDisplayAudit,
  type AsuraDisplayEntry,
  type AsuraDisplaySeal,
} from '@/lib/ghost-asura-display-contract';

const PILLAR_ORDER: GhostAsuraPillarKey[] = ['year', 'month', 'day', 'hour'];
const HOUR_BRANCHES = new Set(['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'unknown', 'pending']);

const CONCRETE_BRANCHES = new Set(['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai']);
/** 時辰未知時的預設：子時（早子 00:00，出生當日）。 */
export const ASSUMED_HOUR_TIME = '00:00';
export const ASSUMED_HOUR_LABEL = '子時' as const;
export const HOUR_ASSUMED_NOTE = '時辰未知，以子時排。';

/**
 * 只收既有阿修羅表單會送的欄位；曆法與時區沿用既有頁面固定值。
 * 時辰未知（birthTime 空白／'unknown'、timeUnknown、birthHourBranch 為 unknown/pending、或「不知道時辰」）
 * → 不留空、不要求補填：以子時（早子 00:00，出生當日）排，並標 hourAssumed: true。
 * 為何是 00:00 而非 23:00：lib/bazi/engine.ts 用 setSect(2)（晚子 23:00 日柱不換日、時柱起子）；
 * 00:00 一定落在出生當日的子時，23:00 雖時支同為子，卻依晚子規則另算時干，故取 00:00。
 * 只改輸入，不動任何引擎與計算。
 */
export function normalizeAsuraInput(raw: unknown): Record<string, unknown> {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const input: Record<string, unknown> = {
    calendarType: 'solar',
    timezone: 'Asia/Taipei',
  };
  if (typeof body.birthDate === 'string') input.birthDate = body.birthDate.trim().slice(0, 10);
  const time = typeof body.birthTime === 'string' ? body.birthTime.trim().slice(0, 7) : '';
  const branch = typeof body.birthHourBranch === 'string' ? body.birthHourBranch : '';
  const hourUnknown =
    body.hourAssumed === true ||
    body.timeUnknown === true ||
    body.birthTimeKnown === false ||
    branch === 'unknown' ||
    branch === 'pending' ||
    ((time === '' || time.toLowerCase() === 'unknown') && !CONCRETE_BRANCHES.has(branch));
  if (hourUnknown) {
    input.birthTime = ASSUMED_HOUR_TIME;
    input.hourAssumed = true;
  } else {
    if (time) input.birthTime = time.slice(0, 5);
    if (HOUR_BRANCHES.has(branch)) input.birthHourBranch = branch;
  }
  if (body.gender === 'male' || body.gender === 'female') input.gender = body.gender;
  if (typeof body.name === 'string') input.name = body.name.slice(0, 60);
  if (body.identityTarget === 'self' || body.identityTarget === 'guest') input.identityTarget = body.identityTarget;
  else if (body.analysisTarget === 'self' || body.analysisTarget === 'guest') input.identityTarget = body.analysisTarget;
  else input.identityTarget = 'self';
  return input;
}

/**
 * 既有管線中的佔位／不完整文案（features/ghost-asura/uiText.ts GHOST_ASURA_UI，narrative.ts 缺話術時填入）。
 * 只用來判斷「是不是真實文案」，不改寫任何文字。
 */
const PLACEHOLDER_COPY = new Set<string>([
  GHOST_ASURA_UI.noReading,
  GHOST_ASURA_UI.wordingGapHint,
  GHOST_ASURA_UI.pendingHint,
  GHOST_ASURA_UI.pendingBackendHint,
  GHOST_ASURA_UI.pendingNeutralLabel,
  GHOST_ASURA_UI.incompleteBanner,
]);

/** 真實文案才回傳原字串；空白或佔位字回傳 null。 */
export function realCopy(text: string | null | undefined): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim().replace(/[。.]$/, '');
  if (!trimmed) return null;
  for (const placeholder of PLACEHOLDER_COPY) {
    if (trimmed === placeholder.replace(/[。.]$/, '')) return null;
  }
  return text;
}

type DropReason = 'dormant' | 'pending' | 'no-pillar' | 'not-cross-verified' | 'placeholder';

function dropReason(item: GhostAsuraDisplayItem, crossChecked: boolean): DropReason {
  if (item.sealStatus === 'dormant') return 'dormant';
  if (item.sealStatus !== 'awakened') return 'pending';
  if (item.pillarLabels.length === 0) return 'no-pillar';
  if (!crossChecked) return 'not-cross-verified';
  return 'placeholder';
}

/**
 * 交叉精準對上：只讀既有後端欄位 specialStars.rules[id]（不改任何狀態）。
 * 依 docs/技能戰鬥檔案/八字/shensha-rule-integrity/SKILL.md 第 15 行與 references/參考命盤取法.md 第 6 行：
 * 只有 status === 'VERIFIED' 可稱「已通過交叉比對」；PENDING_POOL＋referenceMethod 不得寫成已通過。
 */
export function crossCheckedRuleIds(result: unknown): Set<string> {
  const ids = new Set<string>();
  const rules = (result as { specialStars?: { rules?: Record<string, unknown> } } | null)?.specialStars?.rules;
  if (!rules || typeof rules !== 'object') return ids;
  for (const [id, raw] of Object.entries(rules)) {
    const rule = raw as { status?: unknown; referenceMethod?: unknown } | null;
    if (rule && rule.status === 'VERIFIED' && rule.referenceMethod !== true) ids.add(id);
  }
  return ids;
}

/** 命中＝印記覺醒且後端給了柱位；有真實文案＝短宣告、核心、判語至少一項不是佔位字。 */
export function isQualifyingHit(item: GhostAsuraDisplayItem): boolean {
  if (item.sealStatus !== 'awakened' || item.pillarLabels.length === 0) return false;
  return Boolean(realCopy(item.shortDeclaration) || realCopy(item.coreMeaning) || realCopy(item.verdict));
}

function toSeal(item: GhostAsuraDisplayItem): AsuraDisplaySeal {
  const clash = [item.battleSignificance, item.verdict].filter(Boolean).join(' ');
  return {
    id: item.resultId,
    name: item.displayName,
    tone: item.sealStatus,
    sealLabel: item.sealLabel,
    declaration: item.sealStatus === 'pending' ? null : item.shortDeclaration,
    meaning: item.sealStatus === 'pending' ? item.pendingReason ?? GHOST_ASURA_UI.pendingHint : item.coreMeaning,
    clash: item.sealStatus === 'pending' || !clash ? null : clash,
  };
}

/* ── 時間軸（過去／現在／未來）各自的觸發來源 ──────────────────────────────
 * 只用既有後端：大運＝result.bazi.luckCycles（lib/bazi/engine.ts getYun，sect 2，起運不改）；
 * 運／歲觸發＝lib/dual-chart-iching-shensha.ts buildFlowYearShenSha（既有「流年干支當第五柱」取法，
 * 本卡同一函式也用於大運干支；未改任何規則、registry、gate）。
 * 流年以立春為界；「今天」以 Asia/Taipei 計。
 *   過去＝本命已醒＋已走完的大運＋出生那一歲起至今年立春前的每一個流年
 *   現在＝只看今年（今年立春至明年立春）的流年＋今年所在的大運
 *   未來＝明年立春起 10 個流年＋涵蓋這 10 年的大運
 */
export const FUTURE_FLOW_YEARS = 10;
type Trigger = { id: string; source: 'natal' | 'luck' | 'flow'; ganZhi: string; year: number };
export interface AsuraTimeAxis {
  todayTaipei: string;
  flowYear: number;
  flowGanZhi: string;
  ageShi: number;
  ageXu: number;
  past: { luck: string[]; flowYears: [number, number] | null; triggers: Trigger[] };
  present: { luck: string[]; flowYears: [number, number]; triggers: Trigger[] };
  future: { luck: string[]; flowYears: [number, number]; triggers: Trigger[] };
}

const yearGanZhi = (year: number) => Solar.fromYmd(year, 7, 1).getLunar().getYearInGanZhiByLiChun();
/** 某日落在哪一個「立春年」（立春前屬前一年）。 */
function liChunYearOf(y: number, m: number, d: number): { year: number; ganZhi: string } {
  const ganZhi = Solar.fromYmd(y, m, d).getLunar().getYearInGanZhiByLiChun();
  return { year: ganZhi === yearGanZhi(y) ? y : y - 1, ganZhi };
}

export function computeTimeAxis(result: DualChartResult, gender: 'male' | 'female', now: Date = new Date()): AsuraTimeAxis | null {
  const r = result as unknown as {
    core: Parameters<typeof buildFlowYearShenSha>[0];
    bazi: { input?: { birthDate?: string }; professionalChart: { traditionalInterpretationGate?: Parameters<typeof buildFlowYearShenSha>[1] }; luckCycles?: Array<{ pillar: string; startYear: number; endYear: number }> };
    specialStars: { flow?: { state?: string } };
  };
  const gate = r.bazi.professionalChart.traditionalInterpretationGate;
  const birth = String(r.bazi.input?.birthDate ?? '');
  const lucks = r.bazi.luckCycles ?? [];
  if (!gate || !/^\d{4}-\d{2}-\d{2}$/.test(birth) || lucks.length === 0) return null;
  const check = { passed: r.specialStars.flow?.state === 'READY', mismatches: [] as string[] };
  const touched = (year: number, ganZhi: string) => buildFlowYearShenSha(r.core, gate, gender, check, { year, ganZhi })?.touched.map((t) => t.id) ?? [];

  const today = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  const [ty, tm, td] = today.split('-').map(Number);
  const [by, bm, bd] = birth.split('-').map(Number);
  const flowNow = liChunYearOf(ty, tm, td);
  const flowBirth = liChunYearOf(by, bm, bd);
  const birthdayPassed = tm > bm || (tm === bm && td >= bd);
  const ageShi = ty - by - (birthdayPassed ? 0 : 1);
  const ageXu = flowNow.year - flowBirth.year + 1;

  const fromLuck = (step: { pillar: string; startYear: number }): Trigger[] =>
    touched(step.startYear, step.pillar).map((id) => ({ id, source: 'luck' as const, ganZhi: step.pillar, year: step.startYear }));
  const fromFlow = (year: number): Trigger[] => {
    const ganZhi = yearGanZhi(year);
    return touched(year, ganZhi).map((id) => ({ id, source: 'flow' as const, ganZhi, year }));
  };
  const range = (a: number, b: number) => (b < a ? [] : Array.from({ length: b - a + 1 }, (_, i) => a + i));

  const pastLuck = lucks.filter((s) => s.endYear < flowNow.year);
  const nowLuck = lucks.filter((s) => s.startYear <= flowNow.year && flowNow.year <= s.endYear);
  const futA = flowNow.year + 1;
  const futB = flowNow.year + FUTURE_FLOW_YEARS;
  const futLuck = lucks.filter((s) => s.endYear >= futA && s.startYear <= futB);
  const pastYears = range(flowBirth.year, flowNow.year - 1);
  return {
    todayTaipei: today,
    flowYear: flowNow.year,
    flowGanZhi: flowNow.ganZhi,
    ageShi,
    ageXu,
    past: {
      luck: pastLuck.map((s) => `${s.pillar}（${s.startYear}–${s.endYear}）`),
      flowYears: pastYears.length ? [pastYears[0], pastYears[pastYears.length - 1]] : null,
      triggers: [...pastLuck.flatMap(fromLuck), ...pastYears.flatMap(fromFlow)],
    },
    present: {
      luck: nowLuck.map((s) => `${s.pillar}（${s.startYear}–${s.endYear}）`),
      flowYears: [flowNow.year, flowNow.year],
      triggers: [...nowLuck.flatMap(fromLuck), ...fromFlow(flowNow.year)],
    },
    future: {
      luck: futLuck.map((s) => `${s.pillar}（${s.startYear}–${s.endYear}）`),
      flowYears: [futA, futB],
      triggers: [...futLuck.flatMap(fromLuck), ...range(futA, futB).flatMap(fromFlow)],
    },
  };
}

export function toAsuraDisplay(
  reading: GhostAsuraReading,
  crossChecked: ReadonlySet<string>,
  options: { hourAssumed?: boolean; timeAxis?: AsuraTimeAxis | null; targetName?: string | null; identityTarget?: 'self' | 'guest' | null } = {},
): AsuraDisplay {
  const hourAssumed = options.hourAssumed === true;
  const columns: AsuraDisplayColumn[] = PILLAR_ORDER.map((key) => {
    const label = PILLAR_UI[key].label;
    const seals = reading.items
      .filter((item) => item.sealStatus === 'awakened' && item.pillarLabels.includes(label))
      .map(toSeal);
    return {
      key,
      heading: PILLAR_UI[key].traditional,
      lead: seals[0]?.name ?? '暫無命中',
      countText: `共 ${seals.length} 枚印記`,
      seals,
    };
  });

  const restOf = (status: 'dormant' | 'pending') => reading.items.filter((item) => item.sealStatus === status).map(toSeal);
  const dormantSeals = restOf('dormant');
  const pendingSeals = restOf('pending');
  const rest: AsuraDisplayRestGroup[] = [
    { key: 'dormant' as const, heading: `沉眠印記（${dormantSeals.length}項）`, note: '本次無落印柱位', seals: dormantSeals },
    { key: 'pending' as const, heading: `待校核印記（${pendingSeals.length}項）`, note: '印記待校核', seals: pendingSeals },
  ].filter((group) => group.seals.length > 0);

  // 上方統計＝下方清單：覺醒依柱位列在四柱（落多柱者各柱各列一次），沉眠與待校核列在「其餘印記」。
  const columnRows = columns.reduce((sum, column) => sum + column.seals.length, 0);
  const listedDistinct = new Set([
    ...columns.flatMap((column) => column.seals.map((seal) => seal.id)),
    ...dormantSeals.map((seal) => seal.id),
    ...pendingSeals.map((seal) => seal.id),
  ]).size;
  const awakenedListed = new Set(columns.flatMap((column) => column.seals.map((seal) => seal.id))).size;
  const listingOk =
    awakenedListed === reading.awakenedCount &&
    dormantSeals.length === reading.dormantCount &&
    pendingSeals.length === reading.pendingCount &&
    listedDistinct === reading.items.length;
  const placementsById = new Map<string, number>();
  for (const column of columns) for (const seal of column.seals) placementsById.set(seal.id, (placementsById.get(seal.id) ?? 0) + 1);
  const multiPlaceKinds = [...placementsById.values()].filter((n) => n >= 2).length;
  const total = reading.items.length;
  const statsLines = [
    `這次共檢查 ${total} 種印記：${reading.awakenedCount} 種覺醒＋${reading.dormantCount} 種沉眠${reading.pendingCount > 0 ? `＋${reading.pendingCount} 種待校核` : ''}＝${total} 種。`,
    reading.awakenedCount > 0
      ? multiPlaceKinds > 0
        ? `覺醒的 ${reading.awakenedCount} 種，依所在位置列在上方四柱清單。其中 ${multiPlaceKinds} 種同時落在不只一處，所以清單共列 ${columnRows} 處，但仍是 ${reading.awakenedCount} 種，不是 ${columnRows} 種。`
        : `覺醒的 ${reading.awakenedCount} 種，依所在位置列在上方四柱清單，每種只落在一處。`
      : '',
    reading.dormantCount > 0 ? `沉眠的 ${reading.dormantCount} 種沒有落在任何位置，列在「沉眠印記」，點開可逐項查看。` : '',
    reading.pendingCount > 0 ? `待校核的 ${reading.pendingCount} 種還不能確定有沒有出現，列在「待校核印記」。` : '',
  ].filter(Boolean);
  const statsHint = statsLines.join('');

  const failed = reading.guard.status === 'FAILED';
  const pendingNames = reading.pendingEntries.slice(0, 8).map((entry) => entry.label || entry.resultId);
  const alert = !failed && !listingOk
    ? '清單與統計暫時對不上，請重新讀取後再看。'
    : failed
    ? [
        GHOST_ASURA_UI.incompleteBanner,
        reading.pendingEntries.length > 0
          ? `待補 ${reading.pendingEntries.length} 筆：${pendingNames.join('、')}${reading.pendingEntries.length > 8 ? '…' : ''}`
          : '',
      ].filter(Boolean).join(' ')
    : null;

  const bf = reading.battleField;
  const battleRows: AsuraDisplayEntry[] = (
    [
      ['主戰魂', bf.mainSoul],
      ['主要護印', bf.mainGuardian],
      ['主要劫印', bf.mainTribulation],
      ['主要陰影', bf.mainShadow],
      ['魅緣力量', bf.charmPower],
      ['權勢力量', bf.authorityPower],
      ['財庫力量', bf.treasurePower],
      ['移動力量', bf.movementPower],
      ['突破口', bf.breakthrough],
      ['戰局宣判', bf.finalVerdict],
    ] as const
  ).map(([label, text]) => ({ label, text }));

  // 三格（過去／現在／未來）只輸出「命中（印記覺醒且有柱位）＋交叉精準對上＋有真實文案」的印記；
  // 沉眠、待校核、文案為佔位字的一律不輸出（前端不再篩選，照印）。只做輸出挑選，不改任何判定。
  // 交叉精準對上＝管線自身 provenance.verifiedRuleIds ∩ 後端 rules 的 VERIFIED（非自家取法）。
  const pipelineVerified = new Set(reading.provenance.verifiedRuleIds);
  const isCrossChecked = (item: GhostAsuraDisplayItem) => pipelineVerified.has(item.resultId) && crossChecked.has(item.resultId);
  const qualifying = reading.items.filter((item) => isQualifyingHit(item) && isCrossChecked(item));
  const dropped = reading.items
    .filter((item) => !qualifying.includes(item))
    .map((item) => ({ item, reason: dropReason(item, isCrossChecked(item)) }));

  const plainOf = (item: GhostAsuraDisplayItem) => (ASURA_PLAIN[item.resultId] ? { plain: ASURA_PLAIN[item.resultId] } : {});

  // 三張卡同一引擎：一段連續讀盤（依柱位人生階段排序、同柱合拍、轉場、收束）→ 白話區（每印一行，對應時間）→ 收尾金句。
  const pillarKeyOf = (item: GhostAsuraDisplayItem): AsuraPillarKey =>
    (PILLAR_ORDER.find((key) => item.pillarLabels.includes(PILLAR_UI[key].label)) ?? 'year') as AsuraPillarKey;
  const natalMarks = qualifying.map((item) => ({
    resultId: item.resultId,
    name: item.displayName,
    pillar: pillarKeyOf(item),
    fallback: [realCopy(item.shortDeclaration), realCopy(item.verdict)].filter((t): t is string => Boolean(t)),
  }));
  // 時間軸：各卡由自己的時段觸發；同一道篩選＝交叉精準對上（VERIFIED）＋有真實文案（既有核可話術）。
  const axis = options.timeAxis ?? null;
  const itemById = new Map(reading.items.map((item) => [item.resultId, item]));
  const verifiedId = (id: string) => pipelineVerified.has(id) && crossChecked.has(id);
  const approvedCopy = (item: GhostAsuraDisplayItem): string[] => {
    if (isQualifyingHit(item)) return [realCopy(item.shortDeclaration), realCopy(item.verdict)].filter((t): t is string => Boolean(t));
    const w = ASURA_WORDINGS[item.displayName];
    return w ? [realCopy(w.shortDeclaration), realCopy(w.verdict)].filter((t): t is string => Boolean(t)) : [];
  };
  type TimeDrop = { id: string; name: string; reason: 'not-cross-verified' | 'no-copy' | 'unknown-id' };
  const timeMarks = (when: AsuraWhen, base: typeof natalMarks) => {
    const triggers = axis ? axis[when].triggers : [];
    const marks = [...base];
    const dropped: TimeDrop[] = [];
    for (const t of triggers) {
      if (marks.some((m) => m.resultId === t.id) || dropped.some((d) => d.id === t.id)) continue;
      const item = itemById.get(t.id);
      if (!item) { dropped.push({ id: t.id, name: t.id, reason: 'unknown-id' }); continue; }
      if (!verifiedId(t.id)) { dropped.push({ id: t.id, name: item.displayName, reason: 'not-cross-verified' }); continue; }
      const copy = approvedCopy(item);
      if (copy.length === 0) { dropped.push({ id: t.id, name: item.displayName, reason: 'no-copy' }); continue; }
      marks.push({ resultId: t.id, name: item.displayName, pillar: t.source === 'luck' ? 'luck' : 'flow', fallback: copy });
    }
    return { marks, dropped };
  };
  // 過去含本命底盤；現在、未來只看各自時段（沒有時間軸資料時退回本命，與舊行為相同）。
  const perCard = {
    past: timeMarks('past', natalMarks),
    present: axis ? timeMarks('present', []) : { marks: natalMarks, dropped: [] as TimeDrop[] },
    future: axis ? timeMarks('future', []) : { marks: natalMarks, dropped: [] as TimeDrop[] },
  };
  const timeSection = (
    when: AsuraWhen,
    frame: { key: AsuraDisplaySection['key']; heading: string; label: string },
  ): AsuraDisplaySection => {
    const { marks } = perCard[when];
    const reading = composeTime(when, marks, { name: options.targetName, target: options.identityTarget });
    const items: AsuraDisplayEntry[] = marks.map((mark) => ({
      label: mark.name,
      text: '',
      ...(ASURA_TIMELINE[mark.resultId]
        ? { plain: ASURA_TIMELINE[mark.resultId][when].plain }
        : ASURA_PLAIN[mark.resultId]
          ? { plain: ASURA_PLAIN[mark.resultId] }
          : {}),
    }));
    return {
      key: frame.key,
      heading: frame.heading,
      label: frame.label,
      lead: '',
      narrative: reading?.narrative ?? null,
      blocks: reading
        ? reading.blocks.map((block) => ({
            text: block.text,
            plain: block.ids.flatMap((id) => {
              const entry = items[marks.findIndex((m) => m.resultId === id)];
              return entry?.plain ? [{ label: entry.label, plain: entry.plain }] : [];
            }),
          }))
        : null,
      coda: reading?.coda ?? null,
      items,
      // 0 印：narrative／blocks／coda 皆為 null，整段不出字，前端只留卡框與標題列
    };
  };
  const hitsSection = timeSection('past', { key: 'hits', heading: '過去', label: '命中神煞' });
  const pillarsSection = timeSection('present', { key: 'pillars', heading: '現在', label: '柱位與封印' });
  const futureBase = timeSection('future', { key: 'verdict', heading: '未來', label: '阿修羅判語' });
  const verdictItems = futureBase.items;

  // 總判若提到任何未輸出的印記（或用到未輸出印記的計數），整句不輸出：被隱藏的印記不得被讀到。
  const hiddenNames = reading.items.filter((item) => !qualifying.includes(item)).map((item) => item.displayName).filter(Boolean);
  const rawLead = failed ? null : realCopy(bf.finalVerdict);
  const leadMentionsHidden = rawLead ? hiddenNames.some((name) => rawLead.includes(name)) : false;
  const leadCountsHidden = rawLead ? /^覺醒 \d+ 印；/.test(rawLead) && hiddenNames.length > 0 : false;
  const lead = rawLead && !leadMentionsHidden && !leadCountsHidden ? voiceLead(rawLead) : '';
  const verdictSection: AsuraDisplaySection = {
    ...futureBase,
    lead: axis ? '' : lead,
  };

  const audit: AsuraDisplayAudit = {
    listing: {
      total: reading.items.length,
      awakened: reading.awakenedCount,
      dormant: reading.dormantCount,
      pending: reading.pendingCount,
      columnRows,
      listedDistinct,
      ok: listingOk,
    },
    pipelineTotal: reading.items.length,
    emitted: qualifying.length,
    droppedDormant: dropped.filter((d) => d.reason === 'dormant').length,
    droppedDormantNames: dropped.filter((d) => d.reason === 'dormant').map((d) => d.item.displayName),
    droppedPendingNames: dropped.filter((d) => d.reason === 'pending').map((d) => d.item.displayName),
    droppedNoPillarNames: dropped.filter((d) => d.reason === 'no-pillar').map((d) => d.item.displayName),
    timelineMissingNames: qualifying.filter((item) => !ASURA_TIMELINE[item.resultId]).map((item) => item.displayName),
    verdictNoCopyNames: qualifying
      .filter((item) => !ASURA_TIMELINE[item.resultId] && !(ASURA_VOICE[item.resultId]?.verdict ?? realCopy(item.verdict)))
      .map((item) => item.displayName),
    droppedPending: dropped.filter((d) => d.reason === 'pending').length,
    droppedNoPillar: dropped.filter((d) => d.reason === 'no-pillar').length,
    droppedNotCrossVerified: dropped.filter((d) => d.reason === 'not-cross-verified').length,
    droppedNotCrossVerifiedNames: dropped.filter((d) => d.reason === 'not-cross-verified').map((d) => d.item.displayName),
    droppedPlaceholder: dropped.filter((d) => d.reason === 'placeholder').length,
    droppedPlaceholderNames: dropped.filter((d) => d.reason === 'placeholder').map((d) => d.item.displayName),
    leadHidden: Boolean(rawLead) && !lead,
    hourPillarNames: qualifying.filter((item) => item.pillarLabels.includes(PILLAR_UI.hour.label)).map((item) => item.displayName),
    hourDependentNames: hourAssumed
      ? qualifying.filter((item) => item.pillarLabels.includes(PILLAR_UI.hour.label)).map((item) => item.displayName)
      : [],
    timeAxis: axis
      ? {
          todayTaipei: axis.todayTaipei,
          flowYear: axis.flowYear,
          flowGanZhi: axis.flowGanZhi,
          ageShi: axis.ageShi,
          ageXu: axis.ageXu,
          cards: (['past', 'present', 'future'] as const).map((when) => ({
            when,
            luck: axis[when].luck,
            flowYears: axis[when].flowYears,
            triggered: [...new Set(axis[when].triggers.map((t) => t.id))],
            shown: perCard[when].marks.map((m) => m.name),
            dropped: perCard[when].dropped.map((d) => `${d.name}：${d.reason}`),
          })),
        }
      : null,
    plainMissingNames: qualifying.filter((item) => !ASURA_TIMELINE[item.resultId] && !ASURA_PLAIN[item.resultId]).map((item) => item.displayName),
    voiceRewritten: qualifying.filter((item) => ASURA_VOICE[item.resultId] || ASURA_TIMELINE[item.resultId]).length,
  };

  return {
    contract: ASURA_DISPLAY_CONTRACT,
    hourAssumed,
    assumedHour: hourAssumed ? ASSUMED_HOUR_LABEL : null,
    hourNote: hourAssumed ? HOUR_ASSUMED_NOTE : null,
    title: reading.cardTitle,
    subtitle: `${GHOST_ASURA_UI.natalAsura}｜${GHOST_ASURA_UI.battleField}｜${GHOST_ASURA_UI.secretScroll}`,
    lines: ['別人還沒看見風暴，阿修羅先看見。', '命盤是戰場，不是保護區。你已經站上去了。'],
    alert,
    scrollHint: '左右滑動查看四柱，印記依柱對齊。',
    columns,
    rest,
    stats: [
      { value: String(total), label: '項印記', caption: '這次逐一檢查的種類', target: 'pillars' as const },
      { value: String(reading.awakenedCount), label: GHOST_ASURA_UI.sealAwakened, tone: 'awakened', caption: '你的命盤上有出現', ...(reading.awakenedCount > 0 ? { target: 'pillars' as const } : {}) },
      { value: String(reading.dormantCount), label: GHOST_ASURA_UI.sealDormant, tone: 'dormant', caption: '你的命盤上沒出現', ...(reading.dormantCount > 0 ? { target: 'dormant' as const } : {}) },
      { value: String(reading.pendingCount), label: GHOST_ASURA_UI.sealPending, tone: 'pending', caption: reading.pendingCount > 0 ? '還在確認中' : '沒有待確認的項目', ...(reading.pendingCount > 0 ? { target: 'pending' as const } : {}) },
    ],
    statsHint,
    statsLines,
    supplements: [
      {
        key: 'dual' as const,
        heading: GHOST_ASURA_UI.printClash,
        entries: reading.dualClashes.map((clash) => ({
          id: clash.comboId,
          title: clash.title,
          members: `${clash.memberDisplayNames.join(' ↔ ')}${clash.pillarLabel ? `｜${clash.pillarLabel}` : ''}`,
          text: clash.evidenceText,
        })),
      },
      {
        key: 'chain' as const,
        heading: GHOST_ASURA_UI.asuraChain,
        entries: reading.chains.map((chain) => ({
          id: chain.comboId,
          title: chain.title,
          members: chain.memberDisplayNames.join('、'),
          text: chain.evidenceText,
        })),
      },
    ].filter((group) => group.entries.length > 0),
    battleField: { heading: GHOST_ASURA_UI.battleField, rows: battleRows },
    sections: [hitsSection, pillarsSection, verdictSection],
    glowIds: qualifying.map((item) => item.resultId),
    audit,
    scopeNote: '印記故事用於文化象徵與自我反思，不代表心理診斷或必然發生的預言。',
    targetName: options.targetName || null,
    identityTarget: options.identityTarget || 'self',
  };
}

/** 生辰 → 既有後端排盤 → 既有阿修羅管線 → 顯示契約。錯誤訊息沿用既有後端的中文驗證訊息。 */
export function computeGhostAsuraDisplay(raw: unknown, now: Date = new Date()): AsuraDisplay {
  const { hourAssumed, identityTarget, ...engineInput } = normalizeAsuraInput(raw);
  const result = calculateDualChart(engineInput);
  const timeAxis = computeTimeAxis(result, engineInput.gender === 'female' ? 'female' : 'male', now);
  const targetName = typeof engineInput.name === 'string' && engineInput.name.trim().length >= 2 ? engineInput.name.trim() : null;
  const effectiveTarget = (identityTarget === 'guest' ? 'guest' : 'self') as 'self' | 'guest';

  // 顯示別名層：運算結果不動，只把要上畫面的字換成阿修羅語彙（lib/asura-display-alias.ts）
  return asuraDeepScrub(toAsuraDisplay(buildGhostAsuraReading({ result }), crossCheckedRuleIds(result), {
    hourAssumed: hourAssumed === true,
    timeAxis,
    targetName,
    identityTarget: effectiveTarget,
  }));
}
