/**
 * 已驗證紫微命盤暫存（2026-08-22）｜規格「十七」
 *
 * 目的：三老師 API 只能「查回」已經算好、已經驗證過的正式命盤，不能自己重新排盤。
 * 目前整個專案對這類暫存資料的一致做法是純記憶體 Map（見 lib/analysis-job-store.ts），
 * 這裡照同一個模式，不新增外部依賴（Redis/DB）。
 *
 * 已知限制（跟 lib/analysis-job-store.ts:189-196 記錄的是同一個限制，不是新問題）：
 * Vercel serverless 函式不保證跨 request 共用記憶體，算命盤的那次請求跟之後查老師的
 * 請求有可能落在不同執行個體上，屆時查不到會回 CHART_NOT_FOUND。Phase 1 先接受這個
 * 已被專案其他地方接受的限制；真的需要跨執行個體持久化時再考慮外部儲存。
 */

import { createZiweiCore, type ZiweiBirthInput, type ZiweiCoreResult } from './ziwei/engine';

const CHART_TTL_MS = 30 * 60 * 1000; // 30 分鐘：跟分析任務的 TTL 一致

export type ZiweiVerifiedTimeSeed = {
  birthDate?: string;
  annualYear?: number;
  annualTheme?: string;
  annualLevel?: string;
};

export type ZiweiVerifiedChartRecord = {
  chart: ZiweiCoreResult;
  timeSeed: ZiweiVerifiedTimeSeed;
};

type ChartStore = Map<string, ZiweiVerifiedChartRecord & { createdAt: number; expiresAt: number }>;

const store = ((globalThis as typeof globalThis & { __ziweiChartStore?: ChartStore }).__ziweiChartStore ??= new Map());

function cleanupExpired() {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}

/** 命盤算完、通過驗證後呼叫這個——只有驗證通過的命盤才准存進來 */
export function saveVerifiedZiweiChart(analysisId: string, chart: ZiweiCoreResult, timeSeed: ZiweiVerifiedTimeSeed = {}): void {
  if (!chart.validation.passed) return; // 沒驗證過的命盤絕對不存，老師 API 查不到就是查不到
  cleanupExpired();
  const now = Date.now();
  store.set(analysisId, { chart, timeSeed, createdAt: now, expiresAt: now + CHART_TTL_MS });
}

export function getVerifiedZiweiChart(analysisId: string): ZiweiCoreResult | null {
  cleanupExpired();
  return store.get(analysisId)?.chart ?? null;
}

export function getVerifiedZiweiChartRecord(analysisId: string): ZiweiVerifiedChartRecord | null {
  cleanupExpired();
  const entry = store.get(analysisId);
  return entry ? { chart: entry.chart, timeSeed: entry.timeSeed } : null;
}

/**
 * 2026-08-23 修正：正式站（Vercel serverless）已證實會發生查不到已驗證命盤的狀況——
 * 算命盤那次請求跟之後查老師的請求不保證落在同一個執行個體，記憶體 Map 不共用，
 * 導致老師 API 100% 回 CHART_NOT_FOUND（不是偶發，任何跨執行個體的請求都會中招）。
 *
 * 修法：查不到時，如果呼叫端有附上原始 `birthInput`（只是出生年月日時辰性別，
 * 不是算好的命盤），就用跟 `createZiweiCore` 完全相同的決定性引擎當場重新算一次——
 * 同樣輸入永遠得到同樣命盤，這跟查記憶體拿到的是同一份資料，不是老師自己亂補。
 * 只有算出來且通過驗證的命盤才會被使用，沒過驗證一樣視為查不到。
 */
export function resolveVerifiedZiweiChart(analysisId: string, birthInput?: ZiweiBirthInput, timeSeed: ZiweiVerifiedTimeSeed = {}): ZiweiVerifiedChartRecord | null {
  const existing = getVerifiedZiweiChartRecord(analysisId);
  if (existing) return existing;
  if (!birthInput) return null;

  const chart = createZiweiCore(birthInput);
  if (!chart.validation.passed) return null;

  saveVerifiedZiweiChart(analysisId, chart, timeSeed);
  return { chart, timeSeed };
}
