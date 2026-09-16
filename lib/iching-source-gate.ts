/**
 * 《易經》來源閘門
 * ============================================================================
 *
 * 業主定案（2026-09-15）：
 *   凡有「易經」兩個字，都要有**交叉比對的來源、權威性的檔案、大數據的來源**。
 *   易經洋蔥心理學的權威來源也一樣列入。
 *
 * 規格：docs/技能戰鬥檔案/易經/來源治理.md（紫微斗數沿用同一份規格）
 * 登記：docs/技能戰鬥檔案/易經/來源登記.json、docs/技能戰鬥檔案/紫微斗數/來源登記.json
 * 守門：npm run test:iching-sources
 *
 * 狀態只由這裡算——登記表不得手填 VERIFIED。沒過閘門的內容只能放「待驗證資料池」，
 * 不得學進《易經》核心。這支檔案是純函式，網頁、伺服器、測試共用同一份規則。
 */

export type TrustLevel = 'A' | 'B' | 'C' | 'D';
export type Permission = 'PASS' | 'FAIL' | '待查核';
export type GateStatus = 'VERIFIED' | 'CONFLICT' | 'PENDING_POOL';
export type ClaimDomain = '易經知識' | '易經洋蔥心理學' | '易經對手智能' | '紫微斗數排盤' | '紫微斗數知識';

/**
 * 工程判斷類（不是古籍知識）改用工程證據標準：權威檔 ≥ 1、大數據 ≥ 1（至少一份進版控）、交叉 ≥ 3、授權全 PASS、衝突 0。
 * 紫微斗數排盤＝算得對不對（套件＋交叉核對測試）；紫微斗數知識（星曜、宮位意涵）走古籍知識標準。
 */
export const ENGINEERING_DOMAINS: readonly ClaimDomain[] = ['易經對手智能', '紫微斗數排盤'];
export type SourceKind =
  | '原典'
  | '古籍版本注疏'
  | '研究圖書館書目'
  | '學術出版'
  | '原始研究'
  | '學術資料庫'
  | '公開數位文本'
  | '本站整理'
  | '正式檔'
  | '工程證據';

/** SOURCE_PERMISSION_GATE：每一筆來源必須記錄的欄位。 */
export interface SourceEntry {
  source_id: string;
  /** 作者／機構 */
  author: string;
  /** 原始網址或出版資訊 */
  locator: string;
  /** 資料類型 */
  data_type: string;
  /** 原典／註疏／研究／二手資料 */
  kind: SourceKind;
  /** 是否可引用 */
  can_cite: Permission;
  /** 是否可重製 */
  can_reproduce: Permission;
  /** 是否可大量擷取 */
  bulk_extraction: Permission;
  /** 是否允許自動化抓取 */
  automated_crawl: Permission;
  /** 是否可納入訓練資料 */
  training_use: Permission;
  /** 授權條款 */
  license_terms: string;
  /** 存取日期 */
  accessed_at: string;
  /** 版本／底本 */
  edition: string;
  /** 信任等級 A/B/C/D */
  trust: TrustLevel;
  /** 專案內檔案（有的話）；local_only＝只在本機、不進版控 */
  tracked_path?: string;
  local_only?: boolean;
  note?: string;
}

export interface SourceConflict {
  topic: string;
  sources: string[];
  /** 差異文字 */
  difference: string;
  /** 版本年代／來源權重等補充 */
  weight_note?: string;
  /** 採用（或暫不採用）的做法 */
  adopted: string;
  /** 採用理由 */
  reason: string;
}

export interface ClaimEntry {
  claim_id: string;
  title: string;
  domain: ClaimDomain;
  /** 這個登記項目涵蓋的專案檔案 */
  files: string[];
  /** 權威性的檔案 */
  authority_files: string[];
  /** 大數據的來源 */
  big_data_sources: string[];
  /** 交叉比對的來源 */
  cross_references: string[];
  conflicts: SourceConflict[];
  status: GateStatus;
  note?: string;
}

export interface SourceRegistry {
  version: string;
  updatedAt: string;
  sources: SourceEntry[];
  claims: ClaimEntry[];
}

export const REQUIRED_SOURCE_FIELDS = [
  'source_id', 'author', 'locator', 'data_type', 'kind',
  'can_cite', 'can_reproduce', 'bulk_extraction', 'automated_crawl', 'training_use',
  'license_terms', 'accessed_at', 'edition', 'trust',
] as const;

export const PERMISSION_VALUES: readonly Permission[] = ['PASS', 'FAIL', '待查核'];
export const TRUST_SCORE: Record<TrustLevel, number> = { A: 95, B: 85, C: 60, D: 30 };

/** 通過標準（業主定死）：授權 PASS、可信度 ≥ 90、交叉來源 ≥ 3、原典 ≥ 1、版本可追溯、重大衝突 0。 */
export const GATE_THRESHOLDS = {
  minTrustScore: 90,
  minCrossSources: 3,
  minOriginalSources: 1,
  maxMajorConflicts: 0,
} as const;

/** 心理學的「原典」是同儕審查的原始研究。 */
const ORIGINAL_KINDS: readonly SourceKind[] = ['原典', '原始研究'];

export function permissionPass(source: SourceEntry): boolean {
  return source.can_cite === 'PASS' && Boolean(source.license_terms) && !source.license_terms.includes('待查核');
}

export interface GateResult {
  status: GateStatus;
  reasons: string[];
}

export function evaluateClaim(claim: ClaimEntry, sources: Record<string, SourceEntry>): GateResult {
  const reasons: string[] = [];
  const lookup = (id: string) => sources[id];
  const referenced = [...claim.authority_files, ...claim.big_data_sources, ...claim.cross_references];
  const missing = referenced.filter((id) => !lookup(id));
  if (missing.length) reasons.push(`登記表找不到來源：${missing.join('、')}`);
  if (!claim.authority_files.length) reasons.push('缺權威性的檔案');
  if (!claim.big_data_sources.length) reasons.push('缺大數據的來源');

  const cross = [...new Set(claim.cross_references)].map(lookup).filter((s): s is SourceEntry => Boolean(s));
  if (cross.length < GATE_THRESHOLDS.minCrossSources) {
    reasons.push(`交叉比對來源 ${cross.length} 個，未達 ${GATE_THRESHOLDS.minCrossSources} 個`);
  }

  if (ENGINEERING_DOMAINS.includes(claim.domain)) {
    const all = [...new Set(referenced)].map(lookup).filter((s): s is SourceEntry => Boolean(s));
    if (all.some((s) => !permissionPass(s))) reasons.push('有來源授權未通過');
    const bigData = claim.big_data_sources.map(lookup).filter((s): s is SourceEntry => Boolean(s));
    if (bigData.length && !bigData.some((s) => !s.local_only)) reasons.push('大數據來源只在本機，換機器無法查證');
  } else {
    if (cross.some((s) => !permissionPass(s))) reasons.push('交叉來源授權未全數通過（含待查核）');
    const average = cross.length ? cross.reduce((sum, s) => sum + TRUST_SCORE[s.trust], 0) / cross.length : 0;
    if (average < GATE_THRESHOLDS.minTrustScore) reasons.push(`交叉來源可信度平均 ${Math.round(average)}，未達 ${GATE_THRESHOLDS.minTrustScore}`);
    if (cross.some((s) => s.trust === 'D')) reasons.push('D 級來源不得作為交叉依據');
    if (cross.filter((s) => ORIGINAL_KINDS.includes(s.kind)).length < GATE_THRESHOLDS.minOriginalSources) reasons.push('缺原典（或原始研究）來源');
    if (cross.some((s) => !s.edition || s.edition.includes('待查核'))) reasons.push('有來源版本不可追溯');
  }

  if (claim.conflicts.length > GATE_THRESHOLDS.maxMajorConflicts) {
    return { status: 'CONFLICT', reasons: [...reasons, ...claim.conflicts.map((c) => `重大衝突：${c.topic}`)] };
  }
  return { status: reasons.length ? 'PENDING_POOL' : 'VERIFIED', reasons };
}

export function indexSources(registry: SourceRegistry): Record<string, SourceEntry> {
  return Object.fromEntries(registry.sources.map((s) => [s.source_id, s]));
}
