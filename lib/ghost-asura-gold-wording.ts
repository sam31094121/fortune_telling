/**
 * 鬼魅阿修羅 - 話術含金量挑句（後端運算，前端只照印）
 *
 * 規範見 docs/技能戰鬥檔案/鬼魅阿修羅/話術含金量技能.md（含金量＝公信力）；順序與力道等級見 lib/ghost-asura-order.ts。
 * 句庫為 候選話術-100句.json（10 日元 × 10 構面）；本檔只依客戶資料挑「一句」，不生成任何文字。
 * 後端沒有對應欄位的構面（提醒類神煞、流年）不接；挑不到時回明確中文狀態，不用別句頂替。
 */

import { createBaziCore, type BaziProfessionalResult } from './bazi/engine';
import { isZiweiCertified, runBaziLayer, runZiweiLayer, type ThreeCoreInput } from './three-core-engine';
import { verifyFourPillars, type FourPillarDifference } from './four-pillar-verification';
import { coreCredibility } from './credibility-wording';
import { APPROVED_PHRASES, STATUS_WORDING } from './credibility-phrases';
import type { GateStatus } from './iching-source-gate';
import { credibilityTier, type CredibilityTier } from './ghost-asura-order';
import library from '../docs/技能戰鬥檔案/鬼魅阿修羅/候選話術-100句.json';

export type GoldDimension =
  | 'NATURE' | 'MONTH_STRONG' | 'MONTH_WEAK' | 'HOUR_KNOWN' | 'HOUR_UNKNOWN'
  | 'ELEMENT_EXCESS' | 'ELEMENT_MISSING' | 'AUSPICIOUS_STAR' | 'WARNING_STAR' | 'FLOW_YEAR';

interface LibraryEntry {
  id: string;
  stem: string;
  dimension: GoldDimension;
  dimensionName: string;
  trigger: string;
  line: string;
  source: string[];
  designBasis: string;
  factBasis: string;
}

/** 目前後端有真實欄位可觸發的構面。WARNING_STAR／FLOW_YEAR 尚無對應欄位，不接。 */
export const WIRED_DIMENSIONS: readonly GoldDimension[] = [
  'NATURE', 'MONTH_STRONG', 'MONTH_WEAK', 'HOUR_KNOWN', 'HOUR_UNKNOWN',
  'ELEMENT_EXCESS', 'ELEMENT_MISSING', 'AUSPICIOUS_STAR',
];

/**
 * 單一五行加權佔比達此值才算偏旺（本檔自訂門檻，非古籍規則，改動須同步守門測試）。
 * 取 1500 組隨機生辰實測的第 90 百分位（約 0.455），約一成客戶命中，才稱得上「偏」。
 */
export const EXCESS_SHARE_THRESHOLD = 0.45;

/** 本引擎 computeShenSha 輸出中屬吉類（貴人）的規則編號。 */
const AUSPICIOUS_IDS = new Set(['tianyi', 'wenchang']);

/**
 * 第 3 步：八字 × 紫微 四柱逐字核對（沿用三合一的 runBaziLayer／runZiweiLayer／verifyFourPillars，不另寫第二套）。
 * 鐵律：對不上就停在核對關，不挑句；**不自動把任一邊改成另一邊**；哪一柱不同、兩邊各是什麼原封不動留在 differences。
 */
export type FourPillarGate =
  | { status: 'PASSED' }
  /** 沒填時辰：紫微不排，沒有東西可核對。沿用「時辰未填」句，不當成核對通過。 */
  | { status: 'TIME_UNKNOWN' }
  | { status: 'MISMATCH'; differences: FourPillarDifference[] }
  | { status: 'ZIWEI_UNAVAILABLE'; reason: string }
  | { status: 'ERROR'; reason: string };

export const GATE_BLOCK_MESSAGE = '資料核對未通過，暫不顯示';

export function crossCheckFourPillars(input: { birthDate: string; gender: 'male' | 'female'; birthTime?: string | null }): FourPillarGate {
  if (!input.birthTime) return { status: 'TIME_UNKNOWN' };
  try {
    // 三核心層只收補零的 YYYY-MM-DD；這裡只補零，不改任何日期內容
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input.birthDate.trim());
    const birthDate = m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : input.birthDate;
    const coreInput: ThreeCoreInput = { birthDate, gender: input.gender, birthTime: input.birthTime };
    const { core, bazi } = runBaziLayer(coreInput);
    if (!core.verification.readyForInterpretation) return { status: 'ERROR', reason: '八字驗證閘未通過' };
    const ziwei = runZiweiLayer(coreInput, core);
    if (ziwei.status !== 'READY' || !isZiweiCertified(ziwei)) {
      return { status: 'ZIWEI_UNAVAILABLE', reason: ziwei.status === 'READY' ? '紫微未定盤' : ziwei.reason };
    }
    const verification = verifyFourPillars(
      { year: bazi.year, month: bazi.month, day: bazi.day, hour: bazi.hour ?? '' },
      { year: ziwei.analysis.bazi.year, month: ziwei.analysis.bazi.month, day: ziwei.analysis.bazi.day, hour: ziwei.analysis.bazi.hour },
    );
    return verification.passed ? { status: 'PASSED' } : { status: 'MISMATCH', differences: verification.differences };
  } catch (error) {
    return { status: 'ERROR', reason: error instanceof Error ? error.message : String(error) };
  }
}

export type GoldWordingResult =
  | {
      status: 'OK';
      id: string;
      dimension: GoldDimension;
      dimensionName: string;
      trigger: string;
      line: string;
      source: string[];
      designBasis: string;
      factBasis: string;
      /** 力道等級（由公信力決定）；沒給核對結果時為 null */
      tier: CredibilityTier | null;
      /** 客戶看得到的「依據」一句（只用已核准的公信力句子與閘門狀態說法）；沒給核對結果時為 null */
      basis: string | null;
      /** 命中的全部構面（依優先序）；只顯示第一個，其餘留作稽核 */
      matchedDimensions: GoldDimension[];
    }
  | { status: 'UNAVAILABLE'; message: string; gate?: FourPillarGate };

export const UNAVAILABLE_MESSAGE = '暫時無法取得';

/** 各構面所用事實對應的來源登記項目（claim_id）。狀態由閘門重算，不在此手填。 */
const BAZI_CHART_CLAIM = 'C-BAZI-CHART';
const SHENSHA_CLAIM: Record<string, string> = { tianyi: 'C-BAZI-SHENSHA-TIANYI', wenchang: 'C-BAZI-SHENSHA-WENCHANG' };

let baziClaims: Map<string, GateStatus> | null = null;
function baziClaimStatus(claimId: string): GateStatus {
  if (!baziClaims) baziClaims = new Map(coreCredibility('八字').claims.map((c) => [c.claimId, c.status] as const));
  return baziClaims.get(claimId) ?? 'PENDING_POOL';
}

/** 該構面所用事實的來源狀態：吉類神煞看命中的那幾項（任一非 VERIFIED 就取較弱者），其餘看八字排盤正確性。 */
export function claimStatusFor(dimension: GoldDimension, core: BaziProfessionalResult): GateStatus {
  if (dimension === 'AUSPICIOUS_STAR' && Array.isArray(core.shenSha)) {
    const ids = [...new Set(core.shenSha.filter((x) => AUSPICIOUS_IDS.has(x.id)).map((x) => x.id))];
    const statuses = ids.map((id) => baziClaimStatus(SHENSHA_CLAIM[id] ?? ''));
    if (statuses.includes('CONFLICT')) return 'CONFLICT';
    if (statuses.length === 0 || statuses.includes('PENDING_POOL')) return 'PENDING_POOL';
    return 'VERIFIED';
  }
  return baziClaimStatus(BAZI_CHART_CLAIM);
}

/** 客戶看得到的「依據」。只組已核准的句子與閘門狀態說法，不比狀態說得更滿。 */
export function basisLineFor(tier: CredibilityTier, gate: FourPillarGate, claimStatus: GateStatus): string | null {
  if (tier === 'BLOCKED') return null;
  if (gate.status === 'TIME_UNKNOWN') return '時辰未填，暫以夜半起算；核對尚未進行，這句只依已知資料。';
  if (claimStatus === 'CONFLICT') return `這句所用的規則：${STATUS_WORDING.CONFLICT}。`;
  return `${APPROVED_PHRASES.crossCheck}這句所用的規則：${STATUS_WORDING[claimStatus]}。${APPROVED_PHRASES.traditionBoundary}`;
}

/**
 * 依客戶資料算出命中的構面。優先序＝「越少人命中的越在前」，這樣挑出的句子最像他本人，
 * 而不是讓幾乎人人都有的條件蓋掉一切。唯一例外：沒填時辰一律最先說，不補編。
 */
export function matchDimensions(core: BaziProfessionalResult): GoldDimension[] {
  const out: GoldDimension[] = [];

  if (core.timePrecision === 'UNKNOWN_TIME') out.push('HOUR_UNKNOWN');

  const weights = Object.values(core.fiveElements.weightedStrength);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total > 0 && Math.max(...weights) / total >= EXCESS_SHARE_THRESHOLD) out.push('ELEMENT_EXCESS');
  // 真缺＝連藏干加權後也是 0（只看天干地支表面字數，幾乎人人都缺一行，沒有分辨力）
  if (weights.some((w) => w === 0)) out.push('ELEMENT_MISSING');

  const tendency = core.seasonalStrength.tendency;
  if (tendency === 'STRONG') out.push('MONTH_STRONG');
  else if (tendency === 'WEAK') out.push('MONTH_WEAK');

  if (Array.isArray(core.shenSha) && core.shenSha.some((s) => AUSPICIOUS_IDS.has(s.id))) out.push('AUSPICIOUS_STAR');

  if (core.timePrecision !== 'UNKNOWN_TIME') out.push('HOUR_KNOWN');
  out.push('NATURE');
  return out;
}

/**
 * 阿修羅顯示管線用：把 normalizeAsuraInput 的結果轉成送往瀏覽器的一句。
 * 時辰不確定（hourAssumed，顯示管線以子時排）時，這裡一律當「沒填時辰」，不拿假子時去算。
 */
export function goldWordingViewFor(engineInput: Record<string, unknown>, hourAssumed: boolean): { label: string; text: string; basis: string | null } {
  const label = '阿修羅對你說的一句';
  const { birthDate, birthTime, gender } = engineInput;
  if (typeof birthDate !== 'string' || (gender !== 'male' && gender !== 'female')) return { label, text: UNAVAILABLE_MESSAGE, basis: null };
  try {
    const known = !hourAssumed && typeof birthTime === 'string' && birthTime !== '';
    const core = createBaziCore({
      gender,
      birthDate,
      birthTimeKnown: known,
      birthTime: known ? (birthTime as string) : undefined,
      timezone: typeof engineInput.timezone === 'string' ? engineInput.timezone : undefined,
    });
    const gate = crossCheckFourPillars({ birthDate, gender, birthTime: known ? (birthTime as string) : null });
    const r = pickGoldWording(core, gate);
    return { label, text: r.status === 'OK' ? r.line : r.message, basis: r.status === 'OK' ? r.basis : null };
  } catch {
    return { label, text: UNAVAILABLE_MESSAGE, basis: null };
  }
}

export function pickGoldWording(core: BaziProfessionalResult, gate?: FourPillarGate): GoldWordingResult {
  // 核對關沒過就停在這裡：不挑句、不補別句、也不改任何一邊
  if (gate && (gate.status === 'MISMATCH' || gate.status === 'ZIWEI_UNAVAILABLE' || gate.status === 'ERROR')) {
    return { status: 'UNAVAILABLE', message: GATE_BLOCK_MESSAGE, gate };
  }
  const stem = core.dayMaster?.stem;
  if (!stem) return { status: 'UNAVAILABLE', message: UNAVAILABLE_MESSAGE };

  const matched = matchDimensions(core).filter((d) => WIRED_DIMENSIONS.includes(d));
  const entries = (library as { entries: LibraryEntry[] }).entries;
  for (const dimension of matched) {
    const hit = entries.find((e) => e.stem === stem && e.dimension === dimension);
    if (hit) {
      const tier = gate
        ? credibilityTier({ fourPillars: gate.status, timeKnown: core.timePrecision !== 'UNKNOWN_TIME', claimStatus: claimStatusFor(dimension, core), inputConfirmed: false })
        : null;
      const basis = gate && tier ? basisLineFor(tier, gate, claimStatusFor(dimension, core)) : null;
      return {
        status: 'OK',
        id: hit.id,
        dimension: hit.dimension,
        dimensionName: hit.dimensionName,
        trigger: hit.trigger,
        line: hit.line,
        source: hit.source,
        designBasis: hit.designBasis,
        factBasis: hit.factBasis,
        tier,
        basis,
        matchedDimensions: matched,
      };
    }
  }
  return { status: 'UNAVAILABLE', message: UNAVAILABLE_MESSAGE };
}
