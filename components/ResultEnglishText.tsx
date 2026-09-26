'use client';
import { useCallback, useMemo } from 'react';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';
import { renderMatchResultEnglish, type MatchResultLike } from '@/lib/result-english';
import { resultUiEn } from '@/lib/result-english/ui';

/**
 * Language switch for the /match result data. English gets an English copy built from the same
 * engine values; every other language (zh-Hant, zh-Hans, ja, ko) gets the ORIGINAL object back,
 * so their rendering (including the Korean dictionary lookups) is exactly as before.
 */
export function useMatchResultView<T extends MatchResultLike>(data: T | null): T | null {
  const { language } = useInterfaceLanguage();
  return useMemo(() => {
    if (!data || language !== 'en') return data;
    try {
      return renderMatchResultEnglish(data);
    } catch {
      // Never blank the result: fall back to the original text if a template cannot be applied.
      return data;
    }
  }, [data, language]);
}

/**
 * Fixed Chinese in the results components. `t(zh)` returns the English copy in English mode and the
 * untouched original string in every other language (so zh / ko render exactly as before).
 * Missing English falls back to the original text, never blank.
 */
export function useResultUi() {
  const { language } = useInterfaceLanguage();
  const en = language === 'en';
  const t = useCallback((zh: string) => (en ? resultUiEn(zh) : zh), [en]);
  return useMemo(() => ({ en, t }), [en, t]);
}
