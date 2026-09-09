import { profile, type Match, type Side } from './interactive';

export const COMBAT_BEAT_MS = 320;
export function performedAction(match: Match, side: Side) {
  const cardId = match[side].team[match[side].active].cardId;
  const entry = match.log.find(item => item.side === side && item.cardId === cardId);
  if (!entry) return null;
  if (entry.action) return entry.action;
  // Old saved logs remain readable without inventing a performed action.
  if (entry.text.startsWith('切換為')) return 'SWITCH';
  if (!entry.text.includes('：')) return null;
  return match.history.at(-1)?.[side].type ?? null;
}
export function isDamagingAction(match: Match, side: Side) {
  const action = performedAction(match, side);
  return action === 'ATTACK' || (action === 'SKILL' && profile(match[side].team[match[side].active].cardId).effects.some(effect => effect.type === 'DAMAGE' && effect.target === 'ENEMY'));
}
export function combatPlaybackMs(match: Match, reduced = false) {
  if (!match.log.length) return 0;
  if (reduced) return 180;
  return (match.log.length - 1) * COMBAT_BEAT_MS + 450;
}
