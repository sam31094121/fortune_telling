'use client';
import { appendBackup, type LocalBackup } from './beast-game/match3/campaign-safety';
/** 用伺服器資料覆蓋本機前的時間戳記備份（每類最多 3 份）。只存在這個瀏覽器。 */
export const LOCAL_BACKUP_KEY = 'tdh_local_backups_v1';
export function listLocalBackups(): LocalBackup[] {
  try { const v = JSON.parse(window.localStorage.getItem(LOCAL_BACKUP_KEY) ?? '[]'); return Array.isArray(v) ? v.filter(b => b && typeof b.raw === 'string' && typeof b.kind === 'string') : []; } catch { return []; }
}
/** 備份沒存成功就丟錯，呼叫端不得繼續覆蓋。空間不足時先丟掉最舊的一份再試一次。 */
export function backupLocal(kind: string, raw: string): void {
  let list = appendBackup(listLocalBackups(), { at: new Date().toISOString(), kind, raw });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const value = JSON.stringify(list);
      window.localStorage.setItem(LOCAL_BACKUP_KEY, value);
      if (window.localStorage.getItem(LOCAL_BACKUP_KEY) === value) return;
    } catch { /* 空間不足：丟最舊再試 */ }
    const oldest = list.findIndex(b => b.raw !== raw);
    if (oldest < 0) break;
    list = list.filter((_, i) => i !== oldest);
  }
  throw new Error('本機備份沒有存成功（瀏覽器空間可能不足），所以沒有覆蓋你的存檔。請先用「存檔備份」下載存檔後重試。');
}
export function latestLocalBackup(kind: string): LocalBackup | null {
  const list = listLocalBackups().filter(b => b.kind === kind);
  return list.length ? list[list.length - 1] : null;
}
