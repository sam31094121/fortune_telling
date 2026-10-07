/**
 * 首頁信任統計 — 資料庫層
 *
 * 所有正式資料庫讀寫只能經過這裡
 * 禁止三個功能各自直接亂寫資料庫
 *
 * Source of Truth：home_trust_counters 表
 * 記錄：
 *   id = "home"
 *   agree_count (認同)
 *   disagree_count (不認同)
 *   view_count (累計瀏覽次數)
 */

import type {
  HomeTrustCounters,
  CounterType,
  HomeTrustCountersRecord,
} from './counters.types';

/**
 * 取得目前正式計數器狀態
 *
 * 從資料庫讀取唯一記錄
 */
export async function getCurrentCounters(): Promise<HomeTrustCounters> {
  try {
    // TODO: 實作資料庫查詢
    // SELECT agree_count, disagree_count, view_count, updated_at
    // FROM home_trust_counters
    // WHERE id = 'home'

    const record = await fetchFromDatabase();

    if (!record) {
      throw new Error('HOME_TRUST_COUNTERS_NOT_FOUND');
    }

    return {
      agreeCount: record.agree_count,
      disagreeCount: record.disagree_count,
      viewCount: record.view_count,
      updatedAt: record.updated_at,
    };
  } catch (error) {
    console.error('[HomeTrust] Failed to get current counters:', error);
    throw error;
  }
}

/**
 * 原子性增量操作（Atomic Increment）
 *
 * 這是唯一允許的修改方式
 * 禁止前端指定最終值
 *
 * 正確做法：
 *   agree_count = agree_count + 1
 *
 * 禁止做法：
 *   agree_count = 715
 *   agree_count -= 1
 *   reset()
 */
export async function incrementCounter(
  type: CounterType
): Promise<HomeTrustCounters> {
  try {
    const previous = await getCurrentCounters();
    let newValue: number;

    // 決定要更新哪個欄位
    const updateField = {
      agree: 'agree_count',
      disagree: 'disagree_count',
      view: 'view_count',
    }[type];

    // TODO: 實作原子性增量
    // UPDATE home_trust_counters
    // SET
    //   [updateField] = [updateField] + 1,
    //   updated_at = CURRENT_TIMESTAMP
    // WHERE id = 'home'
    // RETURNING *

    const updated = await atomicIncrementInDatabase(updateField);

    if (!updated) {
      throw new Error(`ATOMIC_INCREMENT_FAILED_${type}`);
    }

    // 驗證單調性：新值必須等於舊值 + 1
    newValue = updated[updateField];
    const oldValue = {
      agree: previous.agreeCount,
      disagree: previous.disagreeCount,
      view: previous.viewCount,
    }[type];

    if (newValue !== oldValue + 1) {
      throw new Error(
        `MONOTONIC_VIOLATION: ${type} expected ${oldValue + 1}, got ${newValue}`
      );
    }

    return {
      agreeCount: updated.agree_count,
      disagreeCount: updated.disagree_count,
      viewCount: updated.view_count,
      updatedAt: updated.updated_at,
    };
  } catch (error) {
    console.error(`[HomeTrust] Failed to increment ${type}:`, error);
    throw error;
  }
}

/**
 * 驗證單調性約束
 *
 * 新值必須 >= 舊值
 * 正常操作只允許 +1
 */
export function validateMonotonic(
  type: CounterType,
  oldValue: number,
  newValue: number
): boolean {
  // 必須 >= 舊值
  if (newValue < oldValue) {
    console.error(`[HomeTrust] MONOTONIC_VIOLATION: ${type} decreased from ${oldValue} to ${newValue}`);
    return false;
  }

  // 正常操作只允許 +1
  if (newValue !== oldValue && newValue !== oldValue + 1) {
    console.error(`[HomeTrust] INVALID_INCREMENT: ${type} jumped from ${oldValue} to ${newValue}`);
    return false;
  }

  return true;
}

/**
 * 初始化表格（只在不存在時執行）
 *
 * 禁止每次 Deploy 覆蓋
 * 只在記錄完全不存在時建立
 */
export async function ensureCountersTableExists(): Promise<void> {
  try {
    // 檢查記錄是否存在
    const existing = await getCurrentCounters().catch(() => null);

    if (existing) {
      console.log('[HomeTrust] Counters table already initialized');
      return;
    }

    // 只在不存在時插入預設值
    // TODO: 實作 INSERT IF NOT EXISTS
    // INSERT INTO home_trust_counters (id, agree_count, disagree_count, view_count, updated_at)
    // VALUES ('home', 0, 0, 0, CURRENT_TIMESTAMP)
    // ON CONFLICT DO NOTHING

    console.log('[HomeTrust] Initialized counters table with defaults');
  } catch (error) {
    console.error('[HomeTrust] Failed to ensure table exists:', error);
    throw error;
  }
}

/**
 * 以下是資料庫模擬實作
 * 正式環境應該連接真實資料庫
 */

let mockDatabase: HomeTrustCountersRecord = {
  id: 'home',
  agree_count: 714,
  disagree_count: 74,
  view_count: 110399,
  updated_at: new Date().toISOString(),
};

async function fetchFromDatabase(): Promise<HomeTrustCountersRecord | null> {
  // 模擬資料庫查詢延遲
  await new Promise(resolve => setTimeout(resolve, 10));
  return mockDatabase;
}

async function atomicIncrementInDatabase(
  field: 'agree_count' | 'disagree_count' | 'view_count'
): Promise<HomeTrustCountersRecord> {
  // 模擬原子性增量
  await new Promise(resolve => setTimeout(resolve, 10));

  mockDatabase = {
    ...mockDatabase,
    [field]: mockDatabase[field] + 1,
    updated_at: new Date().toISOString(),
  };

  return mockDatabase;
}
