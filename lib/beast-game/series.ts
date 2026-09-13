import { instantiate, performAttack, triggerSkills, type BattleContext, type PlayerSide } from './battle';
import { effectiveStat, resolveEffects, tickDurations, type EffectLogEntry } from './effects';
import { elementGenerates, type BeastElement } from './elements';
import { getCard } from './registry';
import { createRng, validateLineup } from './turn';

export type PairResult = {
  index: number; playerId: string; opponentId: string;
  winner: PlayerSide | 'DRAW'; firstPlayer: PlayerSide;
  hp: { player: number; opponent: number };
  score: { player: number; opponent: number };
  actions: Array<{ side: PlayerSide; damage: number; note: string; fusion?: boolean; materialId?: string }>;
};

/** A series has no live bench: only an as-yet-unplayed lineup card can lend energy. */
export function seriesFusionMaterial(lineup: string[], slot: number): string | null {
  if (!Number.isInteger(slot) || slot < 0 || slot >= lineup.length) return null;
  const active = getCard(lineup[slot]);
  if (!active) return null;
  return lineup.slice(slot + 1).find(id => {
    const reserve = getCard(id);
    return reserve && elementGenerates(reserve.element as BeastElement, active.element as BeastElement);
  }) ?? null;
}

/** 三席單挑模式，共用既有傷害、元素與技能引擎；每局重置生命與技能次數。 */
export function playSeries(player: string[], opponent: string[], seed: number, fusion: { player: number | null; opponent: number | null } = { player: null, opponent: null }) {
  for (const lineup of [player, opponent]) {
    const valid = validateLineup(lineup);
    if (!valid.ready) throw new Error(valid.reason);
  }
  for (const [side, lineup] of [['player', player], ['opponent', opponent]] as const) {
    const slot = fusion[side];
    if (slot !== null && !seriesFusionMaterial(lineup, slot)) throw new Error('暴怒合體需要本次布陣中尚未上場的相生卡。');
  }
  const rng = createRng(seed);
  const score = { player: 0, opponent: 0 };
  const pairs: PairResult[] = [];
  for (let index = 0; index < 3; index++) {
    const a = getCard(player[index])!;
    const b = getCard(opponent[index])!;
    const units = { PLAYER: instantiate(a, `PLAYER-${index}`), OPPONENT: instantiate(b, `OPPONENT-${index}`) };
    const cards = { PLAYER: a, OPPONENT: b };
    // 單挑模式沒有牌庫與補位，抽棄牌效果沒有可操作目標。
    const context = (): BattleContext => ({ side: { draw: () => 0, discard: () => 0 }, usage: new Map(), log: [] });
    const contexts = { PLAYER: context(), OPPONENT: context() };
    for (const side of ['PLAYER', 'OPPONENT'] as const) {
      for (const trigger of ['ON_SUMMON', 'PASSIVE'] as const) {
        triggerSkills({ card: cards[side], self: units[side], enemy: null, trigger, context: contexts[side] });
      }
    }
    const speed = effectiveStat(units.PLAYER, 'speed') - effectiveStat(units.OPPONENT, 'speed');
    const firstPlayer: PlayerSide = speed === 0 ? (rng() < 0.5 ? 'PLAYER' : 'OPPONENT') : speed > 0 ? 'PLAYER' : 'OPPONENT';
    const actions: PairResult['actions'] = [];
    const fusionUsed = { PLAYER: false, OPPONENT: false };
    for (let turn = 0; turn < 100 && !units.PLAYER.defeated && !units.OPPONENT.defeated; turn++) {
      const side: PlayerSide = turn % 2 === 0 ? firstPlayer : firstPlayer === 'PLAYER' ? 'OPPONENT' : 'PLAYER';
      const enemy = side === 'PLAYER' ? 'OPPONENT' : 'PLAYER';
      triggerSkills({ card: cards[side], self: units[side], enemy: units[enemy], trigger: 'ON_TURN_START', context: contexts[side] });
      const fusionSlot = side === 'PLAYER' ? fusion.player : fusion.opponent;
      const materialId = fusionSlot === index && !fusionUsed[side] && units[side].stunnedTurns === 0
        ? seriesFusionMaterial(side === 'PLAYER' ? player : opponent, index) : null;
      if (materialId) {
        const beforeHp = units[enemy].hp;
        const logs: EffectLogEntry[] = [];
        resolveEffects([{ type: 'DAMAGE', value: 38, target: 'ENEMY' }], {
          source: units[side], target: units[enemy], baseAttack: effectiveStat(units[side], 'attack'),
          side: contexts[side].side, log: logs,
        });
        fusionUsed[side] = true;
        actions.push({ side, damage: beforeHp - units[enemy].hp,
          note: `暴怒合體・${getCard(materialId)?.name ?? materialId}：${logs.map(entry => entry.detail).join('；')}`,
          fusion: true, materialId });
      } else {
        const result = performAttack({ attackerCard: cards[side], defenderCard: cards[enemy], attacker: units[side], defender: units[enemy], context: contexts[side], defenderContext: contexts[enemy] });
        actions.push({ side, damage: result.basicDamage, note: result.log.map((entry) => entry.detail).join('；') });
      }
      triggerSkills({ card: cards[side], self: units[side], enemy: units[enemy], trigger: 'ON_TURN_END', context: contexts[side] });
      tickDurations(units[side]);
    }
    const winner = units.PLAYER.defeated && units.OPPONENT.defeated ? 'DRAW' : units.PLAYER.defeated ? 'OPPONENT' : units.OPPONENT.defeated ? 'PLAYER' : 'DRAW';
    if (winner === 'PLAYER') score.player++;
    if (winner === 'OPPONENT') score.opponent++;
    pairs.push({ index, playerId: a.id, opponentId: b.id, winner, firstPlayer, hp: { player: units.PLAYER.hp, opponent: units.OPPONENT.hp }, score: { ...score }, actions });
  }
  const winner: PlayerSide | 'DRAW' = score.player === score.opponent ? 'DRAW' : score.player > score.opponent ? 'PLAYER' : 'OPPONENT';
  return { mode: 'BEST_OF_THREE' as const, pairs, score, winner, firstPlayer: pairs[0].firstPlayer };
}
