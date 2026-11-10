/**
 * 寶珠戰擊倒事件（只讀伺服端結果，不自行判定擊倒）
 * 規格：寶珠戰鬥卡片技能檔 第五章 1／2a／5。
 *
 * - 只有「送出前 hp > 0、伺服端回傳 hp <= 0」才算擊倒事件；前端算出的傷害（能量技／連線攻擊）不得餵進來。
 * - 事件 id 由 actionId + foeId 組成，同一伺服端回合重複處理也只會播一次。
 * - isFinalBoss：使用者 2026-11-09 20:02 定案「最終魔王＝第 8 關起最後殿後的四大神獸」。
 *   reservedGuardianBossRule(stage) 只沿用既有判定（enemies.ts foeAvailable 的殿後條件＋敵方策略.json guardianReserve.fromStage），
 *   不新增規則、不改數值；呼叫端仍可傳自訂規則覆寫。
 */
import policy from '../../../docs/技能戰鬥檔案/寶珠阿修羅/敵方策略.json';
import { getCard } from '../registry';

/** server-turn＝有效連珠；server-turn-dot＝無效路徑時伺服端算的回合起訖持續傷害；server-counter＝伺服端反擊階段；server-treasure＝寶器。 */
export type KnockoutSource = 'server-turn' | 'server-turn-dot' | 'server-counter' | 'server-treasure' | 'preview';

export interface KnockoutEvent {
  /** 唯一 id，直接當 <AsuraDeathFx play> 的觸發值。 */
  id: string;
  foeId: string;
  foeIndex: number;
  source: KnockoutSource;
  actionId: string;
  isFinalBoss: boolean;
}

export interface KnockoutFoe { id: string; hp: number }

export type FinalBossRule = (foe: KnockoutFoe, index: number, after: readonly KnockoutFoe[]) => boolean;

/** 預設：沒有魔王規格，不判定任何敵人為最終魔王。 */
export const NO_FINAL_BOSS: FinalBossRule = () => false;

export function deriveServerKnockouts(
  before: readonly KnockoutFoe[],
  serverAfter: readonly KnockoutFoe[],
  opts: { actionId: string; source: KnockoutSource; isFinalBoss?: FinalBossRule },
): KnockoutEvent[] {
  if (!opts.actionId) return [];
  const rule = opts.isFinalBoss ?? NO_FINAL_BOSS;
  const out: KnockoutEvent[] = [];
  serverAfter.forEach((foe, index) => {
    const prev = before.find(f => f.id === foe.id);
    if (!prev || !(prev.hp > 0) || !(foe.hp <= 0)) return;
    let boss = false;
    try { boss = rule(foe, index, serverAfter) === true; } catch { boss = false; }
    out.push({ id: `${opts.actionId}:ko:${foe.id}`, foeId: foe.id, foeIndex: index, source: opts.source, actionId: opts.actionId, isFinalBoss: boss });
  });
  return out;
}

/**
 * 最終魔王＝殿後的第 5 張四大神獸（與 enemies.ts foeAvailable 的 waiting 條件同源）：
 * stage（關卡序號＝wins+1，非 rig 模式傳 0）≥ guardianReserve.fromStage(8)、五張陣容、index 4、form === 'GUARDIAN'。
 */
export function reservedGuardianBossRule(stage: number): FinalBossRule {
  return (foe, index, after) => stage >= policy.guardianReserve.fromStage && after.length === 5 && index === 4 && getCard(foe.id)?.form === 'GUARDIAN';
}
