/**
 * 戰鬥主引擎：狀態機驅動。
 * 數值計算全在引擎；UI 只渲染 BattleState。
 *
 * 相位順序：
 * init → player_action → produce_energy → select_inject → resolve_inject
 * → check_transform → resolve_skills → resolve_damage → enemy_action
 * → resolve_status → check_victory → next_turn （循環至 ended）
 */

import {
  createBattleConfig,
  type BattleConfig,
} from '../config/battle-config.js';
import {
  assertPlayerFacingStrings,
  type PlayerElement,
} from '../element-engine/index.js';
import { isCounter } from '../element-engine/index.js';
import { tryInject } from '../injection-engine/index.js';
import { checkAndApplyTransform } from '../transformation-engine/index.js';
import { createEmptyBeastSlot } from '../beast-engine/index.js';
import { computeRewards } from '../reward-engine/index.js';
import {
  getCardDef,
  type TestCardDef,
} from '../data/test-cards.js';
import type {
  BattleAction,
  BattleCardInstance,
  BattleLogEntry,
  BattlePhase,
  BattleState,
} from './types.js';

export type {
  BattleAction,
  BattleCardInstance,
  BattleLogEntry,
  BattlePhase,
  BattleState,
} from './types.js';

const PHASE_ORDER: BattlePhase[] = [
  'init',
  'player_action',
  'produce_energy',
  'select_inject',
  'resolve_inject',
  'check_transform',
  'resolve_skills',
  'resolve_damage',
  'enemy_action',
  'resolve_status',
  'check_victory',
  'next_turn',
];

function log(state: BattleState, message: string): void {
  state.log.push({ turn: state.turn, phase: state.phase, message });
}

function cloneForms(def: TestCardDef) {
  return def.forms.map((f) => ({
    ...f,
    stats: { ...f.stats },
    skillIds: [...f.skillIds],
  }));
}

function instantiate(
  def: TestCardDef,
  side: 'ally' | 'enemy',
  index: number,
): BattleCardInstance {
  const base = def.forms.find((f) => f.tier === 0) ?? def.forms[0];
  if (!base) throw new Error(`卡牌 ${def.cardId} 缺少 forms`);
  assertPlayerFacingStrings(def.nameZh, def.element, base.appearanceId);
  const skillPower: Record<string, number> = {};
  for (const s of def.skillsCatalog) {
    skillPower[s.id] = s.powerMult;
    assertPlayerFacingStrings(s.nameZh);
  }
  return {
    instanceId: `${side}_${index}_${def.cardId}`,
    cardId: def.cardId,
    nameZh: def.nameZh,
    side,
    element: def.element,
    appearanceId: base.appearanceId,
    stats: { ...base.stats },
    currentHp: base.stats.hp,
    skillIds: [...base.skillIds],
    formTier: 0,
    injectPoints: 0,
    injectsThisTurn: 0,
    forms: cloneForms(def),
    skillPower,
    alive: true,
  };
}

function validateTeam(
  cardIds: string[],
  config: BattleConfig,
  label: string,
): TestCardDef[] {
  if (cardIds.length === 0 || cardIds.length > config.team.maxTeamSize) {
    throw new Error(
      `[battle-engine] ${label} 隊伍人數必須為 1..${config.team.maxTeamSize}，收到 ${cardIds.length}`,
    );
  }
  if (config.team.disallowDuplicateCardIds) {
    const set = new Set(cardIds);
    if (set.size !== cardIds.length) {
      throw new Error(`[battle-engine] ${label} 隊伍禁止重複 cardId`);
    }
  }
  return cardIds.map((id) => {
    const def = getCardDef(id);
    if (!def) throw new Error(`[battle-engine] 未知 cardId: ${id}`);
    return def;
  });
}

/** 建立戰鬥；teamAlly / teamEnemy 為 cardId 陣列 */
export function createBattle(
  teamAlly: string[],
  teamEnemy: string[],
  config?: BattleConfig,
): BattleState {
  const cfg = config ?? createBattleConfig();
  const allyDefs = validateTeam(teamAlly, cfg, '友方');
  const enemyDefs = validateTeam(teamEnemy, cfg, '敵方');

  const allies = allyDefs.map((d, i) => instantiate(d, 'ally', i));
  const enemies = enemyDefs.map((d, i) => instantiate(d, 'enemy', i));

  // 斷言所有玩家元素標籤合法
  for (const c of [...allies, ...enemies]) {
    assertPlayerFacingStrings(c.element, c.nameZh, c.appearanceId);
  }

  const state: BattleState = {
    phase: 'init',
    turn: 0,
    energy: cfg.energy.startingEnergy,
    allies,
    enemies,
    beastSlot: createEmptyBeastSlot(),
    config: cfg,
    log: [],
    outcome: null,
    rewards: null,
    pendingInject: null,
    pendingSkill: null,
    lastDamage: null,
    lastTransform: null,
  };
  log(state, '戰鬥建立（init）');
  return state;
}

function aliveAllies(s: BattleState): BattleCardInstance[] {
  return s.allies.filter((c) => c.alive && c.currentHp > 0);
}
function aliveEnemies(s: BattleState): BattleCardInstance[] {
  return s.enemies.filter((c) => c.alive && c.currentHp > 0);
}

function firstAliveIndex(cards: BattleCardInstance[]): number {
  return cards.findIndex((c) => c.alive && c.currentHp > 0);
}

/** 簡易傷害：atk * mult - def/2，元素剋制 ×1.25（測試暫用係數，僅引擎內） */
function calcDamage(
  attacker: BattleCardInstance,
  defender: BattleCardInstance,
  skillId: string,
): number {
  const mult = attacker.skillPower[skillId] ?? 1;
  let raw = attacker.stats.atk * mult - defender.stats.def * 0.5;
  if (isCounter(attacker.element as PlayerElement, defender.element as PlayerElement)) {
    raw *= 1.25;
  }
  return Math.max(1, Math.floor(raw));
}

function applyDamage(
  state: BattleState,
  attacker: BattleCardInstance,
  defender: BattleCardInstance,
  skillId: string,
): number {
  const amount = calcDamage(attacker, defender, skillId);
  defender.currentHp = Math.max(0, defender.currentHp - amount);
  if (defender.currentHp <= 0) {
    defender.alive = false;
    defender.currentHp = 0;
  }
  state.lastDamage = {
    sourceInstanceId: attacker.instanceId,
    targetInstanceId: defender.instanceId,
    amount,
    skillId,
  };
  return amount;
}

/**
 * 推進一步。依當前 phase + action 轉移。
 * 回傳新 state（就地突變後回傳同一參考，便於迴圈；呼叫端可視為新狀態）。
 */
export function step(state: BattleState, action: BattleAction): BattleState {
  if (state.phase === 'ended') {
    return state;
  }

  switch (state.phase) {
    case 'init': {
      if (action.type !== 'start' && action.type !== 'auto_continue') {
        log(state, `init 忽略動作 ${action.type}`);
        return state;
      }
      state.turn = 1;
      state.phase = 'player_action';
      log(state, '→ player_action（回合開始）');
      return state;
    }

    case 'player_action': {
      // 玩家宣告「本回合要行動」→ 進入產能
      if (
        action.type === 'auto_continue' ||
        action.type === 'choose_inject' ||
        action.type === 'skip_inject' ||
        action.type === 'choose_skill'
      ) {
        // 若直接帶 inject/skill，先暫存再走產能
        if (action.type === 'choose_inject') {
          state.pendingInject = {
            slotIndex: action.slotIndex,
            spend: action.spend,
          };
        } else if (action.type === 'skip_inject') {
          state.pendingInject = null;
        }
        if (action.type === 'choose_skill') {
          state.pendingSkill = {
            attackerIndex: action.attackerIndex,
            skillId: action.skillId,
            targetIndex: action.targetIndex,
          };
        }
        state.phase = 'produce_energy';
        log(state, '→ produce_energy');
        return step(state, { type: 'auto_continue' });
      }
      return state;
    }

    case 'produce_energy': {
      const gain = state.config.energy.energyPerTurn;
      state.energy += gain;
      log(state, `產能 +${gain}，能量=${state.energy}`);
      state.phase = 'select_inject';
      log(state, '→ select_inject');
      // 若已有 pendingInject，自動續行；否則等 choose_inject / skip
      if (state.pendingInject !== null || action.type === 'skip_inject') {
        return step(state, { type: 'auto_continue' });
      }
      if (action.type === 'choose_inject') {
        state.pendingInject = {
          slotIndex: action.slotIndex,
          spend: action.spend,
        };
        return step(state, { type: 'auto_continue' });
      }
      // 等待輸入
      return state;
    }

    case 'select_inject': {
      if (action.type === 'choose_inject') {
        state.pendingInject = {
          slotIndex: action.slotIndex,
          spend: action.spend,
        };
      } else if (action.type === 'skip_inject') {
        state.pendingInject = null;
      } else if (action.type === 'auto_continue' && state.pendingInject === null) {
        // 無注入請求視為 skip
      } else if (action.type !== 'auto_continue') {
        return state;
      }
      state.phase = 'resolve_inject';
      log(state, '→ resolve_inject');
      return step(state, { type: 'auto_continue' });
    }

    case 'resolve_inject': {
      const pending = state.pendingInject;
      if (pending) {
        const card = state.allies[pending.slotIndex];
        if (!card || !card.alive) {
          log(state, `注入失敗：無效槽 ${pending.slotIndex}`);
        } else {
          const result = tryInject(
            {
              currentEnergy: state.energy,
              spend: pending.spend,
              injectsThisTurnOnSlot: card.injectsThisTurn,
              currentInjectPoints: card.injectPoints,
            },
            state.config,
          );
          if (result.ok) {
            state.energy = result.energyRemaining;
            card.injectPoints = result.injectPointsTotal;
            card.injectsThisTurn = result.injectsThisTurnOnSlot;
            log(
              state,
              `注入 ${card.nameZh} 消耗${result.energySpent} → 累積${card.injectPoints}`,
            );
          } else {
            log(state, `注入失敗：${result.reason}`);
          }
        }
      } else {
        log(state, '本回合跳過注入');
      }
      state.pendingInject = null;
      state.phase = 'check_transform';
      log(state, '→ check_transform');
      return step(state, { type: 'auto_continue' });
    }

    case 'check_transform': {
      state.lastTransform = null;
      for (const card of state.allies) {
        if (!card.alive) continue;
        const result = checkAndApplyTransform(
          {
            currentTier: card.formTier,
            injectPoints: card.injectPoints,
            forms: card.forms,
          },
          state.config,
        );
        if (result.didTransform) {
          card.formTier = result.newTier;
          card.appearanceId = result.appearanceId;
          // 變身：數值與技能一併更換；生命按比例保留
          const hpRatio =
            card.stats.hp > 0 ? card.currentHp / card.stats.hp : 1;
          card.stats = { ...result.stats };
          card.currentHp = Math.max(
            1,
            Math.min(card.stats.hp, Math.round(card.stats.hp * hpRatio)),
          );
          card.skillIds = [...result.skillIds];
          state.lastTransform = {
            instanceId: card.instanceId,
            newTier: result.newTier,
            appearanceId: result.appearanceId,
            skillIds: [...result.skillIds],
          };
          log(
            state,
            `變身！${card.nameZh} → tier${result.newTier} 外觀=${result.appearanceId} 技能=[${result.skillIds.join(',')}]`,
          );
          assertPlayerFacingStrings(result.appearanceId);
        }
      }
      state.phase = 'resolve_skills';
      log(state, '→ resolve_skills');
      return step(state, { type: 'auto_continue' });
    }

    case 'resolve_skills': {
      // 若無 pendingSkill，自動選第一個存活友軍第一技能打第一個存活敵軍
      if (!state.pendingSkill) {
        const aIdx = firstAliveIndex(state.allies);
        const tIdx = firstAliveIndex(state.enemies);
        const attacker = state.allies[aIdx];
        if (aIdx >= 0 && tIdx >= 0 && attacker) {
          const skillId = attacker.skillIds[0] ?? 'sk_basic';
          state.pendingSkill = {
            attackerIndex: aIdx,
            skillId,
            targetIndex: tIdx,
          };
        }
      }
      if (action.type === 'choose_skill') {
        state.pendingSkill = {
          attackerIndex: action.attackerIndex,
          skillId: action.skillId,
          targetIndex: action.targetIndex,
        };
      }
      const ps = state.pendingSkill;
      if (ps) {
        const atk = state.allies[ps.attackerIndex];
        if (atk && atk.alive) {
          log(state, `${atk.nameZh} 準備技能 ${ps.skillId}`);
        }
      }
      state.phase = 'resolve_damage';
      log(state, '→ resolve_damage');
      return step(state, { type: 'auto_continue' });
    }

    case 'resolve_damage': {
      const ps = state.pendingSkill;
      if (ps) {
        const atk = state.allies[ps.attackerIndex];
        const def = state.enemies[ps.targetIndex];
        if (atk?.alive && def?.alive) {
          const skillId = atk.skillIds.includes(ps.skillId)
            ? ps.skillId
            : (atk.skillIds[0] ?? ps.skillId);
          const dmg = applyDamage(state, atk, def, skillId);
          log(
            state,
            `${atk.nameZh} 使用 ${skillId} → ${def.nameZh} 傷害 ${dmg}（HP ${def.currentHp}）`,
          );
        }
      }
      state.pendingSkill = null;
      state.phase = 'enemy_action';
      log(state, '→ enemy_action');
      return step(state, { type: 'auto_continue' });
    }

    case 'enemy_action': {
      // 每個存活敵軍簡易反擊第一個存活友軍
      const targetIdx = firstAliveIndex(state.allies);
      const target = state.allies[targetIdx];
      if (target) {
        for (const enemy of state.enemies) {
          if (!enemy.alive) continue;
          if (!target.alive) break;
          const skillId = enemy.skillIds[0] ?? 'sk_e_basic';
          const dmg = applyDamage(state, enemy, target, skillId);
          log(
            state,
            `敵方 ${enemy.nameZh} → ${target.nameZh} 傷害 ${dmg}（HP ${target.currentHp}）`,
          );
        }
      } else {
        log(state, '敵方無目標可攻擊');
      }
      state.phase = 'resolve_status';
      log(state, '→ resolve_status');
      return step(state, { type: 'auto_continue' });
    }

    case 'resolve_status': {
      // V1：重整 alive 標記；無額外狀態效果
      for (const c of [...state.allies, ...state.enemies]) {
        if (c.currentHp <= 0) {
          c.alive = false;
          c.currentHp = 0;
        }
      }
      log(state, '狀態重整完成');
      state.phase = 'check_victory';
      log(state, '→ check_victory');
      return step(state, { type: 'auto_continue' });
    }

    case 'check_victory': {
      const alliesLeft = aliveAllies(state).length;
      const enemiesLeft = aliveEnemies(state).length;
      if (enemiesLeft === 0) {
        state.outcome = 'victory';
        state.phase = 'ended';
        state.rewards = computeRewards({
          outcome: 'victory',
          turn: state.turn,
          allyCardIds: state.allies.map((c) => c.cardId),
          enemyCardIds: state.enemies.map((c) => c.cardId),
        });
        log(state, '勝利！');
        return state;
      }
      if (alliesLeft === 0) {
        state.outcome = 'defeat';
        state.phase = 'ended';
        state.rewards = computeRewards({
          outcome: 'defeat',
          turn: state.turn,
          allyCardIds: state.allies.map((c) => c.cardId),
          enemyCardIds: state.enemies.map((c) => c.cardId),
        });
        log(state, '敗北…');
        return state;
      }
      if (state.turn >= state.config.turn.maxTurnsPlaceholder) {
        state.outcome = 'turn_cap';
        state.phase = 'ended';
        state.rewards = computeRewards({
          outcome: 'turn_cap',
          turn: state.turn,
          allyCardIds: state.allies.map((c) => c.cardId),
          enemyCardIds: state.enemies.map((c) => c.cardId),
        });
        log(state, `回合上限 ${state.config.turn.maxTurnsPlaceholder}，結束`);
        return state;
      }
      state.phase = 'next_turn';
      log(state, '→ next_turn');
      return step(state, { type: 'auto_continue' });
    }

    case 'next_turn': {
      state.turn += 1;
      for (const c of state.allies) {
        c.injectsThisTurn = 0;
      }
      state.pendingInject = null;
      state.pendingSkill = null;
      state.phase = 'player_action';
      log(state, `回合 ${state.turn} → player_action`);
      return state;
    }

    default:
      return state;
  }
}

export function getPhaseOrder(): readonly BattlePhase[] {
  return PHASE_ORDER;
}
