/**
 * 免費戰場戰績獎勵的「後端計算」：只給 API 路由用，網頁端／收藏帳本不得匯入（會帶進整個戰鬥引擎）。
 * 守門 test:beast-backend-only 掃元件；帳本只匯入 battle-reward.ts（純規則）。
 *
 * 為什麼要重播：引擎每推進一步都會清空戰報（interactive.ts 的 advance 開頭 s.log=[]），
 * 打完整場後 match.log 只剩最後一步，看不出中途是否合體、合到第幾階。
 * 完整歷程在 match.history（每一步雙方動作）；引擎是確定性的（seed＋隊伍＋動作），
 * 所以用同樣的開局重播一遍，就能逐步拿到每一步的合體階。
 * 重播結果必須和實際結果完全一致（勝負、回合數、血量），不一致就不發獎——寧可不發，不憑猜測發。
 */
import { advance, newMatch, type Match } from './interactive';
import { applyCardCampaignStats, type CardCampaign, type OwnedCardRef } from './card-campaign';
import {
  FUSION_TIER_SHARDS, SWIFT_WIN_MAX_ROUNDS, TIER_RANK, battleKeyOf, rewardLines, survivalShards,
  type BattleReward,
} from './battle-reward';
import type { FusionTier } from './fusion';

/**
 * 開局轉換所需的脈絡。三種開局：
 *  - 試用／一般押注戰：沒有 campaign，newMatch 就是整個開局。
 *  - 卡片闖關：newMatch 之後還要 applyCardCampaignStats（上陣副本的強化加成、關卡敵方倍率），
 *    重播時必須用同一份 campaign 與 selectedEntries 重做，否則能力值對不上。
 */
export interface ReplayContext {
  sharedBonuses?: Record<string,number>;
  campaign?: CardCampaign;
  selectedEntries?: readonly OwnedCardRef[];
}

/** 重播整場並回傳我方達到的最高合體階；重播與實際結果對不上回傳 null。 */
export function replayHighestFusionTier(match: Match, context: ReplayContext = {}): FusionTier | null {
  if (match.status !== 'FINISHED') return null;
  try {
    let m = newMatch(match.player.team.map((f) => f.cardId), match.opponent.team.map((f) => f.cardId), match.seed, { difficulty: match.difficulty });
    if (context.campaign) m = applyCardCampaignStats(m, context.campaign, context.selectedEntries, context.sharedBonuses);
    let best: FusionTier = 'NONE';
    for (const step of match.history) {
      m = advance(m, step.player, step.opponent);
      for (const entry of m.log) {
        if (entry.side === 'player' && entry.fusionTier && TIER_RANK[entry.fusionTier] > TIER_RANK[best]) best = entry.fusionTier;
      }
    }
    const same = m.status === match.status && m.winner === match.winner && m.round === match.round
      && m.player.team.every((f, i) => f.hp === match.player.team[i]?.hp)
      && m.opponent.team.every((f, i) => f.hp === match.opponent.team[i]?.hp);
    return same ? best : null;
  } catch {
    return null;
  }
}

/**
 * 只有「已結束」的戰鬥才算得出獎勵；進行中或無法驗證回傳 null，絕不提前揭曉、不憑猜測發獎。
 * 舊存檔、缺欄位或被竄改的戰局一律回傳 null，不丟例外——否則整個戰況 API 會跟著 400。
 */
export function battleRewardFor(match: Match, context: ReplayContext = {}): BattleReward | null {
  try {
    return computeBattleReward(match, context);
  } catch {
    return null;
  }
}

function computeBattleReward(match: Match, context: ReplayContext): BattleReward | null {
  if (!match || match.status !== 'FINISHED') return null;
  const rounds = Math.max(0, match.round - 1);
  const key = battleKeyOf(match);
  if (match.winner !== 'player') {
    return { key, outcome: match.winner === 'opponent' ? 'lose' : 'draw', base: 0, survival: 0, swift: 0, fusion: 0, fusionTier: 'NONE', rounds, lines: [] };
  }
  const fusionTier = replayHighestFusionTier(match, context);
  if (fusionTier === null) return null;
  const fallen = match.player.team.filter((f) => f.hp <= 0).length;
  const parts = {
    base: 1,
    survival: survivalShards(fallen),
    swift: rounds <= SWIFT_WIN_MAX_ROUNDS ? 1 : 0,
    fusion: FUSION_TIER_SHARDS[fusionTier],
    fusionTier,
  };
  return { key, outcome: 'win', ...parts, rounds, lines: rewardLines(parts, fallen) };
}
