// 手機「儲存網站」金盾牌的純邏輯（無 DOM 依賴，可單獨測試）。
export type InAppBrowser = 'line' | 'facebook' | 'instagram' | null;
export type InstallPlatform = 'ios' | 'android' | 'other';

// v2：舊版 v1（有 × 的版本、或誤滑）留下的收起紀錄一律作廢，讓盾牌重新出現。
export const INSTALL_SHIELD_DISMISS_KEY = 'taiji-install-shield-dismissed-v2';
export const INSTALL_SHIELD_LEGACY_KEYS = ['taiji-install-shield-dismissed-v1'];

/** 判斷是否為「明確的滑掉」：往左或往下、夠遠、方向明確、夠快。 */
export function isDismissFlick(dx: number, dy: number, ms: number): boolean {
  // ms 以觸控事件本身的時間戳記計算；1.5 秒內完成才算「滑掉」，慢慢拖不算。
  if (ms > 1500) return false;
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

export type DesktopBrowser = 'chromium' | 'safari-mac' | 'other';

/** 桌機瀏覽器：Chrome / Edge（含 beforeinstallprompt）、macOS Safari（檔案 → 加入 Dock）、其他（加書籤）。 */
export function detectDesktopBrowser(ua: string): DesktopBrowser {
  if (/Edg\/|Chrome\/|Chromium\//.test(ua) && !/OPR\/|Firefox\//.test(ua)) return 'chromium';
  if (/Macintosh/.test(ua) && /Version\/[\d.]+.*Safari\//.test(ua)) return 'safari-mac';
  return 'other';
}

export function isIPad(ua: string, maxTouchPoints = 0): boolean {
  return /iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
}

/** 加上 openExternalBrowser=1（LINE 官方參數）與 installShield=open（到了真正的瀏覽器自動打開說明），保留其他參數與 hash。 */
export function withOpenExternalBrowser(href: string): string {
  const url = new URL(href);
  url.searchParams.set('openExternalBrowser', '1');
  url.searchParams.set('installShield', 'open');
  return url.toString();
}

/** 是否是從 LINE 轉跳過來、應該自動打開說明。 */
export function wantsInstallSheet(search: string): boolean {
  return new URLSearchParams(search).get('installShield') === 'open';
}

/** 已經帶過 openExternalBrowser=1 還停在 App 內建瀏覽器 → LINE 沒有轉開，改教使用者手動開。 */
export function externalOpenFailed(search: string, inApp: InAppBrowser): boolean {
  return inApp !== null && new URLSearchParams(search).get('openExternalBrowser') === '1';
}

/** 移除轉跳用的參數（保留其他參數與 hash）。 */
export function stripInstallParams(href: string): string {
  const url = new URL(href);
  url.searchParams.delete('openExternalBrowser');
  url.searchParams.delete('installShield');
  return url.toString();
}
