'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { selectRitualHighlights, type RitualTurn } from '@/lib/beast-ritual';
import styles from './BeastDuelRitual.module.css';

/*
  三維對撞只在交鋒階段用，所以動態載入——
  沒打到交鋒的人不該為了它下載 three.js。
  掛不上（舊瀏覽器、沒有 WebGL）就當作沒有，靜態版面照常運作。
*/
const BeastClash3D = dynamic(() => import('./BeastClash3D'), { ssr: false });
import frameStyles from './BeastCardFrame.module.css';
import {
  CLASH_FX,
  ELEMENT_FX,
  playClashSequence,
  spiritArtFor,
  REVEAL_INTERVAL_MS,
  REVEAL_ORDER,
  createSoundPlayer,
  type BattleElement,
} from '@/lib/beast-battle-fx';

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
  /**
   * 已經翻開幾張。
   *
   * 業主定調：「一張一張地翻牌，不要一次就六張牌一起翻。
   * 要同時『我翻一張，對方翻一張』的概念。」
   *
   * 原本用一個布林 revealed 控制全部六張，所以是六張同時翻。
   * 改成計數：照 REVEAL_ORDER（我的前鋒→對方前鋒→我的中軍→…）
   * 一張一張翻，客戶看得出誰對上誰。
   */
  const [revealCount, setRevealCount] = useState(0);
  const [pairClash, setPairClash] = useState<number | null>(null);
  const [pairSide, setPairSide] = useState<'player' | 'opponent'>('player');
  const [pairBeat, setPairBeat] = useState(0);
  /** 這一瞬間正在撞的是誰。做卡片對撞用。 */
  const [clashing, setClashing] = useState<{ side: 'player' | 'opponent'; index: number } | null>(null);
  /**
   * 翻牌是手動還是自動。
   *
   * 業主定調：「功能可以自己翻牌，除非選擇箭頭，可以指向自動翻牌，
   * 可以自己一張一張翻。」
   *
   * 所以預設是**手動**——客戶自己按，一張一張翻，節奏由他決定。
   * 想省事的人按箭頭切成自動，就照間隔自己翻完。
   */
  const [autoFlip, setAutoFlip] = useState(false);
  const sound = useRef(createSoundPlayer());
  useEffect(() => {
    const playerSound = sound.current;
    void import('./BeastClash3D');
    return () => playerSound.dispose();
  }, []);
  const dialog = useRef<HTMLDivElement>(null);
  const completeRef = useRef(onComplete);
  const cancelRef = useRef(onCancel);
  completeRef.current = onComplete;
  cancelRef.current = onCancel;
  const highlights = useMemo(() => selectRitualHighlights(timeline), [timeline]);
  const ready = dealt && opponent?.length === 3;
  const opponentReady = opponent?.length === 3;
  const revealed = phase !== 'covered';
  /** 某一張翻開了沒。逐張揭牌就是靠這個判斷。 */
  const isRevealed = (side: 'player' | 'opponent', index: number) => {
    const order = REVEAL_ORDER.findIndex((step) => step.side === side && step.index === index);
    return order >= 0 && order < revealCount;
  };

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

  /*
    逐張揭牌。

    照 REVEAL_ORDER 一張一張翻：我的前鋒 → 對方前鋒 → 我的中軍 → …
    每翻一張放一次輕音，並讓那張卡短暫發光——客戶看得出「現在翻的是這張」。

    減少動態時直接六張全開，不折磨人。
  */
  useEffect(() => {
    if (phase !== 'revealing') return;
    if (revealCount >= REVEAL_ORDER.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setRevealCount(REVEAL_ORDER.length); return; }
    // 手動模式不自己翻——等客戶按。
    if (!autoFlip) return;
    if (pairClash !== null) return;

    const timer = window.setTimeout(() => {
      const step = REVEAL_ORDER[revealCount];
      setClashing(step);
      sound.current.play(CLASH_FX.flip, 0.3);
      setRevealCount((value) => value + 1);
      window.setTimeout(() => setClashing(null), 260);
    }, revealCount === 0 ? 200 : REVEAL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase, revealCount, autoFlip, pairClash]);

  // 每組雙方都揭開才演出，不預先展示未翻開的神獸或虛構傷害。
  useEffect(() => {
    if (phase !== 'revealing' || revealCount === 0 || revealCount % 2 !== 0) return;
    const index = revealCount / 2 - 1;
    if (!player[index] || !opponent?.[index]) return;
    setPairClash(index);
    setPairSide('player');
    setPairBeat(0);
    const stopSound = playClashSequence(sound.current.play, player[index].element as BattleElement, false, player[index].id);
    const sounds = [stopSound];
    const replies = [1, 2, 3].map((beat) => window.setTimeout(() => {
      const side = beat % 2 === 0 ? 'player' : 'opponent';
      const card = side === 'player' ? player[index] : opponent[index];
      setPairSide(side);
      setPairBeat(beat);
      sounds.push(playClashSequence(sound.current.play, card.element as BattleElement, false, card.id));
    }, beat * 1400));
    const timer = window.setTimeout(() => setPairClash(null), 6000);
    return () => { window.clearTimeout(timer); replies.forEach(window.clearTimeout); sounds.forEach((stop) => stop()); };
  }, [phase, revealCount, player, opponent]);

  /** 手動翻下一張。點卡片或按「翻下一張」都走這裡。 */
  function flipNext() {
    if (phase !== 'revealing' || revealCount >= REVEAL_ORDER.length || pairClash !== null) return;
    const step = REVEAL_ORDER[revealCount];
    setClashing(step);
    sound.current.play(CLASH_FX.flip, 0.3);
    setRevealCount((value) => value + 1);
    window.setTimeout(() => setClashing(null), 260);
  }

  useEffect(() => {
    if (phase === 'covered') return;
    const timer = window.setTimeout(() => {
      if (phase === 'revealing') {
        // 六張都翻完才進交鋒，否則客戶還沒看清楚就跳過去了。
        if (revealCount < REVEAL_ORDER.length || pairClash !== null) return;
        if (!highlights.length) completeRef.current();
        else setPhase('clash');
      } else if (moment + 1 < highlights.length) setMoment((value) => value + 1);
      else completeRef.current();
    }, phase === 'revealing' ? 900 : 1500);
    return () => window.clearTimeout(timer);
  }, [phase, moment, highlights.length, revealCount, pairClash]);

  /*
    交鋒時的聲音。

    用出手方的元素配對應的音效（風→龍捲風、火→火焰、地→地裂…），
    全部是專案裡既有的太極音效，沒有新素材。
    重擊（有人陣亡）換成雷聲，讓「這一下很重」聽得出來。
  */
  useEffect(() => {
    if (phase !== 'clash') return;
    const event = highlights[moment];
    if (!event) return;
    const attacker = event.side === 'PLAYER' ? player : opponent;
    const element = attacker?.[0]?.element as BattleElement | undefined;
    // 三段式：蓄力 → 撞擊 → 餘響。一聲「碰」不夠猛。
    const heavy = /陣亡|擊倒|本命/.test(event.note ?? '');
    if (element) return playClashSequence(sound.current.play, element, heavy, attacker?.[0]?.id);
    else sound.current.play(CLASH_FX.impact, 0.45);
  }, [phase, moment, highlights, player, opponent]);

  function row(cards: RitualCard[] | null, side: 'player' | 'opponent') {
    return <div className={`${styles.row} ${side === 'opponent' && opponentReady && !dealt ? styles.dealing : ''}`} aria-label={side === 'player' ? '你的三張出戰牌' : '電腦對手的三張出戰牌'}>
      {POSITIONS.map((position, index) => {
        const card = cards?.[index];
        // 每一張自己判斷翻了沒——原本一個布林控制全部六張，所以六張同時翻。
        const open = isRevealed(side, index);
        const flipping = clashing?.side === side && clashing.index === index;
        const glow = card ? ELEMENT_FX[card.element as BattleElement]?.glow : undefined;
        return <div key={position} className={styles.slot} data-ritual-slot={side} data-ritual-card={card?.id}>
          <div
            className={`${frameStyles.card} ${styles.card} ${open ? styles.revealed : ''}`}
            data-revealed={open ? 'yes' : 'no'}
            data-flipping={flipping ? 'yes' : 'no'}
            style={flipping && glow ? { boxShadow: `0 0 0 2px ${glow}, 0 0 26px ${glow}` } : undefined}
          >
            <div className={styles.face} aria-hidden={open}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {card && <img src="/tarot/card-back-luxe.png" alt={`${side === 'player' ? '你' : '對手'}的${position}牌背`} />}
            </div>
            <div className={`${styles.face} ${styles.front}`} aria-hidden={!open}>
              {card && <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.thumbnail} alt={open ? card.name : ''} />
                {open && <small>{ELEMENTS[card.element]}</small>}
              </>}
            </div>
          </div>
          <div className={styles.caption} aria-label={open ? `${position}：${card?.name ?? ''}` : position}>
            <strong title={open ? `${position}：${card?.name ?? ''}` : undefined}>{open ? card?.name : position}</strong>
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
        <button type="button" className={styles.close} onClick={onCancel} disabled={!opponentReady}>{opponentReady ? '查看結算' : '準備中'}</button>
      </div>
      <div className={styles.label}><span>電腦對手</span><small>{revealed ? '開場陣容' : '三張待揭'}</small></div>
      {row(opponent, 'opponent')}
      <div className={`${styles.center} ${phase === 'clash' || pairClash !== null ? styles.clash : ''}`} role="status" aria-live="polite" style={{ position: 'relative' }}>
        {pairClash !== null && player[pairClash] && opponent?.[pairClash] && (
          <BeastClash3D
            playerArt={player[pairClash].thumbnail}
            opponentArt={opponent[pairClash].thumbnail}
            playerSpirit={spiritArtFor(player[pairClash].id)}
            opponentSpirit={spiritArtFor(opponent[pairClash].id)}
            attacker={pairSide}
            glow={ELEMENT_FX[(pairSide === 'player' ? player[pairClash] : opponent[pairClash]).element as BattleElement]?.glow ?? '#fff'}
            beat={pairClash * 4 + pairBeat}
          />
        )}
        {/*
          三維對撞。只在交鋒階段掛載，演完就卸掉——
          不長期佔著 WebGL context（太極憲章：手機優先 60FPS）。
        */}
        {phase === 'clash' && event && player[0] && opponent?.[0] && (
          <BeastClash3D
            playerArt={player[0].thumbnail}
            opponentArt={opponent[0].thumbnail}
            playerSpirit={spiritArtFor(player[0].id)}
            opponentSpirit={spiritArtFor(opponent[0].id)}
            attacker={event.side === 'PLAYER' ? 'player' : 'opponent'}
            glow={ELEMENT_FX[(event.side === 'PLAYER' ? player[0] : opponent[0]).element as BattleElement]?.glow ?? '#fff'}
            beat={moment}
          />
        )}
        {pairClash !== null ? <>
          <strong>{POSITIONS[pairClash]}・神獸交鋒</strong>
          <p>雙方現身・開場演武</p>
        </> : phase === 'clash' && event ? <>
          <strong key={moment}>第 {event.turn} 回合・{event.side === 'PLAYER' ? '我方' : '對手'}</strong>
          <p>{event.note}</p>
        </> : phase === 'revealing' && revealCount < REVEAL_ORDER.length ? <>
          {/* 逐張揭牌時要講出現在翻的是誰的哪一席，客戶才跟得上。 */}
          <strong key={revealCount}>
            {REVEAL_ORDER[revealCount]?.side === 'player' ? '你的' : '對手的'}
            {POSITIONS[REVEAL_ORDER[revealCount]?.index ?? 0]}
          </strong>
          <p>一張一張揭・{revealCount} / {REVEAL_ORDER.length}</p>
        </> : <>
          <strong>{revealed ? '雙方揭牌' : ready ? '等你一起揭牌' : '對手理牌中…'}</strong>
          <p>{revealed ? '守護陣已展開' : ready ? '雙方三席已鎖定' : '你的三張已入陣'}</p>
        </>}
      </div>
      <div className={styles.label}><span>你的神獸</span><small>{revealed ? '開場陣容' : '親手選定'}</small></div>
      {row(player, 'player')}

      {/*
        翻牌控制。

        業主定調：「功能可以自己翻牌，除非選擇箭頭，可以指向自動翻牌。」
        所以預設手動，一張一張自己翻；箭頭切成自動就自己翻完。
      */}
      {phase === 'revealing' && revealCount < REVEAL_ORDER.length && (
        <div className={styles.flipControls} data-flip-controls>
          <button
            type="button"
            className={styles.action}
            data-flip-next
            onClick={flipNext}
            disabled={autoFlip || pairClash !== null}
          >
            {autoFlip
              ? '自動翻牌中…'
              : `翻開${REVEAL_ORDER[revealCount]?.side === 'player' ? '你的' : '對手的'}${POSITIONS[REVEAL_ORDER[revealCount]?.index ?? 0]}`}
          </button>
          <button
            type="button"
            className={styles.skip}
            data-auto-flip={autoFlip ? 'on' : 'off'}
            aria-pressed={autoFlip}
            aria-label={autoFlip ? '切換為自己一張一張翻' : '切換為自動翻牌'}
            onClick={() => setAutoFlip((value) => !value)}
          >
            {autoFlip ? '↻ 改回自己翻' : '➤ 自動翻牌'}
          </button>
        </div>
      )}

      {!revealed ? <button type="button" className={styles.action} disabled={!ready} onClick={() => { if (ready) { sound.current.play(CLASH_FX.flip, 0.3); setPhase('revealing'); } }}>
        {ready ? '一起揭牌' : '等待對手就緒…'}
      </button> : <button type="button" className={styles.skip} onClick={() => completeRef.current()}>略過動畫・看戰果</button>}
    </div>
  </div>;
}
