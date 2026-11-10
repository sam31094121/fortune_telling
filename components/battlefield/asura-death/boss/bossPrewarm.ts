/**
 * 輕量預熱入口（不靜態引入引擎）：首屏只多這幾行；呼叫時才以動態 import 載入特效 chunk 並排入背景預備。
 * 用法：第 8 關起魔王上場（或魔王 HP 低於某值）時 `prewarmBossFx('/beast-game/front/guardian-baihu.v2.webp', { width, height })`。
 * width/height＝整張卡（含金框）CSS 尺寸，需與之後元件量到的卡尺寸相同（四捨五入到 px）才會被元件領用。
 */
export type PrewarmBox = { width: number; height: number };
export function prewarmBossFx(imageSrc: string, box: PrewarmBox, opts: Record<string, unknown> = {}): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return import('./BossExplosionDeath').then((m) => m.prewarm(imageSrc, box, opts as any)).catch(() => false);
}
