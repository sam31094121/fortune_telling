'use client';

import CatalogBeastCard from './CatalogBeastCard';
import type { StakeCard } from './StakeSlot';
import styles from './OwnedCampaignPreparation.module.css';

/** Selection is by actual copy; the backend validates the submitted formation. */
export default function OwnedCampaignPreparation({ owned, selected, busy, onToggle, onConfirm }: {
  owned: StakeCard[]; selected: string[]; busy: boolean;
  onToggle: (id: string) => void; onConfirm: () => void;
}) {
  return <section className={styles.panel} data-owned-campaign-team>
    <h2>親選五張出戰卡</h2>
    <p>選五種不同神獸，第一張為主戰。出戰與押注分開確認。</p>
    <p role="status">已選 {selected.length}／5 張</p>
    <div className={styles.grid}>
      {owned.map(card => {
        const index = selected.indexOf(card.id);
        const sameKind = selected.some(id => id !== card.id && owned.find(c => c.id === id)?.cardId === card.cardId);
        return <button type="button" key={card.id} data-team-copy={card.id} aria-pressed={index >= 0}
          disabled={busy || (index < 0 && (selected.length >= 5 || sameKind))}
          onClick={() => onToggle(card.id)}>
          <CatalogBeastCard id={card.cardId} />
          <strong>{card.name}</strong><small>副本 {card.copy} {index >= 0 ? `・第 ${index + 1} 位` : ''}</small>
        </button>;
      })}
    </div>
    <button type="button" className={styles.confirm} data-confirm-owned-team disabled={busy || selected.length !== 5} onClick={onConfirm}>
      {busy ? '正在準備陣容…' : '確認五張，前往押注'}
    </button>
  </section>;
}
