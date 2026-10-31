'use client';
import { useRef, useState } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { getSkill } from '@/cards/skills';
import { enhancementUnlocked, enhancementOptions, previewCampaignEnhancement, type HardCampaign } from '@/lib/beast-game/match3/hard-campaign';
import { enhanceCampaign, type CampaignOwner } from '@/lib/beast-game/match3/hard-campaign-store';
import { BeastCardFace } from './BeastCardTile';
import styles from './Match3TeamPicker.module.css';

export default function CampaignEnhancement({ owner, profile, onSaved }: { owner: CampaignOwner; profile: HardCampaign; onSaved: (profile: HardCampaign) => void }) {
  const [target, setTarget] = useState('');
  const [young, setYoung] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const operation = useRef<string | null>(null);
  const options = enhancementOptions(profile);
  const pool = playableCards();
  const preview = target && young ? previewCampaignEnhancement(profile, young, target) : null;
  const card = (id: string) => pool.find(c => c.id === id);
  const face = (id: string) => {
    const c = card(id); if (!c) return null;
    const skill = getSkill(c.skills[0]);
    return <span className={styles.face}><BeastCardFace card={{ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, skillName: skill?.name, description: skill?.description }} /></span>;
  };
  if (!enhancementUnlocked(profile)) return <p className={styles.enhancement} data-testid="enhancement-locked">第五關解鎖永久強化</p>;
  return <details className={styles.enhancement} data-testid="campaign-enhancement">
    <summary>永久強化主角與成獸</summary>
    <p>消耗一張未出戰的幼子，永久提升指定卡片的攻擊力。幼子會從寶珠收藏消失，無法復原；仍須保留至少四位可用夥伴。</p>
    <label>要強化的卡片<select data-testid="enhance-target" disabled={busy} value={target} onChange={e => { setTarget(e.target.value); operation.current = null; setMessage(''); }}>
      <option value="">請選擇主角或已獲成獸</option>{options.targetIds.map(id => <option key={id} value={id}>{card(id)?.name}</option>)}
    </select></label>
    <label>要消耗的幼子<select data-testid="enhance-material" disabled={busy} value={young} onChange={e => { setYoung(e.target.value); operation.current = null; setMessage(''); }}>
      <option value="">請選擇未出戰的幼子</option>{options.youngIds.map(id => <option key={id} value={id}>{card(id)?.name}</option>)}
    </select></label>
    {options.youngIds.length === 0 && <p>目前沒有可消耗的未出戰幼子。</p>}
    {preview && <>
      <div className={styles.enhancementFaces}><div>{face(young)}<p>幼子材料・將永久消耗</p></div><span className={styles.enhancementArrow} aria-label="融入">→</span><div>{face(target)}<p>融入這張神獸卡</p></div></div><p className={styles.enhancementEquation}>{preview.baseAttack} 原始攻擊 ＋ {preview.newTotal} 永久加成 ＝ {preview.afterAttack} 強化後攻擊</p>
      <dl className={styles.enhancementStats} data-testid="enhance-preview"><dt>原始攻擊</dt><dd>{preview.baseAttack}</dd><dt>目前永久加成</dt><dd>+{preview.currentBonus}</dd><dt>本次提升</dt><dd>+{preview.attackBonus}</dd><dt>強化後攻擊</dt><dd>{preview.afterAttack}</dd></dl>
      {!preview.allowed && <p role="status">{preview.reason}</p>}
      <button type="button" data-testid="confirm-enhancement" disabled={busy || !preview.allowed} onClick={async () => {
        operation.current ??= crypto.randomUUID(); setBusy(true); setMessage('');
        const result = await enhanceCampaign(owner, operation.current, young, target); setBusy(false);
        if (!result.ok || !result.profile) { setMessage(result.error || '強化尚未儲存，請重試。'); return; }
        onSaved(result.profile); setYoung(''); operation.current = null; setMessage(`幼子已融入「${card(target)?.name}」，幼子已消耗，永久加成已儲存。`);
      }}>確認消耗「{card(young)?.name}」並永久強化</button>
    </>}
    {message && <p role="status" data-testid="enhancement-result">{message}</p>}
  </details>;
}
