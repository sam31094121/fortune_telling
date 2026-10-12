'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { interfaceCopy, isInterfaceLanguage, type InterfaceLanguage } from '@/lib/interface-languages';
import Image from 'next/image';

const storageKey = 'interface-reading-language-v1';
const Context = createContext<{ language: InterfaceLanguage; select: (value: InterfaceLanguage) => void }>({ language: 'zh-Hant', select: () => {} });

export function InterfaceLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<InterfaceLanguage>('zh-Hant');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (isInterfaceLanguage(saved)) setLanguage(saved);
    } catch { /* Private browsing still permits an in-memory choice. */ }
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey && isInterfaceLanguage(event.newValue)) setLanguage(event.newValue);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const select = (value: InterfaceLanguage) => {
    setLanguage(value);
    try { localStorage.setItem(storageKey, value); } catch { /* Keep the current session usable. */ }
  };
  return <Context.Provider value={{ language, select }}>{children}</Context.Provider>;
}

export function useInterfaceLanguage() {
  const { language, select } = useContext(Context);
  return { language, select, copy: interfaceCopy[language] };
}

/**
 * 閱讀語言選擇。variant='card'：放進首頁工具卡片裡（沒有自己的外框與邊距，按鈕與卡片裡的其他按鈕同一種金邊樣式）。
 */
export function InterfaceLanguagePicker({ variant = 'standalone' }: { variant?: 'standalone' | 'card' } = {}) {
  const { language, select, copy } = useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  const choices = [
    { value: 'zh-Hant', flag: 'tw', label: '繁體中文' },
    { value: 'zh-Hans', flag: 'cn', label: '简体中文' },
    { value: 'en', flag: 'us', label: 'English' },
    { value: 'ja', flag: 'jp', label: '日本語' },
    { value: 'ko', flag: 'kr', label: '한국어' },
  ] as const;
  const selected = choices.find(item => item.value === language)!;
  const card = variant === 'card';
  return <section lang={language} aria-label="Language" title={copy.scope} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} className={card ? 'relative grid w-full grid-cols-1 items-center print:hidden' : 'relative mx-auto mb-2 grid w-full grid-cols-1 items-center rounded-xl border border-white/15 bg-slate-950/80 print:hidden'}>
    <button type="button" aria-label="閱讀語言 / Language" aria-expanded={open} aria-controls="interface-language-options" onClick={() => setOpen(value => !value)} className={card ? 'flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-[#f8c758]/50 bg-[#24231f] px-3 text-base font-bold text-[#f4efe4] hover:border-[#fcea86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white' : 'flex min-h-11 items-center justify-center gap-2 rounded-l-xl px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'}>
      {card ? (
        <>
          <span className="flex items-center gap-2">
            <Image src={`/images/language-flags/${selected.flag}.svg`} alt="" width={24} height={16} className="h-4 w-6 object-contain" />
            <span>{selected.label}</span>
          </span>
          <span aria-hidden="true">▾</span>
        </>
      ) : (
        <>
          <Image src={`/images/language-flags/${selected.flag}.svg`} alt="" width={24} height={16} className="h-4 w-6 object-contain" />
          <span>{selected.label}</span><span aria-hidden="true">▾</span>
        </>
      )}
    </button>
    {open && <div id="interface-language-options" className={card ? 'flex min-w-0 gap-2 overflow-x-auto pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'flex min-w-0 gap-1 overflow-x-auto border-t border-white/15 p-2'}>
      {choices.map(item => <button key={item.value} type="button" lang={item.value} aria-pressed={language === item.value} onClick={() => { select(item.value); setOpen(false); }} className={card ? `flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-sm font-bold text-[#f4efe4] hover:border-[#fcea86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:flex-1 ${language === item.value ? 'border-[#fcea86] bg-[#3a3320]' : 'border-[#f8c758]/40 bg-[#24231f]'}` : 'flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:flex-1'}>
        <Image src={`/images/language-flags/${item.flag}.svg`} alt="" width={24} height={16} className="h-4 w-6 object-contain" />
        <span>{item.label}</span><span className="ml-auto" aria-hidden="true">{language === item.value ? '✓' : ''}</span>
      </button>)}
    </div>}
  </section>;
}
