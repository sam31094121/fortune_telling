/**
 * 四大神獸系統 —— V1 僅資料結構與介面 stub。
 *
 * 【明確未定 — 禁止發明】
 * - 倍率 / 數值加成
 * - 召喚條件
 * - 哪個最強
 * - 獲取方式
 */

/** 四大神獸識別鍵（僅此四者） */
export type GuardianBeastId = 'qinglong' | 'baihu' | 'zhuque' | 'xuanwu';

export interface GuardianBeastMeta {
  id: GuardianBeastId;
  /** 玩家面向名稱（繁中） */
  labelZh: string;
}

/**
 * 空登錄表：僅鍵與顯示名，無倍率、無召喚條件、無獲取途徑。
 * TODO: 產品定案後再擴充欄位；V1 禁止填入數值發明。
 */
export const GUARDIAN_BEAST_REGISTRY: Readonly<
  Record<GuardianBeastId, GuardianBeastMeta>
> = {
  qinglong: { id: 'qinglong', labelZh: '青龍' },
  baihu: { id: 'baihu', labelZh: '白虎' },
  zhuque: { id: 'zhuque', labelZh: '朱雀' },
  xuanwu: { id: 'xuanwu', labelZh: '玄武' },
};

/** 取得登錄表（唯讀） */
export function listGuardianBeasts(): readonly GuardianBeastMeta[] {
  return Object.values(GUARDIAN_BEAST_REGISTRY);
}

export function getGuardianBeast(id: GuardianBeastId): GuardianBeastMeta {
  return GUARDIAN_BEAST_REGISTRY[id];
}

/**
 * 戰鬥中神獸槽位 stub —— 僅佔位，無效果計算。
 * TODO: summon / passive 皆未定。
 */
export interface BeastBattleSlot {
  beastId: GuardianBeastId | null;
  /** 預留：召喚狀態等；V1 恒為 idle */
  status: 'idle' | 'reserved_future';
}

export function createEmptyBeastSlot(): BeastBattleSlot {
  return { beastId: null, status: 'idle' };
}

/**
 * V1 no-op：不套用任何倍率。
 * 介面預留供日後實作。
 */
export function applyBeastModifiersStub<T>(stateSlice: T): T {
  // TODO: 倍率 / 條件未定 —— 絕對不可發明數值
  return stateSlice;
}
