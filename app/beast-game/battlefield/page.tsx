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
import { readCollection, runOwnedDuel, countByCard } from '@/lib/beast-collection';
import { resolveStake } from '@/lib/beast-game/stake';

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
  /** 押注格：戰鬥前堵住輸贏的那一格。沒押就開不了戰。 */
  const [stakeCardId, setStakeCardId] = useState<string | null>(null);
  const [ownedStake, setOwnedStake] = useState<StakeCard[]>([]);
  const [settlement, setSettlement] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [inspection, setInspection] = useState<{ cardId: string; side: 'player' | 'opponent' } | null>(null);
  const controlScroll = useRef<HTMLDivElement>(null);
  const inspectCard = useCallback((cardId: string, side: 'player' | 'opponent' = 'player') => {
    setInspection({ cardId, side });
    controlScroll.current?.scrollTo({ top: 0 });
  }, []);
  const closeInspection = useCallback(() => {
    setInspection(null);
    controlScroll.current?.scrollTo({ top: 0 });
  }, []);
  useEffect(()=>{if(match?.status==='FINISHED')recordBeastGameCompleted('battlefield');},[match?.status]);

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
    setStakeCardId(null);
    setSettlement(null);
    setInspection(null);
  }, [cards, seed]);

  /** 從目前的佈陣開戰。種子固定，同一局可重播。 */
  const start = useCallback(() => {
    if (!state) return;
    try {
      setMatch(startFromField(state, seed * 7919));
      setInspection(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '還不能開戰。');
    }
  }, [state, seed]);

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
        return moveCard(current, 'PLAYER', current.selectedCardId, to);
      } catch {
        // 非法移動在引擎就被擋下了。畫面本來就不該給出非法的格子，
        // 真的走到這裡代表有 bug——取消選取，不要讓客戶卡在半途。
        return selectCard(current, null);
      }
    });
  }, []);

  /* 可以拿來押的，是成長收藏裡真正擁有的那些——不是卡池六十張。 */
  useEffect(() => {
    if (!cards.length) return;
    const collection = readCollection();
    const owned = [...countByCard(collection).keys()]
      .map((id) => cards.find((card) => card.id === id))
      .filter((card): card is BattlefieldCardArt => Boolean(card))
      .map((card) => ({ id: card.id, name: card.name, thumbnail: card.thumbnail }));
    setOwnedStake(owned);
  }, [cards, seed]);

  /*
    結算：戰鬥打完才動收藏。

    走 runOwnedDuel——它有跨分頁鎖、失敗會回滾、還有崩潰復原日誌。
    另外寫一套「應該也可以」的結算，就是拿客戶的收藏在冒險。
    勝負來自 match.winner，這裡不重算。
  */
  useEffect(() => {
    if (!match || match.status !== 'FINISHED' || !stakeCardId || settlement) return;
    const opponentStake = match.opponent.team[0]?.cardId;
    if (!opponentStake) return;
    const outcome = resolveStake({
      playerStake: stakeCardId,
      opponentStake,
      winner: match.winner === 'player' ? 'PLAYER' : match.winner === 'opponent' ? 'OPPONENT' : 'DRAW',
    });
    void runOwnedDuel(stakeCardId, async () => ({ ok: true as const, stake: outcome }))
      .then(({ result }) => setSettlement(result.stake.message))
      .catch((cause: unknown) => setSettlement(cause instanceof Error ? cause.message : '押注結算失敗。'));
  }, [match, stakeCardId, settlement]);

  /*
    體驗戰：成長收藏空著的人免押注也能開戰。

    實測過的死路：新客戶沒有收藏卡＝押不了注＝完全開不了戰，
    只能先繞去成長中心。體驗戰把牆拆掉——不押卡、不發卡、不沒收，
    純粹讓人先打過一場、看懂相剋，再去領卡打正式戰。
    有收藏卡的人不走這條路：有東西可押的人就要押，賞罰才成立。
  */
  const isTrial = ownedStake.length === 0;
  const startCheck = useMemo(() => {
    const base = state ? canStartBattle(state) : { ready: false as const };
    if (!base.ready) return base;
    // 佈陣完成之後才輪到押注：先後順序不能顛倒，
    // 不然客戶會先選好賭注、才發現主戰還沒放。
    if (!stakeCardId && !isTrial) return { ready: false as const, reason: '先押一張收藏卡' };
    return base;
  }, [state, stakeCardId, isTrial]);
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
            <section className={styles.controls} aria-label="手部操控" data-battle-controls>
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
                {match ? (
                  <>
                    <BattlePanel match={match} onAction={act} compact cards={cards} />
                    {match.status === 'FINISHED' && isTrial && (
                      <p role="status" className={styles.notice} data-trial-note>
                        體驗戰結束：沒有押卡、發卡或沒收。可重新發牌，換一組戰術再挑戰。
                      </p>
                    )}
                    {settlement && (
                      <p role="status" className={styles.notice} data-settlement>
                        {settlement}
                        {match.winner === 'opponent' && <span> 看本場敗因，換個相剋的元素再挑戰。</span>}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <PreparationControls state={state} cards={cards} onSelect={handleSelect} onDestination={handleDestination} onInspect={inspectCard} />
                    <details className={styles.details}>
                      <summary>{isTrial ? '體驗戰・免押卡' : stakeCardId ? '已押：' + ownedStake.find(card => card.id === stakeCardId)?.name : '③ 選一張收藏卡押上・輸了會被沒收'}</summary>
                      <StakeSlot owned={ownedStake} selected={stakeCardId} trial={isTrial}
                        steps={[
                          { label: '選主戰', done: Boolean(state.player.active) },
                          { label: '擺後備・可略', done: state.player.bench.some(Boolean) },
                          { label: isTrial ? '體驗免押' : '押注', done: isTrial || Boolean(stakeCardId) },
                          { label: '開戰', done: false },
                        ]}
                        onSelect={cardId => setStakeCardId(current => current === cardId ? null : cardId)} />
                    </details>
                    {startCheck.ready && placed < opponentPlaced && (
                      <p className={styles.notice} data-outnumbered>
                        你 {placed} 隻、對手 {opponentPlaced} 隻；可再放後備增援。{!isTrial && '押上的卡輸了會被沒收。'}
                      </p>
                    )}
                    <details className={styles.details}>
                      <summary>玩法與重新發牌</summary>
                      <p>60 種神獸，出戰使用 20 張試用牌。先點手牌，再點發光的主戰或後備格；點場上卡片可換位。手機不用拖曳。每回合親手選攻擊、技能或換卡。</p>
                      <p>{isTrial ? '體驗戰免押卡，不發卡也不沒收。' : '正式戰押一張收藏卡；輸了會被沒收，贏了保留並再得一張，平手退回。'}</p>
                      <p><Link href="/beast-game">自由組隊：從 60 張卡中親手選三張 →</Link></p>
                      <button type="button" className={styles.restart} onClick={() => { setSeed(value => value + 1); setError(null); }}>重新發牌</button>
                    </details>
                  </>
                )}
                </div>
              </div>
              {!match ? (
                <div className={styles.footer}>
                  <button type="button" data-start-battle disabled={!startCheck.ready} className={styles.start} onClick={start}>
                    {startCheck.ready ? (isTrial ? '開始體驗戰（免押卡）' : '開戰') : ('reason' in startCheck && startCheck.reason) || '還不能開戰'}
                  </button>
                </div>
              ) : match.status === 'FINISHED' ? (
                <div className={styles.footer}>
                  <button type="button" className={styles.restart} onClick={() => { setSeed(value => value + 1); setError(null); }}>重新發牌，再打一場</button>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
