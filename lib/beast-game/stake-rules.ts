export const MAX_STAKE_CARDS = 20;
export const MAX_REWARD_CARDS = 100;

/** 輸少贏多：贏得張數不少於本場押注張數；技術獎勵更高就照技術給，最多 MAX_REWARD_CARDS 張。 */
export function stakeRewardCount(stakedCount: number, skillBonus: number): number {
  const staked = Math.min(MAX_STAKE_CARDS, Math.max(1, Math.floor(Number.isFinite(stakedCount) ? stakedCount : 1)));
  const bonus = Math.max(0, Math.floor(Number.isFinite(skillBonus) ? skillBonus : 0));
  return Math.min(MAX_REWARD_CARDS, Math.max(staked, bonus));
}

/** 押注前給客戶看的三句話，張數隨押注即時變動。 */
export function describeStakeOdds(stakedCount: number): { lose: string; win: string; draw: string } {
  const staked = Math.min(MAX_STAKE_CARDS, Math.max(1, Math.floor(Number.isFinite(stakedCount) ? stakedCount : 1)));
  return {
    lose: `輸了：只失去這 ${staked} 張，不會多扣。`,
    win: `贏了：押注卡保留，至少再得 ${staked} 張；打得越漂亮越多，最多 ${MAX_REWARD_CARDS} 張。`,
    draw: '平手：押注卡原樣退回。',
  };
}
