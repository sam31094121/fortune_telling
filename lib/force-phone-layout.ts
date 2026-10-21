/**
 * 手機下載／加到主畫面後，Chrome 有時會開「電腦版網站」
 * （layout viewport 變成 980px 左右），媒體查詢就走桌面樣式。
 * 這裡只負責判斷「其實是手機」以及要把 viewport 鎖成多少 CSS 寬。
 */

export type PhoneLayoutSignals = {
  innerWidth: number;
  screenWidth: number;
  screenHeight: number;
  visualWidth: number;
  maxTouchPoints: number;
  pointerCoarse: boolean;
  standalone: boolean;
  userAgent: string;
};

const PHONE_CSS_MAX = 540;
const DESKTOP_SPOOF_MIN = 800;
const DEFAULT_PHONE_WIDTH = 390;

export function isStandaloneDisplay(matchesStandalone: boolean, iosStandalone: boolean): boolean {
  return matchesStandalone || iosStandalone;
}

/** 最短邊像手機（含橫向：最短邊仍是寬度那側）。iPad 最短邊通常 ≥ 768，不列入。 */
export function looksLikePhoneScreen(screenWidth: number, screenHeight: number): boolean {
  const minSide = Math.min(screenWidth, screenHeight);
  return minSide > 0 && minSide <= PHONE_CSS_MAX;
}

export function isTouchPhone(signals: PhoneLayoutSignals): boolean {
  return signals.maxTouchPoints > 0 || signals.pointerCoarse;
}

/**
 * UA 被改成電腦、或 layout 被拉成 980，但裝置仍是手機。
 * 已經是手機寬（innerWidth ≤ 540）時不必改 viewport，避免和捏合還原打架。
 */
export function shouldForcePhoneLayout(signals: PhoneLayoutSignals): boolean {
  if (!isTouchPhone(signals)) return false;
  const ua = signals.userAgent || '';
  const iphone = /iPhone|iPod/i.test(ua);
  const androidMobile = /Android/i.test(ua) && /Mobile/i.test(ua);
  const androidDesktopSite = /Android/i.test(ua) && !/Mobile/i.test(ua);
  const phoneScreen = looksLikePhoneScreen(signals.screenWidth, signals.screenHeight);
  const visualIsPhone = signals.visualWidth > 0 && signals.visualWidth <= PHONE_CSS_MAX;
  const layoutIsDesktop = signals.innerWidth >= DESKTOP_SPOOF_MIN;

  if ((iphone || androidMobile) && layoutIsDesktop) return true;
  if (!layoutIsDesktop) return false;
  if (androidDesktopSite && (phoneScreen || visualIsPhone || signals.standalone)) return true;
  if (signals.standalone && (phoneScreen || visualIsPhone)) return true;
  if (phoneScreen && visualIsPhone) return true;
  return false;
}

export function guessPhoneCssWidth(signals: PhoneLayoutSignals): number {
  const visual = Math.round(signals.visualWidth);
  if (visual >= 320 && visual <= PHONE_CSS_MAX) return visual;
  const minSide = Math.round(Math.min(signals.screenWidth, signals.screenHeight));
  if (minSide >= 320 && minSide <= PHONE_CSS_MAX) return minSide;
  return DEFAULT_PHONE_WIDTH;
}

export function phoneViewportContent(width: number): string {
  return `width=${width}, initial-scale=1, viewport-fit=cover`;
}

/** 頁面畫出前執行，避免先閃電腦版再縮回來。 */
export const FORCE_PHONE_LAYOUT_INIT_SCRIPT = `(function(){try{var t=navigator.maxTouchPoints||0;var ua=navigator.userAgent||'';var st=window.matchMedia('(display-mode: standalone)').matches||!!navigator.standalone;var coarse=window.matchMedia('(pointer: coarse)').matches;var sw=screen.width||0,sh=screen.height||0;var vw=(window.visualViewport&&visualViewport.width)||0;var iw=window.innerWidth||0;var touch=t>0||coarse;if(!touch)return;var phoneScreen=Math.min(sw,sh)<=540;var visualPhone=vw>0&&vw<=540;var layoutDesk=iw>=800;var iphone=/iPhone|iPod/i.test(ua);var andMob=/Android/i.test(ua)&&/Mobile/i.test(ua);var andDesk=/Android/i.test(ua)&&!/Mobile/i.test(ua);var force=false;if((iphone||andMob)&&layoutDesk)force=true;else if(layoutDesk&&((andDesk&&(phoneScreen||visualPhone||st))||(st&&(phoneScreen||visualPhone))||(phoneScreen&&visualPhone)))force=true;if(!force)return;document.documentElement.setAttribute('data-force-phone','1');var w=Math.round(vw);if(!(w>=320&&w<=540)){w=Math.round(Math.min(sw,sh));if(!(w>=320&&w<=540))w=390;}var meta=document.querySelector('meta[name="viewport"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','viewport');document.head.appendChild(meta);}meta.setAttribute('content','width='+w+', initial-scale=1, viewport-fit=cover');}catch(e){}})();`;
