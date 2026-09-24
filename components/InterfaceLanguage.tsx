'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { interfaceCopy, isInterfaceLanguage, type InterfaceLanguage } from '@/lib/interface-languages';

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
  return <section lang={language} className="mb-4 rounded-2xl border border-white/15 bg-slate-950/80 p-3 print:hidden">
    <label className="flex flex-wrap items-center gap-3 text-sm text-slate-100">
      <span>{copy.language} / Language</span>
      <select aria-label="閱讀語言 / Language" value={language} onChange={event => {
        if (isInterfaceLanguage(event.target.value)) select(event.target.value);
      }} className="min-h-11 max-w-full rounded-lg border border-white/25 bg-slate-900 px-3 py-2 text-base text-white">
        <option value="zh-Hant">🇹🇼 繁體中文</option><option value="zh-Hans">🇨🇳 简体中文</option>
        <option value="en">🇺🇸 English</option><option value="ja">🇯🇵 日本語</option>
        <option value="ko">🇰🇷 한국어</option>
      </select>
    </label>
    <p className="mt-2 text-xs leading-6 text-slate-300">{copy.scope}</p>
  </section>;
}
