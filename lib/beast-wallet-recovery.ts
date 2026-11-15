'use client';
/**
 * 共同卡庫識別碼的多重保存與還原。
 *
 * 卡庫資料在伺服器，但「這個瀏覽器是誰」只靠一把存在本機的識別碼（localStorage）。
 * 手機瀏覽器清除網站資料、被系統清理，這把碼就沒了，伺服器上的卡庫還在卻再也找不到。
 * 這裡把同一把碼多存兩份（cookie、IndexedDB），主存放區不見時自動補回來；
 * 三處都沒有時，才讓客戶用「識別碼」手動還原。
 * 只負責保存與還原識別碼，不碰卡庫內容、規則與運算（那些都在後端）。
 */
export const WALLET_KEY = 'tdh_beast_wallet_v1';
const COOKIE = 'tdh_beast_wallet';
const DB_NAME = 'tdh_beast_wallet_backup', STORE = 'kv';
const VALID = /^[a-f0-9]{64}$/;

export const isWalletKey = (value: unknown): value is string => typeof value === 'string' && VALID.test(value);

function readCookie(): string | null {
  try {
    const hit = document.cookie.split('; ').find(part => part.startsWith(COOKIE + '='));
    const value = hit?.slice(COOKIE.length + 1);
    return isWalletKey(value) ? value : null;
  } catch { return null; }
}
function writeCookie(key: string) {
  try { document.cookie = `${COOKIE}=${key}; max-age=${60 * 60 * 24 * 730}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch { /* 瀏覽器不給寫就只靠其他兩處 */ }
}
function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => { request.result.createObjectStore(STORE); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function readDb(): Promise<string | null> {
  const db = await openDb(); if (!db) return null;
  return new Promise(resolve => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(WALLET_KEY);
      request.onsuccess = () => { db.close(); resolve(isWalletKey(request.result) ? request.result : null); };
      request.onerror = () => { db.close(); resolve(null); };
    } catch { try { db.close(); } catch { /* ignore */ } resolve(null); }
  });
}
async function writeDb(key: string): Promise<void> {
  const db = await openDb(); if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(key, WALLET_KEY);
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); resolve(); };
    } catch { try { db.close(); } catch { /* ignore */ } resolve(); }
  });
}

/** 把同一把識別碼寫回所有存放區（主存放區不見時補回、其他備份不見時也補回）。 */
export async function mirrorWalletKey(key: string): Promise<void> {
  if (!isWalletKey(key)) return;
  try { if (window.localStorage.getItem(WALLET_KEY) !== key) window.localStorage.setItem(WALLET_KEY, key); } catch { /* ignore */ }
  writeCookie(key); await writeDb(key);
}

export type WalletRecovery = { key: string | null; source: 'local' | 'cookie' | 'indexeddb' | 'none' };
/** 依序找：localStorage → cookie → IndexedDB。找到非主存放區的就順手補回主存放區。 */
export async function recoverWalletKey(): Promise<WalletRecovery> {
  let local: string | null = null;
  try { const value = window.localStorage.getItem(WALLET_KEY); local = isWalletKey(value) ? value : null; } catch { /* ignore */ }
  if (local) { void mirrorWalletKey(local); return { key: local, source: 'local' }; }
  const cookie = readCookie();
  if (cookie) { await mirrorWalletKey(cookie); return { key: cookie, source: 'cookie' }; }
  const stored = await readDb();
  if (stored) { await mirrorWalletKey(stored); return { key: stored, source: 'indexeddb' }; }
  return { key: null, source: 'none' };
}

/** 識別碼分成 8 組、每組 8 個字元，方便抄寫與貼上。 */
export const formatRecoveryCode = (key: string): string => key.match(/.{8}/g)?.join('-') ?? key;
export function parseRecoveryCode(input: string): string | null {
  const clean = String(input).toLowerCase().replace(/[^a-f0-9]/g, '');
  return isWalletKey(clean) ? clean : null;
}
