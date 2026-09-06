/**
 * 《四大神獸》・二十八宿的歸屬與強弱
 * ============================================================================
 *
 * 業主定調：「改為《四大神獸》，紫微斗數《四大神獸》。神獸卡也有分強弱，
 * 60 張的神獸卡有分等級強弱，戰鬥力強弱都要清楚。五元素相生相剋。」
 *
 * 【為什麼不抄成熟卡牌遊戲】
 *
 * 牌庫、手牌、主戰、後備、棄牌、回合制——這些是這個類型的通用結構，
 * 專案早就做好了（lib/beast-game/battlefield.ts）。
 * 真正屬於別人的是名稱、角色、美術與專有數值，那些不能碰，
 * 也不需要碰：四象與二十八宿是我們自己的體系，比借來的更貼這個站。
 *
 * 業主〈二十二、原創性鐵律〉寫得很清楚：可以參考戰場結構，
 * 不得複製名稱、角色、圖示、官方卡背、官方美術、官方規則與數值。
 *
 * 【四大神獸怎麼來的】
 *
 * 不是新編的分組，是二十八宿本來的歸屬：
 * 每七宿屬一象，資料裡的 season 與 symbolicPart 已經記著。
 * 這一支只是把它讀出來，不另立一套對照表——
 * 兩份分組遲早會有一份是錯的。
 */

// 用相對路徑：編成 CJS 給測試跑時，@/ 別名不會被解析。
import starBeasts from '../data/star-beasts.json';
import type { BeastElement } from './beast-game/elements';

export type GuardianKey = 'QINGLONG' | 'ZHUQUE' | 'BAIHU' | 'XUANWU';

export interface Guardian {
  key: GuardianKey;
  /** 四象本尊的卡片 id，牠自己也是一張可出戰的卡。 */
  cardId: string;
  name: string;
  direction: string;
  season: string;
  element: BeastElement;
  /** 統領的七宿（宿號 1–28）。 */
  mansions: number[];
}

/** 季節 → 四象。二十八宿的歸屬本來就照四季分，不是另編的。 */
const SEASON_TO_GUARDIAN: Record<string, GuardianKey> = {
  spring: 'QINGLONG',
  summer: 'ZHUQUE',
  autumn: 'BAIHU',
  winter: 'XUANWU',
};

const META: Record<GuardianKey, Omit<Guardian, 'mansions'>> = {
  QINGLONG: { key: 'QINGLONG', cardId: 'beast_g_qinglong', name: '東方蒼龍', direction: '東', season: '春', element: 'AIR' },
  ZHUQUE: { key: 'ZHUQUE', cardId: 'beast_g_zhuque', name: '南方朱雀', direction: '南', season: '夏', element: 'FIRE' },
  BAIHU: { key: 'BAIHU', cardId: 'beast_g_baihu', name: '西方白虎', direction: '西', season: '秋', element: 'SPACE' },
  XUANWU: { key: 'XUANWU', cardId: 'beast_g_xuanwu', name: '北方玄武', direction: '北', season: '冬', element: 'WATER' },
};

/** 四大神獸與各自統領的七宿。 */
export const GUARDIANS: Guardian[] = (Object.keys(META) as GuardianKey[]).map((key) => ({
  ...META[key],
  mansions: starBeasts.items
    .filter((item) => SEASON_TO_GUARDIAN[item.season] === key)
    .map((item) => item.id),
}));

/** 這張卡屬於哪一位四象。四象本尊回自己。 */
export function guardianOf(cardId: string): Guardian | null {
  const own = GUARDIANS.find((guardian) => guardian.cardId === cardId);
  if (own) return own;
  const match = /^beast_[ay](\d{2})$/.exec(cardId);
  if (!match) return null;
  const mansion = Number(match[1]);
  return GUARDIANS.find((guardian) => guardian.mansions.includes(mansion)) ?? null;
}

/* ────────────────────────────────────────────────────────────────────────────
   強弱：講得出來，而且只有一個算法
   ──────────────────────────────────────────────────────────────────────── */

/** 等級。幼子最弱、四象最強，中間是成獸。 */
export type PowerTier = 'YOUNG' | 'ADULT' | 'GUARDIAN';

export const TIER_LABEL: Record<PowerTier, string> = {
  YOUNG: '幼子・I 階',
  ADULT: '成獸・II 階',
  GUARDIAN: '四象・III 階',
};

export function tierOf(cardId: string): PowerTier {
  if (/^beast_g_/.test(cardId)) return 'GUARDIAN';
  if (/^beast_y\d{2}$/.test(cardId)) return 'YOUNG';
  return 'ADULT';
}

/**
 * 戰鬥力總分：一個給人看的數字。
 *
 * 【它不參與任何計算】
 *
 * 傷害用的是 effects.ts 的公式，分別看攻擊、防禦、速度。
 * 這個總分只是把四項壓成一個數字方便比大小，不回饋到戰鬥裡——
 * 一旦戰鬥開始讀它就是第二套數值來源，兩邊遲早算出不同答案。
 */
export function powerScore(stats: { hp: number; attack: number; defense: number; speed: number }): number {
  // 生命的權重低一些：血多但打不動的，實戰不會比較強。
  return Math.round(stats.hp * 0.35 + stats.attack * 2 + stats.defense * 1.5 + stats.speed * 0.8);
}

/**
 * 六十張的戰力實測分佈。
 *
 * 【為什麼不做星等】
 *
 * 業主要「戰鬥力強弱都要清楚」。但實測回合制引擎給的數值：
 *
 *   幼子 28 張   戰力平均 238
 *   成獸 28 張   戰力平均 236
 *   四象  4 張   戰力平均 237
 *   全部 60 張   最低 232、最高 248，差距只有 16
 *
 * **階級只寫在名字上，數值上幾乎沒有差別。**
 * 那是 interactive.ts 的 fighter() 刻意壓平的——
 * 六十張數值接近，勝負才會由元素與技能決定
 * （技能檔案〈二十一〉：帶剋的幼子百分之百打贏被剋的四象）。
 *
 * 在這種分佈上做四階星等，只會做出「每一張都是頂級」的假分級。
 * 那是騙人。所以這裡回傳的是**實話**：差距很小，
 * 真正決定勝負的是相剋與技能。
 *
 * 要讓階級真的有強弱差別，得改 fighter() 的數值——
 * 那會動到平衡，一萬場抽樣那份證據要重跑，是業主的決定，不是我能自己改的。
 */
export const POWER_SPREAD = { min: 232, max: 248, flat: true } as const;

export function powerLabel(score: number): { text: string; note: string } {
  const span = POWER_SPREAD.max - POWER_SPREAD.min;
  const position = Math.max(0, Math.min(1, (score - POWER_SPREAD.min) / span));
  // 只分三段，而且講明白差距很小——不做看起來很厲害的假分級。
  const text = position >= 0.66 ? '偏高' : position >= 0.33 ? '中等' : '偏低';
  return {
    text,
    note: '六十張的戰力差距很小（232–248）。真正決定勝負的是五元素相剋與技能。',
  };
}
