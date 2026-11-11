/**
 * 分體承受卡 × 血條一體成型（2026-11-10 整合 WIP，branch fused-rim-wip；需鈺勝／威諺確認）。
 * 範圍（鈺勝 23:51）：只做兩件事——
 *  1. 卡圖往下移，讓卡圖下緣直接接在血條上（同一個外殼、同一個底座），看起來是一體；不修圖、不加遮罩。
 *  2. 卡片下方／卡上的文字全部拿掉（盾 N、暫時受控、待命、反擊中），功能照常；狀態改由既有視覺線索＋aria-label 表達。
 * 數值都在這裡，改數字只動這個檔。
 */
import type { CSSProperties } from 'react';

/** 卡圖在方框內的垂直位置（object-position y）：100%＝貼底，圖下緣直接坐在血條上。 */
export const FUSED_ART_Y = '100%';
/** 血條上緣蓋住卡圖下緣的像素（藏接縫）。 */
export const FUSED_JOIN_PX = 1;
/** D2（鈺勝 23:27 決定保留寶珠）：寶珠在卡右上角（動效助手 v2）；true＝不顯示寶珠。 */
export const FUSED_HIDE_READY_ORB = false;

export function fusedRimVars(): CSSProperties {
  return { ['--art-y' as string]: FUSED_ART_Y, ['--join' as string]: `${FUSED_JOIN_PX}px` } as CSSProperties;
}

/** 護盾純視覺（動效助手 v2，取代「盾 N」）：HP 軌道下半 4px 斜紋帶，長度＝盾／最大生命，接在 HP 尾端；盾＋HP 超過 100% 時靠右。 */
export function fusedShieldVars(hp: number, shield: number, maxHp: number): CSSProperties {
  const h = Math.max(0, Math.min(1, hp / maxHp)), sh = Math.max(0, Math.min(1, shield / maxHp));
  return { ['--hp' as string]: h, ['--sh' as string]: sh } as CSSProperties;
}

/**
 * 主狀態（單選）。盾、目標、待命、受控、出手亮邊是獨立的 data-fused-* 屬性，可疊加（命理必改 4）。
 * activated 只給能量技／連結攻擊施放者（必改 5）；down 由呼叫端先排除死亡動畫播放中（必改 6）。
 */
export type FusedRimState = 'down' | 'activated' | 'ready' | 'low' | 'idle';
export function fusedRimState(s: { down: boolean; fired: boolean; ready: boolean; hpRatio: number }): FusedRimState {
  if (s.down) return 'down';
  if (s.fired) return 'activated';
  if (s.ready) return 'ready';
  // hp<=0 但尚在死亡動畫（呼叫端 down=false）時不要當「低血」呼吸（命理 N2）
  if (s.hpRatio <= 0) return 'idle';
  if (s.hpRatio <= 0.3) return 'low';
  return 'idle';
}
