'use client';

import { useEffect, useRef, useState } from 'react';
import { cardFusionChoices, previewOwnedCardEnhancement, enhanceOwnedCard, readCollection, subscribeCollection } from '@/lib/beast-collection';
import CatalogBeastCard from './CatalogBeastCard';
import styles from './OwnedCampaignPreparation.module.css';

export default function OwnedCardCultivation({ onSaved, onDone }: { onSaved: () => void; onDone: () => void }) {
  const [collection, setCollection] = useState(readCollection);
  const [target, setTarget] = useState('');
  const [material, setMaterial] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewOwnedCardEnhancement>> | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof enhanceOwnedCard>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef<string | null>(null);
  const alive = useRef(true);
  const choices = cardFusionChoices(collection);
  useEffect(() => { alive.current = true; const unsub = subscribeCollection(() => setCollection(readCollection())); return () => { alive.current = false; unsub(); }; }, []);
  useEffect(() => {
    let active = true;
    setPreview(null); setError('');
    if (target && material) void previewOwnedCardEnhancement(target, material).then(value => { if (active) setPreview(value); }).catch(() => { if (active) setError('暫時無法取得強化數值，請重新選擇。'); });
    return () => { active = false; };
  }, [target, material]);
  const select = (kind: 'target' | 'material', id: string) => {
    if (busy) return;
    operation.current = null; setResult(null); setPreview(null);
    if (kind === 'target') { setTarget(id); setMaterial(''); } else setMaterial(id);
  };
  const confirm = async () => {
    if (busy || !preview?.allowed || choices.blockedReason) return;
    setBusy(true); setError(''); operation.current ??= crypto.randomUUID();
    try {
      const next = await enhanceOwnedCard(operation.current, target, material);
      if (!alive.current) return;
      setResult(next);
      if (next.saved) { setCollection(readCollection()); onSaved(); }
      else setError(next.error ?? '尚未保存，請重試同一次強化。');
    } catch { if (alive.current) setError('尚未確認保存，請重試同一次強化。'); }
    finally { if (alive.current) setBusy(false); }
  };
  const targetCard = collection.cards.find(c => c.id === target);
  // Preserve the consumed portrait through the receipt animation.
  const materialPortrait = useRef<string | undefined>(undefined);
  const selectedMaterial = collection.cards.find(c => c.id === material);
  if (selectedMaterial) materialPortrait.current = selectedMaterial.cardId;
  return <section className={styles.panel} data-card-cultivation>
    <h2>我的卡片・永久強化</h2>
    <p>選一張成獸或神獸，再選一張幼子。確認後消耗該幼子副本，強化保存在此瀏覽器。</p>
    {(collection.storageError || choices.blockedReason) && <p role="alert">{collection.storageError || choices.blockedReason}</p>}
    {result?.saved ? <>
      <div className={styles.fusionPair} data-absorbing="true"><CatalogBeastCard id={materialPortrait.current} /><span>→</span><CatalogBeastCard id={targetCard?.cardId} /></div>
      <p role="status" data-cultivation-saved>{result.display ? <>已保存，消耗一張幼子。實戰攻擊 {result.display.beforeAttack} → {result.display.afterAttack}（本次 +{result.display.attackBonus}）</> : '已保存；強化數值暫時無法取得。'}</p>
      <button className={styles.confirm} type="button" onClick={onDone}>完成，繼續選卡</button>
    </> : <>
      <h3>① 選擇要強化的卡片</h3>
      <div className={styles.grid}>{choices.targets.map(card => <button type="button" key={card.id} data-cultivation-target={card.id} disabled={busy || Boolean(choices.blockedReason)} aria-pressed={target === card.id} onClick={() => select('target', card.id)}><CatalogBeastCard id={card.cardId} /></button>)}</div>
      {!choices.targets.length && <p>目前沒有可強化的成獸或神獸。</p>}
      {target && <><h3>② 選擇消耗的幼子</h3><div className={styles.grid}>{choices.materials.map(card => <button type="button" key={card.id} data-cultivation-material={card.id} disabled={busy || Boolean(choices.blockedReason)} aria-pressed={material === card.id} onClick={() => select('material', card.id)}><CatalogBeastCard id={card.cardId} /></button>)}</div></>}
      {preview?.preview && <p data-cultivation-preview>實戰攻擊 {preview.preview.beforeAttack} → {preview.preview.battleAfterAttack}（本次 +{preview.preview.attackBonus}）</p>}
      {preview && !preview.allowed && <p role="alert">{preview.reason}</p>}
      {material && <><p>確認後該幼子永久消耗，不能復原。</p><button type="button" className={styles.confirm} data-confirm-cultivation disabled={busy || !preview?.allowed || Boolean(choices.blockedReason)} onClick={() => void confirm()}>{busy ? '正在保存…' : '確認消耗並強化'}</button></>}
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
