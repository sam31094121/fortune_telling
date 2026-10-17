/**
 * 手機字體大小（客戶自選）。2026-10-12 業主定案：客戶可在首頁自己選字體大小，
 * 「中」＝當天上線的放大版基準字級（手機 125%），是預設標準。
 * 最小的一檔（原「小」，90%）已於 2026-10-12 拿掉：字太小，沒有人會看。
 *
 * 唯一一份設定：開關元件、頁面載入前的套用腳本、守門測試都讀這裡；CSS 在 app/globals.css「手機字體（唯一一份）」。
 * 每一檔的根字級與倍率（--ts）必須和 CSS 一致，測試會核對。
 */
export const TEXT_SIZE_STORAGE_KEY = 'tdh_text_size_v1';

export type TextSizeId = 'medium' | 'large' | 'xlarge';

export const TEXT_SIZE_DEFAULT: TextSizeId = 'medium';

// rootPercent／scale＝手機（640px 以下）；desktopRootPercent＝電腦、平板（641px 以上）。
// 電腦的「中」＝原本的 100%（沒有改動），客戶選「大」「特大」才放大。
export const TEXT_SIZE_OPTIONS: ReadonlyArray<{ id: TextSizeId; label: string; rootPercent: number; scale: number; desktopRootPercent: number }> = [
  { id: 'medium', label: '中', rootPercent: 125, scale: 1, desktopRootPercent: 100 },
  { id: 'large', label: '大', rootPercent: 156.25, scale: 1.25, desktopRootPercent: 112.5 },
  { id: 'xlarge', label: '特大', rootPercent: 187.5, scale: 1.5, desktopRootPercent: 125 },
];

export function isTextSizeId(value: unknown): value is TextSizeId {
  return value === 'medium' || value === 'large' || value === 'xlarge';
}

/** 讀客戶先前的選擇；讀不到、私密模式、值不合法一律回預設「中」。 */
export function readTextSize(): TextSizeId {
  try {
    const stored = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    return isTextSizeId(stored) ? stored : TEXT_SIZE_DEFAULT;
  } catch {
    return TEXT_SIZE_DEFAULT;
  }
}

/** 套用到整個網站：預設「中」不加屬性（就是上線版本），其餘三檔設 data-text-size。 */
export function applyTextSize(id: TextSizeId) {
  const root = document.documentElement;
  if (id === TEXT_SIZE_DEFAULT) root.removeAttribute('data-text-size');
  else root.setAttribute('data-text-size', id);
}

export function saveTextSize(id: TextSizeId) {
  try {
    if (id === TEXT_SIZE_DEFAULT) window.localStorage.removeItem(TEXT_SIZE_STORAGE_KEY);
    else window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, id);
  } catch {
    /* 私密模式或被封鎖：這次仍然生效，只是下次回來不會記得 */
  }
}

/** 放在 <head> 的小腳本：頁面畫出來之前就套用，不會先閃一下標準大小再變大。 */
export const TEXT_SIZE_INIT_SCRIPT = `try{var s=window.localStorage.getItem('${TEXT_SIZE_STORAGE_KEY}');if(s==='large'||s==='xlarge'){document.documentElement.setAttribute('data-text-size',s)}}catch(e){}`;
