import type { Match } from './interactive';

export interface IchingJudgment {
  hexagram: string;
  symbol: string;
  fullName: string;
  tier: number;
  bonusCards: number;
  quote: string;
  verdict: string;
}

/**
 * 以易經六十四卦判斷本場勝利的技術等級，決定額外獎勵卡數（1–20 張）。
 *
 * 技術三維：
 *   存活數  — 三隻全活為最高，零隻存活（險勝）為最低
 *   速度    — 回合越少越快，反映壓制能力
 *   技能率  — 技能行動佔總行動的比例，反映策略深度
 *
 * 分數加總映射到七個易卦等級；每一層對應不同卦象，
 * 越高等卦象獎勵越豐——技術性越高，就多給。
 */
export function judgeVictorySkill(match: Match): IchingJudgment {
  const survivors = match.player.team.filter(f => !f.defeated).length;
  const skillActions = match.history.filter(h => h.player.type === 'SKILL').length;
  const totalActions = match.history.length;
  const skillRate = totalActions > 0 ? skillActions / totalActions : 0;
  const rounds = Math.max(1, match.round - 1);

  const survivorScore = survivors * 22;                              // 0 / 22 / 44 / 66
  const speedScore = Math.max(0, Math.round(24 - rounds * 0.6));    // 0–24（越快越高）
  const skillScore = Math.round(skillRate * 15);                    // 0–15（技能率）
  const total = survivorScore + speedScore + skillScore;             // 0–105

  /*
    押五張、贏最少賠五張——基底對等。
    技術性越高，易經裁定對手賠越多，上限 20 張。
    分數 0-105，映射到七個卦象等級。
  */
  if (total >= 90) {
    const extra = Math.min(5, Math.floor((total - 90) / 3));
    return {
      hexagram: '乾', symbol: '☰', fullName: '乾卦・天行健', tier: 7,
      bonusCards: 15 + extra,
      quote: '天行健，君子以自強不息。',
      verdict: '神獸全員壓制，陽剛至極，天道獎盛世英雄。',
    };
  }
  if (total >= 75) {
    const extra = Math.floor((total - 75) / 5);
    return {
      hexagram: '大有', symbol: '☲', fullName: '大有卦・大業輝煌', tier: 6,
      bonusCards: 12 + extra,
      quote: '大有，元亨。',
      verdict: '上下順應，無往不利，大業已成。',
    };
  }
  if (total >= 60) {
    const extra = Math.floor((total - 60) / 5);
    return {
      hexagram: '豐', symbol: '☳', fullName: '豐卦・豐盛有餘', tier: 5,
      bonusCards: 9 + extra,
      quote: '豐，亨，王假之。',
      verdict: '雷火交攻，威震四方，豐盛有餘。',
    };
  }
  if (total >= 45) {
    const extra = Math.floor((total - 45) / 5);
    return {
      hexagram: '泰', symbol: '☷', fullName: '泰卦・天地交泰', tier: 4,
      bonusCards: 7 + extra,
      quote: '泰，小往大來，吉亨。',
      verdict: '天地相交，陰陽協和，吉象已現。',
    };
  }
  if (total >= 30) {
    const extra = Math.floor((total - 30) / 7);
    return {
      hexagram: '解', symbol: '☵', fullName: '解卦・雷水解難', tier: 3,
      bonusCards: 6 + extra,
      quote: '解，利西南，無所往。',
      verdict: '雷水解難，阻礙已去，前路已開。',
    };
  }
  if (total >= 15) {
    return {
      hexagram: '蹇', symbol: '☶', fullName: '蹇卦・艱難克勝', tier: 2,
      bonusCards: 5,
      quote: '蹇，利西南，不利東北。',
      verdict: '水山險阻，跌宕前進，押五贏五，公平到底。',
    };
  }
  return {
    hexagram: '困', symbol: '☱', fullName: '困卦・困中求勝', tier: 1,
    bonusCards: 5,
    quote: '困，亨，貞，大人吉。',
    verdict: '澤水困境，仍舉勝旗，押五贏五，不多不少。',
  };
}
