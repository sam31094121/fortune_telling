/**
 * 神獸戰隊 v0.8｜三消核心：共用設定（單一來源）
 * 10/30 用戶確認規則：拖曳連珠、普通威力上限 10 顆、4 顆以上生成魔法珠、剛好 5 顆觸發五珠技、
 * 五元素各一張卡、消哪色充哪張卡能量、敵方每 3 步反擊。
 */
import { ELEMENT_LABEL, type BeastElement } from '../elements';

export const MATCH3_COLS = 7;
export const MATCH3_ROWS = 7;
/** 最短可消連線（拖曳連珠與掉落後的直線連鎖都用這個）。 */
export const MATCH3_MIN_RUN = 3;

/** 盤面五色＝主遊戲 elements.ts 的五元素（風、空、水、火、地）。唯一對應表。 */
export const MATCH3_ORB_ELEMENTS: readonly BeastElement[] = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];
export const MATCH3_ORB_LABEL: Record<BeastElement, string> = ELEMENT_LABEL;

/** 拖曳連線顆數不設上限；但「普通消除」威力最多只算到這麼多顆。 */
export const NORMAL_POWER_CAP = 10;
export function normalPower(count: number): number { return Math.min(Math.max(0, count), NORMAL_POWER_CAP); }

/** 連線長度倍率（3 連＝1，每多一顆 +LENGTH_STEP）。 */
export const LENGTH_STEP = 0.25;
/** 【待平衡】連線長度（威力）倍率，非最終規格。 */
export function lengthMultiplier(length: number): number {
  return length < MATCH3_MIN_RUN ? 0 : 1 + (length - MATCH3_MIN_RUN) * LENGTH_STEP;
}

/** 連鎖段倍率（第 1 段＝1，每多一段 +CHAIN_STEP），與連線長度分開計算。 */
export const CHAIN_STEP = 0.2;
/** 【待平衡】連鎖倍率，非最終規格。 */
export function chainMultiplier(chain: number): number {
  return chain < 1 ? 0 : 1 + (chain - 1) * CHAIN_STEP;
}

/** 【待平衡】一組消除的基礎傷害＝攻擊者卡面攻擊力 × BASE_RATIO。 */
export const BASE_RATIO = 0.5;

/** 魔法珠：一次拖曳 4 顆以上，在放開的那格生成同色魔法珠，威力＝連線顆數（不設上限）。 */
export const MAGIC_ORB_MIN_LENGTH = 4;
export const MAGIC_ORB_SPAWN_ENABLED = true;
/** 五珠技：一次拖曳「剛好」5 顆，對應屬性卡能量直接集滿。 */
export const SKILL5_LENGTH = 5;

/** 能量：消一顆同色珠充 ENERGY_PER_ORB（【待平衡】），滿值 ENERGY_MAX。 */
export const ENERGY_MAX = 100;
export const ENERGY_PER_ORB = 10;
/** 【待平衡】能量滿時發動技能：卡面攻擊 × SKILL_RATIO × 克制倍率。 */
export const SKILL_RATIO = 2;

/** 敵方每隔幾步反擊一次。 */
export const ENEMY_COUNTER_EVERY = 3;
/** 我方出陣張數：五元素各一張。 */
export const TEAM_SIZE = 5;

/** 功能旗標：預設關閉，只有 NEXT_PUBLIC_BEAST_MATCH3=1 才開入口。 */
export function isMatch3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_BEAST_MATCH3 === '1';
}
