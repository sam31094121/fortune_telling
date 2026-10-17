'use client';

import { useEffect } from 'react';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';
import { startDomTranslation } from '@/lib/i18n-dom-layer';
import { loadDisplayTranslator } from '@/lib/i18n-dom-dictionaries';

/**
 * 全站顯示層翻譯開關（放在 InterfaceLanguageProvider 裡，畫面上不輸出任何東西）。
 *  - 简体中文：全站文字轉简体字形＋大陸用語（含命盤解讀；只換字形，不改內容）。
 *  - English／日本語／한국어：只套用人工字典裡逐字相同的句子，查不到就保留繁體中文原文。
 *  - 切回繁體中文：把改過的文字還原。
 * 只在瀏覽器執行（伺服器輸出永遠是繁體原文），不改 React 狀態、不碰輸入框內容，也不會送任何文字到外部服務。
 */
export default function I18nDisplayLayer() {
  const { language } = useInterfaceLanguage();
  useEffect(() => {
    if (language === 'zh-Hant') return;
    // 简体是整頁轉換，<html lang> 跟著標成 zh-Hans；英日韓只翻部分文字，維持原文 lang，已翻譯的區塊各自標 lang。
    const root = document.documentElement;
    const previousLang = root.getAttribute('lang');
    if (language === 'zh-Hans') root.setAttribute('lang', 'zh-Hans');
    let cancelled = false;
    let stop: (() => void) | undefined;
    loadDisplayTranslator(language)
      .then(translate => { if (!cancelled && translate) stop = startDomTranslation(document.body, translate, language); })
      .catch(() => { /* 載入失敗就維持原文，不影響操作。 */ });
    return () => {
      cancelled = true;
      stop?.();
      if (language === 'zh-Hans' && root.getAttribute('lang') === 'zh-Hans' && previousLang) root.setAttribute('lang', previousLang);
    };
  }, [language]);
  return null;
}
