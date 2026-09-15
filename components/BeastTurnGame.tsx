'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { recordBeastGameCompleted } from '@/lib/growth-center-client';
import { readCollection, subscribeCollection, type CollectionHistoryItem } from '@/lib/beast-collection';
import { MAX_STAKE_CARDS } from '@/lib/beast-game/stake-rules';
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
  const [starterPackClaimed, setStarterPackClaimed] = useState<boolean | null>(null);
  /** 回來就知道下一步：這台裝置真的持有幾種卡、上一場結果。沒有就不顯示，不編數字。 */
  const [progress, setProgress] = useState<{ kinds: number; last: CollectionHistoryItem | null } | null>(null);
  const [filter, setFilter] = useState('全部');
  const [detail, setDetail] = useState<Card | null>(null);
  const [inspection, setInspection] = useState<{ cardId: string; side: 'player' | 'opponent' } | null>(null);
  const pending = useRef(false);
  const accountRevisionRef = useRef(0);
  const scroll = useRef<HTMLDivElement>(null);
  const match = account?.match;
  useEffect(() => {
    if (account) accountRevisionRef.current = account.revision;
  }, [account]);
  const { playing, begin: beginPlayback, play: playRound, reset: resetPlayback } = useCombatPlayback();

  // Keep completion accounting invisible to the battle interface.
  useEffect(() => { if (match?.status === 'FINISHED') recordBeastGameCompleted('battlefield'); }, [match?.status]);
  useEffect(() => {
    const refresh = () => {
      const collection = readCollection();
      setStarterPackClaimed(Boolean(collection.starterPack));
      setProgress({ kinds: new Set(collection.cards.map((entry) => entry.cardId)).size, last: collection.history[0] ?? null });
    };
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

  const send = useCallback(async (type: 'START' | 'ACTION' | 'LEAVE' | 'AUTO_FINISH' | 'AUTO_STEP', extra: Record<string, unknown> = {}) => {
    if (!account || pending.current) return;
    if ((type === 'ACTION' || type === 'AUTO_STEP') && !beginPlayback()) return;
    pending.current = true; setBusy(true); setError('');

    const post = async (bodyType: 'START' | 'ACTION' | 'LEAVE' | 'AUTO_FINISH' | 'AUTO_STEP', bodyExtra: Record<string, unknown>, revision: number) => {
      const res = await fetch('/api/beast-game/turns', {
        method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: bodyType, revision, requestId: crypto.randomUUID(), ...bodyExtra }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? '戰鬥操作未完成');
      return data as { ok: true; account: Account & { match: Match | null; revision: number } };
    };

    try {
      let data = await post(type, extra, accountRevisionRef.current);
      accountRevisionRef.current = data.account.revision;
      setAccount(data.account);

      // Free battle opens in auto mode: finish in one server lock to avoid
      // multi-turn /tmp races on multi-instance hosts (live Vercel Michelin P0).
      if (type === 'START' && data.account.match?.status === 'PLAYING') {
        setAutomatic(true);
        data = await post('AUTO_FINISH', {}, accountRevisionRef.current);
        accountRevisionRef.current = data.account.revision;
        setAccount(data.account);
        if (data.account.match) playRound(data.account.match);
        else resetPlayback();
      } else if ((type === 'ACTION' || type === 'AUTO_STEP') && data.account.match) {
        playRound(data.account.match);
      } else {
        resetPlayback();
      }

      if (type === 'LEAVE') {
        setAutomatic(false);
        if (account.match) setSelected(account.match.player.team.map(fighter => fighter.cardId));
      }
      if (type !== 'ACTION' && type !== 'AUTO_STEP') { setInspection(null); setDetail(null); }
    } catch (cause) {
      resetPlayback();
      setAutomatic(false);
      const message = cause instanceof Error ? cause.message : '連線中斷，請重新載入確認戰況。';
      if (message.includes('已更新戰局') || message.includes('請重新載入') || message.includes('資料正在保存')) {
        try {
          const res = await fetch('/api/beast-game/turns', { signal: AbortSignal.timeout(15000) });
          const data = await res.json();
          if (res.ok && data.ok) {
            accountRevisionRef.current = data.account.revision;
            setAccount(data.account);
            if (data.account.match?.status === 'FINISHED') {
              setError('');
              return;
            }
            setError('戰況已同步。若還在打，再點一次技能或自動即可。');
            return;
          }
        } catch { /* fall through */ }
      }
      setError(message);
    } finally { pending.current = false; setBusy(false); }
  }, [account, beginPlayback, playRound, resetPlayback]);

  const act = useCallback((action: Action) => { scroll.current?.scrollTo({ top: 0 }); void send('ACTION', { action }); }, [send]);
  /** 自動連擊的下一招由後端決定（前端只負責顯示）。 */
  const autoStep = useCallback(() => { scroll.current?.scrollTo({ top: 0 }); void send('AUTO_STEP'); }, [send]);

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
              <div hidden={Boolean(inspection) || (Boolean(error) && match.status === 'PLAYING')}>
                <BattlePace match={match} automatic={automatic} blocked={busy || playing || Boolean(error) || Boolean(inspection)} canAct={match.status === 'PLAYING'} onAutomatic={setAutomatic} onAuto={autoStep} />
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
      <p>{prepareStep === 'mode' ? '點選：簡單／中等／困難' : prepareStep === 'select' ? '選 3 張卡開戰，不扣收藏卡。' : '準備好了嗎？'}</p>
    </header>
    {errorNotice}
    {!account ? <section className={styles.prepareContent} aria-busy="true" aria-live="polite"><p className={styles.pickHint}>正在讀取戰鬥卡…</p><button type="button" className={styles.startBattle} disabled={busy} onClick={() => void load()}>重新載入</button>{errorNotice}</section> : <>
      <section className={styles.prepareContent} aria-label={prepareStep === 'mode' ? '選擇模式' : prepareStep === 'select' ? '選擇神獸卡' : '檢查陣容'}>
        {prepareStep === 'mode' ? <>
          {progress && progress.kinds > 0 && (() => {
            const last = progress.last;
            const lastCard = last?.cardId ? cards.find((card) => card.id === last.cardId) : undefined;
            const cardName = lastCard ? `「${lastCard.name}」` : '';
            const lastText = !last ? '' : last.kind === 'WON' ? `上一場贏得${cardName}` : last.kind === 'FORFEITED' ? `上一場輸掉${cardName}，換個陣容再挑戰` : '上一場平手，押注卡已退回';
            return <Link href="/beast-game/lineup" className={styles.progressCard} data-player-progress>
              {/* 卡圖沿用現有縮圖素材，不另產圖。 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {lastCard && <img src={lastCard.thumbnail} alt="" aria-hidden="true" />}
              <span className={styles.progressText}>
                <strong>你已收藏 {progress.kinds} 種神獸卡</strong>
                {lastText && <span>{lastText}</span>}
                <span className={styles.progressGo}>帶著卡去中等押注 →</span>
              </span>
            </Link>;
          })()}
          <p className={styles.modeNavLabel} role="status">請先選難度（三選一）</p>
          <div className={styles.modeCards} role="list" aria-label="難度選擇">
            <button type="button" role="listitem" className={styles.freeEntryBtn} onClick={() => { setPrepareStep('select'); setError(''); }} data-difficulty="easy">
              <span className={styles.freeEntryStep}>① 簡單</span>
              <span className={styles.freeEntryIcon}>⚡</span>
              <strong>簡單・三卡免費戰場</strong>
              <span className={styles.freeEntryDesc}>選 3 張卡開戰，不扣收藏卡{starterPackClaimed === false ? '・首戰完成送 28 張幼子卡' : ''}</span>
              <span className={styles.freeEntryGo}>點這裡開始簡單 →</span>
            </button>
            <Link href="/beast-game/lineup" className={styles.modeCard} role="listitem" data-difficulty="medium" aria-label="中等：單卡押注競技場">
              <span className={styles.modeIcon}>🎯</span>
              <strong>中等・單卡押注</strong>
              <span className={styles.modeDesc}>押 1 張收藏卡；輸了失去 1 張</span>
              <span className={styles.modeBadge + ' ' + styles.modeBadgeWager}>② 中等</span>
            </Link>
            <Link href="/beast-game/battlefield" className={styles.modeCard} role="listitem" data-difficulty="hard" aria-label="困難：五卡押注戰場">
              <span className={styles.modeIcon}>⚔️</span>
              <strong>困難・五卡押注</strong>
              <span className={styles.modeDesc}>{`押 1～${MAX_STAKE_CARDS} 張收藏卡；輸了只失去押上的卡`}</span>
              <span className={styles.modeBadge + ' ' + styles.modeBadgeWager}>③ 困難</span>
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
            {selected.length === 0 ? '點一張卡放入先出場 (0/3)'
              : selected.length === 1 ? '再選後備 1 (1/3)'
              : selected.length === 2 ? '再選後備 2 (2/3)'
              : '三張齊了・按下方開始'}
          </p>
          <p className={styles.prepareRule}>開戰後由系統一次演算整場（較穩、較快）；完成後可看結果再戰。</p>
          {/*
            三卡免費戰場「不押收藏、不發押卡獎勵」（技能檔案〈十一〉）。
            這裡原本整塊嵌了收藏押注面板（最多押 20 張、輸了沒收），跟標題「不扣收藏卡」互相矛盾，
            還把卡片推到三屏半之後。2026-09-15 依指示隱藏，程式碼保留；押注請走中等／困難入口。
          */}
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
          <p className={styles.muted}>開戰後由系統一次演算整場（較穩、較快）；完成後可看結果再戰。</p>
          <details className={styles.muted}><summary>對戰方式</summary><p>與易經各派三張，擊倒對方三隻即獲勝。六十張皆可用，本模式免押卡。</p></details>
        </>}
      </section>
      <footer className={styles.prepareFooter}>
        {prepareStep === 'mode' ? <>
          <button className={styles.startBattle} onClick={() => { setPrepareStep('select'); setError(''); }}>① 進入簡單・選 3 張卡</button>
        </> : prepareStep === 'select' ? <>
          <button className={styles.advancedBtn} onClick={() => { setPrepareStep('mode'); setSelected([]); setError(''); }}>進階玩法 ▸</button>
          <button className={styles.startBattle} disabled={busy || selected.length !== 3} onClick={() => { void send('START', { lineup: selected, difficulty: 'NORMAL' }); }} style={selected.length === 3 ? { boxShadow: '0 0 20px rgba(59, 130, 246, 0.35)' } : {}}>
            {busy ? '正在準備戰場…' : selected.length === 3 ? '✨ 開始對戰！' : `選滿 ${selected.length}/3 張`}
          </button>
        </> : <>
          <button disabled={busy} onClick={() => { setPrepareStep('select'); setDetail(null); }}>← 返回選卡</button>
          <button className={styles.startBattle} disabled={busy || selected.length !== 3} onClick={() => void send('START', { lineup: selected, difficulty: 'NORMAL' })}>{busy ? '準備戰場中…' : '⚔ 開始對戰！'}</button>
        </>}
      </footer>
      {detail && <CardDetailSheet card={{ ...detail, story: undefined }} onClose={() => setDetail(null)} />}
    </>}
  </main>;
}
