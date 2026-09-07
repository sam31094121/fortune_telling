'use client';

/**
 * 押注卡管理 Hook
 * ============================================================================
 *
 * 職責：管理押注卡選擇、驗證、結算的完整生命週期。
 * 分離出 page.tsx 的押注相關狀態，提升代碼可維護性。
 */

import { useCallback, useMemo, useState } from 'react';
import type { StakeOutcome, Settlement } from '@/lib/beast-collection';
import type { StakeCard } from '@/components/battlefield/StakeSlot';

export function useStakeManagement() {
  const [stakeCardIds, setStakeCardIds] = useState<string[]>([]);
  const [ownedStake, setOwnedStake] = useState<StakeCard[]>([]);
  const [battleStake, setBattleStake] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [outcome, setOutcome] = useState<StakeOutcome | null>(null);
  const [stakeError, setStakeError] = useState('');
  const [settling, setSettling] = useState(false);

  const selectedStakeCard = useMemo(
    () => ownedStake.find(card => card.id === stakeCardIds[0]),
    [stakeCardIds, ownedStake]
  );

  const canSelectStake = useCallback((cardId: string): boolean => {
    // 1. 該卡必須在收藏裡
    if (!ownedStake.some(card => card.id === cardId)) return false;
    // 2. 未達 5 張上限時可加入
    if (stakeCardIds.length < 5) return true;
    // 3. 達到上限時只能替換
    return stakeCardIds.includes(cardId);
  }, [stakeCardIds, ownedStake]);

  const toggleStakeCard = useCallback((cardId: string) => {
    if (!canSelectStake(cardId)) return;
    setStakeCardIds(current =>
      current.includes(cardId)
        ? current.filter(id => id !== cardId)
        : current.length < 5
          ? [...current, cardId]
          : current
    );
  }, [canSelectStake]);

  const resetStake = useCallback(() => {
    setStakeCardIds([]);
    setOutcome(null);
    setSettlement(null);
    setBattleStake(null);
    setStakeError('');
  }, []);

  return {
    // 狀態
    stakeCardIds,
    ownedStake,
    battleStake,
    settlement,
    outcome,
    stakeError,
    settling,
    selectedStakeCard,

    // 設定器
    setStakeCardIds,
    setOwnedStake,
    setBattleStake,
    setSettlement,
    setOutcome,
    setStakeError,
    setSettling,

    // 操作
    toggleStakeCard,
    canSelectStake,
    resetStake,
  };
}
