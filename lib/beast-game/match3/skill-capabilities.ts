/** Original card trigger/effect capabilities. Generic base/energy formulas remain separate. */
import { getSkill, type SkillTrigger } from '../../../cards/skills';
import { playableCards } from '../registry';
import type { EffectSpec } from '../effects';
import { SKILL_RATIO } from './config';
import { isMappedFoeSkill } from './skill-runtime';

export interface OrbSkillEffectCapability {
  spec: EffectSpec;
  status: 'active' | 'not_applicable';
  decision: 'draw_without_deck' | null;
}
export interface OrbSkillCapability {
  id: string;
  slot: 'first' | 'additional' | 'passive';
  ordinal: number;
  status: 'active' | 'not_applicable' | 'source_missing';
  name: string | null;
  description: string | null;
  trigger: SkillTrigger | null;
  usesPerBattle: number | null;
  version: string | null;
  effects: OrbSkillEffectCapability[];
  source: 'cards/skills/index.ts';
}
export function orbSkillCapability(id: string, slot: OrbSkillCapability['slot'], ordinal = 1): OrbSkillCapability {
  const skill = getSkill(id);
  return {
    id, slot, ordinal, status: skill ? isMappedFoeSkill(skill) ? 'active' : 'not_applicable' : 'source_missing',
    name: skill?.name ?? null, description: skill?.description ?? null, trigger: skill?.trigger ?? null,
    usesPerBattle: skill?.usesPerBattle ?? null, version: skill?.version ?? null, source: 'cards/skills/index.ts',
    effects: (skill?.effects ?? []).map(spec => {
      const decision = spec.type === 'DRAW' || spec.type === 'DISCARD' ? 'draw_without_deck' : null;
      return { spec: { ...spec }, status: skill && isMappedFoeSkill(skill) ? 'active' : 'not_applicable', decision };
    }),
  };
}
export function orbCardSkillCapabilities(cardId: string) {
  const card = playableCards().find(c => c.id === cardId);
  if (!card) return null;
  return {
    cardId: card.id, cardName: card.name, form: card.form,
    genericEnergyAttack: { status: 'active' as const, ratio: SKILL_RATIO, source: 'lib/beast-game/match3/damage.ts#skillAmount' },
    skills: [...card.skills.map((id, i) => orbSkillCapability(id, i === 0 ? 'first' : 'additional', i + 1)), ...card.passive.map((id, i) => orbSkillCapability(id, 'passive', i + 1))],
  };
}
export function orbSkillCapabilityInventory() {
  return playableCards().map(c => orbCardSkillCapabilities(c.id)!);
}
