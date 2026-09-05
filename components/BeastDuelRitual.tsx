'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { selectRitualHighlights, type RitualTurn } from '@/lib/beast-ritual';
import type { PairResult } from '@/lib/beast-game/series';
import styles from './BeastDuelRitual.module.css';

/*
  三維對撞只在交鋒階段用，所以動態載入——
  沒打到交鋒的人不該為了它下載 three.js。
  掛不上（舊瀏覽器、沒有 WebGL）就當作沒有，靜態版面照常運作。
*/
const BeastClash3D = dynamic(() => import('./BeastClash3D'), { ssr: false });
import type { ClashSide } from './BeastClash3D';
import frameStyles from './BeastCardFrame.module.css';
import {
  ELEMENT_FX,
  playPlayerBeastVoice,
  spiritArtFor,
  REVEAL_INTERVAL_MS,
  REVEAL_ORDER,
  createSoundPlayer,
  loadCardBattleSkills,
  presentationSkillsFor,
  chargeVideoFor,
  type BattleElement,
} from '@/lib/beast-battle-fx';

type RitualCard = { id: string; name: string; thumbnail: string; element: string };
type Props = {
  player: RitualCard[];
  opponent: RitualCard[] | null;
  timeline?: RitualTurn[];
  replay?: boolean;
  pairs?: PairResult[];
  onComplete: () => void;
  onCancel: () => void;
};
const ELEMENTS: Record<string, string> = { SPACE: '空', AIR: '風', WATER: '水', FIRE: '火', EARTH: '地' };
const POSITIONS = ['前鋒', '中軍', '後陣'];

export default function BeastDuelRitual({ player, opponent, timeline, replay, pairs, onComplete, onCancel }: Props) {
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
  const [pairResult, setPairResult] = useState<PairResult | null>(null);
  const [shownScore, setShownScore] = useState({ player: 0, opponent: 0 });
  const [chargeSkillLabel, setChargeSkillLabel] = useState<string | null>(null);
  const [chargeVideoSrc, setChargeVideoSrc] = useState<string | null>(null);
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

  /** 預載《技能戰鬥檔案》演出技能（衝鋒／命中／隨時戰鬥）；失敗不擋儀式。 */
  const skillCacheRef = useRef<Record<string, ReturnType<typeof presentationSkillsFor>>>({});
  useEffect(() => {
    const ids = [...player.map((c) => c.id), ...(opponent ?? []).map((c) => c.id)];
    let cancelled = false;
    void (async () => {
      for (const id of ids) {
        if (cancelled || skillCacheRef.current[id]) continue;
        const raw = await loadCardBattleSkills(id);
        if (cancelled) return;
        skillCacheRef.current[id] = presentationSkillsFor(raw?.skills);
      }
    })();
    return () => { cancelled = true; };
  }, [player, opponent]);

  useEffect(() => {
    if (pairClash == null || !opponent) {
      setChargeSkillLabel(null);
      setChargeVideoSrc(null);
      return;
    }
    const id = player[pairClash]?.id;
    const skills = id ? skillCacheRef.current[id] : undefined;
    setChargeSkillLabel(skills?.charge.name ?? '本體衝鋒');
    /*
      戰鬥卡片啟動：只有《技能戰鬥檔案》真的宣告了影片的卡才掛影片層。

      六十張裡目前只有少數幾張備好衝鋒影片。沒影片卻硬掛，
      <video> 會 404 成一塊黑底方塊，整個蓋掉底下的三維對撞——
      那比不放影片更糟。沒有影片就走既有的本體衝鋒，不會開天窗。
    */
    setChargeVideoSrc(id && skills?.charge.video ? chargeVideoFor(id).webm : null);
  }, [pairClash, player, opponent]);

  useEffect(() => {
    // 暖好這一局會使用的六張本體，避免首次揭牌先看到空白舞台。
    for (const card of [...player, ...(opponent ?? [])]) {
      const src = spiritArtFor(card.id);
      if (src) { const image = new Image(); image.src = src; }
    }
  }, [player, opponent]);
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
      if (step.side === 'player') playPlayerBeastVoice(sound.current.play, step.side, player[step.index].id);
      setRevealCount((value) => value + 1);
      window.setTimeout(() => setClashing(null), 260);
    }, revealCount === 0 ? 200 : REVEAL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase, revealCount, autoFlip, pairClash, player]);

  // 每組雙方都揭開才演出，不預先展示未翻開的神獸或虛構傷害。
  useEffect(() => {
    if (phase !== 'revealing' || revealCount === 0 || revealCount % 2 !== 0) return;
    const index = revealCount / 2 - 1;
    if (!player[index] || !opponent?.[index]) return;
    const result = pairs?.[index];
    const actionSide = (beat: number) => {
      if (!result?.actions.length) return beat % 2 === 0 ? 'player' : 'opponent';
      const action = result.actions[Math.round(beat * (result.actions.length - 1) / 3)];
      return action.side === 'PLAYER' ? 'player' : 'opponent';
    };
    setPairClash(index);
    setPairResult(null);
    setPairSide(actionSide(0));
    setPairBeat(0);
    playPlayerBeastVoice(sound.current.play, actionSide(0), player[index].id);
    const replies = [1, 2, 3].map((beat) => window.setTimeout(() => {
      const side = actionSide(beat);
      setPairSide(side);
      setPairBeat(beat);
      playPlayerBeastVoice(sound.current.play, side, player[index].id);
    }, beat * 1400));
    const verdict = window.setTimeout(() => { if (result) { setPairResult(result); setShownScore(result.score); } }, 6000);
    const timer = window.setTimeout(() => {
      setPairClash(null);
      if (pairs && index === pairs.length - 1) completeRef.current();
      else if (pairs && index === 1) {
        if (result && (result.score.player === 2 || result.score.opponent === 2)) setRevealCount(REVEAL_ORDER.length);
        else setAutoFlip(false);
      }
    }, result ? 8000 : 6000);
    return () => { window.clearTimeout(timer); window.clearTimeout(verdict); replies.forEach(window.clearTimeout); };
  }, [phase, revealCount, player, opponent, pairs]);

  /** 手動翻下一張。點卡片或按「翻下一張」都走這裡。 */
  function flipNext() {
    if (phase !== 'revealing' || revealCount >= REVEAL_ORDER.length || pairClash !== null) return;
    const step = REVEAL_ORDER[revealCount];
    setClashing(step);
    if (step.side === 'player') playPlayerBeastVoice(sound.current.play, step.side, player[step.index].id);
    setRevealCount((value) => value + 1);
    window.setTimeout(() => setClashing(null), 260);
  }

  useEffect(() => {
    if (pairs) return;
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
  }, [phase, moment, highlights.length, revealCount, pairClash, pairs]);

  // 舊版整場回放同樣只播放玩家本體，不能混入對手或泛用撞擊聲。
  useEffect(() => {
    if (phase !== 'clash') return;
    const event = highlights[moment];
    if (!event || event.side !== 'PLAYER') return;
    if (player[0]) playPlayerBeastVoice(sound.current.play, 'player', player[0].id);
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

  /*
    三維對撞：整場**只掛一個**，用 active 開關，絕不掛上去又卸掉。

    原本有兩處各自條件掛載（逐組交鋒一處、逐回合節錄一處），
    每次交鋒都新建一個 WebGL context、演完就丟。實測主控台反覆出現
    `THREE.WebGLRenderer: Context Lost.`，舞台變成一整片空白——
    業主要的「六十張本體衝過去對打」根本看不到。

    改成同一個實例、換貼圖與 beat；沒在交鋒就 active=false，
    畫面淡出、frameloop 停掉，不吃 GPU 也不吃 context。
  */
  const clashPairReady = pairClash !== null && Boolean(player[pairClash]) && Boolean(opponent?.[pairClash]);
  const clashTurnReady = phase === 'clash' && Boolean(event) && Boolean(player[0]) && Boolean(opponent?.[0]);
  const clashCards = clashPairReady && pairClash !== null
    ? {
        me: player[pairClash], foe: opponent![pairClash],
        attacker: pairSide as ClashSide,
        beat: pairClash * 4 + pairBeat,
        outcome: pairResult?.winner,
      }
    : player[0] && opponent?.[0]
      ? {
          me: player[0], foe: opponent[0],
          attacker: (event?.side === 'OPPONENT' ? 'opponent' : 'player') as ClashSide,
          beat: moment,
          outcome: undefined,
        }
      : null;
  const clashActive = clashPairReady || clashTurnReady;

  return <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="雙方揭牌儀式" className={styles.stage} data-duel-ritual data-ritual-phase={!opponentReady ? 'waiting' : !dealt ? 'dealing' : phase}>
    <div className={styles.table}>
      <div className={styles.topline}>
        <h2>{pairs ? '三戰兩勝' : '三席對陣'}{replay ? '・重播' : ''}</h2>
        <button type="button" className={styles.close} onClick={onCancel} disabled={!opponentReady}>{opponentReady ? '查看結算' : '準備中'}</button>
      </div>
      <div className={styles.label}><span>電腦對手</span><small>{revealed ? '開場陣容' : '三張待揭'}</small></div>
      {pairs && <p role="status" aria-label="目前比分">你 {shownScore.player} : {shownScore.opponent} 對手</p>}
      {row(opponent, 'opponent')}
      <div className={`${styles.center} ${phase === 'clash' || pairClash !== null ? styles.clash : ''}`} role="status" aria-live="polite" style={{ position: 'relative' }}>
        {pairClash !== null && player[pairClash] && opponent?.[pairClash] && (
          <>
            {chargeVideoSrc ? (
              <video
                key={chargeVideoSrc + String(pairClash)}
                autoPlay
                playsInline
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 4, borderRadius: 16, background: '#000' }}
                src={chargeVideoSrc}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.src.endsWith('.webm') && player[pairClash!]) {
                    el.src = chargeVideoFor(player[pairClash!].id).mp4;
                  }
                }}
              />
            ) : null}
          </>
        )}
        {clashCards && (
          <BeastClash3D
            playerArt={clashCards.me.thumbnail}
            opponentArt={clashCards.foe.thumbnail}
            playerSpirit={spiritArtFor(clashCards.me.id)}
            opponentSpirit={spiritArtFor(clashCards.foe.id)}
            attacker={clashCards.attacker}
            glow={ELEMENT_FX[(clashCards.attacker === 'player' ? clashCards.me : clashCards.foe).element as BattleElement]?.glow ?? '#fff'}
            beat={clashCards.beat}
            outcome={clashCards.outcome}
            active={clashActive}
          />
        )}
        {pairResult && pairClash !== null ? <>
          <strong>{pairResult.winner === 'PLAYER' ? '這一局・你贏了' : pairResult.winner === 'OPPONENT' ? '這一局・對手獲勝' : '這一局・平手'}</strong>
          <p>比分 {pairResult.score.player} : {pairResult.score.opponent}{pairResult.index === 1 ? (pairResult.score.player === 2 || pairResult.score.opponent === 2 ? '・第三組即將自動揭牌' : '・親手揭開決勝局') : pairResult.index === 2 ? '・三局完成' : '・準備下一組'}</p>
        </> : pairClash !== null ? <>
          {/*
            技能名寫進這一行，不另外浮一塊。

            原本是一塊 position:absolute top:12 的圓角晶片，
            但這個容器頂端本來就有這行標題——實測兩者疊在一起
            （標題 297–321，晶片 305–333），兩行字印在同一個位置。
            併成一行，結構上就不可能再疊。
          */}
          <strong>{POSITIONS[pairClash]}・{chargeSkillLabel ?? '神獸交鋒'}</strong>
          <p>{pairs ? '神獸交鋒・勝負即將揭曉' : '雙方現身・開場演武'}</p>
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

      {!revealed ? <button type="button" className={styles.action} disabled={!ready} onClick={() => { if (ready) { playPlayerBeastVoice(sound.current.play, 'player', player[0].id); setPhase('revealing'); } }}>
        {ready ? '一起揭牌' : '等待對手就緒…'}
      </button> : <button type="button" className={styles.skip} onClick={() => completeRef.current()}>略過動畫・看戰果</button>}
      <a className={styles.skip} href="/audio/beast-voices/credits.html" target="_blank" rel="noreferrer">聲音來源</a>
    </div>
  </div>;
}
