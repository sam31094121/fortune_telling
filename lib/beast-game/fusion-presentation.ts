/**
 * 合體演出計畫：規則層算完後，由此挑 4～8 個真實素材交給前端播放。
 * 不改勝負、不擲骰；缺類誠實跳過。
 */

import type { BeastElement } from './elements';
import type { FusionTier } from './fusion';
import type { FusionSession } from './fusion-session';
import { evaluateSession } from './fusion-session';
import {
  composeBattleEffects,
  type EffectComposeInput,
  type EffectComposeResult,
} from './effect-composer';
import type { BattleAsset } from './battle-assets';

export type FusionPresentationPlan = EffectComposeResult & {
  tier: EffectComposeInput['tier'];
  element: BeastElement | null;
  cardIds: string[];
  /** 建議舞台開啟毫秒（手機較短） */
  stageMs: number;
};

function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 900px)').matches;
}

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function planFusionPresentation(
  session: FusionSession,
  opts?: Partial<Pick<EffectComposeInput, 'mobile' | 'reducedMotion'>>,
): FusionPresentationPlan | null {
  const evaluation = evaluateSession(session);
  const tier = (evaluation && evaluation.tier !== 'NONE' ? evaluation.tier : session.lastTier);
  if (!tier || tier === 'NONE') return null;
  return planTierPresentation({
    tier,
    element: (session.cardA?.element ?? null) as BeastElement | null,
    cardIds: [session.cardA?.id, session.cardB?.id].filter(Boolean) as string[],
    ...opts,
  });
}

/** 戰鬥引擎已結算出合體等級時，直接依等級挑素材。 */
export function planTierPresentation(input: {
  tier: FusionTier;
  element: BeastElement | null;
  cardIds: string[];
} & Partial<Pick<EffectComposeInput, 'mobile' | 'reducedMotion'>>): FusionPresentationPlan | null {
  const { tier, element, cardIds } = input;
  if (tier === 'NONE') return null;
  const mobile = input.mobile ?? detectMobile();
  const reducedMotion = input.reducedMotion ?? detectReducedMotion();

  const composed = composeBattleEffects({
    tier,
    element,
    cardIds,
    mobile,
    reducedMotion,
  });

  const stageMs =
    reducedMotion ? 900
    : tier === 'RAGE_ULTIMATE' ? (mobile ? 2200 : 2800)
    : tier === 'TRUE_FUSION' ? (mobile ? 1800 : 2200)
    : mobile ? 1400 : 1800;

  return {
    ...composed,
    tier,
    element,
    cardIds,
    stageMs,
  };
}

/** 只取可給 HTMLAudio 播的媒體路徑（含 AUDIO／元素音效等） */
export function audioCuesFromPlan(plan: FusionPresentationPlan): BattleAsset[] {
  const AUDIO_TYPES = new Set(['OGG', 'MP3', 'FLAC', 'M4A']);
  return plan.assets.filter((asset) => asset.kind === 'MEDIA' && AUDIO_TYPES.has(asset.type));
}

export function presetAssetsFromPlan(plan: FusionPresentationPlan): BattleAsset[] {
  return plan.assets.filter((asset) => asset.kind === 'PRESET');
}

export function shouldShowRageStage(plan: FusionPresentationPlan): boolean {
  return plan.assets.some((asset) =>
    asset.category === 'RAGE'
    || asset.category === 'ULTIMATE'
    || asset.category === 'FUSION'
    || asset.category === 'SHOCKWAVE'
    || asset.category === 'FINISH',
  );
}

export type RitualAudioBeat = {
  at: number;
  assetId: string;
  path: string;
  volume: number;
  phase: 'CHARGE' | 'COLLISION' | 'FUSION' | 'RAGE' | 'FINISH' | 'OTHER';
};

const PHASE_OF: Record<string, RitualAudioBeat['phase']> = {
  CHARGE: 'CHARGE',
  ORB: 'CHARGE',
  CARD_AURA: 'CHARGE',
  ELEMENT: 'CHARGE',
  LIGHTNING: 'CHARGE',
  FIRE: 'CHARGE',
  WIND: 'CHARGE',
  EARTH: 'CHARGE',
  VOID: 'CHARGE',
  WATER: 'CHARGE',
  ICE: 'CHARGE',
  COLLISION: 'COLLISION',
  DEBRIS: 'COLLISION',
  FLASH: 'COLLISION',
  FUSION: 'FUSION',
  PORTAL: 'FUSION',
  RAGE: 'RAGE',
  ULTIMATE: 'RAGE',
  SHOCKWAVE: 'RAGE',
  PARTICLE: 'RAGE',
  SCREEN_SHAKE: 'RAGE',
  FINISH: 'FINISH',
  BACKGROUND: 'OTHER',
  AUDIO: 'OTHER',
};

const PHASE_ORDER: RitualAudioBeat['phase'][] = ['CHARGE', 'COLLISION', 'FUSION', 'RAGE', 'FINISH', 'OTHER'];

const PHASE_SLOT_MS: Record<RitualAudioBeat['phase'], number> = {
  CHARGE: 0,
  COLLISION: 0.22,
  FUSION: 0.42,
  RAGE: 0.58,
  FINISH: 0.78,
  OTHER: 0.12,
};

/**
 * Ritual 音效時間軸：依類別排成 蓄力→碰撞→合體→暴怒→終結。
 * at 落在 0～stageMs；決定性、不擲骰。
 */
export function ritualAudioTimeline(plan: FusionPresentationPlan): RitualAudioBeat[] {
  const cues = audioCuesFromPlan(plan);
  const buckets: Record<RitualAudioBeat['phase'], typeof cues> = {
    CHARGE: [], COLLISION: [], FUSION: [], RAGE: [], FINISH: [], OTHER: [],
  };
  for (const asset of cues) {
    buckets[PHASE_OF[asset.category] ?? 'OTHER'].push(asset);
  }

  const out: RitualAudioBeat[] = [];
  for (const phase of PHASE_ORDER) {
    const list = buckets[phase];
    if (list.length === 0) continue;
    const base = Math.round(plan.stageMs * PHASE_SLOT_MS[phase]);
    list.forEach((asset, index) => {
      const stagger = index * Math.max(90, Math.round(plan.stageMs * 0.05));
      const at = Math.min(plan.stageMs - 40, base + stagger);
      out.push({
        at: Math.max(0, at),
        assetId: asset.assetId,
        path: asset.path,
        volume: Math.min(0.72, 0.28 + asset.intensity * 0.08),
        phase,
      });
    });
  }
  return out.sort((a, b) => a.at - b.at || a.assetId.localeCompare(b.assetId));
}

