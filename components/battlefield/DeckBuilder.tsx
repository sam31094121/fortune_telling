'use client';

import type { BattlefieldCardArt } from './GameBattlefield';
import styles from './BattleScreen.module.css';

interface DeckBuilderProps {
  cards: BattlefieldCardArt[];
  selectedIds: string[];
  open: boolean;
  onOpen: () => void;
  onToggle: (cardId: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function DeckBuilder({ cards, selectedIds, open, onOpen, onToggle, onCancel, onSave }: DeckBuilderProps) {
  const selected = new Set(selectedIds);
  if (!open) {
    return (
      <section className={styles.deckSummary} aria-label="我的二十張牌庫">
        <span><strong>我的牌庫</strong>・已選 {selectedIds.length}/20</span>
        <button type="button" onClick={onOpen}>從六十張選牌</button>
      </section>
    );
  }

  return (
    <section className={styles.deckBuilder} aria-label="從六十張神獸卡選擇二十張牌庫">
      <div className={styles.deckBuilderHeading}>
        <div><strong>組建我的牌庫</strong><span>選滿二十張，每局再公平洗牌發五張。</span></div>
        <b aria-live="polite">{selectedIds.length}/20</b>
      </div>
      <div className={styles.deckGrid} role="group" aria-label="六十張神獸卡">
        {cards.map(card => {
          const active = selected.has(card.id);
          const unavailable = !active && selectedIds.length >= 20;
          return (
            <button key={card.id} type="button" aria-pressed={active} disabled={unavailable}
              aria-label={`${card.name}${active ? '，已加入牌庫' : '，加入牌庫'}`}
              onClick={() => onToggle(card.id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.thumbnail} alt="" loading="lazy" />
              <span>{card.name}</span>
              <small>{active ? '已選' : '選取'}</small>
            </button>
          );
        })}
      </div>
      {selectedIds.length >= 20 && <p className={styles.deckHint}>已選滿；要換卡，先取消一張再選另一張。</p>}
      <div className={styles.deckActions}>
        <button type="button" onClick={onCancel}>取消</button>
        <button type="button" disabled={selectedIds.length !== 20} onClick={onSave}>儲存牌庫並重新洗牌</button>
      </div>
    </section>
  );
}
