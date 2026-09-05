'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { selectRitualHighlights, type RitualTurn } from '@/lib/beast-ritual';
import styles from './BeastDuelRitual.module.css';
import frameStyles from './BeastCardFrame.module.css';

type RitualCard = { id: string; name: string; thumbnail: string; element: string };
type Props = {
  player: RitualCard[];
  opponent: RitualCard[] | null;
  timeline?: RitualTurn[];
  replay?: boolean;
  onComplete: () => void;
  onCancel: () => void;
};
const ELEMENTS: Record<string, string> = { SPACE: '空', AIR: '風', WATER: '水', FIRE: '火', EARTH: '地' };
const POSITIONS = ['前鋒', '中軍', '後陣'];

export default function BeastDuelRitual({ player, opponent, timeline, replay, onComplete, onCancel }: Props) {
  const [dealt, setDealt] = useState(false);
  const [phase, setPhase] = useState<'covered' | 'revealing' | 'clash'>('covered');
  const [moment, setMoment] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const completeRef = useRef(onComplete);
  const cancelRef = useRef(onCancel);
  completeRef.current = onComplete;
  cancelRef.current = onCancel;
  const highlights = useMemo(() => selectRitualHighlights(timeline), [timeline]);
  const ready = dealt && opponent?.length === 3;
  const opponentReady = opponent?.length === 3;
  const revealed = phase !== 'covered';

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') cancelRef.current();
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!opponentReady) return;
    const timer = window.setTimeout(() => setDealt(true), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1700);
    return () => window.clearTimeout(timer);
  }, [opponentReady]);

  useEffect(() => {
    if (phase === 'covered') return;
    const timer = window.setTimeout(() => {
      if (phase === 'revealing') {
        if (!highlights.length) completeRef.current();
        else setPhase('clash');
      } else if (moment + 1 < highlights.length) setMoment((value) => value + 1);
      else completeRef.current();
    }, phase === 'revealing' ? 1000 : 1300);
    return () => window.clearTimeout(timer);
  }, [phase, moment, highlights.length]);

  function row(cards: RitualCard[] | null, side: 'player' | 'opponent') {
    return <div className={`${styles.row} ${side === 'opponent' && opponentReady && !dealt ? styles.dealing : ''}`} aria-label={side === 'player' ? '你的三張出戰牌' : '電腦對手的三張出戰牌'}>
      {POSITIONS.map((position, index) => {
        const card = cards?.[index];
        return <div key={position} className={styles.slot} data-ritual-slot={side} data-ritual-card={card?.id}>
          <div className={`${frameStyles.card} ${styles.card} ${revealed ? styles.revealed : ''}`} data-revealed={revealed ? 'yes' : 'no'}>
            <div className={styles.face} aria-hidden={revealed}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {card && <img src="/tarot/card-back-luxe.png" alt={`${side === 'player' ? '你' : '對手'}的${position}牌背`} />}
            </div>
            <div className={`${styles.face} ${styles.front}`} aria-hidden={!revealed}>
              {card && <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.thumbnail} alt={revealed ? card.name : ''} />
                {revealed && <small>{ELEMENTS[card.element]}</small>}
              </>}
            </div>
          </div>
          <div className={styles.caption} aria-label={revealed ? `${position}：${card?.name ?? ''}` : position}>
            <strong title={revealed ? `${position}：${card?.name ?? ''}` : undefined}>{revealed ? card?.name : position}</strong>
          </div>
        </div>;
      })}
    </div>;
  }

  const event = highlights[moment];
  return <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="雙方揭牌儀式" className={styles.stage} data-duel-ritual data-ritual-phase={!opponentReady ? 'waiting' : !dealt ? 'dealing' : phase}>
    <div className={styles.table}>
      <div className={styles.topline}>
        <h2>三席對陣{replay ? '・重播' : ''}</h2>
        <button type="button" className={styles.close} onClick={onCancel}>返回布陣</button>
      </div>
      <div className={styles.label}><span>電腦對手</span><small>{revealed ? '開場陣容' : '三張待揭'}</small></div>
      {row(opponent, 'opponent')}
      <div className={`${styles.center} ${phase === 'clash' ? styles.clash : ''}`} role="status" aria-live="polite">
        {phase === 'clash' && event ? <>
          <strong key={moment}>第 {event.turn} 回合・{event.side === 'PLAYER' ? '我方' : '對手'}</strong>
          <p>{event.note}</p>
        </> : <>
          <strong>{revealed ? '雙方揭牌' : ready ? '等你一起揭牌' : '對手理牌中…'}</strong>
          <p>{revealed ? '守護陣已展開' : ready ? '雙方三席已鎖定' : '你的三張已入陣'}</p>
        </>}
      </div>
      <div className={styles.label}><span>你的神獸</span><small>{revealed ? '開場陣容' : '親手選定'}</small></div>
      {row(player, 'player')}
      {!revealed ? <button type="button" className={styles.action} disabled={!ready} onClick={() => { if (ready) setPhase('revealing'); }}>
        {ready ? '一起揭牌' : '等待對手就緒…'}
      </button> : <button type="button" className={styles.skip} onClick={() => completeRef.current()}>略過動畫・看戰果</button>}
    </div>
  </div>;
}
