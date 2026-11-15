/**
 * 寶珠存檔安全（2026-11-15 業主：舊進度要帶上去、同步不讓本機變少、覆蓋前先備份、存檔壞掉不能先刪）。
 * 純函式，不碰 window；瀏覽器端的讀寫在 hard-campaign-store.ts 與 beast-local-backup.ts。
 * 不改任何玩法、關卡或獎勵公式。
 */
import { newCampaign, parseCampaign, campaignGuardianIds, type HardCampaign } from './hard-campaign';
import { validateTreasureBook } from './treasures';

export const LEGACY_PROGRESS_SELF_KEY = 'match3-hard-progress-self-v1';
/** 與伺服器 cultivation-legacy.ts 的 LEGACY_MAX_WINS 相同。 */
export const LEGACY_CLAIM_MAX_WINS = 200;

/** 舊進度鍵（只記勝場數字）的值；格式不對就是 0，與 progress-store 的讀法一致。 */
export function legacyProgressWins(raw: string | null): number {
  if (raw === null || !/^\d+(?:\.\d+)?$/.test(raw.trim())) return 0;
  const wins = Math.floor(Number(raw));
  return Number.isSafeInteger(wins) && wins > 0 ? wins : 0;
}

/**
 * 存檔讀不懂時「搶救」而不是刪除：依序嘗試保留越多越好的版本，只要能通過既有的 parseCampaign 就用。
 * 1) 原檔只修正「已用重選主角」這種與勝場矛盾的旗標；2) 拿掉強化收據（強化另有共同卡庫副本加成）；
 * 3) 只留勝場與獎卡收據；4) 只留勝場數字（沒有收據時）；最後才是從舊進度鍵的勝場重新開始。
 */
export function salvageCampaign(raw: string | null, legacyWins = 0): { profile: HardCampaign; level: 'intact' | 'flags' | 'no-enhancements' | 'wins-and-rewards' | 'wins-only' | 'legacy' } {
  let value: Partial<HardCampaign> | null = null;
  if (raw !== null) { try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object') value = parsed; } catch { value = null; } }
  if (raw !== null) { try { return { profile: parseCampaign(raw), level: 'intact' }; } catch { /* 往下搶救 */ } }
  if (value === null) return { profile: newCampaign(Math.min(legacyWins, LEGACY_CLAIM_MAX_WINS)), level: 'legacy' };
  const heroId = typeof value?.heroId === 'string' && campaignGuardianIds().includes(value.heroId) ? value.heroId : null;
  const wins = Number.isSafeInteger(value?.wins) && (value!.wins as number) >= 0 ? value!.wins as number : 0;
  let treasures: HardCampaign['treasures'];
  try { treasures = value?.treasures === undefined ? undefined : validateTreasureBook(value.treasures); } catch { treasures = undefined; }
  const rewards = Array.isArray(value?.rewards) ? value!.rewards : [], receipts = Array.isArray(value?.receipts) ? value!.receipts : [];
  const base = { version: 1 as const, wins, heroId, teamIds: [] as string[], ...(treasures ? { treasures } : {}) };
  const attempts: [HardCampaign, 'flags' | 'no-enhancements' | 'wins-and-rewards' | 'wins-only'][] = [
    [{ ...(value as HardCampaign), version: 1, heroChoiceUsed: value?.heroChoiceUsed === true && wins >= 8 && !!heroId, teamIds: [] }, 'flags'],
    [{ ...base, heroChoiceUsed: value?.heroChoiceUsed === true && wins >= 8 && !!heroId, rewards, receipts, consumedYoungIds: [], enhancements: {}, enhancementReceipts: [] }, 'no-enhancements'],
    [{ ...base, heroChoiceUsed: false, rewards, receipts }, 'wins-and-rewards'],
    [{ ...base, heroChoiceUsed: false, rewards: [], receipts: [] }, 'wins-only'],
  ];
  for (const [candidate, level] of attempts) {
    if (level === 'wins-only' && receipts.length) {
      // 有收據但收據壞掉：勝場以最後一張完好的收據為準，避免憑空多出勝場。
      const lastGood = receipts.filter(r => r && Number.isSafeInteger(r.win)).reduce((m, r) => Math.max(m, r.win), 0);
      candidate.wins = Math.min(wins, lastGood);
    }
    try { return { profile: parseCampaign(JSON.stringify(candidate)), level }; } catch { /* 下一層 */ }
  }
  return { profile: newCampaign(Math.min(legacyWins, LEGACY_CLAIM_MAX_WINS)), level: 'legacy' };
}

/** 第一次接通共同卡庫時要帶上去的寶珠存檔：有存檔用存檔（讀不懂就搶救），只有舊進度鍵就用它的勝場。 */
export function orbProfileForImport(campaignRaw: string | null, progressRaw: string | null): string | null {
  const legacy = Math.min(legacyProgressWins(progressRaw), LEGACY_CLAIM_MAX_WINS);
  if (campaignRaw !== null) {
    const { profile } = salvageCampaign(campaignRaw, legacy);
    // 存檔沒有收據、勝場卻比舊進度鍵少（例如被舊版同步覆蓋成 0）：以舊進度鍵的勝場為準。
    if (!profile.receipts.length && legacy > profile.wins) return JSON.stringify({ ...profile, wins: legacy, heroChoiceUsed: profile.heroChoiceUsed && legacy >= 8 });
    return JSON.stringify(profile);
  }
  return legacy > 0 ? JSON.stringify(newCampaign(legacy)) : null;
}

/** 本機能主張的舊勝場（沒有收據的部分）：舊進度鍵與「沒有收據的本機存檔勝場」取大者。 */
export function localLegacyWins(local: HardCampaign | null, progressRaw: string | null): number {
  const fromKey = legacyProgressWins(progressRaw);
  const fromSave = local && !local.receipts.length ? local.wins : 0;
  return Math.min(Math.max(fromKey, fromSave), LEGACY_CLAIM_MAX_WINS);
}

const treasureTotal = (p: HardCampaign) => p.treasures ? Object.values(p.treasures.counts).reduce((a, b) => a + b, 0) + Object.values(p.treasures.variants ?? {}).reduce((a, b) => a + b, 0) : 0;
/** 本機比伺服器多（勝場或獎卡收據）：不能靜默覆蓋，要讓客戶選。 */
export function campaignAhead(local: HardCampaign, server: HardCampaign): boolean {
  return local.wins > server.wins || local.receipts.length > server.receipts.length;
}
/** 覆蓋前是否需要備份：任何進度欄位會改變就備份。 */
export function campaignWouldChange(localRaw: string, server: HardCampaign): boolean {
  let local: HardCampaign;
  try { local = JSON.parse(localRaw); } catch { return true; }
  return local.wins !== server.wins || (local.receipts?.length ?? 0) !== server.receipts.length || local.heroId !== server.heroId
    || treasureTotal(local) !== treasureTotal(server) || JSON.stringify(local.enhancements ?? {}) !== JSON.stringify(server.enhancements ?? {});
}

/** 「以伺服器為準」時送出的乾淨存檔：只留主角，勝場、收據、寶器全部由伺服器帳本填入。 */
export function serverBaselineProfile(localRaw: string | null): HardCampaign {
  let heroId: string | null = null;
  try { const v = localRaw ? JSON.parse(localRaw) : null; if (typeof v?.heroId === 'string' && campaignGuardianIds().includes(v.heroId)) heroId = v.heroId; } catch { heroId = null; }
  return { ...newCampaign(0), heroId, consumedYoungIds: [], enhancements: {}, enhancementReceipts: [] };
}

export interface LocalBackup { at: string; kind: string; raw: string }
/** 時間戳記備份清單：同類最新一份內容相同就不重複存；每類最多保留 max 份（先丟最舊）。 */
export function appendBackup(list: readonly LocalBackup[], entry: LocalBackup, max = 3): LocalBackup[] {
  const same = list.filter(b => b.kind === entry.kind);
  if (same.length && same[same.length - 1].raw === entry.raw) return [...list];
  const kept = [...list, entry];
  const ofKind = kept.filter(b => b.kind === entry.kind);
  const drop = new Set(ofKind.slice(0, Math.max(0, ofKind.length - max)));
  return kept.filter(b => !drop.has(b));
}
