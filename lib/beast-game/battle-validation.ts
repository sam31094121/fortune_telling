/**
 * 戰鬥開戰前置條件驗證
 * ============================================================================
 *
 * 職責：集中管理所有開戰前的檢查邏輯，避免在 UI 組件中分散。
 * 格式：{ ready: boolean; reason?: string }
 */

export interface StartCheckResult {
  ready: boolean;
  reason?: string;
}

export interface StartCheckContext {
  state: any | null;
  stakeCardIds: string[];
  ownedStake: Array<{ id: string }>;
  recovering: boolean;
  settling: boolean;
  settlement: { saved?: boolean } | null;
  stakeError: string;
  isTrial: boolean;
}

const CONDITION_MESSAGES = {
  SELECTING_ACTIVE: '先選擇主戰卡',
  PLACEMENT_PREPARING: '對手佈陣中…',
  TOO_MANY_CARDS: '上場卡太多',
  SELECT_STAKE: '選擇押注卡',
  SAVE_PREVIOUS: '保存上場結果',
  CHECKING_STAKE: '核對押注紀錄…',
} as const;

/**
 * 驗證是否可開戰
 *
 * 檢查順序（優先級從高到低）：
 * 1. 恢復中 / 結算中 → 等待
 * 2. 上一場未保存 → 先保存
 * 3. 押注有誤 → 修正
 * 4. 佈陣不完整 → 完成佈陣
 * 5. 押注未選 → 選押注卡
 * 6. 一切就緒 → 可開戰
 */
export function canStartBattle(context: StartCheckContext): StartCheckResult {
  const {
    state,
    stakeCardIds,
    ownedStake,
    recovering,
    settling,
    settlement,
    stakeError,
    isTrial,
  } = context;

  // 層級 1: 系統狀態
  if (recovering) {
    return {
      ready: false,
      reason: CONDITION_MESSAGES.CHECKING_STAKE,
    };
  }

  if (settling) {
    return {
      ready: false,
      reason: '正在核對押注紀錄…',
    };
  }

  // 層級 2: 上一場結算
  if (settlement?.saved === false) {
    return {
      ready: false,
      reason: CONDITION_MESSAGES.SAVE_PREVIOUS,
    };
  }

  // 層級 3: 押注錯誤
  if (stakeError) {
    return {
      ready: false,
      reason: '先處理押注提示',
    };
  }

  // 層級 4: 佈陣完整性
  if (!state) {
    return {
      ready: false,
      reason: '載入中…',
    };
  }

  const baseCheck = {
    hasBattleCard: !!state.player.active,
    hasBenchCards: state.player.bench.some(Boolean),
    battleReady: !!state.player.active && state.player.bench.some(Boolean),
  };

  if (!baseCheck.hasBattleCard) {
    return {
      ready: false,
      reason: CONDITION_MESSAGES.SELECTING_ACTIVE,
    };
  }

  if (!baseCheck.hasBenchCards) {
    return {
      ready: false,
      reason: '至少放 1 張後備',
    };
  }

  // 層級 5: 押注選擇
  const needsStake = !isTrial && ownedStake.length > 0;
  if (needsStake && stakeCardIds.length === 0) {
    return {
      ready: false,
      reason: CONDITION_MESSAGES.SELECT_STAKE,
    };
  }

  // 層級 6: 押注卡驗證
  if (needsStake && stakeCardIds.length > 0) {
    const selectedCard = stakeCardIds[0];
    if (!ownedStake.some(card => card.id === selectedCard)) {
      return {
        ready: false,
        reason: '押注卡不在收藏',
      };
    }
  }

  // 一切就緒
  return {
    ready: true,
  };
}

/**
 * 取得使用者友善的開戰提示文字
 * 用於按鈕上，直接告訴玩家該做什麼
 */
export function getBattleHint(result: StartCheckResult): string {
  if (result.ready) return '開戰';
  const reason = result.reason || '準備中…';

  // 提示對應的 emoji
  const hintMap: Record<string, string> = {
    主戰: '📋 選擇主戰卡',
    後備: '📋 放入後備卡',
    押注: '💎 選擇押注卡',
    保存: '💾 保存上場結果',
    核對: '🔄 核對中…',
  };

  for (const [key, hint] of Object.entries(hintMap)) {
    if (reason.includes(key)) return hint;
  }

  return `⏳ ${reason}`;
}
