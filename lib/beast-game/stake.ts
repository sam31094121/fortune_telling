/**
 * 神獸卡遊戲｜賭注結算
 * ============================================================================
 *
 * 業主定調：「輸贏雙方各放一張卡片進去，贏的人可以獲得一張卡片，
 * 輸的人那張卡片則會被沒收。」
 *
 * 這是整套遊戲裡**唯一會拿走客戶東西**的機制，所以規則要毫不含糊，
 * 而且每一步都要說得出來：
 *
 *   贏 → 拿走對手押的那張，進你的收藏
 *   輸 → 你押的那張被沒收
 *   平 → 各自拿回，誰也沒損失
 *
 * 【三條紀律】
 *
 * 1 押注前一定要先講清楚會失去什麼。
 *   沒收本身不是問題，偷偷沒收才是。所以 describeStakeRisk() 是給
 *   「按下開始之前」用的，不是事後才補一句。
 *
 * 2 結算只有這一支檔案說了算。
 *   前端不得自己判斷誰拿走誰的卡——它連「贏了沒」都不該自己算。
 *
 * 3 不得把沒收寫得很輕描淡寫。
 *   輸掉就是輸掉，訊息要讓客戶清楚知道那張卡不在了，
 *   而不是用「本次未獲得獎勵」這種話把沒收藏起來。
 */

import type { PlayerSide } from './battle';

export type DuelOutcome = PlayerSide | 'DRAW';

export interface StakeInput {
  /** 玩家押的卡 id。 */
  playerStake: string;
  /** 對手押的卡 id。 */
  opponentStake: string;
  /** 由 Game Core 判定的勝負，不接受前端傳結果。 */
  winner: DuelOutcome | null;
}

export interface StakeResult {
  /** 這一場押注怎麼收場。 */
  verdict: 'WON' | 'LOST' | 'RETURNED';
  /** 玩家獲得的卡 id（贏才有）。 */
  gainedCardId: string | null;
  /** 玩家被沒收的卡 id（輸才有）。 */
  forfeitedCardId: string | null;
  /** 玩家收藏的淨變化：+1 / -1 / 0。 */
  netChange: 1 | -1 | 0;
  /** 給客戶看的一句話。照實講，不修飾。 */
  message: string;
  /** 押注雙方的原始內容，供回查。 */
  stakes: { player: string; opponent: string };
}

/**
 * 結算押注。
 *
 * winner 為 null（例如對戰沒跑完）時一律當成平手把卡還回去——
 * 系統自己出狀況，不能由客戶承擔損失。
 */
export function resolveStake(input: StakeInput): StakeResult {
  const stakes = { player: input.playerStake, opponent: input.opponentStake };

  if (input.winner === 'PLAYER') {
    return {
      verdict: 'WON',
      gainedCardId: input.opponentStake,
      forfeitedCardId: null,
      netChange: 1,
      message: '你贏了這一場，對手押上的神獸卡歸你，已放進你的收藏。',
      stakes,
    };
  }

  if (input.winner === 'OPPONENT') {
    return {
      verdict: 'LOST',
      gainedCardId: null,
      forfeitedCardId: input.playerStake,
      netChange: -1,
      message: '你輸了這一場，你押上的那張神獸卡被沒收了，已從你的收藏移除。',
      stakes,
    };
  }

  // 平手，或戰局沒有跑完：兩邊都拿回自己的卡。
  return {
    verdict: 'RETURNED',
    gainedCardId: null,
    forfeitedCardId: null,
    netChange: 0,
    message: input.winner === 'DRAW'
      ? '這一場平手，雙方押上的神獸卡各自拿回，誰也沒有損失。'
      : '這一場沒有分出勝負，你押上的神獸卡原樣退回。',
    stakes,
  };
}

/**
 * 押注前的風險告知。
 *
 * 這段話要出現在「開始決鬥」之前，不是結算之後。
 * 客戶按下去的那一刻，就該已經知道輸了會失去哪一張。
 */
export function describeStakeRisk(stakeCardName: string | null): {
  canStart: boolean;
  headline: string;
  detail: string;
} {
  if (!stakeCardName) {
    return {
      canStart: false,
      headline: '還要放一張賭注卡',
      detail: '賭注格要放一張神獸卡才能開始。贏了拿走對手押的那張，輸了這張會被沒收。',
    };
  }
  return {
    canStart: true,
    headline: `你押上的是「${stakeCardName}」`,
    detail: `贏了：對手押的那張歸你。輸了：「${stakeCardName}」會被沒收，從你的收藏移除。平手：各自拿回。`,
  };
}

/**
 * 賭注卡能不能押。
 *
 * 刻意允許「賭注卡同時也在出戰三席裡」——那是客戶自己的取捨：
 * 派最強的上場但也押上它，或者押一張捨得的。
 * 這裡只擋真正不合理的：卡不存在。
 */
export function validateStake(
  stakeCardId: string | null,
  isKnownCard: (id: string) => boolean,
): { ready: boolean; reason: string } {
  if (!stakeCardId) {
    return { ready: false, reason: '賭注格還是空的，放一張神獸卡才能開始決鬥。' };
  }
  if (!isKnownCard(stakeCardId)) {
    return { ready: false, reason: `這張卡不在正式牌庫裡：${stakeCardId}` };
  }
  return { ready: true, reason: '賭注已下，可以開始決鬥。' };
}
