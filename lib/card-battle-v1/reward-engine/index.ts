/**
 * 結算獎勵引擎 —— V1 stub。
 * 介面就緒；實作為 no-op / 最小回傳。
 */

export type BattleOutcome = 'victory' | 'defeat' | 'draw' | 'turn_cap';

export interface RewardRequest {
  outcome: BattleOutcome;
  turn: number;
  /** 可選：戰鬥過程摘要用 id 列表 */
  allyCardIds: string[];
  enemyCardIds: string[];
}

export interface RewardGrant {
  /** 獎勵類型代碼（產品未定） */
  type: string;
  /** 數量（產品未定；V1 stub 恒 0） */
  amount: number;
  note?: string;
}

export interface RewardResult {
  grants: RewardGrant[];
  /** stub 標記 */
  stub: true;
}

/**
 * 計算獎勵。V1：回傳空 grants + stub 標記。
 * TODO: 掉落表 / 經驗 / 貨幣皆未定。
 */
export function computeRewards(_req: RewardRequest): RewardResult {
  return {
    grants: [],
    stub: true,
  };
}
