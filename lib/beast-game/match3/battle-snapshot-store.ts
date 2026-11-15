/**
 * PLAN-v2 A6｜瀏覽器端戰局快照（新存檔鍵，不動既有鍵）。
 * ‧ 自己：localStorage（關分頁、開新分頁也接得回）；親朋好友：sessionStorage（與闖關存檔相同的保存範圍）。
 * ‧ 快照只是「伺服端收據＋權威核心」的副本：改了任何數字，伺服端核對簽章就會拒絕（orb-battle-ledger.ts）。
 * ‧ 裝置識別：新鍵 match3-battle-device-v1，隨機產生，只用來讓伺服端分辨「同一個瀏覽器重送」與「別台裝置代結」。
 */
import { BATTLE_RESUME_POLICY, BATTLE_RESUME_MODES, type BattleSnapshot } from './battle-resume';
export type SnapshotOwner = 'self' | 'guest';
export const BATTLE_SNAPSHOT_KEYS = { self: 'match3-battle-resume-self-v1', guest: 'match3-battle-resume-guest-v1' } as const;
export const BATTLE_DEVICE_KEY = 'match3-battle-device-v1';
const store = (owner: SnapshotOwner): Storage => owner === 'self' ? window.localStorage : window.sessionStorage;

export type SnapshotRead =
  | { status: 'none' }
  | { status: 'ok'; snapshot: BattleSnapshot }
  | { status: 'corrupt'; message: string }
  | { status: 'expired'; snapshot: BattleSnapshot; message: string }
  | { status: 'unavailable'; message: string };

export const SNAPSHOT_MESSAGES = {
  corrupt: '上一場未完成的戰局存檔已損毀，無法接回。依規定這場作廢：不發獎勵、勝場不變，和落敗相同。已為你準備新的一局。',
  expired: '上一場未完成的戰局已超過 24 小時，不能再接回。依規定這場作廢：不發獎勵、勝場不變，和落敗相同。已為你準備新的一局。',
  unavailable: '這個瀏覽器不允許儲存，無法確認有沒有未完成的戰局。請允許網站儲存資料後重新整理。',
  resumed: '已接回上一場未完成的戰局：血量、盤面、敵人、回合與能量都和離開前一樣。',
  resumedAdvanced: '已接回上一場未完成的戰局。你重新整理時最後一步剛好送出，伺服端已經算完，畫面已更新成伺服端的最新結果。',
  otherTab: '這場戰鬥正在另一個分頁進行。請回到那個分頁繼續；若已關閉，請重新整理這一頁。',
  network: '暫時無法連線確認上一場戰局，戰局仍保留，不會重開。請確認網路後按「重試接回」。',
  /** AUDIT-2 M3：存檔勝場和快照不一致（例如剛匯入備份、或在別的分頁打完一關），不是竄改。 */
  progressChanged: '你的闖關進度已經變更（例如剛匯入備份，或在別的分頁打完了一關），上一場未完成的戰局對不上目前進度，所以無法接回。這場不發獎勵、勝場不變；已為你準備新的一局。',
  /** AUDIT-2 H4：回合請求逾時或斷線：那一步可能已經送達伺服端，也可能沒有。 */
  connectionLost: '連線中斷：剛才那一步可能已經送到伺服端，也可能沒有。請按「重新接回」向伺服端確認最新局面（不會重複扣血，也不會多算一步）。',
} as const;

function isSnapshot(v: unknown, owner: SnapshotOwner): v is BattleSnapshot {
  const s = v as BattleSnapshot;
  return !!s && s.v === 1 && s.owner === owner && !!s.meta && typeof s.meta.battleId === 'string' && (BATTLE_RESUME_MODES as readonly string[]).includes(s.meta.mode)
    && Number.isSafeInteger(s.meta.wins) && Number.isSafeInteger(s.meta.seed) && !!s.core && Array.isArray(s.core.board) && Array.isArray(s.core.magic)
    && Array.isArray(s.core.team) && Array.isArray(s.core.foes) && Number.isSafeInteger(s.core.move) && !!s.session && typeof s.session.token === 'string'
    && Number.isSafeInteger(s.session.seq) && Number.isFinite(s.savedAt) && !!s.ui && typeof s.ui === 'object';
}

export function readBattleSnapshot(owner: SnapshotOwner, now = Date.now()): SnapshotRead {
  let raw: string | null;
  try { raw = store(owner).getItem(BATTLE_SNAPSHOT_KEYS[owner]); } catch { return { status: 'unavailable', message: SNAPSHOT_MESSAGES.unavailable }; }
  if (raw === null) return { status: 'none' };
  let parsed: unknown;
  try { parsed = raw.length > BATTLE_RESUME_POLICY.maxSnapshotChars * 2 ? null : JSON.parse(raw); } catch { parsed = null; }
  if (!isSnapshot(parsed, owner)) return { status: 'corrupt', message: SNAPSHOT_MESSAGES.corrupt };
  if (now - parsed.savedAt > BATTLE_RESUME_POLICY.expireMs) return { status: 'expired', snapshot: parsed, message: SNAPSHOT_MESSAGES.expired };
  return { status: 'ok', snapshot: parsed };
}
/** 每次伺服端收據回來就寫；回傳寫入耗時（毫秒）與字數，供流暢度量測。 */
export function writeBattleSnapshot(s: BattleSnapshot): { ok: boolean; ms: number; chars: number } {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const raw = JSON.stringify(s);
    store(s.owner).setItem(BATTLE_SNAPSHOT_KEYS[s.owner], raw);
    const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    return { ok: true, ms, chars: raw.length };
  } catch { return { ok: false, ms: 0, chars: 0 }; }
}
export function clearBattleSnapshot(owner: SnapshotOwner, battleId?: string): void {
  try {
    if (battleId) { const cur = readBattleSnapshot(owner); if (cur.status === 'ok' && cur.snapshot.meta.battleId !== battleId) return; }
    store(owner).removeItem(BATTLE_SNAPSHOT_KEYS[owner]);
  } catch { /* 無法存取儲存：沒有快照可清 */ }
}
export function hasPendingBattle(owner: SnapshotOwner, mode?: string): boolean {
  const r = readBattleSnapshot(owner);
  return r.status === 'corrupt' || r.status === 'expired' || (r.status === 'ok' && (!mode || r.snapshot.meta.mode === mode));
}
export function battleDeviceId(): string {
  try {
    const cur = window.localStorage.getItem(BATTLE_DEVICE_KEY);
    if (cur && /^[A-Za-z0-9-]{8,80}$/.test(cur)) return cur;
    const id = window.crypto.randomUUID?.() ?? Array.from(window.crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join('-');
    window.localStorage.setItem(BATTLE_DEVICE_KEY, id);
    return id;
  } catch { return 'nostore-' + Math.random().toString(36).slice(2, 12); }
}

/** AUDIT-2 L4：不支援 Web Locks 時的退路租約（localStorage 心跳；新鍵，不動既有存檔鍵）。盡力而為：兩分頁同一毫秒搶仍可能都拿到，伺服端序號仍是最後防線。 */
const FALLBACK_LEASE_PREFIX = 'match3-battle-lease-fallback-';
export const FALLBACK_LEASE_POLICY = { heartbeatMs: 3000, staleMs: 9000 } as const;
export function acquireFallbackLease(owner: SnapshotOwner, store: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined = typeof window !== 'undefined' ? window.localStorage : undefined, now: () => number = Date.now): { ok: boolean; release: () => void } {
  const free = { ok: true, release: () => {} };
  if (!store) return free;
  const key = FALLBACK_LEASE_PREFIX + owner;
  const id = Math.random().toString(36).slice(2) + now().toString(36);
  try {
    const cur = JSON.parse(store.getItem(key) ?? 'null') as { id?: unknown; at?: unknown } | null;
    if (cur && typeof cur.id === 'string' && typeof cur.at === 'number' && now() - cur.at < FALLBACK_LEASE_POLICY.staleMs) return { ok: false, release: () => {} };
    store.setItem(key, JSON.stringify({ id, at: now() }));
    if ((JSON.parse(store.getItem(key) ?? 'null') as { id?: string } | null)?.id !== id) return { ok: false, release: () => {} };
  } catch { return free; } // 無法使用儲存：和原本一樣放行，由伺服端序號把關
  const beat = typeof setInterval === 'function' ? setInterval(() => { try { const cur = JSON.parse(store.getItem(key) ?? 'null') as { id?: string } | null; if (cur?.id === id) store.setItem(key, JSON.stringify({ id, at: now() })); } catch { /* 下一拍再試 */ } }, FALLBACK_LEASE_POLICY.heartbeatMs) : undefined;
  return { ok: true, release: () => { if (beat !== undefined) clearInterval(beat); try { const cur = JSON.parse(store.getItem(key) ?? 'null') as { id?: string } | null; if (cur?.id === id) store.removeItem(key); } catch { /* 忽略 */ } } };
}

/**
 * 同一個瀏覽器只允許一個分頁打同一位玩家的闖關戰：Web Locks 獨占租約。拿不到＝別的分頁正在打。
 * 不支援 Web Locks 的瀏覽器改用 localStorage 心跳租約（AUDIT-2 L4），讓第二個分頁看到正確的「另一個分頁在打」提示。
 */
export function acquireBattleLease(owner: SnapshotOwner): Promise<{ ok: boolean; release: () => void }> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks?.request) return Promise.resolve(acquireFallbackLease(owner));
  return new Promise(resolve => {
    let release: () => void = () => {};
    const held = new Promise<void>(r => { release = r; });
    locks.request('match3-battle-lease-' + owner, { ifAvailable: true }, async lock => {
      if (!lock) { resolve({ ok: false, release: () => {} }); return; }
      resolve({ ok: true, release });
      await held;
    }).catch(() => resolve({ ok: true, release: () => {} }));
  });
}
