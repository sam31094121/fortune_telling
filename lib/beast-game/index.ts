/**
 * 神獸卡遊戲核心（BeastCardGameCore）｜對外唯一入口
 * ============================================================================
 *
 * 規格第二十一條：口令「神獸卡遊戲」＝沿用本架構持續補全，
 * 新內容只能補入 Card / Skill / Effect / Game Mode，
 * **不得重新建立第二套遊戲核心**。
 *
 * 所以要用這套系統，只從這裡取東西。想加卡就加 cards/beasts/，
 * 想加技能就加 cards/skills/，兩者都不必動 lib/beast-game/ 裡的任何一支引擎。
 *
 * 架構（規格第二條）：
 *   Card Registry → Element System → Battle Engine → Effect Engine
 *   → Turn Engine → Deck Engine → Reward/Balance → Customer UI
 *
 * 版本分離（規格第二十條）：GAME_CORE_VERSION 與每張卡的 version 各走各的。
 */

export { GAME_CORE_VERSION, validateCard } from './schema';
export type { BeastCard, BeastStats, BeastCardArt, Rarity, CardValidationIssue } from './schema';

export {
  ELEMENTS,
  ELEMENT_LABEL,
  WUXING_TO_ELEMENT,
  MANSION_CHAR_TO_ELEMENT,
  elementFromMansionName,
  elementMultiplier,
  ELEMENT_COUNTER,
} from './elements';
export type { BeastElement } from './elements';

export { EFFECT_TYPES, resolveEffects, computeDamage, tickDurations, MINIMUM_DAMAGE } from './effects';
export type { EffectSpec, EffectType, BeastInstance, EffectLogEntry } from './effects';

export { buildRegistry, cardRegistry, getCard, playableCards } from './registry';
export { evaluateBalance, rarityIsNotPower, RARITY_BUDGET } from './balance';
export type { BalanceReport } from './balance';

export { instantiate, performAttack, triggerSkills, orderBySpeed } from './battle';
export type { PlayerSide, AttackResult } from './battle';

export {
  TURN_PHASES,
  DECK_SIZE,
  OPENING_HAND,
  DRAW_PER_TURN,
  MAX_FIELD,
  MAX_TURNS,
  createGame,
  createRng,
  shuffle,
  buildDeck,
  playTurn,
  playToEnd,
  assertPhaseTransition,
} from './turn';
export type { GameState, PlayerState, TurnPhase } from './turn';

export { SKILLS, getSkill, allSkillIds } from '../../cards/skills';
export type { SkillDefinition, SkillTrigger } from '../../cards/skills';
