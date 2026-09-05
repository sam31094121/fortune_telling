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
import { effectiveStat, tickDurations, type BeastInstance, type EffectLogEntry } from './effects';
import { getCard } from './registry';
import type { BeastCard } from './schema';

export const DECK_SIZE = 20;
export const OPENING_HAND = 5;
export const DRAW_PER_TURN = 1;
/** 後手補償。先手有節奏優勢，後手多一張牌。 */
export const SECOND_PLAYER_BONUS_CARD = 1;
export const MAX_FIELD = 3;
/** 平手上限。沒有這個，兩張高防低攻的卡可以互相磨到天荒地老。 */
export const MAX_TURNS = 30;

/**
 * 本命值。神獸全被打光時，攻擊直接落在本命上；歸零就輸。
 *
 * 沒有這個之前，勝負條件是「手牌與牌庫都空」——六十張卡的牌池會拖到天亮，
 * 而且客戶感受不到「我正在輸」。本命值讓每一次攻擊都有意義。
 */
export const STARTING_LIFE = 30;

/**
 * 氣（召喚資源）。每回合上限 +1，回合開始補滿，當回合沒用完不保留。
 *
 * 沒有成本曲線的話，四象第一回合就能下場，六十張卡等於一張——
 * 誰先抽到最大的誰贏，那不叫遊戲。不保留是為了避免囤積一次爆發。
 */
export const STARTING_MANA_CAP = 1;
export const MAX_MANA_CAP = 10;

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
  /** 本命值。歸零就輸。 */
  life: number;
  /** 這一回合可用的氣。 */
  mana: number;
  /** 氣的上限，每回合 +1 到十為止。 */
  manaCap: number;
  /** 疲勞層數。牌庫抽乾後每回合 +1，並直接扣本命。 */
  fatigue: number;
  deck: string[];
  hand: string[];
  discard: string[];
  /** 場上的神獸。slot 0 是前鋒，數字越大越後面。 */
  field: Array<{ instance: BeastInstance; card: BeastCard; slot: number }>;
  usage: SkillUsage;
}

export interface GameState {
  turn: number;
  phase: TurnPhase;
  active: PlayerSide;
  /** 這一場誰先手。由種子決定，寫進戰報供客戶回查。 */
  firstPlayer: PlayerSide;
  players: Record<PlayerSide, PlayerState>;
  log: EffectLogEntry[];
  /** 每一階段做了什麼，照順序記下來。前端照這份播動畫。 */
  timeline: Array<{ turn: number; side: PlayerSide; phase: TurnPhase; note: string }>;
  winner: PlayerSide | 'DRAW' | null;
  seed: number;
}

function newPlayer(side: PlayerSide, deck: string[]): PlayerState {
  return {
    side,
    life: STARTING_LIFE,
    mana: STARTING_MANA_CAP,
    manaCap: STARTING_MANA_CAP,
    fatigue: 0,
    deck,
    hand: [],
    discard: [],
    field: [],
    usage: new Map(),
  };
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

export function createGame(options: {
  playerDeck: string[];
  opponentDeck: string[];
  seed: number;
}): GameState {
  /*
    先後手由種子決定，不是固定客戶先。

    原本寫死 active: 'PLAYER'，客戶永遠先手——而實測先手勝率約六成七。
    等於我們默默送客戶一個結構性優勢，卻在畫面上講「公平對決」。
    那是作假：不是算錯，是說的和做的不一樣。

    現在用同一顆種子擲一次，先後手照結果走；誰先手會寫進戰報，
    客戶看得到，也可以用同一顆種子重播驗證。
  */
  const coin = createRng(options.seed ^ 0x5f3759df);
  const firstPlayer: PlayerSide = coin() < 0.5 ? 'PLAYER' : 'OPPONENT';
  const secondPlayer: PlayerSide = firstPlayer === 'PLAYER' ? 'OPPONENT' : 'PLAYER';

  const state: GameState = {
    turn: 1,
    phase: 'TURN_START',
    active: firstPlayer,
    firstPlayer,
    players: {
      PLAYER: newPlayer('PLAYER', [...options.playerDeck]),
      OPPONENT: newPlayer('OPPONENT', [...options.opponentDeck]),
    },
    log: [],
    timeline: [],
    winner: null,
    seed: options.seed,
  };

  /*
    後手補一張牌。

    實測只給先手不給後手時，十二場先手十二勝、後手零勝——
    先手拿到的節奏優勢完全沒有補償。多一張牌是卡牌遊戲的通行做法，
    代價小、看得懂，而且不必動任何一張卡的數值。
    補的是「後手」，不是固定補給對手——先後手是隨機的。
  */
  drawFrom(state.players[firstPlayer], OPENING_HAND);
  drawFrom(state.players[secondPlayer], OPENING_HAND + SECOND_PLAYER_BONUS_CARD);

  state.timeline.push({
    turn: 0,
    side: firstPlayer,
    phase: 'TURN_START',
    note: `擲先手：${firstPlayer === 'PLAYER' ? '你先手' : '對手先手'}`
      + `（種子 ${options.seed}，同一顆種子重播結果一定相同）`,
  });

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
  const player = state.players.PLAYER;
  const opponent = state.players.OPPONENT;

  // 本命歸零優先判定。兩邊同時歸零算平手。
  if (player.life <= 0 && opponent.life <= 0) { state.winner = 'DRAW'; return; }
  if (player.life <= 0) { state.winner = 'OPPONENT'; return; }
  if (opponent.life <= 0) { state.winner = 'PLAYER'; return; }

  // 牌庫抽乾也是一種輸法：沒有神獸、沒有手牌、也抽不到了。
  const canContinue = (p: typeof player) =>
    p.field.some((unit) => !unit.instance.defeated) || p.hand.length > 0 || p.deck.length > 0;
  const playerCanContinue = canContinue(player);
  const opponentCanContinue = canContinue(opponent);

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
  // 氣上限每回合 +1 到十為止，然後補滿。當回合沒用完不保留——
  // 可以囤積的話就會變成「憋大招一次爆發」，那不是想要的節奏。
  active.manaCap = Math.min(MAX_MANA_CAP, active.manaCap + 1);
  active.mana = active.manaCap;
  for (const unit of active.field) {
    triggerSkills({ card: unit.card, self: unit.instance, enemy: null, trigger: 'ON_TURN_START', context });
  }
  note(state, phase, `第 ${state.turn} 回合開始（${state.active}）`);

  // ── DRAW ──
  assertPhaseTransition(phase, 'DRAW'); phase = 'DRAW'; state.phase = phase;
  /*
    抽乾了就開始疲勞。

    沒有這一條，雙方場面互相僵住時誰也打不到本命，實測十二場有七場平手——
    五成八的平手率，客戶玩起來就是「白打一場」。
    牌庫空了還要抽，就從本命扣，而且一次比一次痛，戰局一定收得掉。
  */
  let drawn = 0;
  if (active.deck.length === 0) {
    active.fatigue += 1;
    active.life = Math.max(0, active.life - active.fatigue);
    note(state, phase, `牌庫已空，疲勞 ${active.fatigue} 點，本命剩 ${active.life}`);
  } else {
    drawn = drawFrom(active, DRAW_PER_TURN);
    note(state, phase, `抽 ${drawn} 張，手牌 ${active.hand.length}`);
  }

  // ── SUMMON ──
  assertPhaseTransition(phase, 'SUMMON'); phase = 'SUMMON'; state.phase = phase;
  let summoned = 0;
  while (active.field.filter((unit) => !unit.instance.defeated).length < MAX_FIELD && active.hand.length > 0) {
    /*
      吃得起才召得動，而且照曲線出牌：先出當下負擔得起的最大一張。
      策略固定才有辦法重現同一場（同 seed 同結果）；
      接真人操作時把這一段換成外部選擇即可，流程不用動。
    */
    const candidates = active.hand
      .map((id, index) => ({ id, index, card: getCard(id) }))
      .filter((entry): entry is { id: string; index: number; card: BeastCard } => Boolean(entry.card))
      .filter((entry) => entry.card.cost <= active.mana);
    if (candidates.length === 0) break;
    candidates.sort((a, b) => b.card.cost - a.card.cost
      || b.card.stats.speed - a.card.stats.speed
      || a.card.id.localeCompare(b.card.id));
    const chosen = candidates[0];
    active.hand.splice(chosen.index, 1);
    active.mana -= chosen.card.cost;

    const instance = instantiate(chosen.card, `${state.active}-${chosen.card.id}-t${state.turn}-${summoned}`);
    // 保留現有站位，補進真正的空格；不能拿陣列長度當站位。
    const slot = Array.from({ length: MAX_FIELD }, (_, index) => index)
      .find((index) => !active.field.some((unit) => !unit.instance.defeated && unit.slot === index))!;
    active.field.push({ instance, card: chosen.card, slot });
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
  let directHits = 0;
  /*
    先手第一回合不進攻。

    只補一張牌不夠：實測十二場仍是先手十二勝、後手零勝。
    原因是結構性的——先手在對手還沒動過任何一步之前就已經打了一輪，
    而雙方出戰三席開場就在場上，那一輪的價值特別大。

    讓先手第一回合只能布陣與召喚、不能攻擊，是自動對戰常見的解法：
    規則簡單、客戶看得懂，而且不必動任何一張卡的數值。
  */
  const firstTurnNoAttack = state.turn === 1 && state.active === state.firstPlayer;
  if (firstTurnNoAttack) {
    note(state, phase, '先手第一回合不進攻（後手補償）');
  }
  for (const attackerInstance of (firstTurnNoAttack ? [] : attackers)) {
    const attackerUnit = active.field.find((unit) => unit.instance === attackerInstance);
    if (!attackerUnit || attackerUnit.instance.defeated) continue;
    const targets = enemy.field.filter((unit) => !unit.instance.defeated);
    if (targets.length === 0) {
      /*
        對面場上沒有神獸，攻擊直接落在本命上。
        直擊用有效攻擊力，不再扣防禦——沒有神獸擋，就是沒有防禦。
        暈眩中的不能打，這一點與打神獸時一致。
      */
      if (attackerUnit.instance.stunnedTurns > 0) continue;
      const direct = effectiveStat(attackerUnit.instance, 'attack');
      enemy.life = Math.max(0, enemy.life - direct);
      state.log.push({
        type: 'DAMAGE',
        sourceName: attackerUnit.instance.name,
        targetName: `${enemy.side} 本命`,
        applied: direct,
        detail: `直擊本命 ${direct}（對方場上無神獸），剩餘本命 ${enemy.life}`,
      });
      directHits += 1;
      continue;
    }
    /*
      打最前面那一隻，不是打血最少的。

      這一條讓「卡片放在哪一格」變成戰術決定：
      前鋒替後面擋刀，所以前鋒該放硬的；後陣被保護著，所以放脆但能打的。
      如果照血量挑目標，站位就沒有意義，組陣畫面也只是個表單。
      同排時用 instanceId 排，保證同一場永遠同一順序（可重現）。
    */
    targets.sort((a, b) => a.slot - b.slot || a.instance.instanceId.localeCompare(b.instance.instanceId));
    const target = targets[0];
    performAttack({
      attackerCard: attackerUnit.card,
      attacker: attackerUnit.instance,
      defenderCard: target.card,
      defender: target.instance,
      context,
      defenderContext: { side: sideChannelFor(enemy), usage: enemy.usage, log: state.log },
    });
    attacks += 1;
  }
  note(state, phase, attacks + directHits > 0
    ? `${attacks} 次交戰、${directHits} 次直擊本命，對方本命剩 ${enemy.life}`
    : '無可攻擊目標');

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
  // 效果以持有者自己的回合計時。對手剛被暈眩，不能在施術者回合結束就清除。
  for (const unit of active.field) tickDurations(unit.instance);
  checkWinner(state);
  note(state, phase, state.winner ? `勝負已分：${state.winner}` : `第 ${state.turn} 回合結束`);

  if (!state.winner) {
    state.active = state.active === 'PLAYER' ? 'OPPONENT' : 'PLAYER';
    if (state.active === state.firstPlayer) state.turn += 1;
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

/** 出戰三席。客戶在組陣畫面把神獸放進這三格，決鬥開場就在場上。 */
export const LINEUP_SLOTS = 3;
/** 雙方開場使用同一份預算，高階卡必須搭配低成本夥伴。 */
export const MAX_LINEUP_COST = 12;

export interface LineupSetup {
  /** 三張出戰卡的 id，依序＝前鋒、中軍、後陣。 */
  lineup: string[];
  /** 牌組（不含出戰三席）。 */
  deck: string[];
}

/**
 * 出戰三席直接布陣。
 *
 * 為什麼三席不用付氣：它們是「開場陣容」，不是這一回合打出來的。
 * 客戶已經在組陣畫面付出選擇的成本，開場就該看到自己挑的三隻站在場上——
 * 否則辛苦選完，開局還要等抽牌，選擇的感覺就斷掉了。
 *
 * 順序就是站位：第一張站前鋒，替後面兩隻擋刀。
 */
export function deployLineup(state: GameState, side: PlayerSide, lineup: string[]): void {
  const verdict = validateLineup(lineup);
  if (!verdict.ready) throw new Error(`LINEUP_INVALID: ${verdict.reason}`);
  const player = state.players[side];
  if (player.field.length > 0) throw new Error('LINEUP_ALREADY_DEPLOYED: 已完成布陣。');
  const context: BattleContext = { side: sideChannelFor(player), usage: player.usage, log: state.log };

  lineup.slice(0, LINEUP_SLOTS).forEach((cardId, index) => {
    const card = getCard(cardId);
    if (!card) return;
    const instance = instantiate(card, `${side}-lineup-${index}-${card.id}`);
    player.field.push({ instance, card, slot: index });
    triggerSkills({ card, self: instance, enemy: null, trigger: 'ON_SUMMON', context });
    triggerSkills({ card, self: instance, enemy: null, trigger: 'PASSIVE', context });
  });

  state.timeline.push({
    turn: 0,
    side,
    phase: 'TURN_START',
    note: `布陣：${player.field.map((u, i) => `${['前鋒', '中軍', '後陣'][i] ?? `第${i + 1}席`}${u.card.name}`).join('、')}`,
  });
}

/**
 * 從組陣結果開一場決鬥。
 *
 * 這是前端唯一該呼叫的開局入口：把客戶選的三席與牌組交進來，
 * 回傳一個已經布好陣的 GameState。前端不自己擺卡、不自己算誰在前面。
 */
export function createDuel(options: {
  player: LineupSetup;
  opponent: LineupSetup;
  seed: number;
}): GameState {
  for (const setup of [options.player, options.opponent]) {
    const verdict = validateLineup(setup.lineup);
    if (!verdict.ready) throw new Error(`LINEUP_INVALID: ${verdict.reason}`);
  }
  const state = createGame({
    playerDeck: options.player.deck,
    opponentDeck: options.opponent.deck,
    seed: options.seed,
  });
  deployLineup(state, 'PLAYER', options.player.lineup);
  deployLineup(state, 'OPPONENT', options.opponent.lineup);
  return state;
}

/**
 * 檢查一份組陣能不能開戰。
 *
 * 三席沒放滿就不准開始——這是客戶看得到的規則，
 * 所以理由要講得出來，不是把按鈕變灰就算了。
 */
export function validateLineup(lineup: Array<string | null>): { ready: boolean; reason: string } {
  if (!Array.isArray(lineup) || lineup.length !== LINEUP_SLOTS) {
    return { ready: false, reason: '出戰陣容必須剛好三個位置。' };
  }
  if (lineup.some((id) => id !== null && (typeof id !== 'string' || !id.trim()))) {
    return { ready: false, reason: '請從卡池選擇有效的神獸卡。' };
  }
  const filled = lineup.filter((id): id is string => Boolean(id));
  if (filled.length < LINEUP_SLOTS) {
    return { ready: false, reason: `還要再放 ${LINEUP_SLOTS - filled.length} 張神獸卡才能開始決鬥。` };
  }
  if (new Set(filled).size !== filled.length) {
    return { ready: false, reason: '同一張神獸卡不能同時站兩個位置。' };
  }
  const unknown = filled.filter((id) => !getCard(id));
  if (unknown.length > 0) {
    return { ready: false, reason: `有卡片不在正式牌庫裡：${unknown.join('、')}` };
  }
  const cost = filled.reduce((sum, id) => sum + getCard(id)!.cost, 0);
  if (cost > MAX_LINEUP_COST) {
    return { ready: false, reason: `布陣共 ${cost} 氣，上限 ${MAX_LINEUP_COST} 氣；換一張低氣卡。` };
  }
  return { ready: true, reason: '三席已滿，可以開始決鬥。' };
}

/** 對手也只能使用三張不重複、同預算的開場卡。 */
export function buildLineup(cardIds: string[], rng: () => number): string[] {
  const candidates = shuffle([...new Set(cardIds)].filter((id) => getCard(id)), rng);
  function select(start: number, chosen: string[], cost: number): string[] | null {
    if (chosen.length === LINEUP_SLOTS) return chosen;
    for (let index = start; index < candidates.length; index += 1) {
      const id = candidates[index];
      const nextCost = cost + getCard(id)!.cost;
      if (nextCost > MAX_LINEUP_COST) continue;
      const result = select(index + 1, [...chosen, id], nextCost);
      if (result) return result;
    }
    return null;
  }
  const result = select(0, [], 0);
  if (!result) throw new Error('LINEUP_UNAVAILABLE: 沒有符合預算的三張卡。');
  return result;
}

/** 技能是否真的存在於 Registry。給驗證與除錯用。 */
export function skillExists(id: string): boolean {
  return Boolean(getSkill(id));
}
