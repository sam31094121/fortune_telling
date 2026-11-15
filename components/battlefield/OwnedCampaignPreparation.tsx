'use client';

import { memo, useMemo } from 'react';
import CatalogBeastCard from './CatalogBeastCard';
import type { StakeCard } from './StakeSlot';
import styles from './OwnedCampaignPreparation.module.css';
import {readSharedCultivation} from '@/lib/beast-cultivation-client';

/**
 * 親選五張出戰卡。
 * 2026-11-12：同一種神獸只列一張（顯示「持有 N 張」），因為出戰本來就要選五「種」不同的神獸，
 * 把每一張副本各列一格只會讓畫面又長又卡。實際送出的仍是真實副本 id，後端照舊驗證。
 * 用 memo 包起來：押注加碼、換分頁這些與陣容無關的狀態變動不會重畫整排卡面。
 */
function OwnedCampaignPreparation({ owned, selected, busy, onToggle, onConfirm, onReplace }: {
  owned: StakeCard[]; selected: string[]; busy: boolean;
  onToggle: (id: string) => void; onConfirm: () => void;
  onReplace:(oldId:string,newId:string)=>void;
}) {
  // 合體強化的數字全由後端算好（共同卡庫檢視）；這裡只挑「最強的那一張」當代表並照印，不自己算。
  const view = readSharedCultivation();
  const power = new Map((view?.cards ?? []).map(c => [c.id, c]));
  const bonusOf = (id: string) => { try { return BigInt(power.get(id)?.bonus ?? '0'); } catch { return 0n; } };
  const kinds = useMemo(() => {
    const map = new Map<string, { head: StakeCard; ids: string[] }>();
    for (const card of [...owned].sort((a, b) => (bonusOf(b.id) > bonusOf(a.id) ? 1 : bonusOf(b.id) < bonusOf(a.id) ? -1 : 0))) {
      const entry = map.get(card.cardId);
      if (entry) entry.ids.push(card.id); else map.set(card.cardId, { head: card, ids: [card.id] });
    }
    return [...map.values()];
  }, [owned, view?.revision]);
  return <section className={styles.panel} data-owned-campaign-team>
    <h2>親選五張出戰卡</h2>
    <p>選五種不同神獸，第一張為主戰。出戰與押注分開確認。</p>
    <p role="status">已選 {selected.length}／5 張</p>
    <div className={styles.grid}>
      {kinds.map(({ head, ids }) => {
        const chosenId = ids.find(id => selected.includes(id));
        const index = chosenId ? selected.indexOf(chosenId) : -1;
        const targetId = chosenId ?? head.id;
        return <button type="button" key={head.cardId} data-team-copy={targetId} aria-pressed={index >= 0}
          disabled={busy || (index < 0 && selected.length >= 5)}
          onClick={() => onToggle(targetId)}>
          {(() => { const fused = power.get(targetId); const on = fused && bonusOf(targetId) > 0n;
            return <>
              <CatalogBeastCard id={head.cardId} attackOverride={on ? fused.orbAttack : undefined} />
              <strong>{head.name}</strong>{on && <b data-fused-badge style={{ display: 'block', fontSize: 16, fontWeight: 800, color: '#fde68a' }}>已合體 +{fused.bonus}</b>}<small>持有 {ids.length} 張 {index >= 0 ? `・第 ${index + 1} 位` : ''}</small>
            </>; })()}
        </button>;
      })}
    </div>
    {selected.map((id,index)=>{const card=owned.find(c=>c.id===id);if(!card)return null;const copies=owned.filter(c=>c.cardId===card.cardId),view=readSharedCultivation();return <label key={id} style={{display:'block',margin:'12px 0'}}>第 {index+1} 位・{card.name}<select data-card-owned-copy={card.cardId} value={id} disabled={busy} onChange={e=>onReplace(id,e.target.value)} style={{display:'block',minHeight:48,maxWidth:'100%',background:'#0f172a',color:'#fff7ed',border:'1px solid #bca777',borderRadius:8,padding:8}}>{copies.map((c,i)=>{const stats=view?.cards.find(s=>s.id===c.id);return <option key={c.id} value={c.id}>收藏第 {i+1} 份{stats?`・永久 +${stats.bonus}・攻擊 ${stats.battleAttack}`:''}</option>;})}</select></label>;})}
    <button type="button" className={styles.confirm} data-confirm-owned-team disabled={busy || selected.length !== 5} onClick={onConfirm}>
      {busy ? '正在準備陣容…' : '確認五張，前往押注'}
    </button>
  </section>;
}

export default memo(OwnedCampaignPreparation);
