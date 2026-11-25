'use client';
import { useCallback } from 'react';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';
import { homeEnglishCopy } from '@/lib/home-english-copy';
import { homeJapaneseCopy } from '@/lib/home-japanese-copy';
import { resultEnglishCopy } from '@/lib/result-english-copy';
import { formEnglishCopy } from '@/lib/form-english-copy';
import { koreanCopy } from '@/lib/korean-copy';

export function useDisplayText() {
  const { language } = useInterfaceLanguage();
  return useCallback((text: string) => language === 'en' ? formEnglishCopy[text] ?? homeEnglishCopy[text] ?? resultEnglishCopy[text] ?? text : language === 'ja' ? homeJapaneseCopy[text] ?? text : language === 'ko' ? koreanCopy[text] ?? text : text, [language]);
}
