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

export interface AsuraDisplaySection {
  key: 'hits' | 'pillars' | 'verdict';
  /** 段落主標：過去／現在／未來 */
  heading: string;
  /** 功能小標：命中神煞／柱位與封印狀態／阿修羅判語 */
  label: string;
  lead: string;
  items: AsuraDisplayEntry[];
  emptyText: string | null;
}

export interface AsuraDisplay {
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
  /** 三段後端功能：過去（命中神煞）／現在（柱位與封印狀態）／未來（阿修羅判語）（GhostAsuraCard 卡頭下方的原生段落） */
  sections: AsuraDisplaySection[];
  /** 需要點亮動畫的印記 id（後端已篩好） */
  glowIds: string[];
  scopeNote: string;
}
