'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { recordBeastGameCompleted } from '@/lib/growth-center-client';
import { legalActions } from '@/lib/beast-game/interactive';
import type { interactiveCatalog, Match, Action } from '@/lib/beast-game/interactive';
import { BATTLE_VENUES } from '@/lib/beast-game/venues';
import BattleArena from './battlefield/BattleArena';
import BattlePanel from './battlefield/BattlePanel';
import BeastBattleVoice from './BeastBattleVoice';
import BattleCardGuide from './battlefield/BattleCardGuide';
import BeastCardTile, { CardDetailSheet } from './battlefield/BeastCardTile';
import styles from './BeastTurnGame.module.css';
import battleStyles from './battlefield/BattleScreen.module.css';
import venueStyles from './battlefield/BattleVenue.module.css';
import BattlePace from './battlefield/BattlePace';
import { useCombatPlayback } from './battlefield/useCombatPlayback';

type Card = ReturnType<typeof interactiveCatalog>[number];
// Account progression remains on the server; this screen reads only battle data.
type Account = { owned: string[]; match: Match | null; revision: number };
const labels: Record<string, string> = { SPACE: '空', AIR: '風', WATER: '水', FIRE: '火', EARTH: '地' };

export default function BeastTurnGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [automatic, setAutomatic] = useState(false);
  const [prepareStep, setPrepareStep] = useState<'mode' | 'select' | 'confirm'>('mode');
  const [filter, setFilter] = useState('全部');
  const [detail, setDetail] = useState<Card | null>(null);
  const [inspection, setInspection] = useState<{ cardId: string; side: 'player' | 'opponent' } | null>(null);
  const pending = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const match = account?.match;
  const { playing, begin: beginPlayback, play: playRound, reset: resetPlayback } = useCombatPlayback();

  // Keep completion accounting invisible to the battle interface.
  useEffect(() => { if (match?.status === 'FINISHED') recordBeastGameCompleted('battlefield'); }, [match?.status]);

  async function load(signal?: AbortSignal) {
    try {
      const res = await fetch('/api/beast-game/turns', { signal: signal ?? AbortSignal.timeout(15000) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? '卡池讀取失敗');
      if (signal?.aborted) return;
      setCards(data.cards); setAccount(data.account); setError('');
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : '連線中斷，請重新載入。');
    }
  }
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); if (!disposed) setError('卡池讀取逾時，請重新載入。'); }, 15000);
    void load(controller.signal).finally(() => clearTimeout(timer));
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, []);

  const send = useCallback(async (type: 'START' | 'ACTION' | 'LEAVE', extra: Record<string, unknown> = {}) => {
    if (!account || pending.current) return;
    if (type === 'ACTION' && !beginPlayback()) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const res = await fetch('/api/beast-game/turns', {
        method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, revision: account.revision, requestId: crypto.randomUUID(), ...extra }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? '戰鬥操作未完成');
      setAccount(data.account);
      if (type === 'ACTION' && data.account.match) playRound(data.account.match);
      else resetPlayback();
      if (type === 'START') setAutomatic(true);
      if (type === 'LEAVE') setAutomatic(false);
      if (type !== 'ACTION') { setInspection(null); setDetail(null); }
    } catch (cause) {
      resetPlayback();
      setAutomatic(false);
      setError(cause instanceof Error ? cause.message : '連線中斷，請重新載入確認戰況。');
    } finally { pending.current = false; setBusy(false); }
  }, [account, beginPlayback, playRound, resetPlayback]);

  const act = useCallback((action: Action) => { scroll.current?.scrollTo({ top: 0 }); void send('ACTION', { action }); }, [send]);

  const errorNotice = error && <p role="alert" className={styles.error}>{error} <button type="button" disabled={busy} onClick={() => void load()}>重新載入戰況</button></p>;

  if (match) {
    const inspected = inspection ? match[inspection.side].team.find(f => f.cardId === inspection.cardId) : undefined;
    const other = inspection?.side === 'opponent' ? match.player : match.opponent;
    const inspect = (cardId: string, side: 'player' | 'opponent') => { setAutomatic(false); setInspection({ cardId, side }); scroll.current?.scrollTo({ top: 0 }); };
    const attackAction = match.status === 'PLAYING' && !busy && !playing ? legalActions(match, 'player').find(a => a.type === 'ATTACK') : undefined;
    const onAttack = attackAction ? () => act(attackAction) : null;
    return <main className={`${battleStyles.page} ${styles.calmBattle}`} data-mobile-battle>
      <div className={battleStyles.shell}>
        <header className={battleStyles.header}><h1>卡片戰鬥</h1><span>電腦對手・自由組隊</span></header>
        <div className={battleStyles.split} data-battle-split>
          <BattleArena match={match} cards={cards} onInspect={inspect} onAttack={onAttack} playing={playing}
            onSwap={match.status === 'PLAYING' && !busy && !playing ? (action) => act(action) : null}
            onSkill={match.status === 'PLAYING' && !busy && !playing ? (action) => act(action) : null} />
          <section className={battleStyles.controls} aria-label="手部操控" data-battle-controls>
            <div className={battleStyles.controlsHeading}><strong>{inspection ? '相剋' : match.status === 'FINISHED' && !playing ? '結果' : `R${match.round}`}</strong><span>{busy || playing ? '…' : match.status === 'FINISHED' ? '✓' : '⚔'}</span></div>
            <div className={battleStyles.controlScroll} ref={scroll} data-control-scroll>
              {errorNotice}
              {inspection && <BattleCardGuide cardId={inspection.cardId} fighter={inspected} opponentElement={other.team[other.active].element} onClose={() => { setInspection(null); scroll.current?.scrollTo({ top: 0 }); }} />}
              <div hidden={Boolean(inspection)}>
                <BattlePace match={match} automatic={automatic} blocked={busy || playing || Boolean(error) || Boolean(inspection)} onAutomatic={setAutomatic} onAction={act} />
                <BattlePanel match={match} onAction={act} busy={busy || playing} compact attackOnCard={Boolean(onAttack)} swapOnSide={match.status === 'PLAYING' && !busy && !playing} cards={cards} relaxed={automatic} onBrowse={() => { setAutomatic(false); scroll.current?.scrollTo({ top: 0 }); }} />
                {match.status === 'FINISHED' && !playing ? <>
                  <BeastBattleVoice id={`free:${match.seed}:${account?.revision}`} text={`${match.winner === 'player' ? '恭喜獲勝！' : match.winner === 'opponent' ? '本場對手獲勝。' : '本場平手。'}可以更換陣容再挑戰。`} />
                </> : <details className={battleStyles.details} onToggle={event => { if (event.currentTarget.open) setAutomatic(false); }}>
                  <summary>說明</summary>
                  <p>切換先攻；同速隨機；最多 80 回；擊倒三隻獲勝。</p>
                  <button type="button" className={battleStyles.restart} disabled={busy} onClick={() => void send('LEAVE')}>離開本場</button>
                </details>}
              </div>
            </div>
            {match.status === 'FINISHED' && !playing && <div className={battleStyles.footer}><button type="button" className={battleStyles.start} style={{ animation: 'none' }} disabled={busy} onClick={() => void send('LEAVE')}>回到組隊，再戰一場</button><Link href="/" className={styles.homeLink}>回首頁</Link></div>}
          </section>
        </div>
      </div>
    </main>;
  }

  return <main className={`${styles.page} ${styles.preparation}`}>
    <header className={venueStyles.banner} data-battle-venue="cards">
      <Link href="/" className={styles.homeLink}>回首頁</Link>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BATTLE_VENUES.cards.image} alt="" aria-hidden="true" />
      <h1>{prepareStep === 'mode' ? '神獸戰鬥' : prepareStep === 'select' ? '選三張神獸卡' : '確認你的陣容'}</h1>
      <p>{prepareStep === 'mode' ? '選擇你要玩的模式' : prepareStep === 'select' ? '免押卡。點選三張，第一張先出場。' : '看好陣容後，按下開始。'}</p>
    </header>
    {errorNotice}
    {!account ? <p>正在讀取戰鬥卡…</p> : <>
      <section className={styles.prepareContent} aria-label={prepareStep === 'mode' ? '選擇模式' : prepareStep === 'select' ? '選擇神獸卡' : '檢查陣容'}>
        {prepareStep === 'mode' ? <>
          <div className={styles.modeCards}>
            <button className={styles.modeCard} onClick={() => { setPrepareStep('select'); setError(''); }}>
              <span className={styles.modeIcon}>⚡</span>
              <strong>免押卡・輕鬆對戰</strong>
              <span className={styles.modeDesc}>不消耗神獸卡，選三張對電腦，快速上手</span>
              <span className={styles.modeBadge}>免費</span>
            </button>
            <Link href="/beast-game/battlefield" className={styles.modeCard}>
              <span className={styles.modeIcon}>⚔️</span>
              <strong>五卡押注戰場</strong>
              <span className={styles.modeDesc}>壓 5 張・贏最少得 5 張・易經技術判斷最多 20 張・輸失 5 張</span>
              <span className={styles.modeBadge + ' ' + styles.modeBadgeWager}>押注</span>
            </Link>
            <Link href="/beast-game/lineup" className={styles.modeCard}>
              <span className={styles.modeIcon}>🎯</span>
              <strong>單卡押注競技場</strong>
              <span className={styles.modeDesc}>押 1 張・贏得對手卡・易經裁定最多再得 4 張・輸失 1 張</span>
              <span className={styles.modeBadge + ' ' + styles.modeBadgeWager}>押注</span>
            </Link>
          </div>
        </> : prepareStep === 'select' ? <>
          {/* 大型引導：讓老人家也能一眼看懂選了幾張、還要選幾張 */}
          <div className={styles.slotBar} role="status" aria-live="polite" aria-label={`已選 ${selected.length} 張，共需 3 張`}>
            {[0, 1, 2].map(i => {
              const card = cards.find(c => c.id === selected[i]);
              return (
                <div key={i} className={`${styles.slotBarCell} ${selected[i] ? styles.slotBarFilled : styles.slotBarEmpty}`}
                  onClick={() => { if (selected[i]) setSelected(s => s.filter((_, idx) => idx !== i)); }}>
                  {card
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={card.thumbnail} alt={card.name} />
                    : <span className={styles.slotNum}>{i + 1}</span>}
                  <small>{i === 0 ? '先出場' : `後備 ${i}`}</small>
                </div>
              );
            })}
          </div>
          <p className={styles.pickHint} role="status">
            {selected.length === 0 ? '點下方的卡片，選第 1 張（先出場）'
              : selected.length === 1 ? '再選第 2 張（後備）'
              : selected.length === 2 ? '再選第 3 張（後備）'
              : '三張選好了！點下方「確認陣容」開始'}
          </p>
          <div className={styles.filters} aria-label="元素篩選">{['全部', ...Object.keys(labels)].map(element => <button key={element} aria-pressed={filter === element} onClick={() => setFilter(element)}>{labels[element] ?? element}</button>)}</div>
          <div className={styles.grid}>{cards.filter(c => filter === '全部' || c.element === filter).map(card => <div className={`${styles.card} ${styles.pickCard}`} key={card.id}>
            {selected.includes(card.id) && <span className={styles.pickOrder}>第 {selected.indexOf(card.id) + 1} 張</span>}
            <BeastCardTile card={card} selected={selected.includes(card.id)} onOpen={() => {
              if (selected.includes(card.id)) setSelected(s => s.filter(id => id !== card.id));
              else if (selected.length < 3) setSelected(s => [...s, card.id]);
              else setError('已選滿三張；先點已選的卡取消，再換另一張。');
            }} />
          </div>)}</div>
        </> : <>
          <div className={styles.slots}>{selected.map((id, i) => {
            const card = cards.find(c => c.id === id)!;
            return <div key={id} className={styles.card}><p className={styles.selectionCount}>{i === 0 ? '先出場' : '後備 ' + i}</p><BeastCardTile card={card} onOpen={() => setDetail(card)} /><p className={styles.confirmName}>{card.name}</p></div>;
          })}</div>
          <p className={styles.muted}>普通攻擊自動進行，技能就緒時等你決定。</p>
          <details className={styles.muted}><summary>對戰方式</summary><p>與電腦各派三張，擊倒對方三隻即獲勝。六十張皆可用，本模式免押卡。</p></details>
        </>}
      </section>
      <footer className={styles.prepareFooter}>
        {prepareStep === 'mode' ? null : prepareStep === 'select' ? <>
          <button onClick={() => { setPrepareStep('mode'); setSelected([]); setError(''); }}>← 返回</button>
          <button className={styles.startBattle} disabled={selected.length !== 3} onClick={() => { setPrepareStep('confirm'); setError(''); }}>確認陣容</button>
        </> : <>
          <button disabled={busy} onClick={() => { setPrepareStep('select'); setDetail(null); }}>返回選卡</button>
          <button className={styles.startBattle} disabled={busy || selected.length !== 3} onClick={() => void send('START', { lineup: selected })}>{busy ? '正在準備戰場…' : '開始對戰・輕鬆自動'}</button>
        </>}
      </footer>
      {detail && <CardDetailSheet card={{ ...detail, story: undefined }} onClose={() => setDetail(null)} />}
    </>}
  </main>;
}
