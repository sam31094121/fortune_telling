/**
 * 鬼魅阿修羅 — 人格解析中間層（server-only）。規格：lib/ghost-asura-nature-contract.ts（nature-final 第 1、5、6 條）
 *
 * 職責：runNatureGates 依序跑四道關（八字 → 紫微斗數 → 易經 → 命宮）；analyzePersona 在四關全 PASS 後，
 * 把四關結果整理成結構化人格證據 PersonaEvidence[]（本性卡唯一主證據）；任一關未過＝null。
 * traitKey 一律用語意代號（不含任何術數名稱、星名拼音），可直接供三卡串連。
 * 只查既有引擎輸出＋本檔固定對照表 PERSONA_TRAITS；決定性、無隨機、無時間、不自編。
 * 不產生任何畫面文字（文字由翻譯層 lib/server/ghost-asura-translation-layer.ts 負責）。
 *
 * 閘門全部沿用既有程式，不新增、不修改：
 *   八字   lib/three-core-engine.ts computeThreeCore（第一層 readyForInterpretation 不過即丟例外）
 *          ＋ lib/bazi-traditional-gate.ts getBaziTraditionalOutputGate().coreReady（與 lib/dual-chart.ts 同一道）
 *          ＋ crossCheck：BAZI_PILLARS_PRESENT、HOUR_NOT_FABRICATED
 *   紫微   ziwei.status READY ＋ isZiweiCertified ＋ crossCheck ZIWEI_BAZI_MATCHES_CORE
 *   易經   iching.status READY ＋ crossCheck ICHING_SEED_TRACEABLE／ICHING_PATTERN_DERIVED／ICHING_RITUAL_COMPLETED
 *          ＋ crossCheck.passed ＋ assertThreeCoreConsistent
 *   命宮   既有命宮檔案 lib/ziwei-destiny-card.ts：buildZiweiDestinyCard().verification.readyForFrontend
 *          （chartVerified＝十二宮齊＋時辰確認；mappingVerified＝命宮有主星）；命宮星曜取自同檔 mapZiweiToDestinySource
 * 時辰為後端代填（hourAssumed）時，八字之後各關一律 MISSING：不拿代填時辰產本性。
 *
 * 規格常變：關卡清單＝PERSONA_GATES（陣列順序即執行順序），增刪／調序只動這個陣列。
 */

import 'server-only';

import { getBaziTraditionalOutputGate } from '@/lib/bazi-traditional-gate';
import { assertThreeCoreConsistent, computeThreeCore, isZiweiCertified, type ThreeCoreResult } from '@/lib/three-core-engine';
import { buildZiweiDestinyCard, mapZiweiToDestinySource } from '@/lib/ziwei-destiny-card';
import { createZiweiAstrolabe } from '@/lib/ziwei/engine';
import type { GateStatus, NatureGates, PersonaEvidence, SourceRef } from '@/lib/ghost-asura-nature-contract';

export type NatureGateId = keyof NatureGates;
type Strength = NonNullable<PersonaEvidence['strength']>;

/* ───────────────────────── 四道關（順序＝陣列順序） ───────────────────────── */

export interface PersonaInput { birthDate: string; birthTime: string; gender: 'male' | 'female'; hourAssumed?: boolean }

/** 命宮素材：main＝命宮有主星；empty＝命宮空宮，借遷移宮（對宮）主星。星曜、亮度全取自既有引擎輸出（calculateZiweiSanFang allPalaces）。 */
/**
 * 14:13 命宮細項（後端證據，只增不改）：讀同一份輸入的 iztro 星盤 palaces[命宮] 原樣欄位。
 * 不改任何引擎；這些術語只留後端，不進前台 HTML／瀏覽器 JSON。專案內查無紫微原意 → 一律「列出、不解讀」。
 */
export const LIFE_PALACE_DETAIL_SOURCE = 'iztro astrolabe palaces[命宮]';
/** 追溯鏈：同一份 lib/ziwei-sanfang-engine.ts calculateZiweiSanFang ziweiBirthInput → lib/ziwei/engine.ts createZiweiAstrolabe */
const DETAIL_CHAIN = 'lib/ziwei/engine.ts createZiweiAstrolabe；輸入＝lib/ziwei-sanfang-engine.ts calculateZiweiSanFang ziweiBirthInput';
export interface LifePalaceDetail {
  source: typeof LIFE_PALACE_DETAIL_SOURCE;
  changsheng12: string;
  boshi12: string;
  jiangqian12: string;
  suiqian12: string;
  decadal: { range: number[]; heavenlyStem: string; earthlyBranch: string } | null;
  ages: number[];
  /** iztro 原樣星表（分類用：主星含四化、輔煞 minorStars、雜曜 adjectiveStars） */
  majorStars: Array<{ name: string; brightness?: string; mutagen?: string }>;
  minorStars: Array<{ name: string; brightness?: string; mutagen?: string }>;
  adjectiveStars: string[];
}
/** 讀 iztro 星盤命宮細項；讀不到（或宮支對不上引擎命宮）回 undefined，不影響四道關判定。 */
export function readLifePalaceDetail(birthInput: unknown, mingBranch: string): LifePalaceDetail | undefined {
  try {
    const astro = createZiweiAstrolabe(birthInput as Parameters<typeof createZiweiAstrolabe>[0]);
    const p = astro.palaces.find((x) => (x.name === '命宮' || x.name === '命宫') && String(x.earthlyBranch) === mingBranch);
    if (!p) return undefined;
    const d = p.decadal as { range?: number[]; heavenlyStem?: unknown; earthlyBranch?: unknown } | undefined;
    return {
      source: LIFE_PALACE_DETAIL_SOURCE,
      changsheng12: String(p.changsheng12 ?? ''),
      boshi12: String(p.boshi12 ?? ''),
      jiangqian12: String(p.jiangqian12 ?? ''),
      suiqian12: String(p.suiqian12 ?? ''),
      decadal: d ? { range: [...(d.range ?? [])], heavenlyStem: String(d.heavenlyStem ?? ''), earthlyBranch: String(d.earthlyBranch ?? '') } : null,
      ages: [...((p.ages as number[] | undefined) ?? [])],
      majorStars: (p.majorStars ?? []).map((s) => ({ name: String(s.name), ...(s.brightness ? { brightness: String(s.brightness) } : {}), ...(s.mutagen ? { mutagen: String(s.mutagen) } : {}) })),
      minorStars: (p.minorStars ?? []).map((s) => ({ name: String(s.name), ...(s.brightness ? { brightness: String(s.brightness) } : {}), ...(s.mutagen ? { mutagen: String(s.mutagen) } : {}) })),
      adjectiveStars: (p.adjectiveStars ?? []).map((s) => String(s.name)),
    };
  } catch {
    return undefined;
  }
}
/**
 * 14:18 貫穿規則：命宮全部項目同一張清單、同等地位（主星、四化、輔煞、雜曜、四組十二神、大限、小限），不分主從、不另開側物件。
 * 每項附 source（引擎或 iztro 命宮那一格）。有出處的才產文字；沒出處的只在後台列出不編。
 */
export type LifePalaceItemKind = 'major' | 'mutagen' | 'minor' | 'adjective' | 'changsheng' | 'boshi' | 'jiangqian' | 'suiqian' | 'decadal' | 'ages';
export interface LifePalaceItem { kind: LifePalaceItemKind; name: string; brightness?: string; value?: string; source: string }
export const LIFE_PALACE_ITEM_LABEL: Record<LifePalaceItemKind, string> = { major: '主星', mutagen: '四化', minor: '輔煞星', adjective: '雜曜', changsheng: '長生十二神', boshi: '博士十二神', jiangqian: '將前十二神', suiqian: '歲前十二神', decadal: '大限', ages: '小限' };
/** 由引擎命宮（calculateZiweiSanFang allPalaces[命宮]）＋同輸入 iztro palaces[命宮] 組成單一清單；只照抄，不推算。 */
export function buildLifePalaceItems(ming: { majorStars?: string[]; majorStarDetails?: Array<{ name: string; brightness?: string }>; minorStars?: string[]; transformations?: string[] }, detail: LifePalaceDetail | undefined): LifePalaceItem[] {
  const S = 'lib/ziwei-sanfang-engine.ts calculateZiweiSanFang allPalaces[命宮]';
  const IZ = `${LIFE_PALACE_DETAIL_SOURCE}（${DETAIL_CHAIN}）`;
  const bright = new Map((ming.majorStarDetails ?? []).map((s) => [s.name, s.brightness]));
  const items: LifePalaceItem[] = [];
  for (const name of ming.majorStars ?? []) items.push({ kind: 'major', name, ...(bright.get(name) ? { brightness: bright.get(name) } : {}), source: `${S}.majorStarDetails；${IZ}.majorStars` });
  const mutated = [...(detail?.majorStars ?? []), ...(detail?.minorStars ?? [])].filter((s) => s.mutagen);
  for (const mark of ming.transformations ?? []) {
    const star = mutated.find((s) => s.mutagen === mark);
    items.push({ kind: 'mutagen', name: `${star ? star.name : ''}化${mark}`, value: mark, source: `${S}.transformations${star ? `；${IZ}.${detail?.majorStars.includes(star) ? 'majorStars' : 'minorStars'}[${star.name}].mutagen` : ''}` });
  }
  const adjective = new Set(detail?.adjectiveStars ?? []);
  const minorBright = new Map((detail?.minorStars ?? []).map((s) => [s.name, s.brightness]));
  for (const name of ming.minorStars ?? []) {
    const kind: LifePalaceItemKind = adjective.has(name) ? 'adjective' : 'minor';
    const b = minorBright.get(name);
    items.push({ kind, name, ...(b ? { brightness: b } : {}), source: `${S}.minorStars；${IZ}.${kind === 'adjective' ? 'adjectiveStars' : 'minorStars'}` });
  }
  if (detail) {
    const twelve: Array<[LifePalaceItemKind, string, string]> = [['changsheng', detail.changsheng12, 'changsheng12'], ['boshi', detail.boshi12, 'boshi12'], ['jiangqian', detail.jiangqian12, 'jiangqian12'], ['suiqian', detail.suiqian12, 'suiqian12']];
    for (const [kind, v, field] of twelve) if (v) items.push({ kind, name: v, value: v, source: `${IZ}.${field}` });
    if (detail.decadal) { const v = `${detail.decadal.range.join('-')}歲 ${detail.decadal.heavenlyStem}${detail.decadal.earthlyBranch}`; items.push({ kind: 'decadal', name: v, value: v, source: `${IZ}.decadal` }); }
    if (detail.ages.length) { const v = detail.ages.join(','); items.push({ kind: 'ages', name: v, value: v, source: `${IZ}.ages` }); }
  }
  return items;
}

/** 14:13：命宮細項的專案內紫微原意對照（查無 → 空表；同名八字神煞／五神原意不得混用）。 */
export const LIFE_PALACE_DETAIL_MEANINGS: ReadonlyArray<{ field: keyof Omit<LifePalaceDetail, 'source'>; value: string } & Trait> = [];

/**
 * 14:15 命宮檔案（第四道關 buildZiweiDestinyCard 所用 lib/ziwei-destiny-card.ts）裡對得上本命宮的條目，原文照抄、附 file:line。
 * 登記：docs/技能戰鬥檔案/紫微斗數/來源登記.json:391 C-ZIWEI-CLASSICS（files 含 lib/ziwei-destiny-card.ts，:400）＝CONFLICT。
 * 只作後端證據「列出、不解讀」：本卡不據此產文字（卡面文字仍只來自既有人格登錄檔），不進前台。
 */
export const LIFE_PALACE_DATA_FILE = 'lib/ziwei-destiny-card.ts';
export const LIFE_PALACE_DATA_FILE_STATUS = 'docs/技能戰鬥檔案/紫微斗數/來源登記.json:391 C-ZIWEI-CLASSICS＝CONFLICT';
export const LIFE_PALACE_DATA_FILE_STARS: ReadonlyArray<{ star: string; archetype: string; at: string; verbatim: string }> = [
  { star: '七殺', archetype: 'BREAKER_COMMANDER', at: 'lib/ziwei-destiny-card.ts:87 STAR_ARCHETYPE_MAP；:104 ARCHETYPE_COPY.BREAKER_COMMANDER', verbatim: "subtitle '破局中的掌舵者'；keywords ['刀鋒','山峰','破局']；power '你擅長在混亂中快速找到突破口。'；challenge '真正要控制的不是力量，而是力量使用的節奏。'；direction '先定目標，再清阻礙。'；action '先完成最重要的一件事。'" },
  { star: '武曲', archetype: 'RESOURCE_EXECUTOR', at: 'lib/ziwei-destiny-card.ts:90 STAR_ARCHETYPE_MAP；:107 ARCHETYPE_COPY.RESOURCE_EXECUTOR', verbatim: "subtitle '資源中的執行者'；keywords ['金屬','財庫','帳本']；power '你擅長把目標變成資源、數字與成果。'；challenge '若只看效率，容易忽略人與節奏。'；direction '用制度承接成果。'；action '列出今天的完成清單。'" },
];
export const LIFE_PALACE_DATA_FILE_TRANSFORMATIONS: ReadonlyArray<{ mark: string; label: string; at: string }> = [
  { mark: '科', label: '化科', at: "lib/ziwei-destiny-card.ts:148 transformationType（'科'→KE）；:154 transformationLabel（KE→'化科'，只有標籤、無意義文字）" },
];

/**
 * 14:23 使用者決定（2026-10-09 14:23）：
 * (1) 使用者提供的說法算有出處：七殺本性「老闆命、決策者」由「只當資料」改為「可產話術」（證據本來就是 NATURE.DECIDER，非 listedOnly）。
 * (2) 命宮檔案 武曲（:107 '資源中的執行者'）、七殺（:104 '破局中的掌舵者'）原文改為「可產話術」：後端證據標 material（翻譯層素材），
 *     不自動成句、不改卡面四段定稿；化科標籤仍只有標籤、只當資料。登錄檔 CONFLICT 不翻。
 */
export const WORDING_DECISION_1423 = '使用者決定 2026-10-09 14:23';
/** 14:27 使用者決定（2026-10-09 14:27）：武曲／七殺 命宮檔案其餘既有欄位（keywords／power／challenge／direction／action）一併開放為話術素材，逐欄一筆、原文照抄。 */
export const WORDING_DECISION_1427 = '使用者決定 2026-10-09 14:27';
export type LifePalaceWordingField = 'subtitle' | 'keywords' | 'power' | 'challenge' | 'direction' | 'action';
export const LIFE_PALACE_WORDING_MATERIAL: ReadonlyArray<{ star: string; archetype: string; field: LifePalaceWordingField; traitKey: string; text: string; at: string; decision: string }> = [
  { star: '七殺', archetype: 'BREAKER_COMMANDER', field: 'subtitle', traitKey: 'MATERIAL.BREAKER_COMMANDER', text: '破局中的掌舵者', at: 'lib/ziwei-destiny-card.ts:104 ARCHETYPE_COPY.BREAKER_COMMANDER.subtitle', decision: WORDING_DECISION_1423 },
  { star: '七殺', archetype: 'BREAKER_COMMANDER', field: 'keywords', traitKey: 'MATERIAL.BREAKER_COMMANDER.KEYWORDS', text: "['刀鋒', '山峰', '破局']", at: 'lib/ziwei-destiny-card.ts:104 ARCHETYPE_COPY.BREAKER_COMMANDER.keywords', decision: WORDING_DECISION_1427 },
  { star: '七殺', archetype: 'BREAKER_COMMANDER', field: 'power', traitKey: 'MATERIAL.BREAKER_COMMANDER.POWER', text: '你擅長在混亂中快速找到突破口。', at: 'lib/ziwei-destiny-card.ts:104 ARCHETYPE_COPY.BREAKER_COMMANDER.power', decision: WORDING_DECISION_1427 },
  { star: '七殺', archetype: 'BREAKER_COMMANDER', field: 'challenge', traitKey: 'MATERIAL.BREAKER_COMMANDER.CHALLENGE', text: '真正要控制的不是力量，而是力量使用的節奏。', at: 'lib/ziwei-destiny-card.ts:104 ARCHETYPE_COPY.BREAKER_COMMANDER.challenge', decision: WORDING_DECISION_1427 },
  { star: '七殺', archetype: 'BREAKER_COMMANDER', field: 'direction', traitKey: 'MATERIAL.BREAKER_COMMANDER.DIRECTION', text: '先定目標，再清阻礙。', at: 'lib/ziwei-destiny-card.ts:104 ARCHETYPE_COPY.BREAKER_COMMANDER.direction', decision: WORDING_DECISION_1427 },
  { star: '七殺', archetype: 'BREAKER_COMMANDER', field: 'action', traitKey: 'MATERIAL.BREAKER_COMMANDER.ACTION', text: '先完成最重要的一件事。', at: 'lib/ziwei-destiny-card.ts:104 ARCHETYPE_COPY.BREAKER_COMMANDER.action', decision: WORDING_DECISION_1427 },
  { star: '武曲', archetype: 'RESOURCE_EXECUTOR', field: 'subtitle', traitKey: 'MATERIAL.RESOURCE_EXECUTOR', text: '資源中的執行者', at: 'lib/ziwei-destiny-card.ts:107 ARCHETYPE_COPY.RESOURCE_EXECUTOR.subtitle', decision: WORDING_DECISION_1423 },
  { star: '武曲', archetype: 'RESOURCE_EXECUTOR', field: 'keywords', traitKey: 'MATERIAL.RESOURCE_EXECUTOR.KEYWORDS', text: "['金屬', '財庫', '帳本']", at: 'lib/ziwei-destiny-card.ts:107 ARCHETYPE_COPY.RESOURCE_EXECUTOR.keywords', decision: WORDING_DECISION_1427 },
  { star: '武曲', archetype: 'RESOURCE_EXECUTOR', field: 'power', traitKey: 'MATERIAL.RESOURCE_EXECUTOR.POWER', text: '你擅長把目標變成資源、數字與成果。', at: 'lib/ziwei-destiny-card.ts:107 ARCHETYPE_COPY.RESOURCE_EXECUTOR.power', decision: WORDING_DECISION_1427 },
  { star: '武曲', archetype: 'RESOURCE_EXECUTOR', field: 'challenge', traitKey: 'MATERIAL.RESOURCE_EXECUTOR.CHALLENGE', text: '若只看效率，容易忽略人與節奏。', at: 'lib/ziwei-destiny-card.ts:107 ARCHETYPE_COPY.RESOURCE_EXECUTOR.challenge', decision: WORDING_DECISION_1427 },
  { star: '武曲', archetype: 'RESOURCE_EXECUTOR', field: 'direction', traitKey: 'MATERIAL.RESOURCE_EXECUTOR.DIRECTION', text: '用制度承接成果。', at: 'lib/ziwei-destiny-card.ts:107 ARCHETYPE_COPY.RESOURCE_EXECUTOR.direction', decision: WORDING_DECISION_1427 },
  { star: '武曲', archetype: 'RESOURCE_EXECUTOR', field: 'action', traitKey: 'MATERIAL.RESOURCE_EXECUTOR.ACTION', text: '列出今天的完成清單。', at: 'lib/ziwei-destiny-card.ts:107 ARCHETYPE_COPY.RESOURCE_EXECUTOR.action', decision: WORDING_DECISION_1427 },
];

export type LifePalaceMaterial = { mode: 'main' | 'empty'; palaceName: string; majorStars: Array<{ name: string; brightness?: string }>; minorStars: Array<{ name: string; brightness?: string }>; /** 13:24：命宮四化（引擎 allPalaces[命宮].transformations 原樣，例 '科'） */ transformations?: string[]; borrowed: { palaceName: string; majorStars: Array<{ name: string; brightness?: string }> } | null; /** 14:18 命宮單一清單（全部項目同等地位，各附 source） */ items: LifePalaceItem[] };

/** 關卡之間共用的中間結果（只放既有引擎輸出） */
interface GateContext {
  input: PersonaInput;
  threeCore?: ThreeCoreResult;
  lifePalace?: LifePalaceMaterial;
}

interface GateDef { id: NatureGateId; label: string; run(ctx: GateContext): GateStatus }

const checkPassed = (r: ThreeCoreResult, id: string) => r.crossCheck.checks.some((c) => c.id === id && c.passed);

export const PERSONA_GATES: readonly GateDef[] = [
  {
    id: 'bazi',
    label: '八字',
    run(ctx) {
      try {
        ctx.threeCore = computeThreeCore({ birthDate: ctx.input.birthDate, birthTime: ctx.input.birthTime, gender: ctx.input.gender });
      } catch {
        return 'FAIL';
      }
      const r = ctx.threeCore;
      return getBaziTraditionalOutputGate(true).coreReady && checkPassed(r, 'BAZI_PILLARS_PRESENT') && checkPassed(r, 'HOUR_NOT_FABRICATED') && r.bazi.hour !== null
        ? 'PASS' : 'FAIL';
    },
  },
  {
    id: 'ziwei',
    label: '紫微斗數',
    run(ctx) {
      const r = ctx.threeCore;
      if (!r || ctx.input.hourAssumed === true || r.ziwei.status !== 'READY') return 'MISSING';
      return isZiweiCertified(r.ziwei) && checkPassed(r, 'ZIWEI_BAZI_MATCHES_CORE') ? 'PASS' : 'FAIL';
    },
  },
  {
    id: 'yijing',
    label: '易經',
    run(ctx) {
      const r = ctx.threeCore;
      if (!r || r.iching.status === 'UNAVAILABLE_BIRTH_TIME_REQUIRED') return 'MISSING';
      if (r.iching.status !== 'READY') return 'FAIL';
      try { assertThreeCoreConsistent(r); } catch { return 'FAIL'; }
      return r.crossCheck.passed && checkPassed(r, 'ICHING_SEED_TRACEABLE') && checkPassed(r, 'ICHING_PATTERN_DERIVED') && checkPassed(r, 'ICHING_RITUAL_COMPLETED')
        ? 'PASS' : 'FAIL';
    },
  },
  {
    id: 'lifePalace',
    label: '紫微斗數命宮',
    /**
     * 主路：既有命宮檔案 buildZiweiDestinyCard().verification.readyForFrontend（不改其判定）。
     * 替代路（2026-10-09 13:02 使用者規格）：命宮空宮（無主星）且盤面已驗（chartVerified）→ 改走空宮規則：
     * 本性底色＝空宮本義「什麼都可以、什麼都能做」，再列命宮內全部小星（含強弱），再借遷移宮（對宮）主星。
     */
    run(ctx) {
      const r = ctx.threeCore;
      if (!r || r.ziwei.status !== 'READY') return 'MISSING';
      let card: ReturnType<typeof buildZiweiDestinyCard> | null = null;
      try { card = buildZiweiDestinyCard({ analysisId: 'asura-nature', chart: r.ziwei.analysis }); } catch { card = null; }
      if (!card) return 'FAIL';
      const source = mapZiweiToDestinySource(r.ziwei.analysis);
      const palaces = r.ziwei.analysis.allPalaces;
      const ming = palaces.find((p) => p.key === source.palaceId);
      if (!ming) return 'MISSING';
      const bright = (details: Array<{ name: string; brightness?: string }> | undefined) => new Map((details ?? []).map((s) => [s.name, s.brightness]));
      const mingBright = bright(ming.majorStarDetails as Array<{ name: string; brightness?: string }>);
      const minorStars = (ming.minorStars ?? []).map((name) => ({ name, brightness: mingBright.get(name) }));
      const detail = readLifePalaceDetail((r.ziwei.analysis as { ziweiBirthInput?: unknown }).ziweiBirthInput, String((ming as { branch?: string }).branch ?? ''));
      if (card.verification.readyForFrontend === true) {
        ctx.lifePalace = {
          mode: 'main',
          palaceName: source.palaceName,
          // 13:24：命宮全部主星一律照引擎命宮原樣列入（不只代表星）；檔案判定仍是既有 readyForFrontend
          majorStars: (ming.majorStars ?? []).map((name) => ({ name, brightness: mingBright.get(name) })),
          minorStars,
          transformations: [...((ming as { transformations?: string[] }).transformations ?? [])],
          borrowed: null,
          items: buildLifePalaceItems(ming as Parameters<typeof buildLifePalaceItems>[0], detail),
        };
        return 'PASS';
      }
      const emptyPalace = card.verification.chartVerified === true && source.primaryStars.length === 0 && (ming.majorStars ?? []).length === 0;
      if (!emptyPalace) return 'FAIL';
      const travel = palaces.find((p) => p.key === EMPTY_PALACE_BORROW_KEY);
      const travelBright = bright(travel?.majorStarDetails as Array<{ name: string; brightness?: string }> | undefined);
      ctx.lifePalace = {
        mode: 'empty',
        palaceName: source.palaceName,
        majorStars: [],
        minorStars,
        transformations: [...((ming as { transformations?: string[] }).transformations ?? [])],
        borrowed: travel ? { palaceName: travel.name, majorStars: (travel.majorStars ?? []).map((name) => ({ name, brightness: travelBright.get(name) })) } : null,
        items: buildLifePalaceItems(ming as Parameters<typeof buildLifePalaceItems>[0], detail),
      };
      return 'PASS';
    },
  },
];

/* ───────────────────────── 固定對照表：素材 → 人格特質代號 ─────────────────────────
 * 每條附原意出處（refs.source，只存後端）。強弱：廟、旺＝strong；得、利、平、空白＝neutral；不、陷＝weak（本表固定規則）。
 * 有強／弱專屬出處的才換特質（七殺強、巨門弱、破軍弱＝使用者提供 2026-10-09）；其餘星無專屬出處，強弱共用同一特質，
 * strength 仍記在 evidence 上。traitKey 為語意代號，不含術數名稱。 */
const REG = 'lib/asura/ziwei-personality-registry.ts';
const SUPPORT = 'lib/ziwei-teacher-synthesis.ts ZIWEI_PROFESSIONAL_SUPPORT_STARS';
const USER = '使用者提供 2026-10-09';
const PALACE = 'lib/ziwei-destiny-card.ts mapZiweiToDestinySource';
const SANFANG = 'lib/ziwei-sanfang-engine.ts calculateZiweiSanFang allPalaces';
/** 空宮借遷移宮（對宮）：引擎宮位代號 */
export const EMPTY_PALACE_BORROW_KEY = 'QIAN_YI';
/** 空宮本義（使用者提供 2026-10-09 13:02）：本性底色 */
export const EMPTY_PALACE_BASE = { traitKey: 'NATURE.OPEN', source: '使用者提供 2026-10-09 13:02 空宮本義「什麼都可以、什麼都能做」' } as const;

type Trait = { traitKey: string; source: string };
/** 一顆主星的四段：本性（coreDrive；七殺強＝使用者原意）／優勢（strength）／弱點（shadow）／風險（stressResponse；巨門、破軍依使用者原意）。原文見 lib/asura/ziwei-personality-registry.ts */
interface StarTrait { name: string; essence: { strong?: Trait; weak?: Trait; base: Trait }; strength: Trait; weakness: Trait; risk: { strong?: Trait; weak?: Trait; base: Trait } }

export const PERSONA_MAJOR_STARS: readonly StarTrait[] = [
  { name: '紫微',
    essence: { base: { traitKey: 'NATURE.SOVEREIGN', source: `${REG} ZIWEI.coreDrive「掌局、整合、位置感、尊嚴、控制全局」` } },
    strength: { traitKey: 'STRENGTH.SOVEREIGN', source: `${REG} ZIWEI.strength「掌全局、位置感清、標準明確、人服氣」` },
    weakness: { traitKey: 'WEAKNESS.SOVEREIGN.OVERCONTROL', source: `${REG} ZIWEI.shadow「要求高、難接受不按規則、控制欲強」` },
    risk: { base: { traitKey: 'RISK.SOVEREIGN.PRESSURE', source: `${REG} ZIWEI.stressResponse「更沉、話變少」` } } },
  { name: '天機',
    essence: { base: { traitKey: 'NATURE.STRATEGIST', source: `${REG} TIANJI.coreDrive「思考、變化、策略、預判、腦內高速運算」` } },
    strength: { traitKey: 'STRENGTH.STRATEGIST', source: `${REG} TIANJI.strength「想得快、預判強、變通能力、反應敏」` },
    weakness: { traitKey: 'WEAKNESS.STRATEGIST.OVERTHINK', source: `${REG} TIANJI.shadow「想太多、優柔寡斷、容易過度分析」` },
    risk: { base: { traitKey: 'RISK.STRATEGIST.PRESSURE', source: `${REG} TIANJI.stressResponse「話變多、邏輯走得更快」` } } },
  { name: '太陽',
    essence: { base: { traitKey: 'NATURE.TORCHBEARER', source: `${REG} TAIYANG.coreDrive「外放、承擔、照顧、曝光、責任感」` } },
    strength: { traitKey: 'STRENGTH.TORCHBEARER', source: `${REG} TAIYANG.strength「照顧力、承擔能力、領導感、能量足」` },
    weakness: { traitKey: 'WEAKNESS.TORCHBEARER.BURNOUT', source: `${REG} TAIYANG.shadow「容易過度承擔、充電不足、被消耗」` },
    risk: { base: { traitKey: 'RISK.TORCHBEARER.PRESSURE', source: `${REG} TAIYANG.stressResponse「更亮、反而更照顧別人」` } } },
  { name: '武曲',
    essence: { base: { traitKey: 'NATURE.EXECUTOR', source: `${REG} WUQU.coreDrive「效率、結果、資源、紀律、執行」` } },
    strength: { traitKey: 'STRENGTH.EXECUTOR', source: `${REG} WUQU.strength「執行力強、成本意識、結果為王、不軟」` },
    weakness: { traitKey: 'WEAKNESS.EXECUTOR.COLD', source: `${REG} WUQU.shadow「太功利、忽視過程、冷硬」` },
    risk: { base: { traitKey: 'RISK.EXECUTOR.PRESSURE', source: `${REG} WUQU.stressResponse「更快、更狠、效率優先」` } } },
  { name: '天同',
    essence: { base: { traitKey: 'NATURE.EASYGOING', source: `${REG} TIANTONG.coreDrive「舒服、善意、適應、情緒、享受」` } },
    strength: { traitKey: 'STRENGTH.EASYGOING', source: `${REG} TIANTONG.strength「舒服力、善意強、包容度高、反差」` },
    weakness: { traitKey: 'WEAKNESS.EASYGOING.AVOID', source: `${REG} TIANTONG.shadow「太逃避、該動時躲、軟弱」` },
    risk: { base: { traitKey: 'RISK.EASYGOING.PRESSURE', source: `${REG} TIANTONG.stressResponse「更軟、內縮、默默躲」` } } },
  { name: '廉貞',
    essence: { base: { traitKey: 'NATURE.BOUNDARY', source: `${REG} LIANZHEN.coreDrive「界線、原則、魅力、規則、慾望控制」` } },
    strength: { traitKey: 'STRENGTH.BOUNDARY', source: `${REG} LIANZHEN.strength「界線感、魅力強、說服力、控制感」` },
    weakness: { traitKey: 'WEAKNESS.BOUNDARY.HARSH', source: `${REG} LIANZHEN.shadow「界線太硬、容易傷人、欲望難控」` },
    risk: { base: { traitKey: 'RISK.BOUNDARY.PRESSURE', source: `${REG} LIANZHEN.stressResponse「更銳利、下手更狠」` } } },
  { name: '天府',
    essence: { base: { traitKey: 'NATURE.KEEPER', source: `${REG} TIANFU.coreDrive「穩定、儲備、管理、守成、資源掌握」` } },
    strength: { traitKey: 'STRENGTH.KEEPER', source: `${REG} TIANFU.strength「防禦強、資源掌握、穩定感、有底氣」` },
    weakness: { traitKey: 'WEAKNESS.KEEPER.RIGID', source: `${REG} TIANFU.shadow「守得太死、失去機會、躲在後面」` },
    risk: { base: { traitKey: 'RISK.KEEPER.PRESSURE', source: `${REG} TIANFU.stressResponse「更穩、資源更守緊」` } } },
  { name: '太陰',
    essence: { base: { traitKey: 'NATURE.OBSERVER', source: `${REG} TAIYIN.coreDrive「內在、敏感、觀察、細節、安全感」` } },
    strength: { traitKey: 'STRENGTH.OBSERVER', source: `${REG} TAIYIN.strength「洞察強、敏感度、細節控、深思」` },
    weakness: { traitKey: 'WEAKNESS.OBSERVER.BROOD', source: `${REG} TAIYIN.shadow「想太多、內耗重、悶悶的」` },
    risk: { base: { traitKey: 'RISK.OBSERVER.PRESSURE', source: `${REG} TAIYIN.stressResponse「更內向、更多內耗」` } } },
  { name: '貪狼',
    essence: { base: { traitKey: 'NATURE.SEEKER', source: `${REG} TANLANG.coreDrive「慾望、魅力、社交、探索、取得」` } },
    strength: { traitKey: 'STRENGTH.SEEKER', source: `${REG} TANLANG.strength「魅力強、社交強、探索力、取得能力」` },
    weakness: { traitKey: 'WEAKNESS.SEEKER.IMPULSE', source: `${REG} TANLANG.shadow「慾望難滿、選項麻痹、衝動」` },
    risk: { base: { traitKey: 'RISK.SEEKER.PRESSURE', source: `${REG} TANLANG.stressResponse「更活躍、拚命尋求出口」` } } },
  { name: '巨門',
    essence: { base: { traitKey: 'NATURE.QUESTIONER', source: `${REG} JUMEN.coreDrive「拆解、質疑、表達、辯證、查證」` } },
    strength: { traitKey: 'STRENGTH.QUESTIONER', source: `${REG} JUMEN.strength「邏輯強、表達力、洞察力、不信邪」` },
    weakness: { traitKey: 'WEAKNESS.QUESTIONER.SHARP', source: `${REG} JUMEN.shadow「太毒舌、傷人、不信任」` },
    risk: { base: { traitKey: 'RISK.QUESTIONER.QUARREL', source: `${USER} 巨門「口舌之爭」` }, weak: { traitKey: 'RISK.QUESTIONER.SPEAK_BEFORE_CONFIRM', source: `${USER} 巨門（弱）「未經確認就快速講話」` } } },
  { name: '天相',
    essence: { base: { traitKey: 'NATURE.MEDIATOR', source: `${REG} TIANXIANG.coreDrive「協調、公平、形象、規則、人際平衡」` } },
    strength: { traitKey: 'STRENGTH.MEDIATOR', source: `${REG} TIANXIANG.strength「協調力、公平感、形象力、人際」` },
    weakness: { traitKey: 'WEAKNESS.MEDIATOR.PLEASE', source: `${REG} TIANXIANG.shadow「討好過度、沒有立場、隱忍」` },
    risk: { base: { traitKey: 'RISK.MEDIATOR.PRESSURE', source: `${REG} TIANXIANG.stressResponse「更謹慎、更照顧場面」` } } },
  { name: '天梁',
    essence: { base: { traitKey: 'NATURE.GUARDIAN', source: `${REG} TIANLIANG.coreDrive「原則、保護、長線、判斷、照顧」` } },
    strength: { traitKey: 'STRENGTH.GUARDIAN', source: `${REG} TIANLIANG.strength「判斷力、保護力、長線眼光、經歷」` },
    weakness: { traitKey: 'WEAKNESS.GUARDIAN.OVERMANAGE', source: `${REG} TIANLIANG.shadow「管太多、被當警報器、嚴厲」` },
    risk: { base: { traitKey: 'RISK.GUARDIAN.PRESSURE', source: `${REG} TIANLIANG.stressResponse「更沉、責任感更強」` } } },
  { name: '七殺',
    essence: { strong: { traitKey: 'NATURE.DECIDER', source: `${USER} 七殺（強）「老闆命、決策者」；可產話術（${WORDING_DECISION_1423}：使用者提供＝有出處）` }, base: { traitKey: 'NATURE.VANGUARD', source: `${REG} QISHA.coreDrive「決斷、衝鋒、承擔、突破、快速行動」` } },
    strength: { traitKey: 'STRENGTH.VANGUARD', source: `${REG} QISHA.strength「決斷力、承擔力、行動快、衝鋒力」` },
    weakness: { traitKey: 'WEAKNESS.VANGUARD.RASH', source: `${REG} QISHA.shadow「太快、不思考、蠻幹」` },
    risk: { base: { traitKey: 'RISK.VANGUARD.PRESSURE', source: `${REG} QISHA.stressResponse「更快、更狠、馬上行動」` } } },
  { name: '破軍',
    essence: { base: { traitKey: 'NATURE.BREAKER', source: `${USER} 破軍「喜歡破壞」；${REG} POJUN.coreDrive「拆除、改變、破局、重建、革新」` } },
    strength: { traitKey: 'STRENGTH.BREAKER', source: `${REG} POJUN.strength「突破力、改變力、創新感、不守規」` },
    weakness: { traitKey: 'WEAKNESS.BREAKER.NO_BUILD', source: `${REG} POJUN.shadow「太拆、沒有建、亂局」` },
    risk: { base: { traitKey: 'RISK.BREAKER.PRESSURE', source: `${REG} POJUN.stressResponse「更反骨、更拆」` }, weak: { traitKey: 'RISK.BREAKER.CANNOT_BUILD', source: `${USER} 破軍（太弱）「只會破壞無法建設，建設時困難重重」` } } },
];

/** 小星：只收描述本人特質者（左輔、右弼、天魁、天鉞、祿存、天馬為外來助力／資源，非本性，不收）。 */
export const PERSONA_MINOR_STARS: ReadonlyArray<{ name: string } & Trait> = [
  { name: '文昌', traitKey: 'NATURE.SCRIBE', source: `${SUPPORT} 文昌「文書、考試、表達、制度化能力」` },
  { name: '文曲', traitKey: 'NATURE.ARTIST', source: `${SUPPORT} 文曲「才華、審美、溝通、感性表達」` },
];
/** 13:24：命宮四化（引擎標記 祿／權／科／忌）。原意：lib/ziwei-teacher-synthesis.ts:59-64 ZIWEI_PROFESSIONAL_TRANSFORMATIONS。 */
const TRANSFORM_SRC = 'lib/ziwei-teacher-synthesis.ts ZIWEI_PROFESSIONAL_TRANSFORMATIONS';
export const PERSONA_TRANSFORMATIONS: ReadonlyArray<{ mark: string; name: string; kind: 'essence' | 'weakness' } & Trait> = [
  { mark: '祿', name: '化祿', kind: 'essence', traitKey: 'NATURE.MARK.FLOW', source: `${TRANSFORM_SRC}:60 化祿「資源流入、緣分增加、可用條件變多。」` },
  { mark: '權', name: '化權', kind: 'essence', traitKey: 'NATURE.MARK.COMMAND', source: `${TRANSFORM_SRC}:61 化權「責任放大、主導權提升、需要承擔決策。」` },
  { mark: '科', name: '化科', kind: 'essence', traitKey: 'NATURE.MARK.SEEN', source: `${TRANSFORM_SRC}:62 化科「名聲、證照、保護力與可被看見的成果。」` },
  { mark: '忌', name: '化忌', kind: 'weakness', traitKey: 'WEAKNESS.MARK.KNOT', source: `${TRANSFORM_SRC}:63 化忌「卡點、執著、壓力源與必須修正的漏洞。」` },
];
/**
 * 13:24：專案內查無紫微原意的命宮小星（已查 lib/、docs/技能戰鬥檔案/紫微斗數/；只有英譯名或八字神煞語境）。
 * 不自編；覆蓋測試把它們列為「已知來源缺口」，出現新的未覆蓋星即失敗。
 */
/** 13:29：列出、不解讀的證據代號（後端專用，翻譯層不產文字） */
export const LISTED_NO_INTERPRETATION = 'LISTED.NO_INTERPRETATION';
export const PERSONA_KNOWN_SOURCE_GAPS: ReadonlyArray<string> = ['天福', '空亡', '破碎', '封誥', '天哭', '八座', '華蓋', '蜚廉'];
/** 煞星（風險）：只收 ZIWEI_PROFESSIONAL_SUPPORT_STARS 有原意的六顆。 */
export const PERSONA_MALEFIC_STARS: ReadonlyArray<{ name: string } & Trait> = [
  { name: '擎羊', traitKey: 'RISK.CLASH', source: `${SUPPORT} 擎羊「直接衝擊、競爭、傷口與突破壓力」` },
  { name: '陀羅', traitKey: 'RISK.DRAG', source: `${SUPPORT} 陀羅「拖延纏繞、阻力、慢性壓力」` },
  { name: '火星', traitKey: 'RISK.TEMPER', source: `${SUPPORT} 火星「急發事件、爆發力、短促壓力」` },
  { name: '鈴星', traitKey: 'RISK.SMOLDER', source: `${SUPPORT} 鈴星「暗伏焦躁、突發聲響、內部張力」` },
  { name: '地空', traitKey: 'RISK.DRIFT', source: `${SUPPORT} 地空「空轉、抽離、想像與落差」` },
  { name: '地劫', traitKey: 'RISK.LEAK', source: `${SUPPORT} 地劫「耗損、失落、資源被切分」` },
];
/** 13:29 鎖定：八字只做第一關交叉驗證，不參與本性文字 → 原日主五行句（PERSONA_ELEMENTS）已移除。 */

export function personaStrengthOf(brightness: string | undefined): Strength {
  const b = (brightness ?? '').trim();
  if (b === '廟' || b === '旺') return 'strong';
  if (b === '不' || b === '陷' || b === '不得地' || b === '落陷') return 'weak';
  return 'neutral';
}

/* ───────────────────────── 四道關 → 素材 ───────────────────────── */

/** 四道關全過後交給 analyzePersona 的素材（既有引擎輸出原樣摘錄） */
export interface PersonaMaterials {
  dayMasterElement: string;
  hexagram: { name: string; upper: string; lower: string };
  lifePalace: LifePalaceMaterial;
}

export interface NatureGateRun {
  gates: NatureGates;
  /** 實際執行順序（測試用） */
  order: NatureGateId[];
  materials: PersonaMaterials | null;
}

const ALL_MISSING = (): NatureGates => ({ bazi: 'MISSING', ziwei: 'MISSING', yijing: 'MISSING', lifePalace: 'MISSING' });

/** 依 PERSONA_GATES 順序跑；遇到非 PASS 即停，後面各關維持 MISSING。 */
export function runNatureGates(input: PersonaInput): NatureGateRun {
  const gates = ALL_MISSING();
  const order: NatureGateId[] = [];
  const ctx: GateContext = { input };
  for (const gate of PERSONA_GATES) {
    order.push(gate.id);
    gates[gate.id] = gate.run(ctx);
    if (gates[gate.id] !== 'PASS') return { gates, order, materials: null };
  }
  const r = ctx.threeCore;
  if (!r || r.iching.status !== 'READY' || !ctx.lifePalace) return { gates, order, materials: null };
  return {
    gates,
    order,
    materials: {
      dayMasterElement: r.bazi.dayMasterElement,
      hexagram: { name: r.iching.reading.hexagramName, upper: r.iching.reading.upper.name, lower: r.iching.reading.lower.name },
      lifePalace: ctx.lifePalace,
    },
  };
}

/* ───────────────────────── 人格解析 ───────────────────────── */

const GATE_ORDER = PERSONA_GATES.map((g) => g.id);

/**
 * 契約 analyzePersona：四關未全 PASS 或素材不全 → null。
 * 13:18 主軸：一律從命宮出發（axis 'lifePalace'）。輸出順序固定：命宮主星（每顆 本性→優勢→弱點→風險）或〔空宮底色 → 遷移宮（對宮）主星（為主）〕→ 命宮小星（強弱參考）→ 日主（axis 'auxiliary'，八字輔助，殿後）。易經只供措辭，不產特質。
 */
export function analyzePersona(gates: NatureGates, materials: unknown): PersonaEvidence[] | null {
  if (!GATE_ORDER.every((id) => gates[id] === 'PASS')) return null;
  const m = materials as PersonaMaterials | null;
  if (!m || !m.lifePalace || typeof m.dayMasterElement !== 'string') return null;
  const lp = m.lifePalace;
  const palaceRef = `${PALACE}（${lp.palaceName}）；${SANFANG}`;
  const ref = (layer: SourceRef['layer'], item: string, source: string): SourceRef => ({ layer, item, source });
  const out: PersonaEvidence[] = [];

  /** 一顆主星 → 本性／優勢／弱點／風險 四筆；where＝命宮或遷移宮（對宮） */
  const pushStar = (star: { name: string; brightness?: string }, where: string, extra: string) => {
    const def = PERSONA_MAJOR_STARS.find((d) => d.name === star.name);
    if (!def) return;
    const strength = personaStrengthOf(star.brightness);
    const pick = (t: StarTrait['essence']) => (strength === 'strong' && t.strong) || (strength === 'weak' && t.weak) || t.base;
    const item = `${where}${def.name}（${star.brightness ?? ''}）`;
    const at = (t: Trait) => [ref('lifePalace', item, `${t.source}；${extra}`)];
    const ess = pick(def.essence);
    const rsk = pick(def.risk);
    out.push({ traitKey: ess.traitKey, kind: 'essence', strength, refs: at(ess), axis: 'lifePalace' });
    out.push({ traitKey: def.strength.traitKey, kind: 'strength', strength, refs: at(def.strength), axis: 'lifePalace' });
    out.push({ traitKey: def.weakness.traitKey, kind: 'weakness', strength, refs: at(def.weakness), axis: 'lifePalace' });
    out.push({ traitKey: rsk.traitKey, kind: 'risk', strength, refs: at(rsk), axis: 'lifePalace' });
  };

  if (lp.mode === 'main') {
    for (const star of lp.majorStars) pushStar(star, '', palaceRef);
    if (out.length === 0) return null; // 主路卻沒有可對照的主星：不產卡
  } else {
    // 空宮：1) 底色 2) 命宮全部小星（含強弱） 3) 借遷移宮（對宮）主星
    out.push({ traitKey: EMPTY_PALACE_BASE.traitKey, kind: 'essence', refs: [ref('lifePalace', `${lp.palaceName}空宮`, `${EMPTY_PALACE_BASE.source}；${PALACE}（${lp.palaceName} 無主星，借對宮）`)], axis: 'lifePalace' });
  }
  // 13:18：空宮時遷移宮（對宮）主星為主，命宮小星強弱為參考 → 借星在前、小星在後；有主星時主星在前、小星在後
  if (lp.mode === 'empty' && lp.borrowed) {
    for (const star of lp.borrowed.majorStars) pushStar(star, `遷移宮（對宮）`, `${SANFANG}（${lp.borrowed.palaceName}）majorStarDetails`);
  }
  for (const star of lp.minorStars) {
    const minor = PERSONA_MINOR_STARS.find((d) => d.name === star.name);
    const malefic = PERSONA_MALEFIC_STARS.find((d) => d.name === star.name);
    const def = minor ?? malefic;
    if (!def) {
      // 13:29：專案內查無紫微原意 → 照列於後端證據「列出、不解讀」；不解讀、不混用八字神煞原意、不進前台
      out.push({ traitKey: LISTED_NO_INTERPRETATION, kind: 'essence', listedOnly: true, refs: [ref('lifePalace', `${star.name}${star.brightness ? `（${star.brightness}）` : ''}`, `列出、不解讀（listed, no interpretation）：專案內查無紫微原意；${palaceRef}`)], axis: 'lifePalace' });
      continue;
    }
    const strength = star.brightness ? personaStrengthOf(star.brightness) : undefined;
    out.push({ traitKey: def.traitKey, kind: minor ? 'essence' : 'risk', ...(strength ? { strength } : {}), refs: [ref('lifePalace', `${star.name}${star.brightness ? `（${star.brightness}）` : ''}`, `${def.source}；${palaceRef}`)], axis: 'lifePalace' });
  }

  // 13:24：命宮四化（照引擎標記，逐一列入）
  for (const mark of lp.transformations ?? []) {
    const t = PERSONA_TRANSFORMATIONS.find((x) => x.mark === mark || x.name === mark);
    if (!t) continue;
    out.push({ traitKey: t.traitKey, kind: t.kind, refs: [ref('lifePalace', `${lp.palaceName}${t.name}`, `${t.source}；${SANFANG} transformations`)], axis: 'lifePalace' });
  }

  // 14:18：命宮單一清單裡的十二神、大限、小限（同等地位）。有專案內紫微原意才產特質；否則「列出、不解讀」，不產文字、不進前台。
  const FIELD: Partial<Record<LifePalaceItemKind, keyof Omit<LifePalaceDetail, 'source'>>> = { changsheng: 'changsheng12', boshi: 'boshi12', jiangqian: 'jiangqian12', suiqian: 'suiqian12', decadal: 'decadal', ages: 'ages' };
  for (const it of lp.items ?? []) {
    const field = FIELD[it.kind];
    if (!field) continue; // 主星、四化、輔煞、雜曜在上方逐顆處理（同一清單，來源相同）
    const item = `${lp.palaceName}${LIFE_PALACE_ITEM_LABEL[it.kind]}：${it.value ?? it.name}`;
    const def = LIFE_PALACE_DETAIL_MEANINGS.find((m) => m.field === field && m.value === (it.value ?? it.name));
    if (def) {
      out.push({ traitKey: def.traitKey, kind: 'essence', refs: [ref('lifePalace', item, `${def.source}；${it.source}`)], axis: 'lifePalace' });
      continue;
    }
    out.push({ traitKey: LISTED_NO_INTERPRETATION, kind: 'essence', listedOnly: true, refs: [ref('lifePalace', item, `列出、不解讀（listed, no interpretation）：專案內查無紫微原意；${it.source}`)], axis: 'lifePalace' });
  }

  // 14:15：命宮檔案（lib/ziwei-destiny-card.ts）條目——原文附 file:line、登記狀態；列出、不解讀，不產文字。
  for (const star of lp.majorStars) {
    const row = LIFE_PALACE_DATA_FILE_STARS.find((r) => r.star === star.name);
    if (!row) continue;
    // 14:23：使用者決定此原文可產話術 → 標 material（翻譯層素材，不自動成句）
    // 14:27：每個既有欄位各一筆素材（subtitle＝14:23；keywords／power／challenge／direction／action＝14:27）
    const mats = LIFE_PALACE_WORDING_MATERIAL.filter((m) => m.star === row.star);
    if (mats.length > 0) {
      for (const mat of mats) {
        const item = mat.field === 'subtitle' ? `${row.star}（命宮檔案：${row.archetype}）` : `${row.star}（命宮檔案：${row.archetype}.${mat.field}）`;
        out.push({ traitKey: mat.traitKey, kind: 'essence', material: true, refs: [ref('lifePalace', item, `可產話術（${mat.decision}；翻譯層素材，不自動成句）：${mat.at}「${mat.text}」；原文 ${row.verbatim}；${row.at}；登記 ${LIFE_PALACE_DATA_FILE_STATUS}`)], axis: 'lifePalace' });
      }
      continue;
    }
    out.push({ traitKey: LISTED_NO_INTERPRETATION, kind: 'essence', listedOnly: true, refs: [ref('lifePalace', `${row.star}（命宮檔案：${row.archetype}）`, `列出、不解讀（命宮檔案原文，本卡不據此產文字）：${row.at}；原文 ${row.verbatim}；登記 ${LIFE_PALACE_DATA_FILE_STATUS}`)], axis: 'lifePalace' });
  }
  for (const mark of lp.transformations ?? []) {
    const row = LIFE_PALACE_DATA_FILE_TRANSFORMATIONS.find((r) => r.mark === mark);
    if (!row) continue;
    out.push({ traitKey: LISTED_NO_INTERPRETATION, kind: 'essence', listedOnly: true, refs: [ref('lifePalace', `命宮檔案標籤：${row.label}`, `列出、不解讀（命宮檔案只有標籤）：${row.at}；登記 ${LIFE_PALACE_DATA_FILE_STATUS}`)], axis: 'lifePalace' });
  }

  // 易經（13:08）只供措辭、不產特質；八字（13:29）只做交叉驗證、不產特質 → 本性文字只來自命宮。
  return out;
}

/** 稽核用（不顯示）：命宮裡沒有對照表的星名 */
export function unmappedLifePalaceStars(materials: PersonaMaterials | null): string[] {
  if (!materials) return [];
  const known = new Set([...PERSONA_MAJOR_STARS.map((s) => s.name), ...PERSONA_MINOR_STARS.map((s) => s.name), ...PERSONA_MALEFIC_STARS.map((s) => s.name)]);
  const lp = materials.lifePalace;
  return [...lp.majorStars, ...lp.minorStars, ...(lp.borrowed?.majorStars ?? [])].map((s) => s.name).filter((n) => !known.has(n));
}

/**
 * 13:24 覆蓋稽核（後端）：命宮每一顆星（主星、小星）＋四化是否都有對應證據。
 * 回傳 covered＝有證據者、gaps＝查無原意且列在 PERSONA_KNOWN_SOURCE_GAPS 者、uncovered＝其他（應為空）。
 */
export function lifePalaceCoverage(materials: PersonaMaterials | null, evidence: PersonaEvidence[] | null) {
  const lp = materials?.lifePalace;
  const items = lp ? [...lp.majorStars.map((s) => s.name), ...lp.minorStars.map((s) => s.name), ...(lp.transformations ?? []).map((m) => PERSONA_TRANSFORMATIONS.find((t) => t.mark === m || t.name === m)?.name ?? m)] : [];
  const refHas = (e: PersonaEvidence, name: string) => e.refs.some((r) => r.item === name || r.item.startsWith(`${name}（`) || r.item.endsWith(name) || r.item.startsWith(name));
  const interpreted = (name: string) => (evidence ?? []).some((e) => e.axis === 'lifePalace' && !e.listedOnly && !e.material && refHas(e, name));
  const listed = (name: string) => (evidence ?? []).some((e) => e.listedOnly === true && refHas(e, name));
  const covered = items.filter(interpreted);
  const listedOnly = items.filter((n) => !interpreted(n) && listed(n));
  return {
    items,
    covered,
    listedOnly,
    /** 列出不解讀、但不在已知缺口清單者（應為空；出現代表要人工確認） */
    unexpectedListed: listedOnly.filter((n) => !PERSONA_KNOWN_SOURCE_GAPS.includes(n)),
    uncovered: items.filter((n) => !interpreted(n) && !listed(n)),
  };
}
