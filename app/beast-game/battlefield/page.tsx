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
import { nextStakeSelection, preparationGuidance, type PreparationStep } from '@/components/battlefield/preparation-guidance';
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
import { readCollection, runOwnedStakesDuel, countByCard, subscribeCollection, retryStakeSettlement, recoverPendingDuel, type Settlement } from '@/lib/beast-collection';
import { resolveStake } from '@/lib/beast-game/stake';
import type { StakeOutcome } from '@/lib/beast-collection-ledger';
import { namedStakeOutcome } from '@/lib/beast-stake-presentation';
import BeastStakeResult from '@/components/BeastStakeResult';
import BeastBattleVoice from '@/components/BeastBattleVoice';
import DeckBuilder from '@/components/battlefield/DeckBuilder';
import { BATTLEFIELD_DECK_SIZE, buildFreshOpeningDeck, buildUniqueDeck, sanitizeDeckSelection } from '@/lib/beast-game/deck-builder';

/** 一副牌的張數。六十張是卡池，不是一副牌全部上桌。 */
const SAVED_DECK_KEY = 'taiji-beast-battlefield-deck-v1';

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

function secureSeed(): number {
  const values = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(values);
  return values[0] || (Date.now() >>> 0) || 1;
}

export default function BattlefieldPage() {
  const [cards, setCards] = useState<BattlefieldCardArt[]>([]);
  const [state, setState] = useState<BattleState | null>(null);
  /** 開戰之後的戰鬥狀態。null＝還在佈陣。 */
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(secureSeed);
  const [playerDeckIds, setPlayerDeckIds] = useState<string[]>([]);
  const [deckDraft, setDeckDraft] = useState<string[]>([]);
  const [deckEditorOpen, setDeckEditorOpen] = useState(false);
  const previousOpening = useRef<{ player: string[]; opponent: string[] }>({ player: [], opponent: [] });
  /** 正式戰固定押五張收藏紀錄；每個 id 都是可追溯的實際卡片副本。 */
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
  // Refs for stable callbacks — always holds the latest value without adding to deps arrays
  const stateRef = useRef(state);
  stateRef.current = state;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const [prepareView, setPrepareView] = useState<'formation' | 'stake' | 'help'>('formation');
  const [guideRequest, setGuideRequest] = useState<{ step: PreparationStep } | null>(null);
  const reviewStep = useCallback((step: PreparationStep) => {
    setInspection(null);
    setPrepareView(step === 3 ? 'stake' : 'formation');
    setGuideRequest({ step });
  }, []);
  useEffect(() => {
    if (!guideRequest || match) return;
    const frame = requestAnimationFrame(() => {
      const root = controlScroll.current;
      if (!root) return;
      let target: HTMLElement | null = null;
      if (guideRequest.step === 3) {
        target = root.querySelector<HTMLElement>('[role="alert"], [data-preparation-progress]');
      } else if (guideRequest.step === 5) {
        target = root.parentElement?.querySelector<HTMLElement>('[data-start-confirmation]') ?? null;
      } else {
        target = root.querySelector<HTMLElement>(guideRequest.step === 4
          ? '[aria-label="選卡與放牌"]' : '[data-place-active], [aria-label="你的手牌"] button');
        if (guideRequest.step === 1) target = root.querySelector<HTMLElement>('[data-place-active]') ?? target;
        target ??= root.querySelector<HTMLElement>('[aria-label="選卡與放牌"]');
      }
      if (!target) return;
      target.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [guideRequest, match]);
  const openPreparation = (view: 'formation' | 'stake' | 'help') => {
    setInspection(null);
    setGuideRequest(null);
    setPrepareView(view);
    controlScroll.current?.scrollTo({ top: 0 });
    controlScroll.current?.parentElement?.scrollTo({ top: 0 });
  };
  // 緩存選中的押注卡，避免重複查詢
  const selectedStakeCards = useMemo(() => stakeCardIds
    .map(id => ownedStake.find(card => card.id === id))
    .filter((card): card is StakeCard => Boolean(card)), [stakeCardIds, ownedStake]);
  const inspectCard = useCallback((cardId: string, side: 'player' | 'opponent' = 'player') => {
    setInspection({ cardId, side });
    controlScroll.current?.scrollTo({ top: 0 });
    controlScroll.current?.parentElement?.scrollTo({ top: 0 });
  }, []);
  const closeInspection = useCallback(() => {
    setInspection(null);
    controlScroll.current?.scrollTo({ top: 0 });
    controlScroll.current?.parentElement?.scrollTo({ top: 0 });
  }, []);
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
        const loadedCards = data.cards as BattlefieldCardArt[];
        const availableIds = loadedCards.map(card => card.id);
        let saved: string[] = [];
        try {
          const raw = localStorage.getItem(SAVED_DECK_KEY);
          saved = raw ? JSON.parse(raw) : [];
        } catch { saved = []; }
        const restored = sanitizeDeckSelection(saved, availableIds);
        const initialDeck = restored.length === BATTLEFIELD_DECK_SIZE
          ? restored
          : buildUniqueDeck(availableIds, seeded(secureSeed()));
        setCards(loadedCards);
        setPlayerDeckIds(initialDeck);
        setDeckDraft(initialDeck);
      })
      .catch(() => { if (!disposed) setError('卡池暫時無法載入，請點下方按鈕再試一次。收藏不受影響。'); })
      .finally(() => clearTimeout(timer));
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [loadAttempt]);

  // 卡池到齊才開桌。開桌本身是純函式，換種子就是重開一局。
  useEffect(() => {
    if (!cards.length || playerDeckIds.length !== BATTLEFIELD_DECK_SIZE) return;
    const ids = cards.map((card) => card.id);
    const rng = seeded(seed);
    const playerOrder = buildFreshOpeningDeck(playerDeckIds, previousOpening.current.player, rng);
    const opponentSelection = buildUniqueDeck(ids, rng);
    const opponentOrder = buildFreshOpeningDeck(opponentSelection, previousOpening.current.opponent, rng);
    const fresh = newBattle(playerOrder, opponentOrder, rng, false);
    previousOpening.current = { player: fresh.player.hand.slice(), opponent: fresh.opponent.hand.slice() };
    // 對手用同一套佈陣規則自動上場——沒有特權、沒有額外格子。
    setState(autoPlaceOpponent(fresh, rng));
    setMatch(null);
    setStakeCardIds([]);
    setInspection(null);
    setGuideRequest(null);
    setPrepareView('formation');
  }, [cards, playerDeckIds, seed]);

  /** 從目前的佈陣開戰。種子固定，同一局可重播。 */
  const start = useCallback(async () => {
    if (!state || starting.current || recovering || settlement?.saved === false) return;
    starting.current = true;
    setStakeError('');
    try {
      const next = startFromField(state, seed * 7919);
      if (ownedStake.length && stakeCardIds.length !== 5) throw new Error('正式戰必須選滿五張押注卡。');
      const representative = ownedStake.find(card => card.id === stakeCardIds[0]);
      setOutcome(null); setSettlement(null); setBattleStake(representative?.cardId || null);
      setBattleVoiceId(crypto.randomUUID());
      setInspection(null);
      if (!stakeCardIds.length) { setMatch(next); return; }
      setSettling(true);
      // Reserve the actual copy before combat. The shared transaction settles once or releases on interruption.
      const completed = await runOwnedStakesDuel(stakeCardIds, entries => new Promise<{ ok: true; stake: StakeOutcome }>((resolve, reject) => {
        if (!alive.current) { reject(new Error('本場中斷，押注卡未扣除。')); return; }
        pendingBattle.current = {
          resolve: result => resolve({ ok: true, stake: {
            ...result.stake,
            selectedEntries: entries,
            forfeitedEntryIds: result.stake.verdict === 'LOST' ? entries.map(entry => entry.id) : [],
          } }),
          reject,
        };
        setMatch(next);
      }));
      if (alive.current && completed.result.stake) { setOutcome(completed.result.stake); setSettlement(completed.settlement); }
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
    setState((current) => {
      if (!current) return current;

      // 手機優先：手牌只點一次，就依序補入主戰與後備。
      // 陣容已滿或點的是已上場卡時，才保留原本的精準換位流程。
      if (current.player.hand.includes(cardId)) {
        const emptyBenchSlot = current.player.bench.findIndex(id => !id);
        const destination: Destination | null = !current.player.active
          ? { zone: 'ACTIVE' }
          : emptyBenchSlot >= 0
            ? { zone: 'BENCH', slotIndex: emptyBenchSlot }
            : null;

        if (destination) {
          try {
            const next = moveCard(current, 'PLAYER', cardId, destination);
            const cardName = cardsRef.current.find(card => card.id === cardId)?.name ?? '這張卡';
            const targetName = destination.zone === 'ACTIVE' ? '主戰' : `後備 ${destination.slotIndex + 1}`;
            setMovement(`「${cardName}」已一鍵放入${targetName}。佈陣移動不扣卡，押注張數不變。`);
            return next;
          } catch {
            setMovement('這張卡暫時不能放入，請再點一次或選擇其他卡片。');
            return current;
          }
        }
      }

      return selectCard(current, cardId);
    });
  }, []);

  const handleDestination = useCallback((to: Destination) => {
    const current = stateRef.current;
    if (!current?.selectedCardId) return;
    const cardList = cardsRef.current;
    try {
      const id = current.selectedCardId;
      const from = current.player.active === id ? '主戰' : current.player.bench.includes(id) ? `後備 ${current.player.bench.indexOf(id) + 1}` : '手牌';
      const destination = to.zone === 'ACTIVE' ? '主戰' : to.zone === 'BENCH' ? `後備 ${to.slotIndex + 1}` : '棄牌區';
      const next = moveCard(current, 'PLAYER', id, to);
      const outgoing = to.zone === 'ACTIVE' ? current.player.active : null;
      const outgoingTo = outgoing ? next.player.bench.includes(outgoing) ? `後備 ${next.player.bench.indexOf(outgoing) + 1}` : '棄牌區' : '';
      setState(next);
      setMovement(`「${cardList.find(card => card.id === id)?.name}」1 張：${from} → ${destination}。${outgoing ? `「${cardList.find(card => card.id === outgoing)?.name}」1 張：主戰 → ${outgoingTo}。` : ''}佈陣移動不扣卡，押注張數不變。`);
    } catch { setMovement('這個位置不能放入，請點選發光的空格。'); }
  }, []);

  /* 可以拿來押的，是成長收藏裡真正擁有的那些——不是卡池六十張。 */
  useEffect(() => {
    if (!cards.length) return;
    const refresh = () => {
      const collection = readCollection();
      if (collection.storageError) setStakeError(collection.storageError);
      const totals = countByCard(collection);
      const seen = new Map<string, number>();
      const owned = collection.cards.flatMap(entry => {
        const card = cards.find(item => item.id === entry.cardId);
        if (!card) return [];
        const copy = (seen.get(entry.cardId) ?? 0) + 1;
        seen.set(entry.cardId, copy);
        return [{ id: entry.id, cardId: entry.cardId, name: card.name, thumbnail: card.thumbnail, count: totals.get(entry.cardId) ?? 1, copy }];
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
    setSeed(secureSeed()); setError(null);
  };

  const openDeckBuilder = () => {
    setDeckDraft(playerDeckIds);
    setDeckEditorOpen(true);
  };
  const toggleDeckCard = (cardId: string) => {
    setDeckDraft(current => current.includes(cardId)
      ? current.filter(id => id !== cardId)
      : current.length < BATTLEFIELD_DECK_SIZE ? [...current, cardId] : current);
  };
  const saveDeck = () => {
    const next = sanitizeDeckSelection(deckDraft, cards.map(card => card.id));
    if (next.length !== BATTLEFIELD_DECK_SIZE) return;
    try { localStorage.setItem(SAVED_DECK_KEY, JSON.stringify(next)); } catch { /* Play remains available without persistence. */ }
    setPlayerDeckIds(next);
    previousOpening.current = { player: [], opponent: [] };
    setDeckEditorOpen(false);
    setSettlement(null); setOutcome(null); setBattleStake(null); setMovement(''); setStakeCardIds([]);
    setSeed(secureSeed());
  };

  /*
    體驗戰：成長收藏空著的人免押注也能開戰。

    實測過的死路：新客戶沒有收藏卡＝押不了注＝完全開不了戰，
    只能先繞去成長中心。體驗戰把牆拆掉——不押卡、不發卡、不沒收，
    純粹讓人先打過一場、看懂相剋，再去領卡打正式戰。
    有收藏卡的人不走這條路：有東西可押的人就要押，賞罰才成立。
  */
  const isTrial = match ? !battleStake : ownedStake.length === 0;
  const formationCheck = useMemo(() => state ? canStartBattle(state) : { ready: false as const }, [state]);
  const startCheck = useMemo(() => {
    const base = formationCheck;
    if (recovering || settling) return { ready: false as const, reason: '正在核對押注紀錄…' };
    if (settlement?.saved === false) return { ready: false as const, reason: '請先保存上一場結果' };
    if (stakeError) return { ready: false as const, reason: '請先處理押注提示' };
    if (!base.ready) return base;
    // 佈陣完成之後才輪到押注：先後順序不能顛倒，
    // 不然客戶會先選好賭注、才發現主戰還沒放。
    if ((!stakeCardIds.every(id => ownedStake.some(card => card.id === id)) || stakeCardIds.length !== 5) && !isTrial) return { ready: false as const, reason: `押注要選滿五張（目前 ${stakeCardIds.length}/5）` };
    return base;
  }, [formationCheck, stakeCardIds, isTrial, recovering, settling, settlement, stakeError, ownedStake]);
  const guidance = preparationGuidance({
    ready: startCheck.ready,
    hasActive: Boolean(state?.player.active),
    formationReady: formationCheck.ready,
    checkingRecords: recovering || settling,
    recordProblem: settlement?.saved === false || Boolean(stakeError),
    trial: isTrial,
    hasSelection: Boolean(state?.selectedCardId),
  });
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
          <span>{match?.status === 'FINISHED' ? '本場結束' : match ? `第 ${match.round} 回合` : '準備出戰'}</span>
        </header>
        {error ? (
          <div role="alert" className={styles.loading}>
            <p>{error}</p>
            <button type="button" className={styles.restart} onClick={() => { setError(null); setLoadAttempt(n => n + 1); }}>重新載入卡池</button>
          </div>
        ) : !state ? <p className={styles.loading}>正在發牌…</p> : (
          <div className={styles.split} data-battle-split data-inspecting={Boolean(inspection)} data-stake-review={!match && prepareView === 'stake'}>
            <BattleArena state={state} cards={cards} match={match} onInspect={inspectCard} />
            <section className={styles.controls} aria-label="手部操控" data-battle-controls data-preparing={!match}>
              <div className={styles.controlsHeading}>
                {!match && !inspection ? <nav className={styles.prepareNav} aria-label="出戰準備">
                  <button type="button" aria-pressed={prepareView === 'formation'} onClick={() => openPreparation('formation')}>選卡佈陣</button>
                  <button type="button" aria-pressed={prepareView === 'stake'} onClick={() => openPreparation('stake')}>{isTrial ? '體驗確認' : '押注確認'}</button>
                  <button type="button" aria-pressed={prepareView === 'help'} onClick={() => openPreparation('help')}>玩法說明</button>
                </nav> : <><strong>{inspection ? '能力與相剋' : match?.status === 'FINISHED' ? '對戰結果' : '選擇本回合動作'}</strong>
                  <span>{inspection ? '查看不消耗回合' : '戰況同步顯示'}</span></>}
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
                    <div hidden={prepareView !== 'formation'}>
                      <DeckBuilder cards={cards} selectedIds={deckDraft} open={deckEditorOpen}
                        onOpen={openDeckBuilder} onToggle={toggleDeckCard}
                        onCancel={() => { setDeckDraft(playerDeckIds); setDeckEditorOpen(false); }} onSave={saveDeck} />
                      <PreparationControls state={state} cards={cards} onSelect={handleSelect} onDestination={handleDestination} onInspect={inspectCard} />
                      {movement && <p role="status" className={styles.notice} data-card-move>{movement}</p>}
                    </div>
                    <section hidden={prepareView !== 'stake'} className={styles.confirmation} data-preparation-progress tabIndex={-1} aria-label="開戰前確認">
                      <h2>{isTrial ? '體驗戰確認' : '選五張押注卡'}</h2>
                      {!state.player.active && <p className={styles.notice}>建議先到「選卡佈陣」放好主戰，再決定本場押注。</p>}
                      <StakeSlot owned={ownedStake} selected={stakeCardIds} trial={isTrial} locked={settling || settlement?.saved === false}
                        steps={[]}
                        onSelect={cardId => { if (settling || settlement?.saved === false) return; setStakeCardIds(current => nextStakeSelection(current, cardId)); }} />
                    </section>
                    <section hidden={prepareView !== 'help'} className={styles.help} aria-label="卡片戰鬥玩法說明">
                      <h2>先選卡，再出戰</h2>
                      <ol>
                        <li><strong>點一次就完成佈陣</strong><p>第一張直接成為主戰，接著依序補入後備，不必重複點擊。</p></li>
                        <li><strong>陣容滿了再精準換位</strong><p>點已上場的卡即可選位置調整；查看能力不會出招。</p></li>
                        <li><strong>選滿五張才開戰</strong><p>{isTrial ? '本場免押注，不發卡、不沒收。' : '贏了五張原卡保留、再送一張；輸了扣除實際押入的五張。'}</p></li>
                        <li><strong>每回合選一個動作</strong><p>普通攻擊、技能，或換上後備。按「說明」查看技能內容；它不會消耗回合。</p></li>
                      </ol>
                      <button type="button" className={styles.restart} onClick={() => reviewStep(guidance.currentStep)}>回到目前步驟</button>
                      <details className={styles.details}><summary>重新準備</summary>
                        <p>重新發牌會清除本場佈陣與押注選擇，不會扣除收藏。</p>
                        <button type="button" className={styles.restart} disabled={settling || settlement?.saved === false} onClick={redeal}>重新發牌</button>
                      </details>
                    </section>
                  </>
                )}
                </div>
              </div>
              {!match && !inspection ? (
                <div className={styles.footer}>
                  <BattleStartGuide
                    currentStep={guidance.currentStep}
                    actionLabels={guidance.actionLabels}
                    onReviewStep={reviewStep}
                    checkingRecords={recovering || settling}
                    status={isTrial
                      ? `你 ${placed} 隻・對手 ${opponentPlaced} 隻・體驗戰`
                      : `你 ${placed} 隻・對手 ${opponentPlaced} 隻・押注 ${stakeCardIds.length} 張`
                    }
                    canStart={startCheck.ready}
                    startButtonText={isTrial ? '開始體驗戰' : `確認開戰`}
                    onStart={() => void start()}
                    blockReason={!startCheck.ready && 'reason' in startCheck ? startCheck.reason : undefined}
                    riskNotice={state.player.active ? `${placed < opponentPlaced ? `你 ${placed} 隻、對手 ${opponentPlaced} 隻，可補後備。` : ''}${!isTrial && stakeCardIds.length ? `本場已押 ${stakeCardIds.length}/5 張${selectedStakeCards.length ? `：${selectedStakeCards.map(card => card.name).join('、')}` : ''}。輸了會扣除這五張。` : ''}` : undefined}
                  />
                </div>
              ) : match?.status === 'FINISHED' && !inspection ? (
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
