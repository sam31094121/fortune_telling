'use client';
import { useEffect, useState } from 'react';
import { formatRecoveryCode, parseRecoveryCode, recoverWalletKey } from '@/lib/beast-wallet-recovery';
import { restoreWalletKey, startFreshWallet } from '@/lib/beast-cultivation-client';
import { CAMPAIGN_BACKUP_MAX_BYTES, campaignBackupPreview } from '@/lib/beast-game/match3/campaign-backup';
import { exportCampaignBackup, importCampaignBackup } from '@/lib/beast-game/match3/hard-campaign-store';
import styles from './Match3TeamPicker.module.css';

export default function CampaignBackup({ onImported }: { onImported: () => void }) {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof campaignBackupPreview> | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(''), [typed, setTyped] = useState(''), [walletMessage, setWalletMessage] = useState('');
  useEffect(() => { let alive = true; void recoverWalletKey().then(found => { if (alive) setCode(found.key ? formatRecoveryCode(found.key) : ''); }); return () => { alive = false; }; }, []);
  return <details className={styles.enhancement} data-testid="campaign-backup">
    <summary>存檔備份</summary>
    <section data-testid="wallet-recovery" aria-label="共同卡庫識別碼">
      <h3>共同卡庫識別碼</h3>
      <p>你的卡片與進度存在雲端，靠這組識別碼找到。換手機、清除瀏覽器資料之後，輸入它就能把原本的卡庫救回來。請抄下或複製後保管好，不要給別人。</p>
      <p data-testid="wallet-code">{code ? code : '目前這個瀏覽器還沒有識別碼（進入遊戲後會自動產生）。'}</p>
      {code && <button type="button" data-testid="copy-wallet-code" onClick={async () => { try { await navigator.clipboard.writeText(code); setWalletMessage('已複製識別碼，請貼到安全的地方保存。'); } catch { setWalletMessage('這個瀏覽器不能自動複製，請直接抄下上面的識別碼。'); } }}>複製識別碼</button>}
      <label>輸入識別碼還原卡庫<input type="text" inputMode="text" autoComplete="off" data-testid="wallet-code-input" style={{ display: 'block', width: '100%', minHeight: 44, color: '#111', background: '#fff', fontSize: 16 }} value={typed} onChange={e => setTyped(e.target.value)} /></label>
      <button type="button" data-testid="restore-wallet" disabled={busy} onClick={async () => {
        const key = parseRecoveryCode(typed);
        if (!key) { setWalletMessage('識別碼格式不對：應該是 64 個英數字（可以含 - 分隔）。'); return; }
        setBusy(true);
        try { await restoreWalletKey(key); setCode(formatRecoveryCode(key)); setTyped(''); setWalletMessage('識別碼已還原，正在重新讀取你的卡庫。'); onImported(); }
        catch { setWalletMessage('還原尚未成功，請再試一次。'); }
        finally { setBusy(false); }
      }}>用這組識別碼還原</button>
      <button type="button" data-testid="fresh-wallet" disabled={busy} onClick={() => { if (!window.confirm('改用全新卡庫後，找不回的舊卡庫不會再出現。確定嗎？')) return; startFreshWallet(); setCode(''); setWalletMessage('已改用全新卡庫，下次進入遊戲會重新建立。'); onImported(); }}>找不回識別碼，改用全新卡庫</button>
      {walletMessage && <p role="status" data-testid="wallet-message">{walletMessage}</p>}
    </section>
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
