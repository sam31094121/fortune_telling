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

/** AUDIT-2 H5：神獸戰鬥頁（寶珠闖關）新增文字；排在既有字典之後，只補既有字典沒有的句子。 */
async function withMatch3Copy(locale: 'en' | 'ja' | 'ko', base: Translate): Promise<Translate> {
  const { createMatch3Translator, onMatch3Page } = await import('@/lib/i18n-copy/match3');
  const m3 = createMatch3Translator(locale);
  return text => base(text) ?? (onMatch3Page() ? m3(text) ?? m3(text.replace(/\s+/g, ' ')) : undefined);
}

export async function loadDisplayTranslator(language: InterfaceLanguage): Promise<Translate | null> {
  if (language === 'zh-Hant') return null;
  if (language === 'zh-Hans') {
    const [{ toSimplified }, { fixMatch3Hans }] = await Promise.all([import('@/lib/zh-hans/convert'), import('@/lib/i18n-copy/match3')]);
    const cache = new Map<string, string>();
    // AUDIT-2 H5：神獸戰鬥頁再補大陸用語（伺服端→服务器等）；快取只存全站轉換結果，補正每次依頁面判斷。
    return text => {
      let out = cache.get(text);
      if (out === undefined) { out = toSimplified(text); if (cache.size > 5000) cache.clear(); cache.set(text, out); }
      return fixMatch3Hans(out);
    };
  }
  const { phase1Copy } = await import('@/lib/i18n-copy/phase1');
  if (language === 'en') {
    const [{ birthdayEnglishCopy }, { resultEnglishCopy }, { homeEnglishCopy }, { formEnglishCopy }] = await Promise.all([
      import('@/lib/birthday-english-copy'), import('@/lib/result-english-copy'), import('@/lib/home-english-copy'), import('@/lib/form-english-copy'),
    ]);
    return withMatch3Copy('en', await withHomeCopy('en', fromDictionary({ ...phase1Copy.en, ...birthdayEnglishCopy, ...resultEnglishCopy, ...homeEnglishCopy, ...formEnglishCopy })));
  }
  if (language === 'ja') {
    const { homeJapaneseCopy } = await import('@/lib/home-japanese-copy');
    return withMatch3Copy('ja', await withHomeCopy('ja', fromDictionary({ ...phase1Copy.ja, ...homeJapaneseCopy })));
  }
  const { koreanCopy } = await import('@/lib/korean-copy');
  return withMatch3Copy('ko', await withHomeCopy('ko', fromDictionary({ ...phase1Copy.ko, ...koreanCopy })));
}
