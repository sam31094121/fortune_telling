export const MAX_STAKE_CARDS = 20;
export const MAX_REWARD_CARDS = 100;

/** 輸少贏多：贏得張數不少於本場押注張數；技術獎勵更高就照技術給，最多 MAX_REWARD_CARDS 張。 */
export function stakeRewardCount(stakedCount: number, skillBonus: number): number {
  const staked = Math.min(MAX_STAKE_CARDS, Math.max(1, Math.floor(Number.isFinite(stakedCount) ? stakedCount : 1)));
  const bonus = Math.max(0, Math.floor(Number.isFinite(skillBonus) ? skillBonus : 0));
  return Math.min(MAX_REWARD_CARDS, Math.max(staked, bonus));
}

/** 押注前給客戶看的三句話，張數隨押注即時變動。 */
/**
 * 開戰前的「怎麼分配」一眼看懂版（只有張數）：
 * 贏＝押的全保留、再得至少同樣張數（最多 MAX_REWARD_CARDS）；輸＝只失去押上的；平手＝全退回。
 * 張數規則與 stakeRewardCount／describeStakeOdds 同一來源，這裡只是更短的說法。
 */
export function describeStakeBrief(stakedCount: number): { win: string; lose: string; draw: string } {
  const staked = Math.min(MAX_STAKE_CARDS, Math.max(1, Math.floor(Number.isFinite(stakedCount) ? stakedCount : 1)));
  return {
    win: `押的 ${staked} 張全留，再得 ${staked}～${MAX_REWARD_CARDS} 張`,
    lose: `失去押的 ${staked} 張，其他卡都留著`,
    draw: `${staked} 張全部退回`,
  };
}
export function describeStakeOdds(stakedCount: number): { lose: string; win: string; draw: string } {
  const staked = Math.min(MAX_STAKE_CARDS, Math.max(1, Math.floor(Number.isFinite(stakedCount) ? stakedCount : 1)));
  return {
    lose: `輸了：只失去這 ${staked} 張，不會多扣。`,
    win: `贏了：押注卡保留，至少再得 ${staked} 張；打得越漂亮越多，最多 ${MAX_REWARD_CARDS} 張。`,
    draw: '平手：押注卡原樣退回。',
  };
}
