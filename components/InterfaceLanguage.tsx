'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { interfaceCopy, interfaceLanguageTags, isInterfaceLanguage, type InterfaceLanguage } from '@/lib/interface-languages';
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
  // 2026-10-17 language card：整頁 <html lang> 跟著選擇走（伺服器輸出仍是 zh-Hant；載入時讀到存好的語言也會更新）。
  // 沒翻到的字由 HomeTranslatedText 自己標 lang="zh-Hant"，讀屏仍用中文唸。
  useEffect(() => {
    document.documentElement.lang = interfaceLanguageTags[language];
  }, [language]);
  // 2026-10-17 stability：select 與 context 值固定下來，provider 上層重繪時不會讓所有用到語言的元件跟著重繪；
  // 已經是同一個語言就不再寫 localStorage（連點同一個選項不重複寫入）。
  const select = useCallback((value: InterfaceLanguage) => {
    setLanguage(value);
    try { if (localStorage.getItem(storageKey) !== value) localStorage.setItem(storageKey, value); } catch { /* Keep the current session usable. */ }
  }, []);
  const value = useMemo(() => ({ language, select }), [language, select]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
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
  { value: 'en', flag: 'us', label: 'English', region: 'USA', action: 'Switch to English (United States)' },
  { value: 'ja', flag: 'jp', label: '日本語', region: '日本', action: '日本語（日本）に切り替えます' },
  { value: 'ko', flag: 'kr', label: '한국어', region: '대한민국', action: '한국어(대한민국)로 전환합니다' },
] as const satisfies ReadonlyArray<{ value: InterfaceLanguage; flag: string; label: string; region: string; action: string }>;

/**
 * 閱讀語言選擇。variant='card'：放進首頁工具卡片裡（沒有自己的外框與邊距，按鈕與卡片裡的其他按鈕同一種金邊樣式）。
 * 2026-10-17 language card：
 *  - 選項是 role="radiogroup"／role="radio"＋aria-checked，手機 2 欄（第 5 個占滿一排）、640px 以上 5 欄，不再左右滑。
 *  - ←→↑↓ 循環移動、Home／End 到頭尾，Enter／空白鍵選取；選完或按 Esc，焦點回到按鈕；點外面或 Tab 離開就收起。
 *  - 面板一直在 DOM 裡（收起時 hidden），aria-controls 永遠指得到。
 *  - 翻譯範圍說明與免責提醒直接顯示在卡片下方（不再只藏在滑鼠提示 title 裡），跟著目前語言。
 */
export function InterfaceLanguagePicker({ variant = 'standalone' }: { variant?: 'standalone' | 'card' } = {}) {
  const { language, select, copy } = useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const uid = useId();
  const listId = `${uid}-language-options`;
  const noticeId = `${uid}-language-scope`;
  const disclaimerId = `${uid}-language-disclaimer`;
  const selectedIndex = Math.max(0, choices.findIndex(item => item.value === language));
  const selected = choices[selectedIndex];
  const card = variant === 'card';
  const tag = interfaceLanguageTags[language];
  const groupLabel = language === 'en' ? copy.language : `${copy.language} / Language`;

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

  // 打開時、或用方向鍵移動時，把焦點放到對應的語言上。
  useEffect(() => {
    if (open) optionRefs.current[active]?.focus();
  }, [open, active]);

  const openList = () => { setActive(selectedIndex); setOpen(true); };
  const choose = (value: InterfaceLanguage) => { select(value); close(true); };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openList(); }
  };
  const onGroupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = choices.length - 1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); setActive(i => (i >= last ? 0 : i + 1)); }
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); setActive(i => (i <= 0 ? last : i - 1)); }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    else if (event.key === 'End') { event.preventDefault(); setActive(last); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(choices[active].value); }
  };

  return <section
    ref={rootRef}
    lang={tag}
    aria-label={groupLabel}
    data-language-picker={variant}
    onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); close(true); } }}
    onBlur={event => { if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}
    className={card ? `${styles.card} relative grid w-full grid-cols-1 items-center print:hidden` : 'relative mx-auto mb-2 grid w-full grid-cols-1 items-center rounded-xl border border-white/15 bg-slate-950/80 print:hidden'}
  >
    <button
      ref={triggerRef}
      type="button"
      aria-label={`${groupLabel}: ${selected.label} (${selected.region})`}
      aria-expanded={open}
      aria-controls={listId}
      aria-describedby={`${noticeId} ${disclaimerId}`}
      onClick={() => (open ? close(false) : openList())}
      onKeyDown={onTriggerKeyDown}
      className={card ? styles.trigger : 'flex min-h-12 items-center justify-center gap-2 rounded-l-xl px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'}
    >
      <span className={card ? styles.triggerMain : 'flex min-w-0 items-center gap-2'} lang={interfaceLanguageTags[selected.value]}>
        <Image src={`/images/language-flags/${selected.flag}.svg`} alt="" width={24} height={16} className={card ? styles.flag : 'h-4 w-6 object-contain'} />
        <span className={card ? styles.triggerLabel : ''}>{selected.label}</span>
        {card && <span className={styles.triggerRegion}>{selected.region}</span>}
      </span>
      <span aria-hidden="true" className={card ? `${styles.chevron} ${open ? styles.chevronOpen : ''}` : ''}>▾</span>
    </button>
    <div
      id={listId}
      role="radiogroup"
      aria-label={groupLabel}
      hidden={!open}
      onKeyDown={onGroupKeyDown}
      className={card ? styles.list : `${open ? 'grid' : 'hidden'} min-w-0 grid-cols-2 gap-1 border-t border-white/15 p-2 sm:grid-cols-5`}
    >
      {choices.map((item, index) => {
        const isSelected = language === item.value;
        return <button
          key={item.value}
          type="button"
          ref={node => { optionRefs.current[index] = node; }}
          role="radio"
          lang={interfaceLanguageTags[item.value]}
          aria-checked={isSelected}
          aria-label={item.action}
          tabIndex={index === active ? 0 : -1}
          data-language-option={item.value}
          onClick={() => choose(item.value)}
          onFocus={() => setActive(index)}
          className={card ? `${styles.option} ${isSelected ? styles.optionSelected : ''}` : 'flex min-h-12 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'}
        >
          <Image src={`/images/language-flags/${item.flag}.svg`} alt="" width={24} height={16} className={card ? styles.flag : 'h-4 w-6 object-contain'} />
          <span className={card ? styles.optionText : 'flex flex-col'}>
            <span className={card ? styles.optionLabel : ''}>{item.label}</span>
            <span className={card ? styles.optionRegion : 'text-xs opacity-70'}>{item.region}</span>
          </span>
          <span className={card ? styles.check : 'ml-auto'} aria-hidden="true">{isSelected ? '✓' : ''}</span>
        </button>;
      })}
    </div>
    <p id={noticeId} className={card ? styles.notice : 'px-3 pt-2 text-xs text-white/75'}>{copy.scope}</p>
    <p id={disclaimerId} className={card ? styles.disclaimer : 'px-3 pb-2 text-xs text-white/65'}>{copy.disclaimer}</p>
  </section>;
}
