/**
 * 智能緩存管理
 * 優化 API 响应和资源加载
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 生存時間（毫秒）
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxSize = 50;

  set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
    // 控制緩存大小
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // 檢查是否過期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 導出全局緩存實例
export const cacheManager = new CacheManager();

/**
 * 帶緩存的 API 調用包裝器
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl?: number,
): Promise<T> {
  const cacheKey = `fetch:${url}`;

  // 先检查緩存
  const cached = cacheManager.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // 未命中緩存，執行實際請求
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  const data = await response.json() as T;

  // 存儲到緩存
  cacheManager.set(cacheKey, data, ttl);

  return data;
}
