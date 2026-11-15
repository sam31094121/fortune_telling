'use client';
/**
 * 食物鏈「贏卡 → 拿去強化」捷徑（9A：只開面板預選，仍要玩家按確認，絕不自動送出）。
 * 只存在本分頁 sessionStorage 的一次性提示，不是存檔；判定誰能吃誰、加多少仍由伺服端決定，
 * 這裡的目標推算只用來決定要不要顯示捷徑按鈕。
 */
import { getCard, playableCards } from './beast-game/registry';
import { guardianOf } from './beast-guardians';
import { readSharedCultivation } from './beast-cultivation-client';

const SHORTCUT = 'tdh_food_chain_shortcut_v1';
export const FOOD_CHAIN_SHORTCUT = 'tdh-food-chain-shortcut';

/** 顯示用：幼子 → 同星宿本體；本體 → 所屬四大神獸；四大神獸不能被吃。 */
export function feedTargetCardId(materialCardId: string): string | null {
  const card = getCard(materialCardId);
  if (!card) return null;
  if (card.form === 'YOUNG') return playableCards().find(c => c.form === 'ADULT' && c.mansionId === card.mansionId)?.id ?? null;
  if (card.form === 'ADULT') return guardianOf(card.id)?.cardId ?? null;
  return null;
}
/** 卡庫快取裡持有這張戰利卡可以餵的目標時，回傳 {目標名稱}；否則 null（不顯示捷徑）。 */
export function feedShortcutFor(materialCardId: string | null | undefined): { targetName: string; targetCardId: string } | null {
  if (!materialCardId) return null;
  const targetCardId = feedTargetCardId(materialCardId);
  if (!targetCardId) return null;
  try {
    const view = readSharedCultivation();
    if (!view?.cards?.some(c => c.cardId === targetCardId)) return null;
  } catch { return null; }
  return { targetCardId, targetName: getCard(targetCardId)?.name ?? '' };
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
