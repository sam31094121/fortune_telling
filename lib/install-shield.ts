// 手機「儲存網站」金盾牌的純邏輯（無 DOM 依賴，可單獨測試）。
export type InAppBrowser = 'line' | 'facebook' | 'instagram' | null;
export type InstallPlatform = 'ios' | 'android' | 'other';

export const INSTALL_SHIELD_DISMISS_KEY = 'taiji-install-shield-dismissed-v1';

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
