'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TarotReading } from '@/features/tarot/types';
import { loadTarotHistory, prependTarotReading, saveTarotHistory } from '@/features/tarot/services/history';

export function useTarotHistory() {
  const [history, setHistory] = useState<TarotReading[]>([]);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    try {
      setHistory(loadTarotHistory());
    } catch {
      setHistory([]);
      setHistoryError('塔羅歷史紀錄格式損壞，已略過無效資料。');
    }
  }, []);

  const persist = useCallback((nextHistory: TarotReading[]) => {
    setHistory(nextHistory);
    try {
      saveTarotHistory(nextHistory);
      setHistoryError('');
    } catch {
      setHistoryError('目前無法寫入塔羅歷史紀錄，請確認瀏覽器儲存權限。');
    }
  }, []);

  const addReading = useCallback((reading: TarotReading) => {
    setHistory((current) => {
      const next = prependTarotReading(reading, current);
      try {
        saveTarotHistory(next);
        setHistoryError('');
      } catch {
        setHistoryError('目前無法寫入塔羅歷史紀錄，請確認瀏覽器儲存權限。');
      }
      return next;
    });
  }, []);

  const deleteReading = useCallback((id: string) => {
    persist(history.filter((item) => item.id !== id));
  }, [history, persist]);

  const clearHistory = useCallback(() => {
    persist([]);
  }, [persist]);

  return { history, historyError, addReading, deleteReading, clearHistory };
}
