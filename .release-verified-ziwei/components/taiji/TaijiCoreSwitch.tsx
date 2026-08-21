'use client';

/**
 * Taiji Core Feature Flag（A/B Switch + Rollback）
 *
 * 預設：舊核心（UnifiedTaijiCore 經 TaijiCore）。
 * 開啟 V7：網址加 ?taijiV7=1（會記住），或 localStorage.taijiV7='1'。
 * 關閉 V7（rollback）：?taijiV7=0。
 * 禁止一次刪除舊核心；V7 通過完整手機實測後才逐步替換。
 */

import { useEffect, useState } from 'react';
import TaijiCore from '@/components/taiji/TaijiCore';
import TaijiCoreV7 from '@/components/taiji/v7/TaijiCoreV7';
import { getCompletedGrowthModules } from '@/lib/growth-center-client';

const TOTAL_MODULES = 8;

export default function TaijiCoreSwitch() {
  const [useV7, setUseV7] = useState(false);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const flag = params.get('taijiV7');
      if (flag === '1') {
        window.localStorage.setItem('taijiV7', '1');
        setUseV7(true);
        return;
      }
      if (flag === '0') {
        window.localStorage.removeItem('taijiV7');
        setUseV7(false);
        return;
      }
      setUseV7(window.localStorage.getItem('taijiV7') === '1');
    } catch {
      setUseV7(false);
    }
  }, []);

  useEffect(() => {
    if (!useV7) return;
    try {
      const modules = getCompletedGrowthModules();
      setCompleted(Array.isArray(modules) ? Math.min(modules.length, TOTAL_MODULES) : 0);
    } catch {
      setCompleted(0);
    }
  }, [useV7]);

  if (!useV7) {
    return <TaijiCore />;
  }

  return (
    <TaijiCoreV7
      state={{
        state: 'IDLE',
        progress: { completed, total: TOTAL_MODULES },
      }}
    />
  );
}
