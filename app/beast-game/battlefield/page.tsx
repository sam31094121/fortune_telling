'use client';

/**
 * 神獸戰場 V1
 * ============================================================================
 *
 * 業主定調〈二十三、第一階段驗收〉：這一版只驗桌面，不驗戰鬥平衡。
 * 六十張卡可載入、卡片全部 1:1、牌庫／手牌／主戰／五格後備／棄牌正常、
 * 卡片可選取、可放入合法格子、主戰後備可交換、非法位置不能放、
 * 玩家與對手完全分離、手機不卡頓。
 *
 * 【規則不在這一頁】
 *
 * 能不能放、放完長什麼樣，全部走 lib/beast-game/battlefield.ts。
 * 這一頁只做三件事：把卡池抓回來、把狀態交給畫面、把點擊轉成引擎呼叫。
 * 傷害與勝負更不在這裡——那在 interactive.ts，戰場層一行都不重算。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {recordBeastGameCompleted} from '@/lib/growth-center-client';
import type { BattlefieldCardArt } from '@/components/battlefield/GameBattlefield';
import BattleArena, { PreparationControls } from '@/components/battlefield/BattleArena';
import BattleCardGuide from '@/components/battlefield/BattleCardGuide';
import BattleStartGuide from '@/components/battlefield/BattleStartGuide';
import type { BeastElement } from '@/lib/beast-game/elements';
import styles from '@/components/battlefield/BattleScreen.module.css';
import {
  moveCard,
  newBattle,
  selectCard,
  type BattleState,
  type Destination,
} from '@/lib/beast-game/battlefield';
import BattlePanel from '@/components/battlefield/BattlePanel';
import { autoPlaceOpponent, canStartBattle, startFromField } from '@/lib/beast-game/battle-bridge';
import { advance, type Action, type Match } from '@/lib/beast-game/interactive';
import StakeSlot, { type StakeCard } from '@/components/battlefield/StakeSlot';
import { readCollection, runOwnedDuel, countByCard, subscribeCollection, retryStakeSettlement, recoverPendingDuel, type Settlement } from '@/lib/beast-collection';
import { resolveStake } from '@/lib/beast-game/stake';
import type { StakeOutcome } from '@/lib/beast-collection-ledger';
import { namedStakeOutcome } from '@/lib/beast-stake-presentation';
import BeastStakeResult from '@/components/BeastStakeResult';
import BeastBattleVoice from '@/components/BeastBattleVoice';

/** 一副牌的張數。六十張是卡池，不是一副牌全部上桌。 */
const DECK_SIZE = 20;

/**
 * 種子亂數。
 *
 * 用種子而不是 Math.random：同一顆種子洗出同一副牌，
 * 客戶回報「我這局怪怪的」時才查得回去。
 */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDeck(ids: string[], rng: () => number, size: number): string[] {
  // 一副牌內不重複——同一張神獸不會在自己的牌庫裡出現兩次。
  const pool = ids.slice();
  const out: string[] = [];
  while (out.length < size && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}

export default function BattlefieldPage() {
  const [cards, setCards] = useState<BattlefieldCardArt[]>([]);
  const [state, setState] = useState<BattleState | null>(null);
  /** 開戰之後的戰鬥狀態。null＝還在佈陣。 */
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(1);
  /** 押注卡：支持 1-5 張。 */
  const [stakeCardIds, setStakeCardIds] = useState<string[]>([]);
  const [ownedStake, setOwnedStake] = useState<StakeCard[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [outcome, setOutcome] = useState<StakeOutcome | null>(null);
  const [battleStake, setBattleStake] = useState<string | null>(null);
  const [battleVoiceId, setBattleVoiceId] = useState('');
  const [settling, setSettling] = useState(false);
  const [stakeError, setStakeError] = useState('');
  const [movement, setMovement] = useState('');
  const [recovering, setRecovering] = useState(true);
  const alive = useRef(true);
  const starting = useRef(false);
  const pendingBattle = useRef<{ resolve: (value: { ok: true; stake: StakeOutcome }) => void; reject: (reason: Error) => void } | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [inspection, setInspection] = useState<{ cardId: string; side: 'player' | 'opponent' } | null>(null);
  const controlScroll = useRef<HTMLDivElement>(null);
  // 緩存選中的押注卡，避免重複查詢
  const selectedStakeCard = useMemo(() => ownedStake.find(card => card.id === stakeCardIds[0]), [stakeCardIds, ownedStake]);
  const inspectCard = useCallback((cardId: string, side: 'player' | 'opponent' = 'player') => {
    setInspection({ cardId, side });
    controlScroll.current?.scrollTo({ top: 0 });
    controlScroll.current?.parentElement?.scrollTo({ top: 0 });
  }, [controlScroll]);
  const closeInspection = useCallback(() => {
    setInspection(null);
    controlScroll.current?.scrollTo({ top: 0 });
    controlScroll.current?.parentElement?.scrollTo({ top: 0 });
  }, [controlScroll]);
  useEffect(()=>{if(match?.status==='FINISHED')recordBeastGameCompleted('battlefield');},[match?.status]);
  useEffect(() => {
    alive.current = true;
    const timer = setTimeout(() => {
      void recoverPendingDuel<{ ok: boolean; stake?: StakeOutcome }>().then(recovered => {
        if (!alive.current) return;
        if (recovered.result?.stake) setOutcome(recovered.result.stake);
        if (recovered.settlement) setSettlement(recovered.settlement);
        if (recovered.interrupted) setMovement('上一場已中斷，押注卡未扣除。請重新選卡。');
      }).catch(cause => { if (alive.current) setStakeError(cause instanceof Error ? cause.message : '暫時無法讀取押注紀錄。'); })
        .finally(() => { if (alive.current) setRecovering(false); });
    }, 0);
    return () => {
      alive.current = false; clearTimeout(timer);
      pendingBattle.current?.reject(new Error('本場中斷，押注卡未扣除。'));
      pendingBattle.current = null;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    fetch('/api/beast-game', { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error('卡池連線失敗'); return res.json(); })
      .then((data) => {
        if (!data?.ok || !Array.isArray(data.cards)) throw new Error('卡池回應不正確');
        if (disposed) return;
        setError(null);
        setCards(data.cards as BattlefieldCardArt[]);
      })
      .catch(() => { if (!disposed) setError('卡池暫時無法載入，請點下方按鈕再試一次。收藏不受影響。'); })
      .finally(() => clearTimeout(timer));
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [loadAttempt]);

  // 卡池到齊才開桌。開桌本身是純函式，換種子就是重開一局。
  useEffect(() => {
    if (!cards.length) return;
    const ids = cards.map((card) => card.id);
    const rng = seeded(seed);
    const fresh = newBattle(buildDeck(ids, rng, DECK_SIZE), buildDeck(ids, rng, DECK_SIZE), rng);
    // 對手用同一套佈陣規則自動上場——沒有特權、沒有額外格子。
    setState(autoPlaceOpponent(fresh, rng));
    setMatch(null);
    setStakeCardIds([]);
    setInspection(null);
  }, [cards, seed]);

  /** 從目前的佈陣開戰。種子固定，同一局可重播。 */
  const start = useCallback(async () => {
    if (!state || starting.current || recovering || settlement?.saved === false) return;
    starting.current = true;
    setStakeError('');
    try {
      const next = startFromField(state, seed * 7919);
      if (!stakeCardIds.length && ownedStake.length) throw new Error('請先選 1-5 張押注卡。');
      setOutcome(null); setSettlement(null); setBattleStake(stakeCardIds[0] || null);
      setBattleVoiceId(crypto.randomUUID());
      setInspection(null);
      if (!stakeCardIds.length) { setMatch(next); return; }
      setSettling(true);
      // Reserve the actual copy before combat. The shared transaction settles once or releases on interruption.
      const completed = await runOwnedDuel(stakeCardIds[0], () => new Promise<{ ok: true; stake: StakeOutcome }>((resolve, reject) => {
        if (!alive.current) { reject(new Error('本場中斷，押注卡未扣除。')); return; }
        pendingBattle.current = { resolve, reject };
        setMatch(next);
      }));
      if (alive.current) { setOutcome(completed.result.stake); setSettlement(completed.settlement); }
    } catch (cause) {
      if (alive.current) setStakeError(cause instanceof Error ? cause.message : '還不能開戰，押注卡未扣除。');
    } finally { starting.current = false; if (alive.current) setSettling(false); }
  }, [state, seed, stakeCardIds, ownedStake.length, recovering, settlement]);

  /**
   * 出招。
   *
   * 只把動作交給 advance()，對手要出什麼由它自己的 AI 決定（預設參數）。
   * 這裡不挑對手的動作，也不預測結果——**畫面不是裁判**。
   */
  const act = useCallback((action: Action) => {
    setMatch((current) => {
      if (!current || current.status !== 'PLAYING') return current;
      try {
        return advance(current, action);
      } catch {
        // 不合法的動作根本不會出現在畫面上；真的發生就維持原狀，不要亂改狀態。
        return current;
      }
    });
  }, []);

  const handleSelect = useCallback((cardId: string) => {
    setState((current) => (current ? selectCard(current, cardId) : current));
  }, []);

  const handleDestination = useCallback((to: Destination) => {
    setState((current) => {
      if (!current?.selectedCardId) return current;
      try {
        const id = current.selectedCardId;
        const from = current.player.active === id ? '主戰' : current.player.bench.includes(id) ? `後備 ${current.player.bench.indexOf(id) + 1}` : '手牌';
        const destination = to.zone === 'ACTIVE' ? '主戰' : to.zone === 'BENCH' ? `後備 ${to.slotIndex + 1}` : '棄牌區';
        const next = moveCard(current, 'PLAYER', id, to);
        const outgoing = to.zone === 'ACTIVE' ? current.player.active : null;
        const outgoingTo = outgoing ? next.player.bench.includes(outgoing) ? `後備 ${next.player.bench.indexOf(outgoing) + 1}` : '棄牌區' : '';
        setMovement(`「${cards.find(card => card.id === id)?.name}」1 張：${from} → ${destination}。${outgoing ? `「${cards.find(card => card.id === outgoing)?.name}」1 張：主戰 → ${outgoingTo}。` : ''}佈陣移動不扣卡，押注張數不變。`);
        return next;
      } catch { setMovement('這個位置不能放入，請點選發光的空格。'); return current; }
    });
  }, [cards]);

  /* 可以拿來押的，是成長收藏裡真正擁有的那些——不是卡池六十張。 */
  useEffect(() => {
    if (!cards.length) return;
    const refresh = () => {
      const collection = readCollection();
      if (collection.storageError) setStakeError(collection.storageError);
      const owned = [...countByCard(collection)].flatMap(([id, count]) => {
        const card = cards.find(item => item.id === id);
        return card ? [{ id, name: card.name, thumbnail: card.thumbnail, count }] : [];
      });
      setOwnedStake(owned);
    };
    refresh();
    return subscribeCollection(refresh);
  }, [cards]);

  /*
    結算：戰鬥打完才動收藏。

    走 runOwnedDuel——它有跨分頁鎖、失敗會回滾、還有崩潰復原日誌。
    另外寫一套「應該也可以」的結算，就是拿客戶的收藏在冒險。
    勝負來自 match.winner，這裡不重算。
  */
  useEffect(() => {
    if (!match || match.status !== 'FINISHED' || !battleStake || !pendingBattle.current) return;
    const opponentStake = match.opponent.team[0]?.cardId;
    if (!opponentStake) return;
    const outcome = resolveStake({
      playerStake: battleStake,
      opponentStake,
      winner: match.winner === 'player' ? 'PLAYER' : match.winner === 'opponent' ? 'OPPONENT' : 'DRAW',
    });
    const pending = pendingBattle.current;
    pendingBattle.current = null;
    setOutcome(outcome);
    pending.resolve({ ok: true, stake: outcome });
  }, [match, battleStake]);

  const retrySettlement = async () => {
    if (!settlement || !outcome || settling) return;
    setSettling(true);
    try { setSettlement(await retryStakeSettlement(settlement.matchId, outcome)); setStakeError(''); }
    catch (cause) { setStakeError(cause instanceof Error ? cause.message : '請重試保存。'); }
    finally { setSettling(false); }
  };
  const redeal = () => {
    if (settling || settlement?.saved === false) return;
    setSettlement(null); setOutcome(null); setBattleStake(null); setMovement(''); setStakeError('');
    setSeed(value => value + 1); setError(null);
  };

  /*
    體驗戰：成長收藏空著的人免押注也能開戰。

    實測過的死路：新客戶沒有收藏卡＝押不了注＝完全開不了戰，
    只能先繞去成長中心。體驗戰把牆拆掉——不押卡、不發卡、不沒收，
    純粹讓人先打過一場、看懂相剋，再去領卡打正式戰。
    有收藏卡的人不走這條路：有東西可押的人就要押，賞罰才成立。
  */
  const isTrial = match ? !battleStake : ownedStake.length === 0;
  const startCheck = useMemo(() => {
    const base = state ? canStartBattle(state) : { ready: false as const };
    if (recovering || settling) return { ready: false as const, reason: '正在核對押注紀錄…' };
    if (settlement?.saved === false) return { ready: false as const, reason: '請先保存上一場結果' };
    if (stakeError) return { ready: false as const, reason: '請先處理押注提示' };
    if (!base.ready) return base;
    // 佈陣完成之後才輪到押注：先後順序不能顛倒，
    // 不然客戶會先選好賭注、才發現主戰還沒放。
    if ((!stakeCardIds.length || !ownedStake.some(card => card.id === stakeCardIds[0])) && !isTrial) return { ready: false as const, reason: '先押一張收藏卡' };
    return base;
  }, [state, stakeCardIds, isTrial, recovering, settling, settlement, stakeError, ownedStake]);
  const placed = useMemo(() => {
    if (!state) return 0;
    return (state.player.active ? 1 : 0) + state.player.bench.filter(Boolean).length;
  }, [state]);
  /*
    對手上了幾隻。開戰前要把「你 1 隻、對手 3 隻」講出來——
    實測：後備標著「可略」，客戶真的略過，然後在不知情下押著收藏卡
    打一場一對三。輸了卡被沒收，他不會覺得自己學到教訓，只會覺得被坑。
  */
  const opponentPlaced = useMemo(() => {
    if (!state) return 0;
    return (state.opponent.active ? 1 : 0) + state.opponent.bench.filter(Boolean).length;
  }, [state]);

  return (
    <main className={styles.page} data-mobile-battle>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/beast-game/lineup">格鬥場 ↗</Link>
          <h1>卡片戰鬥</h1>
          <span>戰鬥／操控 50:50</span>
        </header>
        {error ? (
          <div role="alert" className={styles.loading}>
            <p>{error}</p>
            <button type="button" className={styles.restart} onClick={() => { setError(null); setLoadAttempt(n => n + 1); }}>重新載入卡池</button>
          </div>
        ) : !state ? <p className={styles.loading}>正在發牌…</p> : (
          <div className={styles.split} data-battle-split>
            <BattleArena state={state} cards={cards} match={match} onInspect={inspectCard} />
            <section className={styles.controls} aria-label="手部操控" data-battle-controls data-preparing={!match}>
              <div className={styles.controlsHeading}>
                <strong>{inspection ? '能力與相剋' : match ? (match.status === 'FINISHED' ? '對戰結果' : '選擇本回合動作') : '親手佈陣'}</strong>
                <span>{inspection ? '查看不消耗回合' : match ? '戰況同步顯示' : '你 ' + placed + ' 隻・對手 ' + opponentPlaced + ' 隻'}</span>
              </div>
              <div className={styles.controlScroll} ref={controlScroll} key={match ? 'battle' : 'prepare'} data-control-scroll>
                {inspection && <BattleCardGuide key={`${inspection.side}-${inspection.cardId}`} cardId={inspection.cardId}
                  fighter={match?.[inspection.side].team.find(fighter => fighter.cardId === inspection.cardId)}
                  opponentElement={(() => {
                    const other = inspection.side === 'player' ? 'opponent' : 'player';
                    return match ? match[other].team[match[other].active].element : cards.find(card => card.id === state[other].active)?.element as BeastElement | undefined;
                  })()}
                  onClose={closeInspection} />}
                <div hidden={Boolean(inspection)}>
                {stakeError && <p role="alert" className={styles.notice}>{stakeError}<button type="button" className={styles.restart} onClick={() => {
                  if (readCollection().storageError) return;
                  setStakeError('');
                }}>重新核對</button></p>}
                {outcome && <BeastStakeResult outcome={namedStakeOutcome(outcome, id => cards.find(card => card.id === id)?.name ?? '神獸卡')}
                  card={cards.find(card => card.id === (outcome.gainedCardId ?? outcome.forfeitedCardId ?? outcome.stakes.player))}
                  cards={cards} settlement={settlement} isReplay={false} retrying={settling} onRetry={() => void retrySettlement()} />}
                {match ? (
                  <>
                    {match.status === 'PLAYING' && <p className={styles.notice} data-battle-stake>{battleStake
                      ? `💎 押注：${cards.find(card => card.id === battleStake)?.name}`
                      : '🎮 體驗戰'}</p>}
                    <BattlePanel match={match} onAction={act} compact cards={cards} />
                    {match.status === 'FINISHED' && (
                      <p role="status" className={styles.notice} data-battle-result={match.winner}>
                        {isTrial ? (
                          <>體驗戰結束：押注 0 張・贏得 0 張・輸掉 0 張。</>
                        ) : outcome ? (
                          <>
                            {outcome.verdict === 'WON' ? '✅ 獲勝！' : outcome.verdict === 'LOST' ? '❌ 落敗。' : '⚪ 平手。'}
                            {' 押注 1 張・'}
                            {outcome.verdict === 'WON' ? '✅ 贏得 1 張' : outcome.verdict === 'LOST' ? '❌ 輸掉 1 張' : '⚪ 保留 1 張'}
                            {' ・'}
                            {outcome.message}
                          </>
                        ) : null}
                      </p>
                    )}
                    {match.status === 'FINISHED' && isTrial && <BeastBattleVoice id={`trial:${battleVoiceId}`}
                      text={`${match.winner === 'player' ? '恭喜獲勝！' : match.winner === 'opponent' ? '本場對手獲勝。' : '本場平手。'}這是免押體驗戰。押注零張，贏得零張，輸掉零張。可以換一組戰術再挑戰。`} />}
                  </>
                ) : (
                  <>
                    {movement && <p role="status" className={styles.notice} data-card-move>{movement}</p>}
                    <PreparationControls state={state} cards={cards} onSelect={handleSelect} onDestination={handleDestination} onInspect={inspectCard} />
                    <details className={styles.details} hidden={Boolean(state.player.active && (isTrial || stakeCardIds.length))}>
                      <summary>{isTrial ? '✓ 體驗戰' : stakeCardIds.length ? `✓ 押注：${selectedStakeCard?.name}` : '📋 佈陣進度'}</summary>
                      <StakeSlot owned={ownedStake} selected={stakeCardIds[0]} trial={isTrial} locked={settling || settlement?.saved === false}
                        steps={[
                          { label: '主戰', done: Boolean(state.player.active) },
                          { label: '後備', done: state.player.bench.some(Boolean) },
                          { label: isTrial ? '免押' : '押注', done: isTrial || Boolean(stakeCardIds.length) },
                          { label: '戰鬥', done: startCheck.ready },
                        ]}
                        onSelect={cardId => { if (settling || settlement?.saved === false) return; setStakeCardIds(current => current.includes(cardId) ? current.filter(id => id !== cardId) : current.length < 5 ? [...current, cardId] : current); }} />
                    </details>
                    {startCheck.ready && placed < opponentPlaced && (
                      <p className={styles.notice} data-outnumbered>
                        你 {placed} 隻、對手 {opponentPlaced} 隻；可再放後備增援。{!isTrial && '押上的卡輸了會被沒收。'}
                      </p>
                    )}
                    <div className={styles.controls}>
                      <button type="button" className={styles.restart} disabled={settling || settlement?.saved === false} onClick={redeal}>🔄 重新發牌</button>
                    </div>
                  </>
                )}
                </div>
              </div>
              {!match ? (
                <div className={styles.footer}>
                  <BattleStartGuide
                    steps={[
                      { step: 1, label: '選主戰卡', done: Boolean(state?.player.active), icon: '🐉' },
                      { step: 2, label: '放後備卡', done: Boolean(state && state.player.bench.some(Boolean)), icon: '🛡️' },
                      { step: 3, label: isTrial ? '免押注' : '選押注卡', done: isTrial || Boolean(stakeCardIds.length), icon: '💎' },
                      { step: 4, label: '檢查陣容', done: Boolean(placed >= 1 && opponentPlaced >= 1), icon: '✓' },
                      { step: 5, label: '開戰！', done: false, icon: '⚔️' },
                    ]}
                    status={isTrial
                      ? `你 ${placed} 隻・對手 ${opponentPlaced} 隻・體驗戰`
                      : `你 ${placed} 隻・對手 ${opponentPlaced} 隻・押注 ${stakeCardIds.length} 張`
                    }
                    canStart={startCheck.ready}
                    startButtonText={isTrial ? '開始體驗戰' : `確認開戰`}
                    onStart={() => void start()}
                    blockReason={!startCheck.ready && 'reason' in startCheck ? startCheck.reason : undefined}
                  />
                </div>
              ) : match.status === 'FINISHED' ? (
                <div className={styles.footer}>
                  <button type="button" className={styles.restart} disabled={settling || settlement?.saved === false} onClick={redeal}>{settling ? '正在保存卡片結算…' : settlement?.saved === false ? '請先重試保存結果' : '重新發牌，再打一場'}</button>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
