'use client';
/**
 * 食物鏈「贏卡 → 拿去強化」捷徑：兩款遊戲的勝利畫面都改成直接開「四大神獸」強化頁（同一個頁面、同一套元件）。
 * 網址只帶來源遊戲（返回用）與剛贏到的卡種（強化頁只用手指提示那一堆，不自動放入；仍要玩家自己加入、按「強化」才送出）。
 * 誰能吃誰不在前端判斷：只看伺服端共同卡庫檢視裡這張卡的 materialTargetCardIds，以及是否持有其中一張大卡。
 */
import { readSharedCultivation } from './beast-cultivation-client';

export type EnhanceFrom = 'battle' | 'orb';
export const ENHANCE_PATH = '/beast-game/four-beasts';
export const GAME_PATH: Record<EnhanceFrom, string> = { battle: '/beast-game/battlefield', orb: '/beast-game/match3-hard' };

/** 只讀後端給定的合法目標；前端不保留舊版材料關係表。 */
export function feedTargetCardId(materialCardId: string): string | null {
  return feedShortcutFor(materialCardId)?.targetCardId ?? null;
}

export function enhanceHref(from?: EnhanceFrom | null, feed?: string | null): string {
  // 不用 URLSearchParams：伺服端渲染（含測試沙盒）也要能算出同一個網址。
  const q = [from ? `from=${encodeURIComponent(from)}` : '', feed ? `feed=${encodeURIComponent(feed)}` : ''].filter(Boolean).join('&');
  return q ? `${ENHANCE_PATH}?${q}` : ENHANCE_PATH;
}

/** 卡庫快取裡持有這張戰利卡、而且持有它要餵的大卡時，回傳大卡資訊；否則 null（不顯示捷徑）。 */
export function feedShortcutFor(materialCardId: string | null | undefined): { targetName: string; targetCardId: string } | null {
  if (!materialCardId) return null;
  try {
    const view = readSharedCultivation();
    const material = view?.cards.find(c => c.cardId === materialCardId && !c.protected);
    if (!material) return null;
    // 誰能吃誰只看伺服端 materialTargetCardIds（v3/v4 各卡種都可當材料）。
    const target = view?.cards.find(c => c.id !== material.id && material.materialTargetCardIds?.includes(c.cardId));
    return target ? { targetCardId: target.cardId, targetName: target.name } : null;
  } catch { return null; }
}

/** 強化頁網址參數（只接受兩種來源與合法卡號格式）。 */
export function readEnhanceParams(search: string): { from: EnhanceFrom | null; feed: string | null } {
  const q = new URLSearchParams(search);
  const from = q.get('from'), feed = q.get('feed');
  return { from: from === 'battle' || from === 'orb' ? from : null, feed: feed && /^beast_[a-z0-9_]{1,40}$/.test(feed) ? feed : null };
}
