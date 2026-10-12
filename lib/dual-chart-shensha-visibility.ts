import { shenShaDisplayNames } from './iching-shensha-display-copy';

/**
 * 神煞可見性（後端算好，前端只照 allowed／conflicts／pending 顯示）。
 * 放行條件缺一不可：底盤核對通過（coreReady）、該規則 ready、來源狀態 VERIFIED（或本派參考取法）、
 * 而且有有效輸出政策 outputStatus === 'READY'——舊結果沒有輸出政策就不得解鎖。
 * 從 lib/dual-chart.ts 抽出，讓測試能直接驗證這條安全規則（tests/dual-chart-iching-shensha-output.test.cjs）。
 */
type ShenShaRuleGate = { ready?: boolean; status?: string; outputStatus?: string; referenceMethod?: boolean };
export type ShenShaGateInput = { coreReady?: boolean; shenShaRules?: Record<string, ShenShaRuleGate | undefined> } | undefined;

export function buildShenShaVisibility(gate: ShenShaGateInput) {
  const rules = (gate?.shenShaRules ?? {}) as Record<string, ShenShaRuleGate | undefined>;
  const ruleIds = Object.keys(rules);
  const allowed = new Set(ruleIds.filter(id => {
    const rule = rules[id];
    return gate?.coreReady && rule?.ready &&
      (rule?.status === 'VERIFIED' || rule?.referenceMethod === true) &&
      rule?.outputStatus === 'READY';
  }));
  const namesZh = shenShaDisplayNames.zh as Record<string, string>;
  const isHeld = (id: string) => rules[id]?.status === 'CONFLICT' || rules[id]?.outputStatus === 'BLOCKED_VARIANT';
  return {
    allowed,
    conflicts: ruleIds.filter(id => !allowed.has(id)).filter(isHeld).map(id => namesZh[id] || id),
    pending: ruleIds.filter(id => !allowed.has(id)).filter(id => !isHeld(id)).map(id => namesZh[id] || id),
  };
}
