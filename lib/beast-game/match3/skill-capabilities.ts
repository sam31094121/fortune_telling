/** Read-only capability inventory. Names/descriptions never imply an effect is active. */
import { getSkill, type SkillTrigger } from '../../../cards/skills';
import { playableCards } from '../registry';
import type { EffectSpec } from '../effects';
import { SKILL_RATIO } from './config';

export interface OrbSkillEffectCapability {
  spec: EffectSpec;
  status: 'not_connected' | 'mode_mapping_required';
  decision: 'draw_without_deck' | 'speed_without_initiative' | 'defense_damage_conversion' | null;
}
export interface OrbSkillCapability {
  id: string;
  slot: 'first' | 'additional' | 'passive';
  ordinal: number;
  status: 'not_connected' | 'source_missing';
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
    id, slot, ordinal, status: skill ? 'not_connected' : 'source_missing',
    name: skill?.name ?? null, description: skill?.description ?? null, trigger: skill?.trigger ?? null,
    usesPerBattle: skill?.usesPerBattle ?? null, version: skill?.version ?? null, source: 'cards/skills/index.ts',
    effects: (skill?.effects ?? []).map(spec => {
      const decision = spec.type === 'DRAW' ? 'draw_without_deck' : spec.type === 'BUFF_SPEED' ? 'speed_without_initiative'
        : spec.type === 'BUFF_DEFENSE' || spec.type === 'DEBUFF_DEFENSE' ? 'defense_damage_conversion' : null;
      return { spec: { ...spec }, status: decision ? 'mode_mapping_required' : 'not_connected', decision };
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
