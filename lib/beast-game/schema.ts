/**
 * 神獸卡遊戲｜卡片統一格式
 * ============================================================================
 *
 * 規格第三條：每張卡片只能使用同一個 Schema，禁止每張神獸自己寫一套程式。
 * 規格第十六條：卡片資料不得寫在 React Component 裡。
 *
 * 所以卡片是**資料**，不是程式。這支檔案定義那份資料長什麼樣，
 * 以及一張卡要通過哪些檢查才准進正式牌庫（規格第十八條）。
 *
 * 版本規則（規格第二十條）：卡片版本與核心版本分離。
 * 卡片改數值 → patch；技能重大改 → minor；核心改 → GAME_CORE_VERSION。
 */

import { isBeastElement, type BeastElement } from './elements';

/** 遊戲核心版本。與任何一張卡的 version 無關，不得混用。 */
export const GAME_CORE_VERSION = '1.0.0';

export const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'] as const;
export type Rarity = (typeof RARITIES)[number];

export const CARD_CATEGORIES = ['DIVINE_BEAST'] as const;
export type CardCategory = (typeof CARD_CATEGORIES)[number];

export interface BeastStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface BeastCardArt {
  /** 手牌與戰場用的小圖。手機優先，先載這張。 */
  thumbnail: string;
  /** 卡片正面（中等尺寸）。 */
  front: string;
  /** 詳細頁才載的高畫質。 */
  high: string;
  /** 牌背。抽卡儀式從這張翻開。 */
  back: string;
}

export interface BeastCard {
  id: string;
  name: string;
  category: CardCategory;
  /** 主元素。每張卡必有且只有一個。 */
  element: BeastElement;
  /** 副元素。可以沒有；有也只能一個。 */
  subElement?: BeastElement | null;
  rarity: Rarity;
  stats: BeastStats;
  /** 技能 id，實際內容在 Skill Registry。卡片不自帶技能程式。 */
  skills: string[];
  /** 被動 id，同上。 */
  passive: string[];
  art: BeastCardArt;
  story: string;
  /** 這張卡對應的二十八宿素材 id（data/star-beasts.json 的 id）。 */
  mansionId: number;
  version: string;
}

/* ────────────────────────────────────────────────────────────────────────────
   卡片品質驗證（規格第十八條）

   有錯就不准進正式牌庫。回傳錯誤清單，不是只回一個 boolean——
   「這張卡不合格」對工程端沒有用，要講得出是哪一項不合格。
   ──────────────────────────────────────────────────────────────────────────── */

export interface CardValidationIssue {
  cardId: string;
  field: string;
  message: string;
}

const SEMVER = /^\d+\.\d+\.\d+$/;
/** 數值上下限。超出就是打錯字，不是設計選擇。 */
const STAT_RANGE: Record<keyof BeastStats, { min: number; max: number }> = {
  hp: { min: 40, max: 300 },
  attack: { min: 10, max: 150 },
  defense: { min: 0, max: 120 },
  speed: { min: 10, max: 150 },
};

export function validateCard(
  card: BeastCard,
  context: { knownSkillIds: Set<string>; knownCardIds: Set<string>; assetExists?: (path: string) => boolean },
): CardValidationIssue[] {
  const issues: CardValidationIssue[] = [];
  const bad = (field: string, message: string) => issues.push({ cardId: card.id ?? '(無 id)', field, message });

  // ✓ ID 唯一
  if (!card.id || typeof card.id !== 'string') bad('id', 'id 必填');
  else if (context.knownCardIds.has(card.id)) bad('id', `id 重複：${card.id}`);

  // ✓ 名稱存在
  if (!card.name || card.name.trim().length === 0) bad('name', '名稱必填');

  if (!(CARD_CATEGORIES as readonly string[]).includes(card.category)) {
    bad('category', `category 不合法：${String(card.category)}`);
  }

  // ✓ 元素合法（只准平台那五個）
  if (!isBeastElement(card.element)) bad('element', `主元素不合法：${String(card.element)}`);
  if (card.subElement != null) {
    if (!isBeastElement(card.subElement)) bad('subElement', `副元素不合法：${String(card.subElement)}`);
    else if (card.subElement === card.element) bad('subElement', '副元素不得與主元素相同');
  }

  if (!(RARITIES as readonly string[]).includes(card.rarity)) {
    bad('rarity', `稀有度不合法：${String(card.rarity)}`);
  }

  // ✓ 數值合法
  for (const key of Object.keys(STAT_RANGE) as Array<keyof BeastStats>) {
    const value = card.stats?.[key];
    const range = STAT_RANGE[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      bad(`stats.${key}`, `${key} 必須是數字`);
    } else if (!Number.isInteger(value)) {
      bad(`stats.${key}`, `${key} 必須是整數，收到 ${value}`);
    } else if (value < range.min || value > range.max) {
      bad(`stats.${key}`, `${key} 超出合理範圍 ${range.min}–${range.max}，收到 ${value}`);
    }
  }

  // ✓ 技能存在、✓ Skill ID 合法
  if (!Array.isArray(card.skills)) bad('skills', 'skills 必須是陣列');
  else {
    if (card.skills.length === 0) bad('skills', '至少要有一個技能，否則這張卡在場上沒有事情可做');
    for (const skillId of card.skills) {
      if (!context.knownSkillIds.has(skillId)) bad('skills', `技能不存在於 Skill Registry：${skillId}`);
    }
  }
  if (!Array.isArray(card.passive)) bad('passive', 'passive 必須是陣列');
  else {
    for (const skillId of card.passive) {
      if (!context.knownSkillIds.has(skillId)) bad('passive', `被動不存在於 Skill Registry：${skillId}`);
    }
  }

  // ✓ 圖片存在（三段式，規格第十四條）
  for (const key of ['thumbnail', 'front', 'high', 'back'] as const) {
    const src = card.art?.[key];
    if (!src || typeof src !== 'string') {
      bad(`art.${key}`, `${key} 圖片路徑必填`);
      continue;
    }
    if (context.assetExists && !context.assetExists(src)) {
      bad(`art.${key}`, `圖片不存在：${src}`);
    }
  }

  if (!card.story || card.story.trim().length < 10) {
    bad('story', '故事必填，且不得只有幾個字——第三層要展開給客戶看');
  }

  if (!SEMVER.test(card.version ?? '')) {
    bad('version', `卡片版本要用 x.y.z，收到 ${String(card.version)}`);
  }

  if (!Number.isInteger(card.mansionId) || card.mansionId < 1 || card.mansionId > 28) {
    bad('mansionId', `mansionId 必須是 1–28 的二十八宿編號，收到 ${String(card.mansionId)}`);
  }

  return issues;
}
