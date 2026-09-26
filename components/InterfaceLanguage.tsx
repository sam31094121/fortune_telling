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

export function InterfaceLanguagePicker() {
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
  return <section lang={language} aria-label="Language" title={copy.scope} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} className="relative mx-auto mb-2 grid w-full grid-cols-1 items-center rounded-xl border border-white/15 bg-slate-950/80 print:hidden">
    <button type="button" aria-label="閱讀語言 / Language" aria-expanded={open} aria-controls="interface-language-options" onClick={() => setOpen(value => !value)} className="flex min-h-11 items-center justify-center gap-2 rounded-l-xl px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
      <Image src={`/images/language-flags/${selected.flag}.svg`} alt="" width={24} height={16} className="h-4 w-6 object-contain" />
      <span>{selected.label}</span><span aria-hidden="true">▾</span>
    </button>
    {open && <div id="interface-language-options" className="flex min-w-0 gap-1 overflow-x-auto border-t border-white/15 p-2">
      {choices.map(item => <button key={item.value} type="button" lang={item.value} aria-pressed={language === item.value} onClick={() => { select(item.value); setOpen(false); }} className="flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:flex-1">
        <Image src={`/images/language-flags/${item.flag}.svg`} alt="" width={24} height={16} className="h-4 w-6 object-contain" />
        <span>{item.label}</span><span className="ml-auto" aria-hidden="true">{language === item.value ? '✓' : ''}</span>
      </button>)}
    </div>}
  </section>;
}
