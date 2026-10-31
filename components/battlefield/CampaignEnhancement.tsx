'use client';
import { useEffect, useRef, useState } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { getSkill } from '@/cards/skills';
import { enhancementReceiptDisplay, campaignCardAttack, enhancementUnlocked, enhancementOptions, previewCampaignEnhancement, type HardCampaign } from '@/lib/beast-game/match3/hard-campaign';
import { enhanceCampaign, type CampaignOwner } from '@/lib/beast-game/match3/hard-campaign-store';
import { BeastCardFace } from './BeastCardTile';
import styles from './Match3TeamPicker.module.css';

export default function CampaignEnhancement({ owner, profile, onSaved }: { owner: CampaignOwner; profile: HardCampaign; onSaved: (profile: HardCampaign) => void }) {
  const [target, setTarget] = useState('');
  const [young, setYoung] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [absorption, setAbsorption] = useState<{ preview: ReturnType<typeof previewCampaignEnhancement>; done: boolean; beforeAttack: number | null; afterAttack: number; attackBonus: number | null } | null>(null);
  const operation = useRef<string | null>(null);
  const mounted = useRef(true);
  const closeup = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (absorption) closeup.current?.focus({ preventScroll: true });
  }, [absorption]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!absorption || absorption.done) return;
    const timer = window.setTimeout(() => {
      setAbsorption({ ...absorption, done: true }); setBusy(false);
      setMessage('幼子已融入，永久加成已儲存。');
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : 1800);
    return () => window.clearTimeout(timer);
  }, [absorption]);
  const options = enhancementOptions(profile);
  const pool = playableCards();
  const preview = absorption?.preview ?? (target && young ? previewCampaignEnhancement(profile, young, target) : null);
  const beforeAttack = absorption ? absorption.beforeAttack : (target ? campaignCardAttack(profile, target).attack : 0);
  const card = (id: string) => pool.find(c => c.id === id);
  const face = (id: string) => {
    const c = card(id); if (!c) return null;
    const skill = getSkill(c.skills[0]);
    return <span className={styles.face}><BeastCardFace card={{ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, skillName: skill?.name, description: skill?.description }} /></span>;
  };
  if (!enhancementUnlocked(profile)) return <p className={styles.enhancement} data-testid="enhancement-locked">第五關解鎖永久強化</p>;
  return <section className={styles.enhancement} data-testid="campaign-enhancement" aria-label="永久強化">
    <h3 className={styles.enhancementStep}>永久強化</h3>
    {!target && <section aria-label="選擇要強化的神獸">
      <h3 className={styles.enhancementStep}>① 選神獸</h3>
      <div className={styles.enhancementChoices}>{options.targetIds.map(id => <button type="button" key={id} className={styles.enhancementCard} data-testid="enhance-target" data-id={id} disabled={busy} aria-label={`強化${card(id)?.name}`} onClick={() => { setTarget(id); setYoung(''); operation.current = null; setMessage(''); }}>{face(id)}</button>)}</div>
    </section>}
    {target && !young && <section aria-label="選擇融入的幼子">
      <div className={styles.enhancementStepBar}><h3 className={styles.enhancementStep}>② 選幼子</h3><button type="button" className={styles.enhancementBack} disabled={busy} onClick={() => { setTarget(''); operation.current = null; setMessage(''); }}>重選神獸</button></div>
      <div className={styles.enhancementChosen}>{face(target)}</div>
      <div className={styles.enhancementChoices}>{options.youngIds.map(id => <button type="button" key={id} className={styles.enhancementCard} data-testid="enhance-material" data-id={id} disabled={busy} aria-label={`選擇${card(id)?.name}作為永久消耗材料`} onClick={() => { setYoung(id); operation.current = null; setMessage(''); }}>{face(id)}</button>)}</div>
      {options.youngIds.length === 0 && <p>目前沒有可消耗的未出戰幼子。</p>}
    </section>}
    {preview && <div ref={closeup} tabIndex={absorption ? -1 : undefined} className={absorption ? styles.enhancementCloseup : undefined} role={absorption ? "dialog" : undefined} aria-modal={absorption ? true : undefined} aria-label={absorption ? "永久攻擊強化" : undefined} onKeyDown={e => {
      if (!absorption || e.key !== 'Tab') return;
      e.preventDefault();
      const button = e.currentTarget.querySelector<HTMLButtonElement>('button');
      if (button) button.focus(); else e.currentTarget.focus();
    }}>
      <div className={styles.enhancementStepBar}><h3 className={styles.enhancementStep}>③ {absorption ? '融入強化' : '確認融入'}</h3>{!absorption && <button type="button" className={styles.enhancementBack} disabled={busy} onClick={() => { setYoung(''); operation.current = null; setMessage(''); }}>重選幼子</button>}</div>
      <div className={styles.enhancementFaces} data-enhancement-animation={absorption ? absorption.done ? 'complete' : 'absorbing' : undefined} aria-busy={busy}>
        <div className={styles.enhancementMaterial}>{face(young)}<p>永久消耗</p></div><span className={styles.enhancementArrow} aria-label="融入">→</span><div className={styles.enhancementRecipient}>{face(target)}<p>永久強化</p></div>
      </div><p className={styles.enhancementEquation} data-enhancement-reveal={absorption ? absorption.done ? 'complete' : 'pending' : undefined} aria-label="強化前攻擊、強化後攻擊與本次增加">攻擊 {beforeAttack !== null ? <>{beforeAttack} → </> : null}<strong>{absorption?.afterAttack ?? preview.afterAttack}</strong>{(!absorption || absorption.attackBonus !== null) && <span className={styles.enhancementGain}>本次 ＋{absorption ? absorption.attackBonus : preview.attackBonus}</span>}</p>
      {!absorption && <details className={styles.enhancementNumbers}><summary>攻擊數值</summary><dl className={styles.enhancementStats} data-testid="enhance-preview"><dt>原始攻擊</dt><dd>{preview.baseAttack}</dd><dt>目前永久加成</dt><dd>+{preview.currentBonus}</dd><dt>本次提升</dt><dd>+{preview.attackBonus}</dd><dt>強化後攻擊</dt><dd>{preview.afterAttack}</dd></dl></details>}
      {!absorption && <p className={styles.enhancementWarning}>幼子融入後會消失，無法復原。</p>}
      {!preview.allowed && <p role="status">{preview.reason}</p>}
      {!absorption && <button type="button" data-testid="confirm-enhancement" disabled={busy || !preview.allowed} onClick={async () => {
        operation.current ??= crypto.randomUUID(); setBusy(true); setMessage('');
        const result = await enhanceCampaign(owner, operation.current, young, target);
        if (!mounted.current) return;
        if (!result.ok || !result.profile) { setBusy(false); setMessage(result.error || '強化尚未儲存，請重試。'); return; }
        const savedDisplay = enhancementReceiptDisplay(result.profile, operation.current);
        setAbsorption({ preview, done: false, beforeAttack: savedDisplay?.beforeAttack ?? null, afterAttack: savedDisplay?.afterAttack ?? campaignCardAttack(result.profile, target).attack, attackBonus: savedDisplay?.attackBonus ?? result.receipt?.attackBonus ?? null }); onSaved(result.profile); operation.current = null;
      }}>確認消耗「{card(young)?.name}」並永久強化</button>}
      {absorption?.done && <button type="button" data-testid="enhancement-continue" onClick={() => { setAbsorption(null); setYoung(''); setMessage(''); }}>完成</button>}
    </div>}
    {message && <p role="status" data-testid="enhancement-result">{message}</p>}
  </section>;
}
