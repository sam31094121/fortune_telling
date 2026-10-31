import { getCard } from '../registry';
import { campaignCollection, parseCampaign, type HardCampaign } from './hard-campaign';

export const CAMPAIGN_BACKUP_MAX_BYTES = 2 * 1024 * 1024;
const FORMAT = 'match3-hard-self-backup';
function bounded(raw: string) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > CAMPAIGN_BACKUP_MAX_BYTES) throw new Error('備份檔超過 2 MB 或格式不正確');
}
export function encodeCampaignBackup(profile: HardCampaign, exportedAt = new Date().toISOString()): string {
  const verified = parseCampaign(JSON.stringify(profile));
  const raw = JSON.stringify({ format: FORMAT, version: 1, exportedAt, profile: verified });
  bounded(raw); return raw;
}
export function decodeCampaignBackup(raw: string): HardCampaign {
  bounded(raw);
  let data: unknown; try { data = JSON.parse(raw); } catch { throw new Error('備份檔無法讀取，請選擇完整的寶珠存檔'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('這不是寶珠存檔備份');
  const value = data as Record<string, unknown>;
  if (value.format !== FORMAT || value.version !== 1 || typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt)) || !value.profile || typeof value.profile !== 'object') throw new Error('備份版本或產品不符，無法匯入');
  try { return parseCampaign(JSON.stringify(value.profile)); } catch { throw new Error('寶珠存檔內容不完整或紀錄不一致，無法匯入'); }
}
export function campaignBackupPreview(raw: string) {
  const profile = decodeCampaignBackup(raw), collection = campaignCollection(profile);
  return {
    hero: profile.heroId ? getCard(profile.heroId)?.name ?? profile.heroId : '尚未選擇',
    wins: profile.wins,
    adultCopies: collection.adults.reduce((total, card) => total + card.count, 0),
    youngAvailable: collection.youngIds.length,
    consumedYoung: (profile.consumedYoungIds ?? []).length,
    enhancedCards: Object.keys(profile.enhancements ?? {}).length,
    heroChoiceUsed: profile.heroChoiceUsed,
  };
}
