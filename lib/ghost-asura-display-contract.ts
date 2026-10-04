/**
 * 鬼魅阿修羅 — 前端顯示契約（由後端 POST /api/ghost-asura/reading 產出）
 *
 * 只放「可直接顯示的文字」型別：已在後端分組、篩選、排序完成。
 * 不含四柱干支、天干地支、命中旗標或任何可供前端運算的原始資料。
 * 本檔只有型別；前端一律以 `import type` 引用，不會打包任何命理邏輯。
 */

export const ASURA_DISPLAY_CONTRACT = 'ghost-asura-display/v1' as const;

/** 純樣式用的語氣標記（決定顏色），不是可運算的命理資料。 */
export type AsuraDisplayTone = 'awakened' | 'dormant' | 'pending';

export interface AsuraDisplayEntry {
  label: string;
  text: string;
  /** 白話：一句日常中文（≤25 字、無術語），顯示在該項最後。 */
  plain?: string;
}

export interface AsuraDisplaySeal {
  /** 穩定識別（用於動畫／DOM 定位） */
  id: string;
  name: string;
  tone: AsuraDisplayTone;
  sealLabel: string;
  declaration: string | null;
  meaning: string | null;
  clash: string | null;
}

export interface AsuraDisplayColumn {
  key: 'year' | 'month' | 'day' | 'hour';
  heading: string;
  lead: string;
  countText: string;
  seals: AsuraDisplaySeal[];
}

export interface AsuraDisplayStat {
  value: string;
  label: string;
  tone?: AsuraDisplayTone;
}

export interface AsuraDisplaySupplement {
  key: 'dual' | 'chain';
  heading: string;
  entries: Array<{ id: string; title: string; members: string; text: string }>;
}

export interface AsuraNarrativeBlock {
  text: string;
  plain: { label: string; plain: string }[];
}

export interface AsuraDisplaySection {
  key: 'hits' | 'pillars' | 'verdict';
  /** 段落主標：過去／現在／未來 */
  heading: string;
  /** 功能小標：命中神煞／柱位與封印／阿修羅判語 */
  label: string;
  lead: string;
  items: AsuraDisplayEntry[];
  /** 「過去」卡：一段連續的阿修羅讀盤（段落以換行分隔）；有值時前端先印這段，再印 items 的白話區 */
  narrative?: string | null;
  /**
   * 三張時間軸卡：narrative 依段落拆開，每段後緊接該段印記的白話（同柱兩印＝兩行）。
   * 有值時前端逐段照印，不再於文末另放白話區；開場在最前、coda 在最後。
   */
  blocks?: AsuraNarrativeBlock[] | null;
  /** 「過去」卡收尾：「你以前就是這樣的人。……」（白話區之後，金色、略大） */
  coda?: string | null;
}

/** 稽核用（不顯示）：三格輸出挑選的誠實計數。 */
export interface AsuraDisplayAudit {
  pipelineTotal: number;
  emitted: number;
  droppedDormant: number;
  droppedDormantNames: string[];
  droppedPendingNames: string[];
  droppedNoPillarNames: string[];
  /** 通過三重條件、但沒有判語文案而未進「未來」格的印記 */
  verdictNoCopyNames: string[];
  /** 時間軸（過去／現在／未來）各卡的觸發來源與篩選結果（前端不顯示） */
  timeAxis: {
    todayTaipei: string;
    flowYear: number;
    flowGanZhi: string;
    ageShi: number;
    ageXu: number;
    cards: Array<{ when: 'past' | 'present' | 'future'; luck: string[]; flowYears: [number, number] | null; triggered: string[]; shown: string[]; dropped: string[] }>;
  } | null;
  /** 顯示中、且柱位落在時柱的印記（後界） */
  hourPillarNames: string[];
  /** 時辰為預設子時（hourAssumed）時，顯示中依賴時柱的印記；目前不隱藏，留給業主決定 */
  hourDependentNames: string[];
  /** 顯示中但尚無時間軸（過去／現在／未來）三句的印記：照原文案顯示 */
  timelineMissingNames: string[];
  /** 顯示中但尚無白話的印記 */
  plainMissingNames: string[];
  droppedPending: number;
  droppedNoPillar: number;
  droppedNotCrossVerified: number;
  droppedNotCrossVerifiedNames: string[];
  droppedPlaceholder: number;
  droppedPlaceholderNames: string[];
  leadHidden: boolean;
  voiceRewritten: number;
}

export interface AsuraDisplay {
  /** 客人不知道時辰時，後端以子時（早子 00:00）排；此旗標誠實標示 */
  hourAssumed: boolean;
  assumedHour: '子時' | null;
  /** hourAssumed 時前端照印的一句：「時辰未知，以子時排。」 */
  hourNote: string | null;
  contract: typeof ASURA_DISPLAY_CONTRACT;
  title: string;
  subtitle: string;
  /** 阿修羅短句（後端固定文案） */
  lines: string[];
  /** 秘卷不完整時的提示；完整時為 null */
  alert: string | null;
  scrollHint: string;
  columns: AsuraDisplayColumn[];
  stats: AsuraDisplayStat[];
  statsHint: string;
  supplements: AsuraDisplaySupplement[];
  battleField: { heading: string; rows: AsuraDisplayEntry[] };
  /** 三格只含「命中＋有真實文案」的印記（後端已挑選）。時間軸：過去＝此印對你過去的說法／現在＝此刻帶來什麼／未來＝接下來；小標新舊並陳：過去（命中神煞）／現在（柱位與封印）／未來（阿修羅判語）（GhostAsuraCard 卡頭下方的原生段落） */
  sections: AsuraDisplaySection[];
  /** 需要點亮動畫的印記 id（後端已篩好） */
  glowIds: string[];
  /** 稽核計數（前端不顯示） */
  audit: AsuraDisplayAudit;
  scopeNote: string;
}

/** 技能頁三張摺疊卡：生辰未送出前的一句（阿修羅口吻；無命盤資料，故放在共用合約）。 */
export const ASURA_AWAIT_BIRTH = '生辰未至，我不開卷。日期、時辰、性別，交來。';
