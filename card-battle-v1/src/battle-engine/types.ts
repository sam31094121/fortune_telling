/**
 * 戰鬥狀態與動作型別 —— UI 只渲染 BattleState，不自行計算。
 */

import type { BattleConfig, CardStats } from '../config/battle-config.js';
import type { PlayerElement } from '../element-engine/index.js';
import type { BeastBattleSlot } from '../beast-engine/index.js';
import type { BattleOutcome, RewardResult } from '../reward-engine/index.js';
import type { TransformForm } from '../transformation-engine/index.js';

/** 狀態機相位（嚴格順序） */
export type BattlePhase =
  | 'init'
  | 'player_action'
  | 'produce_energy'
  | 'select_inject'
  | 'resolve_inject'
  | 'check_transform'
  | 'resolve_skills'
  | 'resolve_damage'
  | 'enemy_action'
  | 'resolve_status'
  | 'check_victory'
  | 'next_turn'
  | 'ended';

export interface BattleCardInstance {
  instanceId: string;
  cardId: string;
  nameZh: string;
  side: 'ally' | 'enemy';
  element: PlayerElement;
  /** 當前外觀 */
  appearanceId: string;
  /** 當前數值（變身時整包替換） */
  stats: CardStats;
  /** 當前生命（戰鬥中變動；上限為 stats.hp） */
  currentHp: number;
  /** 當前技能 id 列表 */
  skillIds: string[];
  /** 變身階級 */
  formTier: number;
  /** 累積注入點 */
  injectPoints: number;
  /** 本回合該槽已注入次數 */
  injectsThisTurn: number;
  /** 形態資料（唯讀引用用拷貝） */
  forms: TransformForm[];
  /** 技能倍率查表 */
  skillPower: Record<string, number>;
  alive: boolean;
}

export interface BattleLogEntry {
  turn: number;
  phase: BattlePhase;
  message: string;
}

export interface BattleState {
  phase: BattlePhase;
  turn: number;
  energy: number;
  allies: BattleCardInstance[];
  enemies: BattleCardInstance[];
  /** 四大神獸槽（V1 stub） */
  beastSlot: BeastBattleSlot;
  config: BattleConfig;
  log: BattleLogEntry[];
  outcome: BattleOutcome | null;
  rewards: RewardResult | null;
  /** 本回合待處理的注入請求（select_inject → resolve_inject） */
  pendingInject: { slotIndex: number; spend: number } | null;
  /** 本回合玩家選中的攻擊者槽 / 技能 */
  pendingSkill: {
    attackerIndex: number;
    skillId: string;
    targetIndex: number;
  } | null;
  /** 最近一次傷害結算摘要（UI 可顯示） */
  lastDamage: {
    sourceInstanceId: string;
    targetInstanceId: string;
    amount: number;
    skillId: string;
  } | null;
  /** 最近一次變身摘要 */
  lastTransform: {
    instanceId: string;
    newTier: number;
    appearanceId: string;
    skillIds: string[];
  } | null;
}

export type BattleAction =
  | { type: 'start' }
  | { type: 'choose_inject'; slotIndex: number; spend: number }
  | { type: 'skip_inject' }
  | { type: 'choose_skill'; attackerIndex: number; skillId: string; targetIndex: number }
  | { type: 'auto_continue' };
