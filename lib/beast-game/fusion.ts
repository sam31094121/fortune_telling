/**
 * 封印寶珠 × 暴怒合體 V2｜規則層
 * ============================================================================
 *
 * 只回答「能不能合、合到第幾階、開了哪幾招」。不播動畫、不擲亂數、
 * 不改既有對戰數值——接進 interactive.ts 的回合結算是下一階段的事。
 *
 * 相生沿用 elements.ts 的 ELEMENT_GENERATES，不另立第二張相生表：
 * 客戶在卡片上學到的相生，必須就是合體判定用的那一張。
 */

import { elementGenerates } from './elements';
import type { BeastCard } from './schema';
import type { BeastElement } from './elements';

export const MAX_ORBS = 5;
export const MAX_RAGE = 100;
export const DUAL_UNSEAL_RAGE = 50;
export const TRUE_FUSION_RAGE = 70;
export const RIVAL_RAGE_REQUIREMENT = 80;
/** 首領反制一律先蓄力，玩家要來得及看到、防得住。 */
export const BOSS_COUNTER_TELEGRAPH_MS = 1200;

export type FusionBondType = 'PARTNER' | 'RIVAL' | 'BLOODLINE' | 'DESTINED' | 'SECRET';
export interface FusionBond {
  targetId: string;
  type: FusionBondType;
}
export type FusionCard = Pick<BeastCard, 'id' | 'name' | 'element'> & {
  subElement?: BeastCard['element'] | null;
  /** 規格別名：與 fusionBonds 並存；寫 id 清單時視為 PARTNER 羈絆。 */
  fusionPartners?: readonly string[];
  fusionBonds?: readonly FusionBond[];
};

export type FusionState =
  | 'IDLE'
  | 'SYNERGY_CHECK'
  | 'ORB_RESONANCE'
  | 'UNSEALING'
  | 'FUSION_READY'
  | 'FUSING'
  | 'FUSION_ACTIVE'
  | 'ULTIMATE_READY'
  | 'ULTIMATE_CASTING'
  | 'COOLDOWN';

export type FusionTier = 'NONE' | 'RESONANCE' | 'DUAL_UNSEAL' | 'TRUE_FUSION' | 'RAGE_ULTIMATE';

export type UltimateSkill = 'SEAL_BREAKER' | 'RAGE_QUAKE' | 'HEAVEN_EARTH_DESTRUCTION' | 'RAGE_WORLD_END';

export type RageStage = 'CALM' | 'AWAKENING' | 'RAGING' | 'MAX_RAGE';

export type FusionDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export const FUSION_TIER_LABEL: Record<FusionTier, string> = {
  NONE: '未共鳴',
  RESONANCE: '共鳴',
  DUAL_UNSEAL: '雙珠解封',
  TRUE_FUSION: '真・合體',
  RAGE_ULTIMATE: '五珠究極暴怒合體',
};

export const ULTIMATE_LABEL: Record<UltimateSkill, string> = {
  SEAL_BREAKER: '破封斬',
  RAGE_QUAKE: '暴怒天震',
  HEAVEN_EARTH_DESTRUCTION: '迴天滅地',
  RAGE_WORLD_END: '暴怒・天地終焉',
};

const TIER_RANK: Record<FusionTier, number> = {
  NONE: 0,
  RESONANCE: 1,
  DUAL_UNSEAL: 2,
  TRUE_FUSION: 3,
  RAGE_ULTIMATE: 4,
};

function clampCount(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

export function isElementCompatible(a: FusionCard, b: FusionCard): boolean {
  const aPrimaries = [a.element, a.subElement].filter(Boolean) as BeastElement[];
  const bPrimaries = [b.element, b.subElement].filter(Boolean) as BeastElement[];
  for (const ae of aPrimaries) {
    for (const be of bPrimaries) {
      if (elementGenerates(ae, be) || elementGenerates(be, ae)) return true;
    }
  }
  return false;
}

/** SECRET 只是劇情關係，不開放合體；RIVAL 要暴怒到 80 才肯聯手。 */
export function hasSpecialFusionBond(a: FusionCard, b: FusionCard): boolean {
  return Boolean(
    (a.fusionPartners ?? []).includes(b.id)
    || (b.fusionPartners ?? []).includes(a.id)
    || (a.fusionBonds ?? []).some((bond) => bond.targetId === b.id && ['PARTNER', 'BLOODLINE', 'DESTINED'].includes(bond.type))
    || (b.fusionBonds ?? []).some((bond) => bond.targetId === a.id && ['PARTNER', 'BLOODLINE', 'DESTINED'].includes(bond.type)),
  );
}

export function fusionBondBetween(a: FusionCard, b: FusionCard, rage: number): FusionBondType | null {
  const partnerListed =
    (a.fusionPartners ?? []).includes(b.id) || (b.fusionPartners ?? []).includes(a.id);
  const bonds = [
    ...(a.fusionBonds ?? []).filter((bond) => bond.targetId === b.id),
    ...(b.fusionBonds ?? []).filter((bond) => bond.targetId === a.id),
    ...(partnerListed ? [{ targetId: b.id, type: 'PARTNER' as const }] : []),
  ];
  for (const type of ['PARTNER', 'BLOODLINE', 'DESTINED'] as const) {
    if (bonds.some((bond) => bond.type === type)) return type;
  }
  if (bonds.some((bond) => bond.type === 'RIVAL') && clampCount(rage, MAX_RAGE) >= RIVAL_RAGE_REQUIREMENT) {
    return 'RIVAL';
  }
  return null;
}

export type FusionCompatibility =
  | { compatible: true; via: 'ELEMENT' | FusionBondType }
  | { compatible: false; via: null };

export function checkFusionCompatibility(a: FusionCard, b: FusionCard, rage: number): FusionCompatibility {
  if (a.id === b.id) return { compatible: false, via: null };
  if (isElementCompatible(a, b)) return { compatible: true, via: 'ELEMENT' };
  const bond = fusionBondBetween(a, b, rage);
  return bond ? { compatible: true, via: bond } : { compatible: false, via: null };
}

export function rageStage(rage: number): RageStage {
  const value = clampCount(rage, MAX_RAGE);
  if (value >= MAX_RAGE) return 'MAX_RAGE';
  if (value >= TRUE_FUSION_RAGE) return 'RAGING';
  if (value >= 40) return 'AWAKENING';
  return 'CALM';
}

/** 只看珠數與暴怒；相容與否由 evaluateFusion 把關。 */
export function resolveFusionTier(orbCount: number, rage: number): FusionTier {
  const orbs = clampCount(orbCount, MAX_ORBS);
  const value = clampCount(rage, MAX_RAGE);
  if (orbs >= 5 && value >= MAX_RAGE) return 'RAGE_ULTIMATE';
  if (orbs >= 3 && value >= TRUE_FUSION_RAGE) return 'TRUE_FUSION';
  if (orbs >= 2 && value >= DUAL_UNSEAL_RAGE) return 'DUAL_UNSEAL';
  if (orbs >= 1) return 'RESONANCE';
  return 'NONE';
}

export function unlockedUltimates(tier: FusionTier): UltimateSkill[] {
  const skills: UltimateSkill[] = [];
  if (TIER_RANK[tier] >= TIER_RANK.TRUE_FUSION) skills.push('SEAL_BREAKER', 'RAGE_QUAKE', 'HEAVEN_EARTH_DESTRUCTION');
  if (tier === 'RAGE_ULTIMATE') skills.push('RAGE_WORLD_END');
  return skills;
}

export interface FusionEligibilityContext {
  cardA: FusionCard;
  cardB: FusionCard;
  rage: number;
  availableOrbs: number;
  bothAlive: boolean;
  controlled: boolean;
  bossSealActive: boolean;
  fusionCooldown: number;
}

export type FusionBlocker = 'NOT_COMPATIBLE' | 'NOT_ALIVE' | 'CONTROLLED' | 'BOSS_SEAL' | 'COOLDOWN' | 'ORBS' | 'RAGE';

export const FUSION_BLOCKER_LABEL: Record<FusionBlocker, string> = {
  NOT_COMPATIBLE: '無法合體：缺少相生或羈絆',
  NOT_ALIVE: '兩張卡都要存活',
  CONTROLLED: '受控中',
  BOSS_SEAL: '被首領封印',
  COOLDOWN: '合體冷卻中',
  ORBS: '寶珠不足兩顆',
  RAGE: `暴怒未達 ${DUAL_UNSEAL_RAGE}`,
};

export interface FusionEvaluation {
  compatibility: FusionCompatibility;
  blockers: FusionBlocker[];
  ready: boolean;
  tier: FusionTier;
  ultimates: UltimateSkill[];
  rageStage: RageStage;
}

export function evaluateFusion(ctx: FusionEligibilityContext): FusionEvaluation {
  const rage = clampCount(ctx.rage, MAX_RAGE);
  const orbs = clampCount(ctx.availableOrbs, MAX_ORBS);
  const compatibility = checkFusionCompatibility(ctx.cardA, ctx.cardB, rage);

  const blockers: FusionBlocker[] = [];
  if (!compatibility.compatible) blockers.push('NOT_COMPATIBLE');
  if (!ctx.bothAlive) blockers.push('NOT_ALIVE');
  if (ctx.controlled) blockers.push('CONTROLLED');
  if (ctx.bossSealActive) blockers.push('BOSS_SEAL');
  if (ctx.fusionCooldown > 0) blockers.push('COOLDOWN');
  if (orbs < 2) blockers.push('ORBS');
  else if (rage < DUAL_UNSEAL_RAGE) blockers.push('RAGE');

  const ready = blockers.length === 0;
  const pairResonates = compatibility.compatible && ctx.bothAlive && orbs >= 1;
  const tier: FusionTier = ready ? resolveFusionTier(orbs, rage) : pairResonates ? 'RESONANCE' : 'NONE';

  return { compatibility, blockers, ready, tier, ultimates: unlockedUltimates(tier), rageStage: rageStage(rage) };
}

export function canFuse(ctx: FusionEligibilityContext): boolean {
  return evaluateFusion(ctx).ready;
}

/** 單一狀態值，所以 FUSING 與 ULTIMATE_CASTING 不可能同時成立。 */
const FUSION_TRANSITIONS: Record<FusionState, readonly FusionState[]> = {
  IDLE: ['SYNERGY_CHECK'],
  SYNERGY_CHECK: ['ORB_RESONANCE', 'IDLE'],
  ORB_RESONANCE: ['UNSEALING', 'IDLE'],
  UNSEALING: ['FUSION_READY', 'IDLE'],
  FUSION_READY: ['FUSING', 'IDLE'],
  FUSING: ['FUSION_ACTIVE', 'COOLDOWN'],
  FUSION_ACTIVE: ['ULTIMATE_READY', 'COOLDOWN'],
  ULTIMATE_READY: ['ULTIMATE_CASTING', 'COOLDOWN'],
  ULTIMATE_CASTING: ['COOLDOWN'],
  COOLDOWN: ['IDLE'],
};

export function canTransitionFusion(from: FusionState, to: FusionState): boolean {
  return FUSION_TRANSITIONS[from].includes(to);
}

export function transitionFusion(from: FusionState, to: FusionState): FusionState {
  if (!canTransitionFusion(from, to)) throw new Error(`合體狀態不可從 ${from} 跳到 ${to}`);
  return to;
}

export type BossCounter = 'ORB_SEAL' | 'FUSION_BREAK' | 'DESPERATION_MODE';
export interface BossCounterOption {
  counter: BossCounter;
  telegraphMs: number;
}

/** 只列出首領「可以」用的反制；要不要用由對手 AI 以種子決定，這裡不擲骰。 */
export function bossCounterOptions(
  difficulty: FusionDifficulty,
  orbCount: number,
  rage: number,
  state: FusionState,
): BossCounterOption[] {
  if (difficulty !== 'HARD') return [];
  const orbs = clampCount(orbCount, MAX_ORBS);
  const tier = resolveFusionTier(orbs, rage);
  const counters: BossCounter[] = [];
  if (tier === 'RAGE_ULTIMATE') counters.push('DESPERATION_MODE');
  else if (orbs >= 2 && orbs <= 4) counters.push('ORB_SEAL');
  if (tier === 'TRUE_FUSION' && (state === 'FUSING' || state === 'FUSION_ACTIVE')) counters.push('FUSION_BREAK');
  return counters.map((counter) => ({ counter, telegraphMs: BOSS_COUNTER_TELEGRAPH_MS }));
}


export interface FusionUltimateState {
  sealBreakerUnlocked: boolean;
  rageQuakeUnlocked: boolean;
  heavenEarthUnlocked: boolean;
  rageWorldEndUnlocked: boolean;
}

export function resolveUltimateState(tier: FusionTier): FusionUltimateState {
  const trueFusion = tier === 'TRUE_FUSION' || tier === 'RAGE_ULTIMATE';
  return {
    sealBreakerUnlocked: trueFusion,
    rageQuakeUnlocked: trueFusion,
    heavenEarthUnlocked: trueFusion,
    rageWorldEndUnlocked: tier === 'RAGE_ULTIMATE',
  };
}
