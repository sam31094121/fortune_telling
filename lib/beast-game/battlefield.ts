/**
 * 神獸戰場系統 V1・區域與移動規則
 * ============================================================================
 *
 * 業主定調（工程師專用｜直接開工）：
 *   「本次先不要重做 60 張卡片內容。先完成最重要的：戰場。」
 *   「先讓玩家一眼看懂：卡在哪裡、哪隻正在戰鬥、下一張可以放哪裡。」
 *
 * 【這一支管什麼、不管什麼】
 *
 * 管：卡片在哪一區、能不能移到某一格、移動之後狀態長什麼樣。
 * 不管：傷害、技能、勝負。那些在 lib/beast-game/interactive.ts 與 battle.ts，
 *       **這裡一行都不重算**——CLAUDE.md 鐵律：不得建立第二套遊戲核心。
 *
 * 換句話說這是「桌面」，不是「規則書」。桌面負責卡放哪裡，
 * 規則書負責打起來會怎樣。兩者分開，之後要換戰鬥規則不必動桌面。
 *
 * 【第九條：一張卡只能存在一個位置】
 *
 * 業主寫明「禁止：同一張卡同時 HAND + ACTIVE」。
 * 光靠小心是守不住的，所以每次移動都走 moveCard()，
 * 它先從來源拔掉、再放進目的地，並且 assertOneZone() 會逐張數，
 * 數到有卡出現兩次就丟例外——寧可當場炸，也不要讓兩個位置各有半張卡。
 */

/** 卡片可能在的位置。一張卡同一時間只能在其中一個。 */
export type CardZone = 'DECK' | 'HAND' | 'BENCH' | 'ACTIVE' | 'DISCARD';

export type PlayerSide = 'PLAYER' | 'OPPONENT';

/** 回合階段。第一版只走這四段，不再細分。 */
export type BattlePhase = 'DRAW' | 'PREPARE' | 'BATTLE' | 'END';

/** 後備區格數。業主定調第一版五格。 */
export const BENCH_SIZE = 5;

/** 起始手牌張數。 */
export const OPENING_HAND = 5;

export interface PlayerBattleState {
  deck: string[];
  hand: string[];
  active: string | null;
  /** 固定長度 BENCH_SIZE，空格是 null——格子是位置，不是清單。 */
  bench: Array<string | null>;
  discard: string[];
  /**
   * 目前蓋著的卡。
   *
   * 業主定調：「某些神獸先以背面進場，對方不知道是哪一隻；
   * 達到條件後翻牌 → 神獸顯形 → 技能發動。」
   *
   * 只記在場上（主戰／後備）的那幾張。離開場面就自動不再蓋著——
   * 一張進了棄牌堆還標成「蓋著」，之後誰都說不清它到底翻過沒有。
   */
  faceDown: string[];
}

export interface BattleState {
  turn: number;
  currentPlayer: PlayerSide;
  phase: BattlePhase;
  player: PlayerBattleState;
  opponent: PlayerBattleState;
  /** 目前選取的卡。點卡→選位置的兩段式操作靠它。 */
  selectedCardId: string | null;
}

/** 一個可以放卡的目的地。UI 拿它來讓合法位置發光。 */
export type Destination =
  | { zone: 'ACTIVE' }
  | { zone: 'BENCH'; slotIndex: number }
  | { zone: 'DISCARD' };

/* ────────────────────────────────────────────────────────────────────────────
   建立與洗牌
   ──────────────────────────────────────────────────────────────────────── */

/**
 * 洗牌。
 *
 * 收一個 rng 而不是自己呼叫 Math.random——同一顆種子要能洗出同一副牌，
 * 否則「重播」跟「回報問題」都無從查起。
 */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

function emptySide(deck: string[]): PlayerBattleState {
  return { deck, hand: [], active: null, bench: Array(BENCH_SIZE).fill(null), discard: [], faceDown: [] };
}

const sideKey = (side: PlayerSide) => (side === 'PLAYER' ? 'player' : 'opponent');

function drawInto(side: PlayerBattleState): void {
  const card = side.deck.shift();
  if (card) side.hand.push(card);
}

/**
 * 開一場新的。
 *
 * 雙方各自洗自己的牌庫、各抽起始手牌。
 * 起始階段是 PREPARE：先選主戰、再擺後備，還沒進戰鬥。
 */
export function newBattle(
  playerDeck: readonly string[],
  opponentDeck: readonly string[],
  rng: () => number,
): BattleState {
  const state: BattleState = {
    turn: 1,
    currentPlayer: 'PLAYER',
    phase: 'PREPARE',
    player: emptySide(shuffle(playerDeck, rng)),
    opponent: emptySide(shuffle(opponentDeck, rng)),
    selectedCardId: null,
  };
  for (let i = 0; i < OPENING_HAND; i += 1) {
    drawInto(state.player);
    drawInto(state.opponent);
  }
  assertOneZone(state);
  return state;
}

/** 抽一張。牌庫空了就什麼都不做——第一版不做疲勞傷害。 */
export function draw(state: BattleState, side: PlayerSide): BattleState {
  const next = clone(state);
  drawInto(next[sideKey(side)]);
  assertOneZone(next);
  return next;
}

/* ────────────────────────────────────────────────────────────────────────────
   合法性：UI 只問「能不能」，不自己判斷
   ──────────────────────────────────────────────────────────────────────── */

/** 這張卡現在在哪一區。找不到回 null。 */
export function zoneOf(state: BattleState, side: PlayerSide, cardId: string): CardZone | null {
  const s = state[sideKey(side)];
  if (s.active === cardId) return 'ACTIVE';
  if (s.hand.includes(cardId)) return 'HAND';
  if (s.bench.includes(cardId)) return 'BENCH';
  if (s.deck.includes(cardId)) return 'DECK';
  if (s.discard.includes(cardId)) return 'DISCARD';
  return null;
}

/**
 * 這張卡現在可以放到哪些位置。
 *
 * UI 拿這個清單讓合法格子發光——**判斷只有這一份**，
 * 畫面不得自己另外算一套「看起來可以放」。
 */
export function legalDestinations(
  state: BattleState,
  side: PlayerSide,
  cardId: string,
): Destination[] {
  const s = state[sideKey(side)];
  const from = zoneOf(state, side, cardId);
  if (!from) return [];

  const out: Destination[] = [];
  const emptyBench = s.bench.flatMap((slot, index) => (slot === null ? [index] : []));

  if (from === 'HAND') {
    // 手牌可以上主戰（空著才行）或放進後備空格。
    if (s.active === null) out.push({ zone: 'ACTIVE' });
    for (const index of emptyBench) out.push({ zone: 'BENCH', slotIndex: index });
  }

  if (from === 'BENCH') {
    // 後備換上主戰。主戰有人就是交換，不是擠掉——所以永遠合法。
    out.push({ zone: 'ACTIVE' });
  }

  if (from === 'ACTIVE') {
    // 主戰退回後備，要有空格。沒空格就換不下來，這是規則不是缺陷。
    for (const index of emptyBench) out.push({ zone: 'BENCH', slotIndex: index });
  }

  return out;
}

export function canMove(
  state: BattleState,
  side: PlayerSide,
  cardId: string,
  to: Destination,
): boolean {
  return legalDestinations(state, side, cardId).some((d) => {
    if (d.zone !== to.zone) return false;
    if (d.zone === 'BENCH' && to.zone === 'BENCH') return d.slotIndex === to.slotIndex;
    return true;
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   移動
   ──────────────────────────────────────────────────────────────────────── */

function removeEverywhere(s: PlayerBattleState, cardId: string): void {
  s.hand = s.hand.filter((id) => id !== cardId);
  s.deck = s.deck.filter((id) => id !== cardId);
  s.discard = s.discard.filter((id) => id !== cardId);
  s.bench = s.bench.map((slot) => (slot === cardId ? null : slot));
  if (s.active === cardId) s.active = null;
  // 離開場面就不再是「蓋著」。一張進了棄牌堆還標成蓋著，
  // 之後誰都說不清它到底翻過沒有。
  s.faceDown = s.faceDown.filter((id) => id !== cardId);
}

/**
 * 把一張卡移到目的地。
 *
 * 非法就丟例外，不是靜靜不動——靜靜不動會讓客戶以為自己沒點到，
 * 一直點；丟例外則是在開發期就把錯抓出來。
 */
export function moveCard(
  state: BattleState,
  side: PlayerSide,
  cardId: string,
  to: Destination,
  options: { faceDown?: boolean } = {},
): BattleState {
  /*
    蓋牌的守衛排在合法性之前。

    兩個都會擋下來，但訊息不一樣：「不能放到那裡」講的是位置，
    「棄牌堆沒有蓋牌這回事」講的是呼叫端把參數用錯了。
    後者更具體，先報它才幫得上忙。
  */
  if (options.faceDown && to.zone === 'DISCARD') {
    throw new Error('棄牌堆沒有蓋牌這回事。');
  }
  if (!canMove(state, side, cardId, to)) {
    throw new Error(`這張卡不能放到那裡：${cardId} → ${to.zone}`);
  }
  const next = clone(state);
  const s = next[sideKey(side)];

  if (to.zone === 'ACTIVE') {
    // 主戰上已經有神獸就是「交換」：它退回這張卡原本的位置。
    const incomingFrom = zoneOf(state, side, cardId);
    const incomingSlot = s.bench.indexOf(cardId);
    const outgoing = s.active;
    removeEverywhere(s, cardId);
    s.active = cardId;
    if (outgoing) {
      if (incomingFrom === 'BENCH' && incomingSlot >= 0) {
        s.bench[incomingSlot] = outgoing;
      } else {
        const free = s.bench.indexOf(null);
        // 後備滿了才會走到棄牌；不讓卡憑空消失是底線。
        if (free >= 0) s.bench[free] = outgoing;
        else s.discard.push(outgoing);
      }
    }
  } else if (to.zone === 'BENCH') {
    removeEverywhere(s, cardId);
    s.bench[to.slotIndex] = cardId;
  } else {
    removeEverywhere(s, cardId);
    s.discard.push(cardId);
  }

  // 蓋著進場：只有進到場上（主戰／後備）才成立。
  if (options.faceDown && !s.faceDown.includes(cardId)) s.faceDown.push(cardId);

  next.selectedCardId = null;
  assertOneZone(next);
  return next;
}

/* ────────────────────────────────────────────────────────────────────────────
   蓋牌與翻牌
   ──────────────────────────────────────────────────────────────────────── */

/** 這張卡現在是不是蓋著的。 */
export function isFaceDown(state: BattleState, side: PlayerSide, cardId: string): boolean {
  return state[sideKey(side)].faceDown.includes(cardId);
}

/**
 * 翻牌顯形。
 *
 * 業主定調：「達到條件後翻牌 → 神獸顯形 → 技能發動。」
 * 這裡只負責翻——條件由呼叫端決定，技能由 interactive.ts 執行。
 * 翻一張沒有蓋著的卡是呼叫端的錯，所以丟例外而不是靜靜略過。
 */
export function flipUp(state: BattleState, side: PlayerSide, cardId: string): BattleState {
  if (!isFaceDown(state, side, cardId)) throw new Error(`這張卡本來就是正面的：${cardId}`);
  const next = clone(state);
  const s = next[sideKey(side)];
  s.faceDown = s.faceDown.filter((id) => id !== cardId);
  return next;
}

/** 對手蓋著的卡在畫面上的代號。不是卡片 id，因為根本不該知道是哪一張。 */
export const HIDDEN_CARD = '__FACE_DOWN__';

/**
 * 把狀態改成「某一方看得到的樣子」。
 *
 * **講清楚目前的限制**：這一版整份狀態都在瀏覽器裡，
 * 對手蓋的牌是什麼，打開開發者工具就看得到。
 * 真正的隱藏必須由伺服器持有狀態、只回傳這個函式的結果。
 *
 * 先做出這個形狀，是為了之後搬上伺服器時不必改介面——
 * 而不是假裝現在就藏得住。畫面請用它取值，不要直接讀對手的 bench／active。
 */
export function redactFor(state: BattleState, viewer: PlayerSide): BattleState {
  const foeKey = viewer === 'PLAYER' ? 'opponent' : 'player';
  const next = clone(state);
  const foe = next[foeKey];
  const hide = (cardId: string | null) =>
    cardId && foe.faceDown.includes(cardId) ? HIDDEN_CARD : cardId;
  foe.active = hide(foe.active);
  foe.bench = foe.bench.map(hide);
  // 手牌與牌庫本來就不該讓對方看見內容，只留張數。
  foe.hand = foe.hand.map(() => HIDDEN_CARD);
  foe.deck = foe.deck.map(() => HIDDEN_CARD);
  foe.faceDown = [];
  return next;
}

/** 點卡選取／再點一次取消。合法目標由 legalDestinations 提供。 */
export function selectCard(state: BattleState, cardId: string | null): BattleState {
  const next = clone(state);
  next.selectedCardId = next.selectedCardId === cardId ? null : cardId;
  return next;
}

/* ────────────────────────────────────────────────────────────────────────────
   不變式
   ──────────────────────────────────────────────────────────────────────── */

function countCards(s: PlayerBattleState): Map<string, number> {
  const seen = new Map<string, number>();
  const bump = (id: string) => seen.set(id, (seen.get(id) ?? 0) + 1);
  s.deck.forEach(bump);
  s.hand.forEach(bump);
  s.discard.forEach(bump);
  s.bench.forEach((slot) => {
    if (slot) bump(slot);
  });
  if (s.active) bump(s.active);
  return seen;
}

/**
 * 一張卡只能存在一個位置（業主定調第九條）。
 *
 * 每次移動之後都跑一次。這種不變式不能靠「應該不會發生」——
 * 一旦破了，畫面上會出現同一隻神獸在手牌又在場上，客戶會直接說這是外掛。
 */
export function assertOneZone(state: BattleState): void {
  for (const side of ['player', 'opponent'] as const) {
    const s = state[side];
    if (s.bench.length !== BENCH_SIZE) {
      throw new Error(`${side} 後備格數應為 ${BENCH_SIZE}，實際 ${s.bench.length}`);
    }
    for (const entry of countCards(s)) {
      if (entry[1] > 1) {
        throw new Error(`${side} 的「${entry[0]}」同時出現在 ${entry[1]} 個位置`);
      }
    }
    // 蓋著的卡一定要真的在場上。標記留在不在場的卡上，
    // 之後就會出現「翻不開的牌」或「翻了兩次的牌」。
    for (const cardId of s.faceDown) {
      const onField = s.active === cardId || s.bench.includes(cardId);
      if (!onField) throw new Error(`${side} 的「${cardId}」標成蓋著，卻不在場上`);
    }
    if (new Set(s.faceDown).size !== s.faceDown.length) {
      throw new Error(`${side} 的蓋牌清單有重複`);
    }
  }
}

function cloneSide(s: PlayerBattleState): PlayerBattleState {
  return {
    deck: s.deck.slice(),
    hand: s.hand.slice(),
    active: s.active,
    bench: s.bench.slice(),
    discard: s.discard.slice(),
    faceDown: s.faceDown.slice(),
  };
}

function clone(state: BattleState): BattleState {
  return {
    turn: state.turn,
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    selectedCardId: state.selectedCardId,
    player: cloneSide(state.player),
    opponent: cloneSide(state.opponent),
  };
}
