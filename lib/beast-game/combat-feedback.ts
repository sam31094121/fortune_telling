import type { Match, Side } from './interactive';

/** Read recorded before/after values, including shields and overkill, not damage formulas. */
export function combatChanges(match: Match, side: Side, cardId: string): string {
  let lost = 0, healed = 0, shieldLost = 0, shieldGained = 0;
  for (const entry of match.log) for (const change of entry.changes ?? []) {
    if (change.side !== side || change.cardId !== cardId) continue;
    lost += Math.max(0, change.hpBefore - change.hpAfter);
    healed += Math.max(0, change.hpAfter - change.hpBefore);
    shieldLost += Math.max(0, change.shieldBefore - change.shieldAfter);
    shieldGained += Math.max(0, change.shieldAfter - change.shieldBefore);
  }
  return [lost ? `受傷 −${lost}` : '', healed ? `回復 ＋${healed}` : '',
    // 2026-10-17 客戶實玩：「護盾 −16」看起來像「我扣了護盾」，其實是對手打掉了我的護盾。寫清楚誰對誰。
    shieldLost ? `盾被打掉 ${shieldLost}` : '', shieldGained ? `獲得護盾 ${shieldGained}` : ''].filter(Boolean).join('・');
}

/** Shorten the existing engine log for the live view; never calculate a result. */
export function combatFeedback(text: string): string {
  return text.replace(/^.*?：/, '').replace(/攻\d+ × 元素[\d.]+ − 防[\d.]+ × [\d.]+ = (\d+)(?:（低於底值 \d+，取底值）)?/g, '傷害 $1');
}
