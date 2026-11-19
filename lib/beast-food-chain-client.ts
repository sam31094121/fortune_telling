'use client';
/**
 * 食物鏈「贏卡 → 拿去強化」捷徑（9A：只開面板預選，仍要玩家按確認，絕不自動送出）。
 * 只存在本分頁 sessionStorage 的一次性提示，不是存檔；判定誰能吃誰、加多少仍由伺服端決定，
 * 這裡的目標推算只用來決定要不要顯示捷徑按鈕。
 */
import { readSharedCultivation } from './beast-cultivation-client';

const SHORTCUT = 'tdh_food_chain_shortcut_v1';
export const FOOD_CHAIN_SHORTCUT = 'tdh-food-chain-shortcut';

/** 只讀後端給定的合法目標；前端不保留舊版材料關係表。 */
export function feedTargetCardId(materialCardId: string): string | null {
  return feedShortcutFor(materialCardId)?.targetCardId ?? null;
}
/** 卡庫快取裡持有這張戰利卡可以餵的目標時，回傳 {目標名稱}；否則 null（不顯示捷徑）。 */
export function feedShortcutFor(materialCardId: string | null | undefined): { targetName: string; targetCardId: string } | null {
  if (!materialCardId) return null;
  try {
    const view=readSharedCultivation();
    const material=view?.cards.find(c=>c.cardId===materialCardId&&!c.protected);
    if(!material)return null;
    const target=view?.cards.find(c=>c.id!==material.id&&material.materialTargetCardIds?.includes(c.cardId));
    return target?{targetCardId:target.cardId,targetName:target.name}:null;
  } catch { return null; }
}
export function requestFeedShortcut(materialCardId: string) {
  try { window.sessionStorage.setItem(SHORTCUT, JSON.stringify({ materialCardId, at: Date.now() })); } catch {}
  window.dispatchEvent(new Event(FOOD_CHAIN_SHORTCUT));
}
/** 讀一次就清掉；十分鐘前的舊提示不採用。 */
export function takeFeedShortcut(): string | null {
  try {
    const raw = window.sessionStorage.getItem(SHORTCUT);
    window.sessionStorage.removeItem(SHORTCUT);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value.materialCardId === 'string' && Date.now() - Number(value.at) < 600000 ? value.materialCardId : null;
  } catch { return null; }
}
export function peekFeedShortcut(): boolean {
  try { return Boolean(window.sessionStorage.getItem(SHORTCUT)); } catch { return false; }
}
