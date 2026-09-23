/**
 * 注入引擎：消耗能量注入卡槽 → 回傳累積增量。
 * 本模組不負責變身（變身由 transformation-engine 處理）。
 */

import type { BattleConfig } from '../config/battle-config.js';

export interface InjectRequest {
  /** 能量池當前值 */
  currentEnergy: number;
  /** 本次欲消耗能量 */
  spend: number;
  /** 目標槽位本回合已注入次數 */
  injectsThisTurnOnSlot: number;
  /** 該槽當前累積注入點 */
  currentInjectPoints: number;
}

export interface InjectResult {
  ok: boolean;
  reason?: string;
  /** 實際消耗能量 */
  energySpent: number;
  /** 注入點增量 */
  injectPointsGained: number;
  /** 消耗後剩餘能量 */
  energyRemaining: number;
  /** 更新後累積注入點 */
  injectPointsTotal: number;
  /** 更新後本回合該槽注入次數 */
  injectsThisTurnOnSlot: number;
}

/**
 * 嘗試注入。純函數：不改外部狀態，只回傳結果 deltas。
 */
export function tryInject(req: InjectRequest, config: BattleConfig): InjectResult {
  const { maxEnergySpendPerInject, maxInjectsPerSlotPerTurn, energyToInjectPoints } =
    config.inject;

  if (maxEnergySpendPerInject === null) {
    return fail(req, 'config.inject.maxEnergySpendPerInject 未設定（null）');
  }
  if (maxInjectsPerSlotPerTurn === null) {
    return fail(req, 'config.inject.maxInjectsPerSlotPerTurn 未設定（null）');
  }

  if (req.spend <= 0) {
    return fail(req, 'spend 必須 > 0');
  }
  if (req.spend > maxEnergySpendPerInject) {
    return fail(
      req,
      `超過單次注入上限 maxEnergySpendPerInject=${maxEnergySpendPerInject}`,
    );
  }
  if (req.currentEnergy < req.spend) {
    return fail(req, '能量不足');
  }
  if (req.injectsThisTurnOnSlot >= maxInjectsPerSlotPerTurn) {
    return fail(
      req,
      `超過每回合同槽注入上限 maxInjectsPerSlotPerTurn=${maxInjectsPerSlotPerTurn}`,
    );
  }

  const gained = req.spend * energyToInjectPoints;
  return {
    ok: true,
    energySpent: req.spend,
    injectPointsGained: gained,
    energyRemaining: req.currentEnergy - req.spend,
    injectPointsTotal: req.currentInjectPoints + gained,
    injectsThisTurnOnSlot: req.injectsThisTurnOnSlot + 1,
  };
}

function fail(req: InjectRequest, reason: string): InjectResult {
  return {
    ok: false,
    reason,
    energySpent: 0,
    injectPointsGained: 0,
    energyRemaining: req.currentEnergy,
    injectPointsTotal: req.currentInjectPoints,
    injectsThisTurnOnSlot: req.injectsThisTurnOnSlot,
  };
}
