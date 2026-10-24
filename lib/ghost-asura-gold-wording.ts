/**
 * 鬼魅阿修羅 - 話術含金量挑句（後端運算，前端只照印）
 *
 * 規範見 docs/技能戰鬥檔案/鬼魅阿修羅/話術含金量技能.md。
 * 句庫為 候選話術-100句.json（10 日元 × 10 構面）；本檔只依客戶資料挑「一句」，不生成任何文字。
 * 後端沒有對應欄位的構面（提醒類神煞、流年）不接；挑不到時回明確中文狀態，不用別句頂替。
 */

import { createBaziCore, type BaziProfessionalResult } from './bazi/engine';
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
  evidenceCeiling: string;
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

export type GoldWordingResult =
  | {
      status: 'OK';
      id: string;
      dimension: GoldDimension;
      dimensionName: string;
      trigger: string;
      line: string;
      source: string[];
      evidenceCeiling: string;
      /** 命中的全部構面（依優先序）；只顯示第一個，其餘留作稽核 */
      matchedDimensions: GoldDimension[];
    }
  | { status: 'UNAVAILABLE'; message: string };

const UNAVAILABLE_MESSAGE = '技能檔無此資料，暫不顯示';

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
export function goldWordingViewFor(engineInput: Record<string, unknown>, hourAssumed: boolean): { label: string; text: string } {
  const label = '阿修羅對你說的一句';
  const { birthDate, birthTime, gender } = engineInput;
  if (typeof birthDate !== 'string' || (gender !== 'male' && gender !== 'female')) return { label, text: UNAVAILABLE_MESSAGE };
  try {
    const known = !hourAssumed && typeof birthTime === 'string' && birthTime !== '';
    const core = createBaziCore({
      gender,
      birthDate,
      birthTimeKnown: known,
      birthTime: known ? (birthTime as string) : undefined,
      timezone: typeof engineInput.timezone === 'string' ? engineInput.timezone : undefined,
    });
    const r = pickGoldWording(core);
    return { label, text: r.status === 'OK' ? r.line : r.message };
  } catch {
    return { label, text: UNAVAILABLE_MESSAGE };
  }
}

export function pickGoldWording(core: BaziProfessionalResult): GoldWordingResult {
  const stem = core.dayMaster?.stem;
  if (!stem) return { status: 'UNAVAILABLE', message: UNAVAILABLE_MESSAGE };

  const matched = matchDimensions(core).filter((d) => WIRED_DIMENSIONS.includes(d));
  const entries = (library as { entries: LibraryEntry[] }).entries;
  for (const dimension of matched) {
    const hit = entries.find((e) => e.stem === stem && e.dimension === dimension);
    if (hit) {
      return {
        status: 'OK',
        id: hit.id,
        dimension: hit.dimension,
        dimensionName: hit.dimensionName,
        trigger: hit.trigger,
        line: hit.line,
        source: hit.source,
        evidenceCeiling: hit.evidenceCeiling,
        matchedDimensions: matched,
      };
    }
  }
  return { status: 'UNAVAILABLE', message: UNAVAILABLE_MESSAGE };
}
