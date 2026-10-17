'use client';

import { useEffect } from 'react';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';
import { startDomTranslation } from '@/lib/i18n-dom-layer';
import { loadDisplayTranslator } from '@/lib/i18n-dom-dictionaries';

// 與 InterfaceLanguageProvider、layout 開頁腳本同一個儲存鍵。
const READING_LANGUAGE_STORAGE_KEY = 'interface-reading-language-v1';

/**
 * 全站顯示層翻譯開關（放在 InterfaceLanguageProvider 裡，畫面上不輸出任何東西）。
 *  - 简体中文：全站文字轉简体字形＋大陸用語（含命盤解讀；只換字形，不改內容）。
 *  - English／日本語／한국어：只套用人工字典裡逐字相同的句子，查不到就保留繁體中文原文。
 *  - 切回繁體中文：把改過的文字還原。
 * 只在瀏覽器執行（伺服器輸出永遠是繁體原文），不改 React 狀態、不碰輸入框內容，也不會送任何文字到外部服務。
 */
export default function I18nDisplayLayer() {
  const { language } = useInterfaceLanguage();
  // 2026-10-17 穩定性：<html data-reading-lang> 由 layout 的開頁腳本先標上（畫面畫出來前），
  // 讓首頁依閱讀語言先預留版面、翻譯換上時不跳動；之後切換語言時在這裡同步。
  // 剛載入時 language 還是預設的繁中、但裝置上存的是別的語言 → 不要把開頁腳本標好的值拿掉。
  useEffect(() => {
    const root = document.documentElement;
    if (language === 'zh-Hant') {
      let stored: string | null = null;
      try { stored = window.localStorage.getItem(READING_LANGUAGE_STORAGE_KEY); } catch {}
      if (stored && stored !== 'zh-Hant' && root.hasAttribute('data-reading-lang')) return;
      root.removeAttribute('data-reading-lang');
      root.setAttribute('lang', 'zh-Hant');
      return;
    }
    root.setAttribute('data-reading-lang', language);
    // <html lang> 跟著目前閱讀語言（螢幕閱讀器用來選發音）；元件裡仍是繁中原文的句子各自標 lang="zh-Hant"。
    root.setAttribute('lang', language);
  }, [language]);
  useEffect(() => {
    if (language === 'zh-Hant') return;
    // <html lang> 由上面的效果統一同步（2026-10-17 起各語言都標，不再只有简体）。
    let cancelled = false;
    let stop: (() => void) | undefined;
    loadDisplayTranslator(language)
      .then(translate => { if (!cancelled && translate) stop = startDomTranslation(document.body, translate, language); })
      .catch(() => { /* 載入失敗就維持原文，不影響操作。 */ });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [language]);
  return null;
}
