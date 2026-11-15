/**
 * AUDIT-2 M2｜寶珠闖關 API 的呼叫頻率限制（固定時間窗，依來源 IP）。
 * ‧ 只防「灌爆」：正常玩家一秒最多一兩步，上限留很寬。數字是【待平衡暫定值】。
 * ‧ 誠實限制：計數存在這個伺服器行程的記憶體；多執行個體時是「每台各自計算」，總量上限＝每台上限 × 台數。
 *   要全域限流需搬到共用儲存（和 X2 同一個資料庫，見 docs/merge-opt/DESIGN-shared-ledger.md）。
 */
export const M3_RATE_LIMITS = {
  /** 每 10 秒每個來源最多幾次回合請求（連珠、能量技、連結攻擊、寶器）。 */
  turn: { windowMs: 10_000, max: 60 },
  /** 每 60 秒每個來源最多開幾場（start）。 */
  start: { windowMs: 60_000, max: 20 },
  /** 每 10 秒每個來源最多幾次接回／結算／關閉。 */
  record: { windowMs: 10_000, max: 40 },
} as const;
export type M3RateBucket = keyof typeof M3_RATE_LIMITS;

type G = typeof globalThis & { __m3Rate?: Map<string, { start: number; count: number }> };
const g = globalThis as G;
const table = () => (g.__m3Rate ??= new Map());

/** 取來源 IP：Vercel／反向代理放在 x-forwarded-for 第一個；取不到就用 'unknown'（一起計算，偏保守）。 */
export function clientKey(request: Request): string {
  const xf = request.headers.get('x-forwarded-for');
  const ip = (xf ? xf.split(',')[0] : request.headers.get('x-real-ip') ?? '').trim();
  return /^[0-9a-fA-F:.]{2,64}$/.test(ip) ? ip : 'unknown';
}
/** 回 true＝放行；false＝超過上限。 */
export function allowRequest(bucket: M3RateBucket, key: string, now = Date.now()): boolean {
  const { windowMs, max } = M3_RATE_LIMITS[bucket];
  const t = table(), id = bucket + '|' + key, cur = t.get(id);
  if (!cur || now - cur.start >= windowMs) {
    t.set(id, { start: now, count: 1 });
    if (t.size > 20_000) for (const [k, v] of t) if (now - v.start >= 60_000) t.delete(k);
    return true;
  }
  cur.count += 1;
  return cur.count <= max;
}
export function __resetRateLimitForTest() { table().clear(); }
