'use client';

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { interfaceCopy, isInterfaceLanguage, type InterfaceLanguage } from '@/lib/interface-languages';
import Image from 'next/image';
import styles from './InterfaceLanguage.module.css';

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
 * 每個語言選項都用「該語言自己的寫法」：名稱、地區、讀屏用的說明都寫在自己的語言裡。
 *  繁體中文＝台灣國旗、简体中文＝中國國旗（簡體字）、English＝美國國旗、日本語＝日本國旗、한국어＝韓國（大韓民國）國旗。
 */
const choices = [
  { value: 'zh-Hant', flag: 'tw', label: '繁體中文', region: '台灣', action: '切換為繁體中文（台灣）' },
  { value: 'zh-Hans', flag: 'cn', label: '简体中文', region: '中国', action: '切换为简体中文（中国）' },
  { value: 'en', flag: 'us', label: 'English', region: 'United States', action: 'Switch to English (United States)' },
  { value: 'ja', flag: 'jp', label: '日本語', region: '日本', action: '日本語（日本）に切り替えます' },
  { value: 'ko', flag: 'kr', label: '한국어', region: '대한민국', action: '한국어(대한민국)로 전환합니다' },
] as const satisfies ReadonlyArray<{ value: InterfaceLanguage; flag: string; label: string; region: string; action: string }>;

/**
 * 閱讀語言選擇。variant='card'：放進首頁工具卡片裡（沒有自己的外框與邊距，按鈕與卡片裡的其他按鈕同一種金邊樣式）。
 * 無障礙：按鈕 aria-haspopup="listbox"；選單 role="listbox"、每項 role="option"＋aria-selected；
 * ↑↓／Home／End 移動，Enter／空白鍵選取，Esc 關閉並把焦點還給按鈕，點選單外面也會關閉；每項至少 48px 高。
 */
export function InterfaceLanguagePicker({ variant = 'standalone' }: { variant?: 'standalone' | 'card' } = {}) {
  const { language, select, copy } = useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const uid = useId();
  const listId = 'interface-language-options';
  const noticeId = `${uid}-language-scope`;
  const selectedIndex = Math.max(0, choices.findIndex(item => item.value === language));
  const selected = choices[selectedIndex];
  const card = variant === 'card';

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // 點選單外面（手機手指點、滑鼠點都算）就收起來。
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // 打開時把焦點放到目前選中的語言上。
  useEffect(() => {
    if (open) optionRefs.current[active]?.focus();
  }, [open, active]);

  const openList = () => { setActive(selectedIndex); setOpen(true); };
  const choose = (value: InterfaceLanguage) => { select(value); close(true); };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openList(); }
  };
  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = choices.length - 1;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => (i >= last ? 0 : i + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i <= 0 ? last : i - 1)); }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    else if (event.key === 'End') { event.preventDefault(); setActive(last); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(choices[active].value); }
    else if (event.key === 'Tab') setOpen(false);
  };

  return <section
    ref={rootRef}
    lang={language}
    aria-label={`${copy.language} / Language`}
    title={copy.scope}
    data-language-picker={variant}
    onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); close(true); } }}
    className={card ? `${styles.card} relative grid w-full grid-cols-1 items-center print:hidden` : 'relative mx-auto mb-2 grid w-full grid-cols-1 items-center rounded-xl border border-white/15 bg-slate-950/80 print:hidden'}
  >
    <button
      ref={triggerRef}
      type="button"
      aria-label={`${copy.language}: ${selected.label} (${selected.region})`}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      aria-describedby={noticeId}
      onClick={() => (open ? close(false) : openList())}
      onKeyDown={onTriggerKeyDown}
      className={card ? styles.trigger : 'flex min-h-12 items-center justify-center gap-2 rounded-l-xl px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'}
    >
      <span className={card ? styles.triggerMain : 'flex min-w-0 items-center gap-2'}>
        <Image src={`/images/language-flags/${selected.flag}.svg`} alt="" width={24} height={16} className={card ? styles.flag : 'h-4 w-6 object-contain'} />
        <span className={card ? styles.triggerLabel : ''}>{selected.label}</span>
        {card && <span className={styles.triggerRegion}>{selected.region}</span>}
      </span>
      <span aria-hidden="true" className={card ? `${styles.chevron} ${open ? styles.chevronOpen : ''}` : ''}>▾</span>
    </button>
    {open && <ul
      id={listId}
      role="listbox"
      aria-label={`${copy.language} / Language`}
      onKeyDown={onListKeyDown}
      className={card ? styles.list : 'flex min-w-0 flex-col gap-1 border-t border-white/15 p-2'}
    >
      {choices.map((item, index) => {
        const isSelected = language === item.value;
        return <li
          key={item.value}
          ref={node => { optionRefs.current[index] = node; }}
          id={`${uid}-opt-${item.value}`}
          role="option"
          lang={item.value}
          aria-selected={isSelected}
          aria-label={item.action}
          title={item.action}
          tabIndex={index === active ? 0 : -1}
          data-language-option={item.value}
          onClick={() => choose(item.value)}
          onMouseEnter={() => setActive(index)}
          className={card ? `${styles.option} ${isSelected ? styles.optionSelected : ''}` : 'flex min-h-12 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'}
        >
          <Image src={`/images/language-flags/${item.flag}.svg`} alt="" width={24} height={16} className={card ? styles.flag : 'h-4 w-6 object-contain'} />
          <span className={card ? styles.optionText : 'flex flex-col'}>
            <span className={card ? styles.optionLabel : ''}>{item.label}</span>
            <span className={card ? styles.optionRegion : 'text-xs opacity-70'}>{item.region}</span>
          </span>
          <span className={card ? styles.check : 'ml-auto'} aria-hidden="true">{isSelected ? '✓' : ''}</span>
        </li>;
      })}
    </ul>}
    <p id={noticeId} className={open ? (card ? styles.notice : 'px-3 pb-2 text-xs text-white/70') : 'sr-only'}>{copy.scope}</p>
  </section>;
}
