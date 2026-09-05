/**
 * 神獸卡遊戲｜五元素
 * ============================================================================
 *
 * 規格第四條：平台固定五元素（空、風、水、火、地），**不得另外建立第二套**。
 *
 * 所以這裡不發明新的五行。平台既有的對照在
 * lib/ziwei-star-beast-link.ts 的 PRODUCT_ELEMENT：
 *
 *   金 metal → 空    木 wood → 風    水 water → 水
 *   火 fire  → 火    土 earth → 地
 *
 * 這一份只是把同一組對照換成遊戲用的英文常數，並由測試釘住兩邊一致
 * （tests/beast-game.test.ts 會直接讀那支檔案比對，改動任一邊都會報錯）。
 */

/** 遊戲內元素代號。五個，不多不少。 */
export const ELEMENTS = ['SPACE', 'AIR', 'WATER', 'FIRE', 'EARTH'] as const;
export type BeastElement = (typeof ELEMENTS)[number];

/** 對客戶顯示的字。與平台其他卡片同一組字，不另造詞。 */
export const ELEMENT_LABEL: Record<BeastElement, string> = {
  SPACE: '空',
  AIR: '風',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

/** 傳統五行 → 平台五元素。與 PRODUCT_ELEMENT 同一組對照。 */
export const WUXING_TO_ELEMENT: Record<'金' | '木' | '水' | '火' | '土', BeastElement> = {
  金: 'SPACE',
  木: 'AIR',
  水: 'WATER',
  火: 'FIRE',
  土: 'EARTH',
};

/**
 * 二十八宿名稱中間那個字 → 元素。
 *
 * 二十八宿每七宿一輪「木金土日月火水」，其中日、月不在五行裡。
 * 依傳統歸屬：太陽屬火、太陰屬水。這不是我們自己配的，
 * 是把既有名稱接進既有的五元素，沒有新增第六種。
 *
 * 注意：這裡**不改** ziwei-star-beast-link.ts 的 beastElement()。
 * 那支在遇到日、月時回傳 null 並退回同季第一張，是已上線的行為；
 * 改它會讓現有客戶的紫微神獸卡換一張。遊戲核心自己用這一份，
 * 不去動已經在跑的東西。
 */
export const MANSION_CHAR_TO_ELEMENT: Record<string, BeastElement> = {
  木: 'AIR',
  金: 'SPACE',
  土: 'EARTH',
  水: 'WATER',
  火: 'FIRE',
  日: 'FIRE',
  月: 'WATER',
};

/**
 * 從二十八宿名稱取元素：取名字中間那個字（木金土日月火水）去對照。
 * 取不到就回 null——不猜，讓卡片驗證去擋。
 */
export function elementFromMansionName(name: string): BeastElement | null {
  const middle = name.slice(1, 2);
  return MANSION_CHAR_TO_ELEMENT[middle] ?? null;
}

export function isBeastElement(value: unknown): value is BeastElement {
  return typeof value === 'string' && (ELEMENTS as readonly string[]).includes(value);
}

/**
 * 元素相剋加成。
 *
 * 刻意做得溫和（剋 +20%、被剋 −10%），理由與稀有度那一條相同：
 * 讓元素成為戰術選擇，而不是「帶對元素就贏」。
 * 相生相剋沿用五行既有關係，換成遊戲代號而已：
 *   風(木)剋地(土)、地(土)剋水、水剋火、火剋空(金)、空(金)剋風(木)
 */
export const ELEMENT_COUNTER: Record<BeastElement, BeastElement> = {
  AIR: 'EARTH',
  EARTH: 'WATER',
  WATER: 'FIRE',
  FIRE: 'SPACE',
  SPACE: 'AIR',
};

export const ELEMENT_ADVANTAGE_MULTIPLIER = 1.2;
export const ELEMENT_DISADVANTAGE_MULTIPLIER = 0.9;

/** 攻方對守方的元素倍率。沒有相剋關係時就是 1，不做任何調整。 */
export function elementMultiplier(attacker: BeastElement, defender: BeastElement): number {
  if (ELEMENT_COUNTER[attacker] === defender) return ELEMENT_ADVANTAGE_MULTIPLIER;
  if (ELEMENT_COUNTER[defender] === attacker) return ELEMENT_DISADVANTAGE_MULTIPLIER;
  return 1;
}
