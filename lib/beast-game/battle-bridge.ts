/**
 * 戰場 → 戰鬥：橋接層
 * ============================================================================
 *
 * 業主定調〈二十四〉：第一階段 HEALTHY 之後，才增加 HP、攻擊、防禦、速度、
 * 技能、元素、傷害、狀態效果、勝負條件。
 *
 * 【這一支只做翻譯，不做裁判】
 *
 * 戰場（battlefield.ts）知道「誰在場上、誰在後備」。
 * 戰鬥（interactive.ts）知道「打起來會怎樣」。
 * 這一支把前者翻成後者收得下的形狀——**一個數值都不自己算**。
 *
 * 為什麼要分這麼開：傷害、技能、勝負已經在 interactive.ts 通過認證
 * （test:beast-game 194 項）。橋接層一旦開始「順便算一下」，
 * 就變成第二套核心，CLAUDE.md 明文禁止，而且兩套遲早算出不同答案。
 *
 * 【對手用同一套規則佈陣】
 *
 * autoPlaceOpponent() 走的是 battlefield.ts 的 legalDestinations()，
 * 跟玩家完全同一份判斷。對手沒有額外格子、沒有無視規則的捷徑——
 * 「公平對決」不是寫在文案上，是讓兩邊呼叫同一個函式。
 */

import { legalDestinations, moveCard, type BattleState, type PlayerSide } from './battlefield';
import { newMatch, MAX_TEAM, type Match } from './interactive';

/**
 * 一側目前在場上的神獸，主戰排第一。
 *
 * 主戰排第一是刻意的：interactive.ts 的 Match 用 active 索引指目前出戰的那隻，
 * 開場就是 0。順序對不上會變成「畫面顯示 A 在打，實際上核心在打 B」。
 */
export function fieldTeam(state: BattleState, side: PlayerSide): string[] {
  const s = side === 'PLAYER' ? state.player : state.opponent;
  const bench = s.bench.filter((slot): slot is string => Boolean(slot));
  return s.active ? [s.active, ...bench] : bench;
}

export interface StartCheck {
  ready: boolean;
  /** 不能開戰時，講得出是哪一項不足——不是只把按鈕變灰。 */
  reason?: string;
}

/** 能不能開戰。雙方都要有主戰神獸，且隊伍不超過戰場格數。 */
export function canStartBattle(state: BattleState): StartCheck {
  if (!state.player.active) return { ready: false, reason: '先把一隻神獸放到主戰格。' };
  if (!state.opponent.active) return { ready: false, reason: '對手還在佈陣。' };
  for (const side of ['PLAYER', 'OPPONENT'] as PlayerSide[]) {
    const team = fieldTeam(state, side);
    if (team.length > MAX_TEAM) {
      return { ready: false, reason: `上場神獸最多 ${MAX_TEAM} 隻，目前 ${team.length} 隻。` };
    }
  }
  return { ready: true };
}

/**
 * 從目前的佈陣開一場戰鬥。
 *
 * 種子由呼叫端給——同一顆種子要打出同一場，否則重播與回報都查不了。
 */
export function startFromField(state: BattleState, seed: number): Match {
  const check = canStartBattle(state);
  if (!check.ready) throw new Error(check.reason ?? '還不能開戰。');
  return newMatch(fieldTeam(state, 'PLAYER'), fieldTeam(state, 'OPPONENT'), seed);
}

/** Project the resolved match onto the table; never calculate combat here. */
export function fieldFromMatch(state: BattleState, match: Match): BattleState {
  const next = structuredClone(state);
  next.turn = match.round;
  next.phase = match.status === 'FINISHED' ? 'END' : 'BATTLE';
  next.selectedCardId = null;
  for (const key of ['player', 'opponent'] as const) {
    const side = match[key];
    const active = side.team[side.active];
    next[key].active = active && !active.defeated ? active.cardId : null;
    const livingBench = side.team.filter((f, index) => index !== side.active && !f.defeated).map(f => f.cardId);
    next[key].bench = Array.from({length: 5}, (_, index) => livingBench[index] ?? null);
    next[key].discard = [...new Set([...state[key].discard, ...side.team.filter(f => f.defeated).map(f => f.cardId)])];
  }
  return next;
}

/**
 * 對手自動佈陣。
 *
 * 用的是跟玩家完全一樣的 legalDestinations()／moveCard()，
 * 只是選擇由亂數決定。對手沒有特權：一樣要先有主戰、一樣受後備格數限制、
 * 一樣不能把牌庫的卡直接放上場。
 */
export function autoPlaceOpponent(state: BattleState, rng: () => number, benchCount = 2): BattleState {
  let next = state;
  const place = (): boolean => {
    const hand = next.opponent.hand;
    if (!hand.length) return false;
    // 隨機拿一張手牌，看看它現在能放哪裡。
    const cardId = hand[Math.floor(rng() * hand.length)];
    const options = legalDestinations(next, 'OPPONENT', cardId);
    if (!options.length) return false;
    // 主戰還空著就優先補主戰——先站上場才打得起來。
    const active = options.find((d) => d.zone === 'ACTIVE');
    const target = next.opponent.active === null && active
      ? active
      : options[Math.floor(rng() * options.length)];
    next = moveCard(next, 'OPPONENT', cardId, target);
    return true;
  };

  // 一隻主戰 ＋ benchCount 隻後備。放不出來就停，不硬塞。
  for (let attempts = 0; attempts < 1 + benchCount; attempts += 1) {
    if (!place()) break;
  }
  return next;
}
