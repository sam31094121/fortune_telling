'use client';
import { useState } from 'react';
import { CAMPAIGN_BACKUP_MAX_BYTES, campaignBackupPreview } from '@/lib/beast-game/match3/campaign-backup';
import { exportCampaignBackup, importCampaignBackup } from '@/lib/beast-game/match3/hard-campaign-store';
import styles from './Match3TeamPicker.module.css';

export default function CampaignBackup({ onImported }: { onImported: () => void }) {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof campaignBackupPreview> | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <details className={styles.enhancement} data-testid="campaign-backup">
    <summary>存檔備份</summary>
    <p>只備份「我自己」的寶珠進度。這是手動下載與搬移，不是雲端同步；兩台裝置之後的進度不會自動合併。</p>
    <button type="button" data-testid="export-campaign" disabled={busy} onClick={() => {
      const result = exportCampaignBackup('self');
      if (!result.ok || !result.backup) { setMessage(result.error || '目前無法下載備份'); return; }
      const url = URL.createObjectURL(new Blob([result.backup], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `寶珠存檔-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('已交給瀏覽器下載，請確認檔案已保存在裝置。');
    }}>下載自己的存檔</button>
    <p>另一裝置可選擇備份檔預覽。僅限尚未有自己進度的瀏覽器，既有存檔不會被覆蓋。</p>
    <label>選擇寶珠備份檔（最多 2 MB）<input type="file" accept=".json,application/json" data-testid="import-campaign-file" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; setPreview(null); setRaw(''); setMessage('');
      if (!file) return;
      if (file.size > CAMPAIGN_BACKUP_MAX_BYTES) { setMessage('備份檔超過 2 MB，無法匯入'); return; }
      setBusy(true);
      try { const text = await file.text(); const data = campaignBackupPreview(text); setRaw(text); setPreview(data); }
      catch (error) { setMessage(error instanceof Error ? error.message : '備份檔無法讀取'); }
      finally { setBusy(false); }
    }} /></label>
    {preview && <>
      <dl className={styles.enhancementStats} data-testid="backup-preview">
        <dt>主角</dt><dd>{preview.hero}</dd><dt>已通過關卡</dt><dd>{preview.wins}</dd>
        <dt>已獲成獸</dt><dd>{preview.adultCopies} 張</dd><dt>可用幼子</dt><dd>{preview.youngAvailable} 張</dd>
        <dt>已永久消耗幼子</dt><dd>{preview.consumedYoung} 張</dd><dt>已強化卡片</dt><dd>{preview.enhancedCards} 張</dd>
        <dt>第八關重選機會</dt><dd>{preview.heroChoiceUsed ? '已使用' : '尚未使用'}</dd>
      </dl>
      <p>確認後會保留此檔案的消耗、強化與換角紀錄，不會恢復已消耗的幼子。原裝置的存檔不會自動刪除。</p>
      <button type="button" data-testid="confirm-campaign-import" disabled={busy} onClick={async () => {
        setBusy(true); const result = await importCampaignBackup('self', raw); setBusy(false);
        if (!result.ok) { setMessage(result.error || '匯入尚未成功，請重試'); return; }
        setMessage('存檔已匯入並確認儲存。'); setRaw(''); setPreview(null); onImported();
      }}>確認匯入「我自己」的存檔</button>
    </>}
    {message && <p role="status" data-testid="backup-result">{message}</p>}
  </details>;
}
