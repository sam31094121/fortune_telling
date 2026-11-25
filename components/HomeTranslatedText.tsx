'use client';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';
import { homeEnglishCopy } from '@/lib/home-english-copy';
import { homeJapaneseCopy } from '@/lib/home-japanese-copy';
import { resultEnglishCopy } from '@/lib/result-english-copy';
import { formEnglishCopy } from '@/lib/form-english-copy';
import { homeKoreanCopy } from '@/lib/korean-copy/home';
import { formKoreanCopy } from '@/lib/korean-copy/form';
import { koHomeLeftoversCopy } from '@/lib/korean-copy/pages/home-leftovers';

const koreanHomeCopy: Record<string, string> = {
  ...homeKoreanCopy,
  ...formKoreanCopy,
  ...koHomeLeftoversCopy,
};

export default function HomeTranslatedText({ text }: { text: string }) {
  const { language } = useInterfaceLanguage();
  const translated = language === 'en' ? formEnglishCopy[text] ?? homeEnglishCopy[text] ?? resultEnglishCopy[text] : language === 'ja' ? homeJapaneseCopy[text] : language === 'ko' ? koreanHomeCopy[text] : undefined;
  return <span lang={translated ? language : language === 'zh-Hans' ? 'zh-Hans' : 'zh-Hant'}>{translated ?? text}</span>;
}
