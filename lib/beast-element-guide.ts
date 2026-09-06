/**
 * 相生相剋・給客戶看的說明
 * ============================================================================
 *
 * 業主定調：「讓客戶知道、學會相生相剋的概念。」
 *
 * 技能檔案〈二十一〉量過：帶剋的幼子百分之百打贏被剋的四象。
 * 規則早就成立了，缺的是**客戶看不看得出來**——
 * 打輸的人只會覺得對面比較強，不會知道自己帶錯了元素。
 *
 * 【這一支只翻譯，不算數值】
 *
 * 倍率來自 lib/beast-game/elements.ts 的 elementMultiplier()，
 * 那是傷害公式在用的同一份。這裡把它翻成人話，
 * 一個數字都不重算——畫面自己算一套，遲早跟實際傷害對不上。
 */

import { elementMultiplier, ELEMENT_LABEL, type BeastElement } from './beast-game/elements';

export type Matchup = 'ADVANTAGE' | 'DISADVANTAGE' | 'NEUTRAL';

export interface ElementMatchup {
  kind: Matchup;
  multiplier: number;
  /** 一句話，出戰前就要看得懂。 */
  headline: string;
  /** 為什麼——客戶要學得到，就不能只給結論。 */
  reason: string;
}

/**
 * 我方對上對方，是剋、被剋、還是無關。
 *
 * 講法刻意直白：「你剋他」「他剋你」，不用「屬性優勢」這種
 * 看完還要再想一下的字。學得會的前提是先看得懂。
 */
export function describeMatchup(mine: BeastElement, theirs: BeastElement): ElementMatchup {
  const multiplier = elementMultiplier(mine, theirs);
  const me = ELEMENT_LABEL[mine] ?? mine;
  const foe = ELEMENT_LABEL[theirs] ?? theirs;

  if (multiplier > 1) {
    return {
      kind: 'ADVANTAGE',
      multiplier,
      headline: `${me}剋${foe}．你占上風`,
      reason: `你的每一擊乘 ${multiplier}，同樣的攻擊打得更痛。`,
    };
  }
  if (multiplier < 1) {
    return {
      kind: 'DISADVANTAGE',
      multiplier,
      headline: `${foe}剋${me}．你吃虧`,
      reason: `你的每一擊只剩 ${multiplier}。換一隻剋他的神獸，勝算差很多。`,
    };
  }
  return {
    kind: 'NEUTRAL',
    multiplier,
    headline: `${me}對${foe}．互不相剋`,
    reason: '這一組沒有相剋關係，比的是數值與技能。',
  };
}

/**
 * 打完之後，講得出為什麼。
 *
 * 業主定調的第三件事：「輸掉時講得出原因，而不是只說『你輸了』。」
 * 所以結果一定附上那一場的元素對位——
 * 客戶要能把「我輸了」跟「我帶錯元素」連起來，才學得到東西。
 */
export function explainOutcome(
  winner: 'player' | 'opponent' | 'DRAW' | null,
  matchup: ElementMatchup,
): string {
  const tail = matchup.kind === 'NEUTRAL'
    ? '這一場沒有相剋關係，勝負來自數值、技能與換陣時機。'
    : `${matchup.headline}——${matchup.reason}`;

  if (winner === 'player') {
    return matchup.kind === 'ADVANTAGE'
      ? `你贏了。${tail}帶對元素，這一場你從第一擊就占著便宜。`
      : `你贏了。${tail}`;
  }
  if (winner === 'opponent') {
    return matchup.kind === 'DISADVANTAGE'
      /*
        輸掉時最重要的一句：把「我輸了」跟「我帶錯元素」接起來。

        不重複 reason 裡已經講過的「換一隻剋他的」——
        同一件事說兩次，客戶會整段跳過，反而什麼都沒讀到。
      */
      ? `對手獲勝。不是牠比較強，是你這一隻被剋：${matchup.headline}，每一擊只剩 ${matchup.multiplier}。下一場換一隻剋牠的試試。`
      : `對手獲勝。${tail}`;
  }
  return `平手。${tail}`;
}
