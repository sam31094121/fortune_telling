/**
 * 神獸卡遊戲｜回合核心（Turn Engine）＋ 牌組系統（Deck Engine）
 * ============================================================================
 *
 * 規格第六條：牌組 20 張、起手 5 張、每回合抽 1、場上最多 3 隻。
 * 規格第七條：固定七階段 TURN_START → DRAW → SUMMON → ACTION → BATTLE
 *             → EFFECT_RESOLVE → TURN_END，且動畫不得自己決定戰鬥結果。
 *
 * 階段寫成轉移表而不是幾個 if——理由跟三合一那邊一樣：
 * 順序若只靠「大家記得照著寫」，哪天有人插一行就靜靜失效，沒有人會發現。
 *
 * 亂數用種子。同一個 seed 跑出同一場戰鬥，才有辦法回查客訴、才寫得出測試。
 */

import { getSkill } from '../../cards/skills';
import { instantiate, orderBySpeed, performAttack, triggerSkills, type BattleContext, type PlayerSide, type SkillUsage } from './battle';
import { tickDurations, type BeastInstance, type EffectLogEntry } from './effects';
import { getCard } from './registry';
import type { BeastCard } from './schema';

export const DECK_SIZE = 20;
export const OPENING_HAND = 5;
export const DRAW_PER_TURN = 1;
export const MAX_FIELD = 3;
/** 平手上限。沒有這個，兩張高防低攻的卡可以互相磨到天荒地老。 */
export const MAX_TURNS = 30;

export const TURN_PHASES = [
  'TURN_START',
  'DRAW',
  'SUMMON',
  'ACTION',
  'BATTLE',
  'EFFECT_RESOLVE',
  'TURN_END',
] as const;
export type TurnPhase = (typeof TURN_PHASES)[number];

/** 只允許照順序走，最後一階段回到第一階段（換人）。 */
const NEXT_PHASE: Record<TurnPhase, TurnPhase> = {
  TURN_START: 'DRAW',
  DRAW: 'SUMMON',
  SUMMON: 'ACTION',
  ACTION: 'BATTLE',
  BATTLE: 'EFFECT_RESOLVE',
  EFFECT_RESOLVE: 'TURN_END',
  TURN_END: 'TURN_START',
};

export function assertPhaseTransition(from: TurnPhase, to: TurnPhase): void {
  if (NEXT_PHASE[from] !== to) {
    throw new Error(
      `TURN_PHASE_ILLEGAL: ${from} → ${to} 不合法，只能是 ${from} → ${NEXT_PHASE[from]}。`
      + '回合流程是固定的，不得跳關。',
    );
  }
}

/** 種子亂數（mulberry32）。同一個 seed 永遠同一個序列，可回查。 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates。用注入的 rng，不用 Math.random——那樣就無法重現了。 */
export function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 由可用卡片組出一副 20 張的牌組（同一張可重複，像實體卡包）。 */
export function buildDeck(cardIds: string[], rng: () => number, size = DECK_SIZE): string[] {
  if (cardIds.length === 0) throw new Error('DECK_EMPTY: 沒有可用卡片，組不出牌組。');
  const deck: string[] = [];
  while (deck.length < size) deck.push(cardIds[Math.floor(rng() * cardIds.length)]);
  return shuffle(deck, rng);
}

export interface PlayerState {
  side: PlayerSide;
  deck: string[];
  hand: string[];
  discard: string[];
  field: Array<{ instance: BeastInstance; card: BeastCard }>;
  usage: SkillUsage;
}

export interface GameState {
  turn: number;
  phase: TurnPhase;
  active: PlayerSide;
  players: Record<PlayerSide, PlayerState>;
  log: EffectLogEntry[];
  /** 每一階段做了什麼，照順序記下來。前端照這份播動畫。 */
  timeline: Array<{ turn: number; side: PlayerSide; phase: TurnPhase; note: string }>;
  winner: PlayerSide | 'DRAW' | null;
  seed: number;
}

function newPlayer(side: PlayerSide, deck: string[]): PlayerState {
  return { side, deck, hand: [], discard: [], field: [], usage: new Map() };
}

function drawFrom(player: PlayerState, count: number): number {
  let drawn = 0;
  for (let i = 0; i < count; i += 1) {
    const next = player.deck.shift();
    if (!next) break;
    player.hand.push(next);
    drawn += 1;
  }
  return drawn;
}

function discardFrom(player: PlayerState, count: number): number {
  let discarded = 0;
  for (let i = 0; i < count; i += 1) {
    const card = player.hand.pop();
    if (!card) break;
    player.discard.push(card);
    discarded += 1;
  }
  return discarded;
}

export function createGame(options: { playerDeck: string[]; opponentDeck: string[]; seed: number }): GameState {
  const state: GameState = {
    turn: 1,
    phase: 'TURN_START',
    active: 'PLAYER',
    players: {
      PLAYER: newPlayer('PLAYER', [...options.playerDeck]),
      OPPONENT: newPlayer('OPPONENT', [...options.opponentDeck]),
    },
    log: [],
    timeline: [],
    winner: null,
    seed: options.seed,
  };

  drawFrom(state.players.PLAYER, OPENING_HAND);
  drawFrom(state.players.OPPONENT, OPENING_HAND);
  return state;
}

function sideChannelFor(player: PlayerState) {
  return {
    draw: (count: number) => drawFrom(player, count),
    discard: (count: number) => discardFrom(player, count),
  };
}

function note(state: GameState, phase: TurnPhase, text: string) {
  state.timeline.push({ turn: state.turn, side: state.active, phase, note: text });
}

function checkWinner(state: GameState): void {
  const playerAlive = state.players.PLAYER.field.some((unit) => !unit.instance.defeated);
  const opponentAlive = state.players.OPPONENT.field.some((unit) => !unit.instance.defeated);
  const playerCanContinue = playerAlive || state.players.PLAYER.hand.length > 0 || state.players.PLAYER.deck.length > 0;
  const opponentCanContinue = opponentAlive || state.players.OPPONENT.hand.length > 0 || state.players.OPPONENT.deck.length > 0;

  if (!playerCanContinue && !opponentCanContinue) state.winner = 'DRAW';
  else if (!playerCanContinue) state.winner = 'OPPONENT';
  else if (!opponentCanContinue) state.winner = 'PLAYER';
}

/**
 * 跑完一個完整回合的七個階段。
 *
 * 召喚與攻擊的選擇目前用固定策略（第一版要的是「核心可以玩」，
 * 不是 AI 有多聰明）：能召就召速度最快的、打對方場上血最少的。
 * 之後接真人操作時，把這兩處換成外部決策即可，流程本身不用動。
 */
export function playTurn(state: GameState): GameState {
  if (state.winner) return state;

  const active = state.players[state.active];
  const enemy = state.players[state.active === 'PLAYER' ? 'OPPONENT' : 'PLAYER'];
  const context: BattleContext = { side: sideChannelFor(active), usage: active.usage, log: state.log };

  let phase: TurnPhase = 'TURN_START';
  state.phase = phase;

  // ── TURN_START ──
  for (const unit of active.field) {
    triggerSkills({ card: unit.card, self: unit.instance, enemy: null, trigger: 'ON_TURN_START', context });
  }
  note(state, phase, `第 ${state.turn} 回合開始（${state.active}）`);

  // ── DRAW ──
  assertPhaseTransition(phase, 'DRAW'); phase = 'DRAW'; state.phase = phase;
  const drawn = drawFrom(active, DRAW_PER_TURN);
  note(state, phase, drawn > 0 ? `抽 ${drawn} 張，手牌 ${active.hand.length}` : '牌庫已空，抽不到牌');

  // ── SUMMON ──
  assertPhaseTransition(phase, 'SUMMON'); phase = 'SUMMON'; state.phase = phase;
  let summoned = 0;
  while (active.field.filter((unit) => !unit.instance.defeated).length < MAX_FIELD && active.hand.length > 0) {
    // 手牌裡挑速度最快的先上場。策略固定，才有辦法重現同一場。
    const candidates = active.hand
      .map((id, index) => ({ id, index, card: getCard(id) }))
      .filter((entry): entry is { id: string; index: number; card: BeastCard } => Boolean(entry.card));
    if (candidates.length === 0) break;
    candidates.sort((a, b) => b.card.stats.speed - a.card.stats.speed || a.card.id.localeCompare(b.card.id));
    const chosen = candidates[0];
    active.hand.splice(chosen.index, 1);

    const instance = instantiate(chosen.card, `${state.active}-${chosen.card.id}-t${state.turn}-${summoned}`);
    active.field.push({ instance, card: chosen.card });
    triggerSkills({ card: chosen.card, self: instance, enemy: null, trigger: 'ON_SUMMON', context });
    triggerSkills({ card: chosen.card, self: instance, enemy: null, trigger: 'PASSIVE', context });
    summoned += 1;
  }
  note(state, phase, summoned > 0 ? `召喚 ${summoned} 隻，場上 ${active.field.filter((u) => !u.instance.defeated).length}` : '本回合沒有召喚');

  // ── ACTION ──
  assertPhaseTransition(phase, 'ACTION'); phase = 'ACTION'; state.phase = phase;
  const attackers = orderBySpeed(active.field.filter((unit) => !unit.instance.defeated).map((unit) => unit.instance));
  note(state, phase, `行動順序：${attackers.map((unit) => unit.name).join('、') || '（無）'}`);

  // ── BATTLE ──
  assertPhaseTransition(phase, 'BATTLE'); phase = 'BATTLE'; state.phase = phase;
  let attacks = 0;
  for (const attackerInstance of attackers) {
    const attackerUnit = active.field.find((unit) => unit.instance === attackerInstance);
    if (!attackerUnit || attackerUnit.instance.defeated) continue;
    const targets = enemy.field.filter((unit) => !unit.instance.defeated);
    if (targets.length === 0) break;
    // 打血最少的：固定策略，可重現。
    targets.sort((a, b) => a.instance.hp - b.instance.hp || a.instance.instanceId.localeCompare(b.instance.instanceId));
    const target = targets[0];
    performAttack({
      attackerCard: attackerUnit.card,
      attacker: attackerUnit.instance,
      defenderCard: target.card,
      defender: target.instance,
      context,
    });
    attacks += 1;
  }
  note(state, phase, attacks > 0 ? `${attacks} 次攻擊結算完成` : '無可攻擊目標');

  // ── EFFECT_RESOLVE ──
  assertPhaseTransition(phase, 'EFFECT_RESOLVE'); phase = 'EFFECT_RESOLVE'; state.phase = phase;
  for (const unit of active.field) {
    if (unit.instance.defeated) continue;
    triggerSkills({ card: unit.card, self: unit.instance, enemy: null, trigger: 'ON_TURN_END', context });
  }
  // 陣亡的移出場，進墓地。
  for (const player of [active, enemy]) {
    const fallen = player.field.filter((unit) => unit.instance.defeated);
    for (const unit of fallen) player.discard.push(unit.card.id);
    player.field = player.field.filter((unit) => !unit.instance.defeated);
  }
  note(state, phase, '效果結算完成');

  // ── TURN_END ──
  assertPhaseTransition(phase, 'TURN_END'); phase = 'TURN_END'; state.phase = phase;
  for (const player of [active, enemy]) {
    for (const unit of player.field) tickDurations(unit.instance);
  }
  checkWinner(state);
  note(state, phase, state.winner ? `勝負已分：${state.winner}` : `第 ${state.turn} 回合結束`);

  if (!state.winner) {
    state.active = state.active === 'PLAYER' ? 'OPPONENT' : 'PLAYER';
    if (state.active === 'PLAYER') state.turn += 1;
    if (state.turn > MAX_TURNS) state.winner = 'DRAW';
  }

  return state;
}

/** 一路打到分出勝負或到達回合上限。測試與 AI 對戰都用這支。 */
export function playToEnd(state: GameState): GameState {
  let guard = 0;
  while (!state.winner && guard < MAX_TURNS * 2 + 4) {
    playTurn(state);
    guard += 1;
  }
  if (!state.winner) state.winner = 'DRAW';
  return state;
}

/** 技能是否真的存在於 Registry。給驗證與除錯用。 */
export function skillExists(id: string): boolean {
  return Boolean(getSkill(id));
}
