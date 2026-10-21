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

/** 使用者自己勾選「我要電腦版」才會寫入；沒勾就一律手機版。 */
export const DESKTOP_OPT_IN_KEY = 'tdh-want-desktop-layout';

/**
 * 預設：只要是手機（手機 UA，或觸控＋手機大小螢幕）就鎖手機版，
 * 不管網址、加到主畫面或 APK；真的電腦（沒觸控）不動。
 * 唯一例外：使用者自己勾了「我要電腦版」。
 */
export function shouldForcePhoneLayout(signals: PhoneLayoutSignals, wantsDesktop = false): boolean {
  if (wantsDesktop) return false;
  const ua = signals.userAgent || '';
  const phoneUa = /iPhone|iPod/i.test(ua) || (/Android/i.test(ua) && /Mobile/i.test(ua));
  const touchPhoneScreen = isTouchPhone(signals) && looksLikePhoneScreen(signals.screenWidth, signals.screenHeight);
  if (!phoneUa && !touchPhoneScreen) return false;
  return signals.innerWidth > PHONE_CSS_MAX;
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

/** 頁面畫出前執行，避免先閃電腦版再縮回來。判斷條件與 shouldForcePhoneLayout 一致。 */
export const FORCE_PHONE_LAYOUT_INIT_SCRIPT = `(function(){try{try{if(localStorage.getItem('${DESKTOP_OPT_IN_KEY}')==='1')return;}catch(e){}var ua=navigator.userAgent||'';var touch=(navigator.maxTouchPoints||0)>0||window.matchMedia('(pointer: coarse)').matches;var sw=screen.width||0,sh=screen.height||0;var minSide=Math.min(sw,sh);var phoneUa=/iPhone|iPod/i.test(ua)||(/Android/i.test(ua)&&/Mobile/i.test(ua));var phoneScreen=touch&&minSide>0&&minSide<=${PHONE_CSS_MAX};if(!phoneUa&&!phoneScreen)return;if((window.innerWidth||0)<=${PHONE_CSS_MAX})return;document.documentElement.setAttribute('data-force-phone','1');var vw=Math.round((window.visualViewport&&visualViewport.width)||0);var w=(vw>=320&&vw<=${PHONE_CSS_MAX})?vw:Math.round(minSide);if(!(w>=320&&w<=${PHONE_CSS_MAX}))w=${DEFAULT_PHONE_WIDTH};var meta=document.querySelector('meta[name="viewport"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','viewport');document.head.appendChild(meta);}meta.setAttribute('content','width='+w+', initial-scale=1, viewport-fit=cover');}catch(e){}})();`;
