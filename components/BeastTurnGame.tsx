'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { recordBeastGameCompleted } from '@/lib/growth-center-client';
import { readCollection, subscribeCollection } from '@/lib/beast-collection';
import { legalActions } from '@/lib/beast-game/interactive';
import type { interactiveCatalog, Match, Action } from '@/lib/beast-game/interactive';
import { BATTLE_VENUES } from '@/lib/beast-game/venues';
import BattleArena from './battlefield/BattleArena';
import BattlePanel from './battlefield/BattlePanel';
import FusionOrbHud from './battlefield/FusionOrbHud';
import BeastBattleVoice from './BeastBattleVoice';
import BattleCardGuide from './battlefield/BattleCardGuide';
import BeastCardTile, { CardDetailSheet } from './battlefield/BeastCardTile';
import styles from './BeastTurnGame.module.css';
import battleStyles from './battlefield/BattleScreen.module.css';
import venueStyles from './battlefield/BattleVenue.module.css';
import BattlePace from './battlefield/BattlePace';
import { useCombatPlayback } from './battlefield/useCombatPlayback';
import BattleHelpPanel from './battlefield/BattleHelpPanel';
import VictoryAnimation from './battlefield/VictoryAnimation';
import StarterPackAfterBattle from './StarterPackAfterBattle';
import BeastWagerPanel from './BeastWagerPanel';

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
  const [prepareStep, setPrepareStep] = useState<'mode' | 'select' | 'confirm'>('select');
  const [starterPackClaimed, setStarterPackClaimed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState('全部');
  const [detail, setDetail] = useState<Card | null>(null);
  const [inspection, setInspection] = useState<{ cardId: string; side: 'player' | 'opponent' } | null>(null);
  const pending = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const match = account?.match;
  const { playing, begin: beginPlayback, play: playRound, reset: resetPlayback } = useCombatPlayback();

  // Keep completion accounting invisible to the battle interface.
  useEffect(() => { if (match?.status === 'FINISHED') recordBeastGameCompleted('battlefield'); }, [match?.status]);
  useEffect(() => {
    const refresh = () => setStarterPackClaimed(Boolean(readCollection().starterPack));
    refresh();
    return subscribeCollection(refresh);
  }, []);

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
      if (type === 'LEAVE') {
        setAutomatic(false);
        if (account.match) setSelected(account.match.player.team.map(fighter => fighter.cardId));
      }
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
    const attackAction = match.status === 'PLAYING' && !busy && !playing && !error ? legalActions(match, 'player').find(a => a.type === 'ATTACK') : undefined;
    const onAttack = attackAction ? () => act(attackAction) : null;
    return <main className={`${battleStyles.page} ${styles.calmBattle}`} data-mobile-battle>
      <VictoryAnimation show={match.status === 'FINISHED' && !playing} winner={match.winner === 'player' ? 'player' : null} />
      <div className={battleStyles.shell}>
        <header className={battleStyles.header}><h1>三卡免費戰場</h1><div className={styles.headerActions}><Link href="/" onClick={() => setAutomatic(false)} title="本場進度保留，回來可繼續">回首頁</Link><BattleHelpPanel onOpen={() => setAutomatic(false)} /></div></header>
        <div className={battleStyles.split} data-battle-split data-inspecting={Boolean(inspection)} data-finished={match.status === 'FINISHED' && !playing}>
          <BattleArena match={match} cards={cards} onInspect={inspect} onAttack={onAttack} playing={playing}
            onSwap={match.status === 'PLAYING' && !busy && !playing && !error ? (action) => act(action) : null}
            onSkill={match.status === 'PLAYING' && !busy && !playing && !error ? (action) => act(action) : null} />
          <section className={battleStyles.controls} aria-label="手部操控" data-battle-controls>
            <div className={battleStyles.controlsHeading}><strong>{inspection ? '相剋' : match.status === 'FINISHED' && !playing ? '結果' : `R${match.round}`}</strong><span>{busy || playing ? '…' : match.status === 'FINISHED' ? '✓' : '⚔'}</span></div>
            <div className={battleStyles.controlScroll} ref={scroll} data-control-scroll>
              {errorNotice}
              {inspection && <BattleCardGuide cardId={inspection.cardId} fighter={inspected} opponent={other.team[other.active]} context={{ match, side: inspection.side }} opponentElement={other.team[other.active].element} onClose={() => { setInspection(null); scroll.current?.scrollTo({ top: 0 }); }} />}
              <div hidden={Boolean(inspection) || Boolean(error)}>
                <BattlePace match={match} automatic={automatic} blocked={busy || playing || Boolean(error) || Boolean(inspection)} onAutomatic={setAutomatic} onAction={act} />
                <BattlePanel match={match} onAction={act} busy={busy || playing} compact attackOnCard={Boolean(onAttack)} swapOnSide={match.status === 'PLAYING' && !busy && !playing} cards={cards} relaxed={automatic} onBrowse={() => { setAutomatic(false); scroll.current?.scrollTo({ top: 0 }); }} />
                {/* 預覽用寶珠面板：魔珠與暴怒已由戰鬥引擎結算並顯示在戰場右欄，這裡隱藏。 */}
                {(false as boolean) && match.status === 'PLAYING' && (() => {
                  const active = match.player.team[match.player.active];
                  const bench = match.player.team.find((f, i) => i !== match.player.active && !f.defeated) ?? null;
                  return (
                    <FusionOrbHud
                      cardA={{ id: active.cardId, name: active.name, element: active.element }}
                      cardB={bench ? { id: bench.cardId, name: bench.name, element: bench.element } : null}
                      bothAlive={!active.defeated && Boolean(bench)}
                      controlled={active.stunnedTurns > 0}
                      orbs={match.player.orbs ?? 0}
                      rage={match.player.rage ?? 0}
                      onUltimate={() => {
                        if (busy || playing) return;
                        if (!legalActions(match, 'player').some((a) => a.type === 'RAGE')) return;
                        act({ type: 'RAGE' });
                      }}
                    />
                  );
                })()}
                {match.status === 'FINISHED' && !playing ? <>
                  <p className={styles.prepareRule} data-free-card-balance>本場押注 0 張、輸掉 0 張。免費戰鬥不發押卡獎勵；首戰贈卡另計。</p>
                  <BeastBattleVoice id={`free:${match.seed}:${account?.revision}`} text={`${match.winner === 'player' ? '恭喜獲勝！' : match.winner === 'opponent' ? '本場易經獲勝。' : '本場平手。'}可以更換陣容再挑戰。`} />
                  <StarterPackAfterBattle completed="battlefield" />
                </> : <details className={battleStyles.details} onToggle={event => { if (event.currentTarget.open) setAutomatic(false); }}>
                  <summary>說明</summary>
                  <p>切換先攻；同速隨機；最多 80 回；擊倒三隻獲勝。回首頁會保留進度；選「離開本場」則結束這場，兩者都不扣收藏卡。</p>
                  <button type="button" className={battleStyles.restart} disabled={busy} onClick={() => void send('LEAVE')}>離開本場</button>
                </details>}
              </div>
            </div>
            {match.status === 'FINISHED' && !playing && !inspection && <div className={battleStyles.footer} data-free-result-actions><div className={styles.resultActions}><button type="button" className={battleStyles.start} style={{ animation: 'none' }} disabled={busy} onClick={() => void send('START', { lineup: match.player.team.map(f => f.cardId) })}>同陣容再戰</button><button type="button" className={battleStyles.restart} disabled={busy} onClick={() => void send('LEAVE')}>更換陣容</button></div><Link href="/" className={styles.homeLink}>回首頁</Link></div>}
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
      <h1>{prepareStep === 'mode' ? '選擇戰場' : prepareStep === 'select' ? '三卡免費戰場' : '確認陣容'}</h1>
      <p>{prepareStep === 'mode' ? '簡單・中等・困難' : prepareStep === 'select' ? '選 3 張卡開戰，不扣收藏卡。' : '準備好了嗎？'}</p>
    </header>
    {errorNotice}
    {!account ? <p>正在讀取戰鬥卡…</p> : <>
      <section className={styles.prepareContent} aria-label={prepareStep === 'mode' ? '選擇模式' : prepareStep === 'select' ? '選擇神獸卡' : '檢查陣容'}>
        {prepareStep === 'mode' ? <>
          {/* ── 主要入口：免費體驗，一鍵開始 ── */}
          <button className={styles.freeEntryBtn} onClick={() => { setPrepareStep('select'); setError(''); }}>
            <span className={styles.freeEntryStep}>簡單</span>
            <span className={styles.freeEntryIcon}>⚡</span>
            <strong>三卡免費戰場</strong>
            <span className={styles.freeEntryDesc}>選 3 張卡，不扣收藏卡{starterPackClaimed === false ? '・首戰完成送 28 張幼子卡' : ''}</span>
            <span className={styles.freeEntryGo}>點這裡開始 →</span>
          </button>
          {/* ── 進階模式（需要持有神獸卡）── */}
          <p className={styles.modeNavLabel}>其他戰場</p>
          <div className={styles.modeCards}>
            <Link href="/beast-game/lineup" className={styles.modeCard}>
              <span className={styles.modeIcon}>🎯</span>
              <strong>單卡押注競技場</strong>
              <span className={styles.modeDesc}>押 1 張，輸了會失去 1 張</span>
              <span className={styles.modeBadge + ' ' + styles.modeBadgeWager}>中等</span>
            </Link>
            <Link href="/beast-game/battlefield" className={styles.modeCard}>
              <span className={styles.modeIcon}>⚔️</span>
              <strong>五卡押注戰場</strong>
              <span className={styles.modeDesc}>押 5 張，輸了會失去 5 張</span>
              <span className={styles.modeBadge + ' ' + styles.modeBadgeWager}>困難</span>
            </Link>
          </div>
        </> : prepareStep === 'select' ? <>
          {starterPackClaimed === false && <p className={styles.pickHint} role="status">先選 3 張卡，玩完首戰送 28 張幼子卡 ↓</p>}
          {/* 大型引導：讓老人家也能一眼看懂選了幾張、還要選幾張 */}
          <div className={styles.slotBar} role="status" aria-live="polite" aria-label={`已選 ${selected.length} 張，共需 3 張`}>
            {[0, 1, 2].map(i => {
              const card = cards.find(c => c.id === selected[i]);
              return (
                <button type="button" key={i} className={`${styles.slotBarCell} ${selected[i] ? styles.slotBarFilled : styles.slotBarEmpty}`}
                  disabled={!card} aria-label={card ? `移除第 ${i + 1} 張：${card.name}` : `第 ${i + 1} 張尚未選擇`}
                  onClick={() => { if (selected[i]) setSelected(s => s.filter((_, idx) => idx !== i)); }}>
                  {card
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={card.thumbnail} alt={card.name} />
                    : <span className={styles.slotNum}>{i + 1}</span>}
                  <small>{i === 0 ? '先出場' : `後備 ${i}`}</small>
                </button>
              );
            })}
          </div>
          <p className={styles.pickHint} role="status" aria-live="polite">
            {selected.length === 0 ? '👆 點任何一張卡片開始選 (0/3)'
              : selected.length === 1 ? `✔ 第1張選好了！再點一張 (1/3)`
              : selected.length === 2 ? `✔ 第2張選好了！再點一張 (2/3)`
              : '✅ 三張選好了！按下方「開始對戰」'}
          </p>
          <p className={styles.prepareRule}>普通攻擊自動進行，可隨時暫停；技能就緒會等你決定。點「能力」先了解卡片，再選入隊伍。</p>
          <BeastWagerPanel mode="簡單" />
          <div className={styles.filters} aria-label="元素篩選">{['全部', ...Object.keys(labels)].map(element => <button key={element} aria-pressed={filter === element} onClick={() => setFilter(element)}>{labels[element] ?? element}</button>)}</div>
          <div className={styles.grid}>{cards.filter(c => filter === '全部' || c.element === filter).map(card => <div className={`${styles.card} ${styles.pickCard}`} key={card.id}>
            {selected.includes(card.id) && <span className={styles.pickOrder}>第 {selected.indexOf(card.id) + 1} 張</span>}
            <BeastCardTile card={card} selected={selected.includes(card.id)} onOpen={() => {
              if (selected.includes(card.id)) {
                setSelected(s => s.filter(id => id !== card.id));
                setError('');
              } else if (selected.length < 3) {
                setSelected(s => [...s, card.id]);
                setError('');
              } else {
                setError('已選滿三張；先點已選的卡取消，再換另一張。');
              }
            }} />
            <button type="button" className={styles.cardInfo} aria-label={`查看${card.name}的能力`} onClick={() => setDetail(card)}>能力</button>
          </div>)}</div>
        </> : <>
          <div className={styles.slots}>{selected.map((id, i) => {
            const card = cards.find(c => c.id === id)!;
            return <div key={id} className={styles.card}><p className={styles.selectionCount}>{i === 0 ? '先出場' : '後備 ' + i}</p><BeastCardTile card={card} onOpen={() => setDetail(card)} /><p className={styles.confirmName}>{card.name}</p></div>;
          })}</div>
          <p className={styles.muted}>普通攻擊自動進行，技能就緒時等你決定。</p>
          <details className={styles.muted}><summary>對戰方式</summary><p>與易經各派三張，擊倒對方三隻即獲勝。六十張皆可用，本模式免押卡。</p></details>
        </>}
      </section>
      <footer className={styles.prepareFooter}>
        {prepareStep === 'mode' ? <>
          <button onClick={() => { setPrepareStep('select'); setError(''); }}>← 返回選卡</button>
        </> : prepareStep === 'select' ? <>
          <button className={styles.advancedBtn} onClick={() => { setPrepareStep('mode'); setSelected([]); setError(''); }}>進階玩法 ▸</button>
          <button className={styles.startBattle} disabled={busy || selected.length !== 3} onClick={() => { void send('START', { lineup: selected }); }} style={selected.length === 3 ? { boxShadow: '0 0 20px rgba(59, 130, 246, 0.35)' } : {}}>
            {busy ? '正在準備戰場…' : selected.length === 3 ? '✨ 開始對戰！' : `選滿 ${selected.length}/3 張`}
          </button>
        </> : <>
          <button disabled={busy} onClick={() => { setPrepareStep('select'); setDetail(null); }}>← 返回選卡</button>
          <button className={styles.startBattle} disabled={busy || selected.length !== 3} onClick={() => void send('START', { lineup: selected })}>{busy ? '準備戰場中…' : '⚔ 開始對戰！'}</button>
        </>}
      </footer>
      {detail && <CardDetailSheet card={{ ...detail, story: undefined }} onClose={() => setDetail(null)} />}
    </>}
  </main>;
}
