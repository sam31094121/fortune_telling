'use client';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';
import { homeEnglishCopy } from '@/lib/home-english-copy';
import { homeJapaneseCopy } from '@/lib/home-japanese-copy';
import { resultEnglishCopy } from '@/lib/result-english-copy';
import { formEnglishCopy } from '@/lib/form-english-copy';
import { koreanCopy } from '@/lib/korean-copy';
import { useCallback } from 'react';

export function useDisplayText() {
  const { language } = useInterfaceLanguage();
  return useCallback((text: string) => language === 'en' ? formEnglishCopy[text] ?? homeEnglishCopy[text] ?? resultEnglishCopy[text] ?? text : language === 'ja' ? homeJapaneseCopy[text] ?? text : language === 'ko' ? koreanCopy[text] ?? text : text, [language]);
}

export default function HomeTranslatedText({ text }: { text: string }) {
  const { language } = useInterfaceLanguage();
  const translated = language === 'en' ? formEnglishCopy[text] ?? homeEnglishCopy[text] ?? resultEnglishCopy[text] : language === 'ja' ? homeJapaneseCopy[text] : language === 'ko' ? koreanCopy[text] : undefined;
  return <span lang={translated ? language : 'zh-Hant'}>{translated ?? text}</span>;
}
