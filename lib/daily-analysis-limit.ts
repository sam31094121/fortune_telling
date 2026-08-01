export type DailyAnalysisModuleKey =
  | 'match'
  | 'number'
  | 'nameology'
  | 'bazi'
  | 'zodiac'
  | 'ziwei'
  | 'music'
  | 'tarot';

export type DailyAnalysisRecord<T = unknown> = {
  moduleKey: DailyAnalysisModuleKey;
  createdAt: number;
  expiresAt: number;
  result: T;
  meta?: Record<string, unknown>;
};

export const DAILY_ANALYSIS_TTL_MS = 24 * 60 * 60 * 1000;
export const DAILY_ANALYSIS_NOTICE =
  '免費正式體驗：每個分析功能每日提供一次完整免費分析。請先整理好您最想了解的問題，再開始本次正式分析。完成後可以隨時查看今日分析，24 小時後可以再次開始。';

function storageKey(moduleKey: DailyAnalysisModuleKey) {
  return `tdh:daily-analysis:${moduleKey}:v1`;
}

function nowMs() {
  return Date.now();
}

export function formatDailyAnalysisRemaining(expiresAt?: number) {
  if (!expiresAt) return '24 小時後';
  const remaining = Math.max(0, expiresAt - nowMs());
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.ceil((remaining % (60 * 60 * 1000)) / (60 * 1000));
  if (hours <= 0) return `${Math.max(1, minutes)} 分鐘後`;
  return `${hours} 小時 ${Math.max(0, minutes)} 分鐘後`;
}

export function readDailyAnalysis<T = unknown>(moduleKey: DailyAnalysisModuleKey): DailyAnalysisRecord<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(moduleKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyAnalysisRecord<T>;
    if (!parsed || typeof parsed !== 'object' || parsed.moduleKey !== moduleKey || typeof parsed.expiresAt !== 'number') {
      window.localStorage.removeItem(storageKey(moduleKey));
      return null;
    }
    if (parsed.expiresAt <= nowMs()) {
      window.localStorage.removeItem(storageKey(moduleKey));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDailyAnalysis<T>(moduleKey: DailyAnalysisModuleKey, result: T, meta?: Record<string, unknown>) {
  if (typeof window === 'undefined') return null;
  const createdAt = nowMs();
  const record: DailyAnalysisRecord<T> = {
    moduleKey,
    createdAt,
    expiresAt: createdAt + DAILY_ANALYSIS_TTL_MS,
    result,
    meta,
  };
  try {
    window.localStorage.setItem(storageKey(moduleKey), JSON.stringify(record));
  } catch {
    // Some mobile/private browsers block localStorage. The analysis flow still works for this session.
  }
  return record;
}

export function clearDailyAnalysis(moduleKey: DailyAnalysisModuleKey) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(moduleKey));
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function getDailyAnalysisButtonLabel(record: DailyAnalysisRecord | null) {
  return record ? '查看今日分析' : '立即開始';
}
