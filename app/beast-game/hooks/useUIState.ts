'use client';

/**
 * UI 狀態管理 Hook
 * ============================================================================
 *
 * 職責：管理檢查卡片面板、捲動位置、提示訊息等 UI 層狀態。
 */

import { useCallback, useRef, useState } from 'react';

export interface CardInspection {
  cardId: string;
  side: 'player' | 'opponent';
}

export function useUIState() {
  const [inspection, setInspection] = useState<CardInspection | null>(null);
  const [movement, setMovement] = useState('');
  const controlScroll = useRef<HTMLDivElement>(null);

  const inspectCard = useCallback(
    (cardId: string, side: 'player' | 'opponent' = 'player') => {
      setInspection({ cardId, side });
      controlScroll.current?.scrollTo({ top: 0 });
    },
    []
  );

  const closeInspection = useCallback(() => {
    setInspection(null);
    controlScroll.current?.scrollTo({ top: 0 });
  }, []);

  const showMovement = useCallback((message: string) => {
    setMovement(message);
  }, []);

  const clearMovement = useCallback(() => {
    setMovement('');
  }, []);

  return {
    // 狀態
    inspection,
    movement,
    controlScroll,

    // 操作
    inspectCard,
    closeInspection,
    showMovement,
    clearMovement,
    setInspection,
    setMovement,
  };
}
