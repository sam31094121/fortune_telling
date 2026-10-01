/**
 * 鬼魅阿修羅 — 解盤接線型別（080-14／附件 3）
 *
 * 前端只讀已核可顯示資料；不重算四柱／神煞／命中。
 */

/** 印記狀態三分法 */
export type GhostAsuraSealStatus =
  | 'awakened' // matched=true → 印記覺醒
  | 'dormant' // matched=false → 印記沉眠
  | 'pending'; // 未驗證／轉譯缺漏 → 待校核（不可當沉眠）

export type GhostAsuraPillarKey = 'year' | 'month' | 'day' | 'hour';

export interface GhostAsuraVerifiedRecord {
  /** 後端結果唯一編號（規則 id；多柱仍同一紀錄） */
  resultId: string;
  /** 規則識別碼（與母版／coverage.id 對齊） */
  ruleId: string;
  /** 後端原始中文名（稽核用；一般 UI 不直接當主標題） */
  originalName: string;
  /** true=命中、false=未命中；缺漏時為 null */
  matched: boolean | null;
  /** 命中柱位（可多柱）；未命中為空陣列 */
  pillars: GhostAsuraPillarKey[];
  /** 來源／流派（若後端有） */
  source?: string;
  /** 規則版本（若後端有） */
  ruleVersion?: string;
  /** 結果批次識別 */
  resultBatchId: string;
  /** 母版／coverage 版本 */
  motherVersion: string;
  /** 後端原始狀態字串（MATCHED／NOT_MATCHED／BLOCKED_*…） */
  backendStatus: string;
  /** 後端原因（稽核） */
  reason?: string;
}

export interface GhostAsuraRegistryEntry {
  ruleId?: string;
  originalName: string;
  displayName: string;
  family: string;
  approved: true;
  namingVersion: string;
}

export interface GhostAsuraTranslatedItem {
  resultId: string;
  ruleId: string;
  originalName: string;
  /** 固定名或穩定延伸名；使用者主標題只用此欄 */
  displayName: string;
  matched: boolean | null;
  sealStatus: GhostAsuraSealStatus;
  pillars: GhostAsuraPillarKey[];
  pillarLabels: string[];
  family: string | null;
  namingApproved: boolean;
  namingVersion: string | null;
  /** approved＝母種固定；stable-extension＝延伸語系 */
  namingSource?: 'approved' | 'stable-extension';
  resultBatchId: string;
  pendingReason?: string;
}

export interface GhostAsuraNarrativeItem {
  resultId: string;
  displayName: string;
  sealStatus: GhostAsuraSealStatus;
  shortDeclaration: string | null;
  coreMeaning: string | null;
  battleSignificance: string | null;
  verdict: string | null;
  wordingVersion: string | null;
  hasApprovedWording: boolean;
  pendingReason?: string;
}

export interface GhostAsuraVerifiedCombo {
  comboId: string;
  title: string;
  /** 成員為 originalName 或 displayName 皆可；battle 層以 resultId／ruleId 對齊 */
  memberRuleIds: string[];
  memberNames: string[];
  pillar: string | null;
  evidenceText: string;
}

export interface GhostAsuraDualClash {
  comboId: string;
  title: string;
  memberDisplayNames: string[];
  pillarLabel: string | null;
  evidenceText: string;
}

export interface GhostAsuraChain {
  comboId: string;
  title: string;
  memberDisplayNames: string[];
  evidenceText: string;
}

export interface GhostAsuraBattleField {
  mainSoul: string;
  mainGuardian: string;
  mainTribulation: string;
  mainShadow: string;
  charmPower: string;
  authorityPower: string;
  treasurePower: string;
  movementPower: string;
  breakthrough: string;
  finalVerdict: string;
}

export interface GhostAsuraGuardReport {
  status: 'PASSED' | 'FAILED';
  backendCount: number;
  translatedCount: number;
  displayCount: number;
  backendIds: string[];
  translatedIds: string[];
  displayIds: string[];
  missingIds: string[];
  extraIds: string[];
  duplicateIds: string[];
  pendingCount: number;
  message: string;
  details: string[];
}

export interface GhostAsuraDisplayItem {
  resultId: string;
  displayName: string;
  sealStatus: GhostAsuraSealStatus;
  sealLabel: string;
  pillarLabels: string[];
  shortDeclaration: string | null;
  coreMeaning: string | null;
  battleSignificance: string | null;
  verdict: string | null;
  pendingReason?: string;
}

export interface GhostAsuraReading {
  cardTitle: string;
  resultBatchId: string;
  motherVersion: string;
  namingVersion: string;
  translateVersion: string;
  /** 四柱幹支（年月日時） */
  pillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  items: GhostAsuraDisplayItem[];
  dualClashes: GhostAsuraDualClash[];
  chains: GhostAsuraChain[];
  battleField: GhostAsuraBattleField;
  guard: GhostAsuraGuardReport;
  awakenedCount: number;
  dormantCount: number;
  pendingCount: number;
  /**
   * 待補條目（僅後端未驗證等真缺項）。
   * label 為使用者可見中性標籤；禁止帶原始神煞中文名。
   */
  pendingEntries: Array<{ resultId: string; label: string; reason: string }>;
}
