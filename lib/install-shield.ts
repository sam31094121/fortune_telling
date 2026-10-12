// 手機「儲存網站」金盾牌的純邏輯（無 DOM 依賴，可單獨測試）。
export type InAppBrowser = 'line' | 'facebook' | 'instagram' | null;
export type InstallPlatform = 'ios' | 'android' | 'other';

// v2：舊版 v1（有 × 的版本、或誤滑）留下的收起紀錄一律作廢，讓盾牌重新出現。
export const INSTALL_SHIELD_DISMISS_KEY = 'taiji-install-shield-dismissed-v2';
export const INSTALL_SHIELD_LEGACY_KEYS = ['taiji-install-shield-dismissed-v1'];

/** 判斷是否為「明確的滑掉」：往左或往下、夠遠、方向明確、夠快。 */
export function isDismissFlick(dx: number, dy: number, ms: number): boolean {
  if (ms > 700) return false;
  const left = dx <= -60 && Math.abs(dx) >= 2 * Math.abs(dy);
  const down = dy >= 70 && dy >= 2 * Math.abs(dx);
  return left || down;
}

/** 網址帶 ?resetShield=1 時清除收起紀錄。 */
export function wantsShieldReset(search: string): boolean {
  return new URLSearchParams(search).get('resetShield') === '1';
}

export function detectInAppBrowser(ua: string): InAppBrowser {
  if (/\sLine\//i.test(ua)) return 'line';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
  if (/Instagram/i.test(ua)) return 'instagram';
  return null;
}

export function detectPlatform(ua: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  // iPadOS 13+ 以 Macintosh UA 偽裝
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/** 加上 openExternalBrowser=1（LINE 官方參數），保留其他參數與 hash。 */
export function withOpenExternalBrowser(href: string): string {
  const url = new URL(href);
  url.searchParams.set('openExternalBrowser', '1');
  return url.toString();
}
