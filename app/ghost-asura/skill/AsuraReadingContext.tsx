/**
 * 技能頁共用的「同一次後端結果」：生辰表單（AsuraSkillReading）寫入，
 * 卡頭三格（GhostAsuraCard）與三張時間軸摺疊卡（AsuraTimeCards）同讀一份，永不各算各的。
 * 只存後端 /api/ghost-asura/reading 回傳的 AsuraDisplay；不做任何計算或篩選。
 */

'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AsuraDisplay } from '@/lib/ghost-asura-display-contract';

type AsuraReadingState = {
  display: AsuraDisplay | null;
  setDisplay: (display: AsuraDisplay | null) => void;
};

const AsuraReadingContext = createContext<AsuraReadingState | null>(null);

export function AsuraReadingProvider({ children }: { children: ReactNode }) {
  const [display, setDisplay] = useState<AsuraDisplay | null>(null);
  return <AsuraReadingContext.Provider value={{ display, setDisplay }}>{children}</AsuraReadingContext.Provider>;
}

export function useAsuraReading(): AsuraReadingState | null {
  return useContext(AsuraReadingContext);
}
