import { profile, type Match, type Side } from './interactive';
import { RIG_STRIKE_MS, rigFor } from './beast-rig';

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
  return action === 'ATTACK' || action === 'RAGE' || (action === 'SKILL' && profile(match[side].team[match[side].active].cardId).effects.some(effect => effect.type === 'DAMAGE' && effect.target === 'ENEMY'));
}
export function combatPlaybackMs(match: Match, reduced = false) {
  if (!match.log.length) return 0;
  if (reduced) return 180;
  const base = (match.log.length - 1) * COMBAT_BEAT_MS + (match.log.some(entry => entry.action === 'RAGE') ? 900 : 450);
  return Math.max(base, rigStrikeEndMs(match));
}

/** 玩家主戰有網格變形動畫（目前只有白虎）且這回合出了傷害招式時，整段出擊（跳出→奔跑→攻擊→返回）結束的時刻。否則 0。 */
export function rigStrikeEndMs(match: Match): number {
  const fighter = match.player.team[match.player.active];
  if (!fighter || !rigFor(fighter.cardId) || !isDamagingAction(match, 'player')) return 0;
  const order = Math.max(0, match.log.findIndex(entry => entry.side === 'player' && entry.cardId === fighter.cardId));
  return order * COMBAT_BEAT_MS + RIG_STRIKE_MS + 100;
}
