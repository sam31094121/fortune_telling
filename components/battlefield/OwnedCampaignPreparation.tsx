'use client';

import { memo, useMemo } from 'react';
import CatalogBeastCard from './CatalogBeastCard';
import type { StakeCard } from './StakeSlot';
import styles from './OwnedCampaignPreparation.module.css';

/**
 * 親選五張出戰卡。
 * 2026-11-12：同一種神獸只列一張（顯示「持有 N 張」），因為出戰本來就要選五「種」不同的神獸，
 * 把每一張副本各列一格只會讓畫面又長又卡。實際送出的仍是真實副本 id，後端照舊驗證。
 * 用 memo 包起來：押注加碼、換分頁這些與陣容無關的狀態變動不會重畫整排卡面。
 */
function OwnedCampaignPreparation({ owned, selected, busy, onToggle, onConfirm }: {
  owned: StakeCard[]; selected: string[]; busy: boolean;
  onToggle: (id: string) => void; onConfirm: () => void;
}) {
  const kinds = useMemo(() => {
    const map = new Map<string, { head: StakeCard; ids: string[] }>();
    for (const card of owned) {
      const entry = map.get(card.cardId);
      if (entry) entry.ids.push(card.id); else map.set(card.cardId, { head: card, ids: [card.id] });
    }
    return [...map.values()];
  }, [owned]);
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
          <CatalogBeastCard id={head.cardId} />
          <strong>{head.name}</strong><small>持有 {ids.length} 張 {index >= 0 ? `・第 ${index + 1} 位` : ''}</small>
        </button>;
      })}
    </div>
    <button type="button" className={styles.confirm} data-confirm-owned-team disabled={busy || selected.length !== 5} onClick={onConfirm}>
      {busy ? '正在準備陣容…' : '確認五張，前往押注'}
    </button>
  </section>;
}

export default memo(OwnedCampaignPreparation);
