/**
 * 依語系載入「顯示層翻譯」用的對照（動態載入：沒選該語言的人不會下載）。
 *  - zh-Hans：繁→简字形與大陸用語轉換（lib/zh-hans），全站文字都會轉。
 *  - en／ja／ko：只用既有人工字典＋第一階段字典逐句對照；查不到就保留繁體原文。
 * 既有字典優先（與 HomeTranslatedText 相同順序），第一階段字典只補缺。
 * 首頁（pathname === '/'）：先查 lib/i18n-copy/home.ts（首頁補齊字典＋動態句型＋裝飾字形原樣），查不到才用上面的全站字典。
 */
import type { InterfaceLanguage } from '@/lib/interface-languages';
import type { Translate } from '@/lib/i18n-dom-layer';

/** 首頁專用字典只在首頁生效；換頁後新出現的文字就回到全站字典。 */
function onHomePage() {
  return typeof window !== 'undefined' && window.location.pathname === '/';
}

async function withHomeCopy(locale: 'en' | 'ja' | 'ko', base: Translate): Promise<Translate> {
  const { createHomeTranslator } = await import('@/lib/i18n-copy/home');
  const home = createHomeTranslator(locale, base);
  return text => (onHomePage() ? home(text) ?? home(text.replace(/\s+/g, ' ')) : undefined) ?? base(text);
}

function fromDictionary(dict: Record<string, string>): Translate {
  return text => dict[text] ?? dict[text.replace(/\s+/g, ' ')];
}

export async function loadDisplayTranslator(language: InterfaceLanguage): Promise<Translate | null> {
  if (language === 'zh-Hant') return null;
  if (language === 'zh-Hans') {
    const { toSimplified } = await import('@/lib/zh-hans/convert');
    const cache = new Map<string, string>();
    return text => {
      let out = cache.get(text);
      if (out === undefined) { out = toSimplified(text); if (cache.size > 5000) cache.clear(); cache.set(text, out); }
      return out;
    };
  }
  const { phase1Copy } = await import('@/lib/i18n-copy/phase1');
  if (language === 'en') {
    const [{ birthdayEnglishCopy }, { resultEnglishCopy }, { homeEnglishCopy }, { formEnglishCopy }] = await Promise.all([
      import('@/lib/birthday-english-copy'), import('@/lib/result-english-copy'), import('@/lib/home-english-copy'), import('@/lib/form-english-copy'),
    ]);
    return withHomeCopy('en', fromDictionary({ ...phase1Copy.en, ...birthdayEnglishCopy, ...resultEnglishCopy, ...homeEnglishCopy, ...formEnglishCopy }));
  }
  if (language === 'ja') {
    const { homeJapaneseCopy } = await import('@/lib/home-japanese-copy');
    return withHomeCopy('ja', fromDictionary({ ...phase1Copy.ja, ...homeJapaneseCopy }));
  }
  const { koreanCopy } = await import('@/lib/korean-copy');
  return withHomeCopy('ko', fromDictionary({ ...phase1Copy.ko, ...koreanCopy }));
}
