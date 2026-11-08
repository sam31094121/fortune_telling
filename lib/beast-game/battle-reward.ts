/**
 * 免費戰場「戰利碎片」規則層（純函式，不碰儲存、不播動畫、不擲亂數，不匯入戰鬥引擎）。
 *
 * 業主定調（2026-11-08）：贏了要有看得見的獎賞，打得越好、越合體、連勝越多，獎賞越大，讓客戶想一直玩。
 * 這同時修改了「免費戰鬥不發押卡獎勵」：免費戰場仍然**不發卡、不押卡**，改發「戰利碎片」，
 * 集滿固定片數才兌換一張卡——押卡經濟（輸少贏多、五至二十張）完全不動。
 *
 * 公平與誠實（沿用 docs/beast-game-skill.md〈客戶利益與收藏〉）：
 * - 碎片只依「已經結束的那一場戰鬥紀錄」計算：勝負、倒下人數、回合數、合體階，都是後端真實記錄。
 *   動畫、前端提示、事後手動選級都不能決定碎片數；同一場紀錄一定算出同樣的碎片。
 * - 碎片入帳靠收據鑰匙（battleKey）擋重複：重新整理、重送、重播都不會多給。
 * - 連勝只看本機帳本裡「這一場之前」的連續勝場；輸了歸零，平手不動。
 * - 不虛構價值：不稱碎片有金錢價值，不做倒數或稀缺壓力。
 *
 * 寶珠闖關（困難寶珠戰）有自己獨立、凍結的獎勵契約（每勝一場一張成獸），這裡完全不碰。
 *
 * 這支檔案客戶端（收藏帳本）與伺服器都會用，所以**不得匯入戰鬥引擎**。
 * 需要重播整場戰鬥的 battleRewardFor 在 battle-reward-server.ts（只給 API 路由用）。
 */
import type { Match } from './interactive';
import type { FusionTier } from './fusion';

/** 兌換一張成獸（普通兌換）所需碎片。 */
export const SHARDS_PER_ADULT = 12;
/** 兌換一張四象守護獸（高級兌換）所需碎片。 */
export const SHARDS_PER_GUARDIAN = 40;
/**
 * 「速戰」：這個回合數以內贏下來算速戰（回合數＝match.round - 1）。
 * 依 600 場真實引擎模擬定的：贏局回合中位數 27、第一四分位 22，所以 22 以內約四分之一的勝場拿得到。
 */
export const SWIFT_WIN_MAX_ROUNDS = 22;

/** 合體階 → 額外碎片。越合體越多；只計「我方」在這場實際達到的最高階。 */
export const FUSION_TIER_SHARDS: Record<FusionTier, number> = {
  NONE: 0,
  RESONANCE: 0,
  DUAL_UNSEAL: 1,
  TRUE_FUSION: 2,
  RAGE_ULTIMATE: 3,
};
export const FUSION_TIER_NAME: Record<FusionTier, string> = {
  NONE: '未合體',
  RESONANCE: '共鳴',
  DUAL_UNSEAL: '雙珠解封',
  TRUE_FUSION: '真・合體',
  RAGE_ULTIMATE: '究極暴怒合體',
};
export const TIER_RANK: Record<FusionTier, number> = { NONE: 0, RESONANCE: 1, DUAL_UNSEAL: 2, TRUE_FUSION: 3, RAGE_ULTIMATE: 4 };

export type BattleOutcomeKind = 'win' | 'lose' | 'draw';

/** 後端算好、隨回應送出的戰績獎勵。連勝加成不在這裡（連勝存在本機帳本，由帳本入帳時加上）。 */
export interface BattleReward {
  /** 這一場的唯一鑰匙（防重複入帳）。 */
  key: string;
  outcome: BattleOutcomeKind;
  /** 勝利才有碎片；輸、平手為 0。 */
  base: number;
  /** 倒下人數換的分：全員生還 2、只倒下一隻 1。 */
  survival: number;
  swift: number;
  fusion: number;
  /** 本場實際達到的最高合體階。 */
  fusionTier: FusionTier;
  /** 回合數，給畫面顯示用。 */
  rounds: number;
  /** 後端組好的每一項說明（畫面只照印，不自己組句）。 */
  lines: string[];
}

/** 與 app/api/beast-game/turns 的 battleKey 同一條規則：同一場永遠同一把鑰匙。 */
export function battleKeyOf(match: Pick<Match, 'seed' | 'player' | 'opponent'>): string {
  return `${match.seed}:${match.player.team.map((f) => f.cardId).join(',')}:${match.opponent.team.map((f) => f.cardId).join(',')}`;
}

/** 由戰績各項組出給畫面照印的說明；贏才有。 */
export function rewardLines(r: Pick<BattleReward, 'base' | 'survival' | 'swift' | 'fusion' | 'fusionTier'>, fallen: number): string[] {
  const lines = [`贏得勝利 ＋${r.base}`];
  if (r.survival === 2) lines.push('完勝：全員生還 ＋2');
  else if (r.survival === 1) lines.push(`穩健：只倒下 ${fallen} 隻 ＋1`);
  if (r.swift > 0) lines.push(`速戰：${SWIFT_WIN_MAX_ROUNDS} 回合內獲勝 ＋${r.swift}`);
  if (r.fusion > 0) lines.push(`合體：${FUSION_TIER_NAME[r.fusionTier]} ＋${r.fusion}`);
  return lines;
}

/** 由倒下人數算存活分：0 隻倒下 2 分、1 隻倒下 1 分，其餘 0。 */
export function survivalShards(fallen: number): number {
  return fallen <= 0 ? 2 : fallen === 1 ? 1 : 0;
}

/** 連勝加成：這一場「含」在內的連續勝場數（第 3、5、10 場起階梯加碼）。 */
export function streakBonus(streakIncludingThisWin: number): number {
  if (streakIncludingThisWin >= 10) return 3;
  if (streakIncludingThisWin >= 5) return 2;
  if (streakIncludingThisWin >= 3) return 1;
  return 0;
}

/** 這一場戰績本身的碎片（不含連勝）。 */
export function rewardShards(reward: Pick<BattleReward, 'base' | 'survival' | 'swift' | 'fusion'>): number {
  return reward.base + reward.survival + reward.swift + reward.fusion;
}

/** 距離下一個連勝加碼還差幾場；已到最高階回傳 null。畫面「下一個目標」用。 */
export function winsToNextStreakTier(streak: number): { wins: number; bonus: number } | null {
  for (const [at, bonus] of [[3, 1], [5, 2], [10, 3]] as const) if (streak < at) return { wins: at - streak, bonus };
  return null;
}

export type ShardExchangeKind = 'ADULT' | 'GUARDIAN';
export const SHARD_EXCHANGE_COST: Record<ShardExchangeKind, number> = { ADULT: SHARDS_PER_ADULT, GUARDIAN: SHARDS_PER_GUARDIAN };

const ADULT_IDS = Array.from({ length: 28 }, (_, i) => `beast_a${String(i + 1).padStart(2, '0')}`);
const GUARDIAN_IDS = ['beast_g_qinglong', 'beast_g_baihu', 'beast_g_zhuque', 'beast_g_xuanwu'];

/**
 * 第 N 次兌換給哪一張卡：按卡檔順序輪流，不抽籤、不看運氣（公平、可重算）。
 * 成獸二十八張輪完才回頭；四象四張輪流。
 */
export function exchangeCardId(kind: ShardExchangeKind, exchangeIndex: number): string {
  const pool = kind === 'ADULT' ? ADULT_IDS : GUARDIAN_IDS;
  return pool[((exchangeIndex % pool.length) + pool.length) % pool.length];
}
