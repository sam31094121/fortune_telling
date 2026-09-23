/**
 * 戰鬥可調參數集中處。
 * 所有引擎禁止硬編碼數值；一律從此 Config 讀取。
 *
 * 【明確未定 / 測試暫用】標記為 TODO 或 placeholder 的項不得視為產品定案。
 */

/** 卡牌基礎數值（攻擊 / 防禦 / 生命） */
export interface CardStats {
  atk: number;
  def: number;
  hp: number;
}

/** 注入相關參數 */
export interface InjectConfig {
  /**
   * 單次注入可消耗能量上限。
   * null = 未設定，必須由呼叫端覆寫；測試腳本會傳入暫用值。
   * TODO: 產品定案前勿寫死。
   */
  maxEnergySpendPerInject: number | null;
  /**
   * 每回合可對同一槽位注入次數上限。
   * null = 未設定。
   * TODO: 產品定案前勿寫死。
   */
  maxInjectsPerSlotPerTurn: number | null;
  /**
   * 每點能量對注入累積器的增量（測試暫用）。
   * TODO: 平衡表未定。
   */
  energyToInjectPoints: number;
}

/** 變身階級門檻 */
export interface TransformConfig {
  /**
   * 各階級所需的累積注入點數門檻（索引 = 目標階級）。
   * 例：[0, 3, 8] 表示階級 0→1 需 3 點、1→2 需 8 點。
   * 空陣列或僅 [0] = 尚未配置變身。
   * TODO: 總階級數與門檻未定。
   */
  tierThresholds: number[];
}

/** 能量產出 */
export interface EnergyConfig {
  /** 每回合產出能量（測試暫用） */
  energyPerTurn: number;
  /** 開場初始能量（測試暫用） */
  startingEnergy: number;
}

/** 隊伍限制 */
export interface TeamConfig {
  /** 隊伍卡牌上限（產品：exactly up to 5） */
  maxTeamSize: number;
  /** 同 cardId 不可重複 */
  disallowDuplicateCardIds: boolean;
}

/** 回合 / 勝負 */
export interface TurnConfig {
  /** 測試用回合上限，防無限迴圈；產品值未定 */
  maxTurnsPlaceholder: number;
}

export interface BattleConfig {
  inject: InjectConfig;
  transform: TransformConfig;
  energy: EnergyConfig;
  team: TeamConfig;
  turn: TurnConfig;
}

/**
 * 測試用預設 Config。
 * 數值僅供 Phase 1 迴圈跑通，絕非產品定案。
 */
export const PLACEHOLDER_TEST_CONFIG: BattleConfig = {
  inject: {
    // TODO: 產品 inject cap 未定 —— 以下為測試暫用
    maxEnergySpendPerInject: 3,
    maxInjectsPerSlotPerTurn: 2,
    energyToInjectPoints: 1,
  },
  transform: {
    // TODO: 總變身階級與門檻未定 —— 測試暫用：累積 3 點→階級1，累積 8 點→階級2
    tierThresholds: [0, 3, 8],
  },
  energy: {
    energyPerTurn: 2,
    startingEnergy: 2,
  },
  team: {
    maxTeamSize: 5,
    disallowDuplicateCardIds: true,
  },
  turn: {
    maxTurnsPlaceholder: 30,
  },
};

/** 深拷貝並允許覆寫；未傳入則用 PLACEHOLDER_TEST_CONFIG */
export function createBattleConfig(
  overrides?: Partial<{
    inject: Partial<InjectConfig>;
    transform: Partial<TransformConfig>;
    energy: Partial<EnergyConfig>;
    team: Partial<TeamConfig>;
    turn: Partial<TurnConfig>;
  }>,
): BattleConfig {
  const base = PLACEHOLDER_TEST_CONFIG;
  return {
    inject: { ...base.inject, ...overrides?.inject },
    transform: {
      ...base.transform,
      tierThresholds: overrides?.transform?.tierThresholds
        ? [...overrides.transform.tierThresholds]
        : [...base.transform.tierThresholds],
    },
    energy: { ...base.energy, ...overrides?.energy },
    team: { ...base.team, ...overrides?.team },
    turn: { ...base.turn, ...overrides?.turn },
  };
}
