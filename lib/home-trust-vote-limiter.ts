/*
  2026-10-17 vote guard：首頁「認同／不認同」投票的伺服器端節流（純邏輯、無外部相依，方便單元測試）。

  - 同一個 IP：兩次投票至少間隔 VOTE_MIN_INTERVAL_MS；每 VOTE_WINDOW_MS 最多 VOTE_WINDOW_MAX 票。
  - 同一個事件編號（eventId）重送：不佔額度。已確認寫入的事件直接判定為重複，不再 +1；
    還在處理中的重送照常交給資料庫（資料庫本身也以事件編號去重）。
  - 全部存在記憶體 Map：有筆數上限，並在每次呼叫時順手清掉過期資料，不開計時器、不會洩漏。
  - 這是「擋灌票」的輕量防線，不是安全邊界：多台伺服器各自計數；同一 IP 後面的多位真人（公司網路、電信 NAT）共用額度。
*/

export const VOTE_MIN_INTERVAL_MS = 1_500;
export const VOTE_WINDOW_MS = 10 * 60_000;
export const VOTE_WINDOW_MAX = 30;
export const VOTE_LIMITER_MAX_KEYS = 5_000;
export const VOTE_EVENT_TTL_MS = 10 * 60_000;
export const VOTE_EVENT_MAX = 10_000;
const VOTE_CLEANUP_INTERVAL_MS = 60_000;

type VoteBucket = { last: number; windowStart: number; count: number };
type VoteEventState = { at: number; applied: boolean };

const voteBuckets = new Map<string, VoteBucket>();
const recentVoteEvents = new Map<string, VoteEventState>();
let lastVoteCleanup = 0;

/** allow：可以 +1；duplicate：同一事件已確認寫入，不要再 +1；inflight：同一事件還在處理中，交給資料庫去重；limited：太頻繁。 */
export type VoteLimitDecision = 'allow' | 'duplicate' | 'inflight' | 'limited';

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp ? realIp.slice(0, 64) : 'unknown';
}

function dropOldest<K, V>(map: Map<K, V>, maxSize: number) {
  while (map.size > maxSize) {
    const oldestKey = map.keys().next().value as K;
    map.delete(oldestKey);
  }
}

function cleanupVoteLimiter(now: number) {
  const tooBig = voteBuckets.size > VOTE_LIMITER_MAX_KEYS || recentVoteEvents.size > VOTE_EVENT_MAX;
  if (!tooBig && now - lastVoteCleanup < VOTE_CLEANUP_INTERVAL_MS) return;
  lastVoteCleanup = now;

  for (const [key, bucket] of voteBuckets) {
    if (now - bucket.last >= VOTE_WINDOW_MS) voteBuckets.delete(key);
  }
  for (const [eventId, state] of recentVoteEvents) {
    if (now - state.at >= VOTE_EVENT_TTL_MS) recentVoteEvents.delete(eventId);
  }
  // Map 依插入順序；最近活動的會被移到最後，所以超量時從最舊的開始丟。
  dropOldest(voteBuckets, VOTE_LIMITER_MAX_KEYS);
  dropOldest(recentVoteEvents, VOTE_EVENT_MAX);
}

export function checkVoteRateLimit(ip: string, eventId: string | null, now: number = Date.now()): VoteLimitDecision {
  cleanupVoteLimiter(now);

  if (eventId) {
    const seen = recentVoteEvents.get(eventId);
    if (seen && now - seen.at < VOTE_EVENT_TTL_MS) return seen.applied ? 'duplicate' : 'inflight';
  }

  const bucket = voteBuckets.get(ip);
  if (bucket) {
    if (now - bucket.last < VOTE_MIN_INTERVAL_MS) return 'limited';
    if (now - bucket.windowStart >= VOTE_WINDOW_MS) {
      bucket.windowStart = now;
      bucket.count = 0;
    }
    if (bucket.count >= VOTE_WINDOW_MAX) return 'limited';
    bucket.last = now;
    bucket.count += 1;
    voteBuckets.delete(ip);
    voteBuckets.set(ip, bucket);
  } else {
    voteBuckets.set(ip, { last: now, windowStart: now, count: 1 });
  }

  if (eventId) recentVoteEvents.set(eventId, { at: now, applied: false });
  cleanupVoteLimiter(now);
  return 'allow';
}

/** 資料庫確認寫入後呼叫：之後同一事件重送直接判定重複。 */
export function markVoteEventApplied(eventId: string | null, now: number = Date.now()) {
  if (!eventId) return;
  recentVoteEvents.delete(eventId);
  recentVoteEvents.set(eventId, { at: now, applied: true });
}

/** 資料庫寫入失敗時呼叫：讓客戶端用同一事件重試時不被當成重複。 */
export function releaseVoteEvent(eventId: string | null) {
  if (eventId) recentVoteEvents.delete(eventId);
}

/** 測試用：目前記憶體內的筆數。 */
export function voteLimiterSize() {
  return { buckets: voteBuckets.size, events: recentVoteEvents.size };
}

/** 測試用：清空節流狀態。 */
export function resetVoteRateLimiter() {
  voteBuckets.clear();
  recentVoteEvents.clear();
  lastVoteCleanup = 0;
}
