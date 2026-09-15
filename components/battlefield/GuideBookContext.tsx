'use client';

/**
 * 相剋戰力手冊的共用來源（前端只讀）
 *
 * 手冊由後端 buildGuideBook() 算好（/api/beast-game/guide-book），這裡只負責載入與傳給元件。
 * 元件用 useGuideBook() 照印；還沒載到就不顯示數字，不自己推算（業主定調：前端只負責顯示）。
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { GuideBook } from '@/lib/beast-game/guide-book';

const GuideBookContext = createContext<GuideBook | null>(null);

export function GuideBookProvider({ value, children }: { value: GuideBook | null; children: ReactNode }) {
  return <GuideBookContext.Provider value={value}>{children}</GuideBookContext.Provider>;
}

export function useGuideBook(): GuideBook | null {
  return useContext(GuideBookContext);
}

/** 向後端取一次手冊；失敗就保持 null，畫面顯示「資料載入中」而不是自己算。 */
export function useFetchedGuideBook(): GuideBook | null {
  const [book, setBook] = useState<GuideBook | null>(null);
  useEffect(() => {
    let disposed = false;
    fetch('/api/beast-game/guide-book', { signal: AbortSignal.timeout(20000) })
      .then((res) => res.json())
      .then((data: { ok?: boolean; book?: GuideBook }) => { if (!disposed && data?.ok && data.book) setBook(data.book); })
      .catch(() => { /* 保持 null：寧可不顯示，也不在前端推算 */ });
    return () => { disposed = true; };
  }, []);
  return book;
}
