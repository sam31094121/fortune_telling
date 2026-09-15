import { instantiate, performAttack, triggerSkills, type BattleContext, type PlayerSide } from './battle';
import { effectiveStat, resolveEffects, tickDurations, type EffectLogEntry } from './effects';
import { elementGenerates, type BeastElement } from './elements';
import { getCard } from './registry';
import { MAX_LINEUP_COST, buildLineup, createRng, validateLineup } from './turn';

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

/**
 * 中等入口的易經組陣（2026-09-15，業主批准「中度易經變聰明」）。
 *
 * 三局單挑在戰鬥中沒有決定可做，易經能變聰明的只有「挑哪三張、合體放哪一格」：
 *   1. 每張卡對全卡池單挑的平均勝率當強弱表（兩顆固定種子；平手算半場）。
 *   2. 列出所有預算內三張組合，依強弱總和排名（有相生搭檔可合體再加 0.3），
 *      從前七成裡用本場種子挑一套——避開最弱的三成，也不會每場同一套被摸透。
 *   3. 站位用種子排，但一定排出能暴怒合體的順序；合體放在強弱表最弱的那一格。
 *
 * 公平：只收卡池與本場種子，**看不到客戶這一場的陣容**；卡片數值、預算、規則雙方相同。
 * 實測（1200 場，對隨機組陣的基礎玩家）：易經勝率約六成；隨機對隨機約五成。
 */
export const MEDIUM_TOP_FRACTION = 0.7;
const MEDIUM_FUSION_BONUS = 0.3;
type RankedCombo = { set: string[]; score: number };
let mediumCache: { key: string; strength: Map<string, number>; ranked: RankedCombo[] } | null = null;

function mediumTables(pool: string[]) {
  const ids = [...new Set(pool)].filter((id) => getCard(id));
  const key = ids.join(',');
  if (mediumCache?.key === key) return mediumCache;
  const cost = (id: string) => getCard(id)!.cost;
  const cheap = [...ids].sort((a, b) => cost(a) - cost(b));
  const fillers = (id: string) => cheap.filter((other) => other !== id).slice(0, 2);
  const strength = new Map<string, number>();
  for (const a of ids) {
    let score = 0, n = 0;
    for (const b of ids) {
      for (const seed of [11, 12]) {
        const pair = playSeries([a, ...fillers(a)], [b, ...fillers(b)], seed).pairs[0];
        score += pair.winner === 'PLAYER' ? 1 : pair.winner === 'DRAW' ? 0.5 : 0; n++;
      }
    }
    strength.set(a, score / n);
  }
  const ranked: RankedCombo[] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) {
    const set = [ids[i], ids[j], ids[k]];
    if (set.reduce((sum, id) => sum + cost(id), 0) > MAX_LINEUP_COST) continue;
    const fusable = set.some((x) => set.some((y) => y !== x && elementGenerates(getCard(y)!.element as BeastElement, getCard(x)!.element as BeastElement)));
    ranked.push({ set, score: set.reduce((sum, id) => sum + strength.get(id)!, 0) + (fusable ? MEDIUM_FUSION_BONUS : 0) });
  }
  ranked.sort((a, b) => b.score - a.score || a.set.join().localeCompare(b.set.join()));
  mediumCache = { key, strength, ranked };
  return mediumCache;
}

export function chooseSeriesOpponent(pool: string[], rng: () => number): { lineup: string[]; fusionSlot: number | null } {
  const { strength, ranked } = mediumTables(pool);
  if (!ranked.length) {
    const lineup = buildLineup(pool, rng);
    return { lineup, fusionSlot: [0, 1].find((slot) => seriesFusionMaterial(lineup, slot)) ?? null };
  }
  const top = ranked.slice(0, Math.max(1, Math.round(ranked.length * MEDIUM_TOP_FRACTION)));
  const [a, b, c] = top[Math.floor(rng() * top.length)].set;
  const orders = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];
  const fusable = orders.filter((order) => seriesFusionMaterial(order, 0) || seriesFusionMaterial(order, 1));
  const choices = fusable.length ? fusable : orders;
  const lineup = choices[Math.floor(rng() * choices.length)];
  const slots = [0, 1].filter((slot) => seriesFusionMaterial(lineup, slot));
  const fusionSlot = slots.length ? slots.reduce((best, slot) => (strength.get(lineup[slot])! < strength.get(lineup[best])! ? slot : best), slots[0]) : null;
  return { lineup, fusionSlot };
}
