'use client';

/**
 * 神獸戰場 V1・畫面
 * ============================================================================
 *
 * 業主定調：「先讓玩家一眼看懂：卡在哪裡、哪隻正在戰鬥、下一張可以放哪裡。」
 *
 * 【這一層只負責顯示】
 *
 * 能不能放、放完長什麼樣，全部問 lib/beast-game/battlefield.ts。
 * 這裡一行規則都不寫——業主第十八條「不要把規則寫死在 UI」。
 * 所以合法格子要發光時，問的是 legalDestinations()，
 * 不是畫面自己判斷「看起來應該可以放」。
 *
 * 【只載看得見的卡】
 *
 * 業主第六條：六十張不得一次載入。所以進 DOM 的只有
 * 手牌、五格後備、主戰、牌庫最上面一張的牌背、棄牌最上面一張——
 * 牌庫其餘的只是一個數字。
 */

import { useMemo } from 'react';
import styles from './Battlefield.module.css';
import {
  BENCH_SIZE,
  legalDestinations,
  type BattleState,
  type Destination,
  type PlayerSide,
} from '@/lib/beast-game/battlefield';

/** 畫面要顯示一張卡需要的最小資料。戰場不需要故事與技能全文。 */
export interface BattlefieldCardArt {
  id: string;
  name: string;
  thumbnail: string;
  element: string;
}

type CardLookup = (cardId: string) => BattlefieldCardArt | undefined;

/* ────────────────────────────────────────────────────────────────────────────
   卡槽：所有尺寸的唯一來源
   ──────────────────────────────────────────────────────────────────────── */

export function CardSlot({
  card,
  selected,
  legalTarget,
  label,
  onClick,
}: {
  card?: BattlefieldCardArt;
  selected?: boolean;
  legalTarget?: boolean;
  /** 無障礙名稱。空格也要說得出這是哪一格，不能只有一個框。 */
  label: string;
  onClick?: () => void;
}) {
  const classes = [styles.slot, selected ? styles.selected : '', legalTarget ? styles.legal : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={classes} onClick={onClick} aria-label={label} aria-pressed={selected}>
      {card ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.thumbnail} alt={card.name} loading="lazy" decoding="async" draggable={false} />
      ) : (
        <span className={styles.slotMark} aria-hidden="true">＋</span>
      )}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   各區
   ──────────────────────────────────────────────────────────────────────── */

export function ActiveCardSlot({
  cardId, lookup, selected, legalTarget, sideLabel, onClick,
}: {
  cardId: string | null;
  lookup: CardLookup;
  selected?: boolean;
  legalTarget?: boolean;
  sideLabel: string;
  onClick?: () => void;
}) {
  const card = cardId ? lookup(cardId) : undefined;
  return (
    <div className={styles.activeRow}>
      <div className={styles.active}>
        <CardSlot
          card={card}
          selected={selected}
          legalTarget={legalTarget}
          label={card ? `${sideLabel}主戰：${card.name}` : `${sideLabel}主戰：空格`}
          onClick={onClick}
        />
      </div>
    </div>
  );
}

export function BenchZone({
  bench, lookup, selectedCardId, legalSlots, sideLabel, onSlot,
}: {
  bench: Array<string | null>;
  lookup: CardLookup;
  selectedCardId: string | null;
  /** 目前可以放進去的格號。空陣列＝這一區現在都不能放。 */
  legalSlots: number[];
  sideLabel: string;
  onSlot?: (index: number) => void;
}) {
  return (
    <div className={styles.bench}>
      {bench.map((cardId, index) => {
        const card = cardId ? lookup(cardId) : undefined;
        return (
          <CardSlot
            key={index}
            card={card}
            selected={Boolean(cardId) && cardId === selectedCardId}
            legalTarget={legalSlots.includes(index)}
            label={card ? `${sideLabel}後備第 ${index + 1} 格：${card.name}` : `${sideLabel}後備第 ${index + 1} 格：空格`}
            onClick={onSlot ? () => onSlot(index) : undefined}
          />
        );
      })}
    </div>
  );
}

export function HandZone({
  hand, lookup, selectedCardId, onCard,
}: {
  hand: string[];
  lookup: CardLookup;
  selectedCardId: string | null;
  onCard?: (cardId: string) => void;
}) {
  return (
    <div className={styles.hand} role="group" aria-label="你的手牌">
      {hand.map((cardId) => {
        const card = lookup(cardId);
        return (
          <div key={cardId} className={styles.handCard}>
            <CardSlot
              card={card}
              selected={cardId === selectedCardId}
              label={card ? `手牌：${card.name}` : `手牌：${cardId}`}
              onClick={onCard ? () => onCard(cardId) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

/** 牌庫。只畫牌背與剩餘張數——底下那幾十張不進 DOM。 */
export function DeckPile({ count, label }: { count: number; label: string }) {
  return (
    <div className={styles.pile}>
      <div className={styles.slot} aria-label={`${label}牌庫，剩 ${count} 張`} role="img">
        <span className={styles.pileBack} aria-hidden="true">☯</span>
      </div>
      <p className={styles.pileCount}>牌庫 {count}</p>
    </div>
  );
}

/** 棄牌。只畫最上面那一張，其餘只是數字。 */
export function DiscardPile({
  discard, lookup, label,
}: {
  discard: string[];
  lookup: CardLookup;
  label: string;
}) {
  const top = discard.length ? lookup(discard[discard.length - 1]) : undefined;
  return (
    <div className={styles.pile}>
      <div className={styles.slot} role="img" aria-label={`${label}棄牌，共 ${discard.length} 張`}>
        {top ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={top.thumbnail} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className={styles.slotMark} aria-hidden="true">－</span>
        )}
      </div>
      <p className={styles.pileCount}>棄牌 {discard.length}</p>
    </div>
  );
}

export function TurnIndicator({ state }: { state: BattleState }) {
  const mine = state.currentPlayer === 'PLAYER';
  return (
    <div className={styles.center} role="status" aria-live="polite">
      <p className={styles.vs}>VS</p>
      <p className={styles.hint}>
        第 {state.turn} 回合・{mine ? '你的回合' : '對手回合'}
        {state.phase === 'PREPARE' ? '・佈陣中' : ''}
      </p>
      <p className={styles.hint}>
        {state.selectedCardId ? '已選取——點發光的格子放下' : '點一張卡開始'}
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   整張桌子
   ──────────────────────────────────────────────────────────────────────── */

export function OpponentField({ state, lookup }: { state: BattleState; lookup: CardLookup }) {
  return (
    <section className={styles.side} aria-label="對手戰場">
      <div className={styles.sideLabel}>
        <strong>電腦對手</strong>
        <span>手牌 {state.opponent.hand.length}・牌庫 {state.opponent.deck.length}</span>
      </div>
      {/* 對手的後備在上、主戰在下——越靠中央越接近交戰面。 */}
      <BenchZone
        bench={state.opponent.bench}
        lookup={lookup}
        selectedCardId={null}
        legalSlots={[]}
        sideLabel="對手"
      />
      <ActiveCardSlot cardId={state.opponent.active} lookup={lookup} sideLabel="對手" />
    </section>
  );
}

export function PlayerField({
  state, lookup, onSelect, onDestination,
}: {
  state: BattleState;
  lookup: CardLookup;
  onSelect: (cardId: string) => void;
  onDestination: (to: Destination) => void;
}) {
  const selected = state.selectedCardId;

  // 合法位置只問引擎一次，畫面照著點亮。
  const legal = useMemo<Destination[]>(
    () => (selected ? legalDestinations(state, 'PLAYER' as PlayerSide, selected) : []),
    [state, selected],
  );
  const activeLegal = legal.some((d) => d.zone === 'ACTIVE');
  const benchLegal = legal.flatMap((d) => (d.zone === 'BENCH' ? [d.slotIndex] : []));

  return (
    <section className={styles.side} aria-label="你的戰場">
      <ActiveCardSlot
        cardId={state.player.active}
        lookup={lookup}
        selected={Boolean(state.player.active) && state.player.active === selected}
        legalTarget={activeLegal}
        sideLabel="你的"
        onClick={() => {
          if (activeLegal) onDestination({ zone: 'ACTIVE' });
          else if (state.player.active) onSelect(state.player.active);
        }}
      />
      <BenchZone
        bench={state.player.bench}
        lookup={lookup}
        selectedCardId={selected}
        legalSlots={benchLegal}
        sideLabel="你的"
        onSlot={(index) => {
          if (benchLegal.includes(index)) onDestination({ zone: 'BENCH', slotIndex: index });
          else {
            const cardId = state.player.bench[index];
            if (cardId) onSelect(cardId);
          }
        }}
      />
      <div className={styles.piles}>
        <DeckPile count={state.player.deck.length} label="你的" />
        <DiscardPile discard={state.player.discard} lookup={lookup} label="你的" />
      </div>
      <div className={styles.sideLabel}>
        <strong>你的手牌</strong>
        <span>{state.player.hand.length} 張</span>
      </div>
      <HandZone hand={state.player.hand} lookup={lookup} selectedCardId={selected} onCard={onSelect} />
    </section>
  );
}

export default function GameBattlefield({
  state, cards, onSelect, onDestination,
}: {
  state: BattleState;
  cards: BattlefieldCardArt[];
  onSelect: (cardId: string) => void;
  onDestination: (to: Destination) => void;
}) {
  const lookup = useMemo<CardLookup>(() => {
    const map = new Map(cards.map((card) => [card.id, card]));
    return (cardId: string) => map.get(cardId);
  }, [cards]);

  return (
    <div className={styles.table} data-battlefield data-bench-size={BENCH_SIZE}>
      <OpponentField state={state} lookup={lookup} />
      <TurnIndicator state={state} />
      <PlayerField state={state} lookup={lookup} onSelect={onSelect} onDestination={onDestination} />
    </div>
  );
}
