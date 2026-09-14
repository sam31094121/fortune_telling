/**
 * 封印寶珠 × 暴怒合體｜場次狀態（單一核心延伸）
 * ============================================================================
 *
 * 只管珠數、暴怒計量、儀式狀態機與長按確認。
 * 不另立傷害公式——真正出招仍走 interactive.ts 既有 Action。
 */

import {
  MAX_ORBS,
  MAX_RAGE,
  evaluateFusion,
  transitionFusion,
  canTransitionFusion,
  resolveUltimateState,
  FUSION_TIER_LABEL,
  ULTIMATE_LABEL,
  FUSION_BLOCKER_LABEL,
  type FusionCard,
  type FusionState,
  type FusionTier,
  type FusionEvaluation,
  type UltimateSkill,
} from './fusion';

export interface FusionSession {
  orbs: number;
  rage: number;
  state: FusionState;
  cardA: FusionCard | null;
  cardB: FusionCard | null;
  bothAlive: boolean;
  controlled: boolean;
  bossSealActive: boolean;
  fusionCooldown: number;
  ceremonySkipsUnlocked: boolean;
  lastTier: FusionTier;
}

export function createFusionSession(partial?: Partial<FusionSession>): FusionSession {
  return {
    orbs: 0,
    rage: 0,
    state: 'IDLE',
    cardA: null,
    cardB: null,
    bothAlive: true,
    controlled: false,
    bossSealActive: false,
    fusionCooldown: 0,
    ceremonySkipsUnlocked: false,
    lastTier: 'NONE',
    ...partial,
  };
}

export function gainOrbs(session: FusionSession, amount = 1): FusionSession {
  return { ...session, orbs: Math.min(MAX_ORBS, Math.max(0, session.orbs + Math.floor(amount))) };
}

export function gainRage(session: FusionSession, amount: number): FusionSession {
  return { ...session, rage: Math.min(MAX_RAGE, Math.max(0, session.rage + Math.floor(amount))) };
}

export function setFusionPair(
  session: FusionSession,
  cardA: FusionCard | null,
  cardB: FusionCard | null,
  opts?: Partial<Pick<FusionSession, 'bothAlive' | 'controlled' | 'bossSealActive' | 'fusionCooldown'>>,
): FusionSession {
  return { ...session, cardA, cardB, ...opts };
}

export function evaluateSession(session: FusionSession): FusionEvaluation | null {
  if (!session.cardA || !session.cardB) return null;
  return evaluateFusion({
    cardA: session.cardA,
    cardB: session.cardB,
    rage: session.rage,
    availableOrbs: session.orbs,
    bothAlive: session.bothAlive,
    controlled: session.controlled,
    bossSealActive: session.bossSealActive,
    fusionCooldown: session.fusionCooldown,
  });
}

export type FusionHudModel = {
  evaluation: FusionEvaluation | null;
  tierLabel: string;
  canLongPress: boolean;
  longPressMs: number;
  actionLabel: string;
  blockers: string[];
  ultimates: { id: UltimateSkill; label: string }[];
  energyLine: boolean;
  incompatible: boolean;
};

export function buildFusionHudModel(session: FusionSession): FusionHudModel {
  const evaluation = evaluateSession(session);
  const tier = evaluation?.tier ?? 'NONE';
  const ultimates = (evaluation?.ultimates ?? []).map((id) => ({ id, label: ULTIMATE_LABEL[id] }));
  const blockers = (evaluation?.blockers ?? []).map((b) => FUSION_BLOCKER_LABEL[b]);
  const incompatible = Boolean(evaluation && !evaluation.compatibility.compatible);
  const energyLine = Boolean(evaluation?.compatibility.compatible && session.orbs >= 1);

  let actionLabel = '等待共鳴';
  let longPressMs = 0;
  let canLongPress = false;
  if (tier === 'DUAL_UNSEAL' && evaluation?.ready) {
    actionLabel = '雙珠解封';
    longPressMs = 600;
    canLongPress = session.state === 'IDLE' || session.state === 'FUSION_READY' || session.state === 'ORB_RESONANCE';
  } else if (tier === 'TRUE_FUSION' && evaluation?.ready) {
    actionLabel = '真・合體';
    longPressMs = 600;
    canLongPress = true;
  } else if (tier === 'RAGE_ULTIMATE' && evaluation?.ready) {
    actionLabel = '暴怒究極合體';
    longPressMs = 800;
    canLongPress = true;
  } else if (tier === 'RESONANCE') {
    actionLabel = '共鳴成立';
  } else if (incompatible) {
    actionLabel = '無法合體';
  }

  return {
    evaluation,
    tierLabel: FUSION_TIER_LABEL[tier],
    canLongPress,
    longPressMs,
    actionLabel,
    blockers,
    ultimates,
    energyLine,
    incompatible,
  };
}

/** 長按成功後推進狀態機；儀式看過一次後可 skip。 */
export function beginFusionRitual(session: FusionSession, _skipCeremony: boolean): FusionSession {
  const evaluation = evaluateSession(session);
  if (!evaluation?.ready) return session;
  // 儀式可略過演出，但狀態機仍必須逐步合法推進（禁止跳關）。
  let state = session.state;
  const steps: FusionState[] = [
    'SYNERGY_CHECK',
    'ORB_RESONANCE',
    'UNSEALING',
    'FUSION_READY',
    'FUSING',
    'FUSION_ACTIVE',
  ];
  if (state === 'IDLE' || state === 'COOLDOWN') {
    if (state === 'COOLDOWN' && canTransitionFusion(state, 'IDLE')) state = transitionFusion(state, 'IDLE');
    for (const next of steps) {
      if (canTransitionFusion(state, next)) state = transitionFusion(state, next);
    }
  }
  if (
    (evaluation.tier === 'RAGE_ULTIMATE' || evaluation.tier === 'TRUE_FUSION')
    && canTransitionFusion(state, 'ULTIMATE_READY')
  ) {
    state = transitionFusion(state, 'ULTIMATE_READY');
  }
  return {
    ...session,
    state,
    lastTier: evaluation.tier,
    ceremonySkipsUnlocked: true,
  };
}

export function castUltimate(session: FusionSession, skill: UltimateSkill): FusionSession {
  const evaluation = evaluateSession(session);
  if (!evaluation?.ultimates.includes(skill)) return session;
  let state = session.state;
  if (state === 'ULTIMATE_READY' && canTransitionFusion(state, 'ULTIMATE_CASTING')) {
    state = transitionFusion(state, 'ULTIMATE_CASTING');
  }
  if (state === 'ULTIMATE_CASTING' && canTransitionFusion(state, 'COOLDOWN')) {
    state = transitionFusion(state, 'COOLDOWN');
  }
  return { ...session, state, fusionCooldown: Math.max(session.fusionCooldown, 1) };
}

export function tickFusionCooldown(session: FusionSession): FusionSession {
  if (session.state === 'COOLDOWN' && canTransitionFusion('COOLDOWN', 'IDLE')) {
    return { ...session, state: 'IDLE', fusionCooldown: 0 };
  }
  return session;
}

export { resolveUltimateState, MAX_ORBS, MAX_RAGE };
