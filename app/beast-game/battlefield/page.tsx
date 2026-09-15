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
  selectCard,
  type BattleState,
  type Destination,
} from '@/lib/beast-game/battlefield';
import BattlePanel from '@/components/battlefield/BattlePanel';
import { canStartBattle, fieldTeam } from '@/lib/beast-game/battle-bridge';
import type { Action, Match } from '@/lib/beast-game/interactive';
import type { BattleView } from '@/lib/beast-game/battle-view';
import StakeSlot, { type StakeCard } from '@/components/battlefield/StakeSlot';
import { readCollection, runOwnedStakesDuel, countByCard, subscribeCollection, retryStakeSettlement, recoverPendingDuel, type Settlement } from '@/lib/beast-collection';
import type { StakeOutcome } from '@/lib/beast-collection-ledger';
import { namedStakeOutcome } from '@/lib/beast-stake-presentation';
import BeastStakeResult from '@/components/BeastStakeResult';
import BeastBattleVoice from '@/components/BeastBattleVoice';
import StarterPackAfterBattle from '@/components/StarterPackAfterBattle';
import DeckBuilder from '@/components/battlefield/DeckBuilder';
import { BATTLEFIELD_DECK_SIZE, sanitizeDeckSelection } from '@/lib/beast-game/deck-builder';
import { useCombatPlayback } from '@/components/battlefield/useCombatPlayback';
import BattlePace from '@/components/battlefield/BattlePace';
import { GuideBookProvider, useFetchedGuideBook } from '@/components/battlefield/GuideBookContext';
import { MAX_REWARD_CARDS, MAX_STAKE_CARDS } from '@/lib/beast-game/stake-rules';

/** 一副牌的張數。六十張是卡池，不是一副牌全部上桌。 */
const SAVED_DECK_KEY = 'taiji-beast-battlefield-deck-v1';


type BattleReply = { ok: true; match: Match; token: string; legal: Action[]; view: BattleView; notice: string | null; outcome?: StakeOutcome; action?: Action };
type DealReply = { ok: true; table: BattleState; deckIds: string[]; opening: { player: string[]; opponent: string[] }; tableToken: string };

/**
 * 困難戰場的運算全部在後端 /api/beast-game/battlefield（2026-09-15 業主定調：前端只負責顯示易經）。
 * 這裡只送出佈陣與出招，拿回結果顯示；不自己算勝負、易經判斷或押注。
 */
async function callBattle<T = BattleReply>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/beast-game/battlefield', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => null) as ({ ok: true } | { ok: false; error?: string } | null);
  if (!res.ok || !data || !data.ok) throw new Error((data && !data.ok && data.error) || '戰場暫時無法連線，押注卡未扣除。');
  return data as T;
}

/** 重新發牌的請求編號（不是亂數種子——洗牌發牌的亂數都在後端）。 */
function secureSeed(): number {
  const values = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(values);
  return values[0] || (Date.now() >>> 0) || 1;
}

function BattlefieldScreen() {
  const [cards, setCards] = useState<BattlefieldCardArt[]>([]);
  const [state, setState] = useState<BattleState | null>(null);
  /** 開戰之後的戰鬥狀態。null＝還在佈陣。 */
  const [match, setMatch] = useState<Match | null>(null);
  /** 後端簽名的戰局票：每一招都帶著它請後端運算。 */
  const battleToken = useRef<string | null>(null);
  /** 後端簽名的牌桌票：開戰時證明陣容來自這一桌發的牌、易經陣容是後端排的。 */
  const tableToken = useRef<string | null>(null);
  /** 後端送來的可出招清單與首領提示——前端不自己判斷。 */
  const [legal, setLegal] = useState<Action[]>([]);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [battleView, setBattleView] = useState<BattleView | null>(null);
  const { playing, begin: beginPlayback, play: playRound, reset: resetPlayback } = useCombatPlayback();
  // 懶人玩法：開戰就自動一路連擊到結束（2026-09-15）；原本困難模式每一回合都要手動按。
  const [automatic, setAutomatic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(secureSeed);
  const [playerDeckIds, setPlayerDeckIds] = useState<string[]>([]);
  const [deckDraft, setDeckDraft] = useState<string[]>([]);
  const [deckEditorOpen, setDeckEditorOpen] = useState(false);
  const replayPreferences = useRef<{ active: string | null; bench: Array<string | null>; stakes: string[] } | null>(null);
  const previousOpening = useRef<{ player: string[]; opponent: string[] }>({ player: [], opponent: [] });
  /** 正式戰押 1～20 張收藏紀錄；每個 id 都是可追溯的實際卡片副本。 */
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
        // 牌組不齊就交給後端發牌時組一副（前端不自己洗牌）。
        const initialDeck = restored.length === BATTLEFIELD_DECK_SIZE ? restored : [];
        setCards(loadedCards);
        setPlayerDeckIds(initialDeck);
        setDeckDraft(initialDeck);
      })
      .catch(() => { if (!disposed) setError('卡池暫時無法載入，請點下方按鈕再試一次。收藏不受影響。'); })
      .finally(() => clearTimeout(timer));
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [loadAttempt]);

  // 卡池到齊才開桌。洗牌、發牌、易經自動佈陣都在後端（2026-09-15 後端化第三階段）；換請求編號（seed）就是重開一局。
  const playerDeckRef = useRef(playerDeckIds);
  playerDeckRef.current = playerDeckIds;
  useEffect(() => {
    if (!cards.length) return;
    let disposed = false;
    void callBattle<DealReply>({ type: 'DEAL', playerDeckIds: playerDeckRef.current, previousOpening: previousOpening.current })
      .then((dealt) => {
        if (disposed) return;
        tableToken.current = dealt.tableToken;
        if (dealt.deckIds.join(',') !== playerDeckRef.current.join(',')) { setPlayerDeckIds(dealt.deckIds); setDeckDraft(dealt.deckIds); }
        previousOpening.current = { player: dealt.opening.player, opponent: dealt.opening.opponent };
        let prepared = dealt.table;
        const preference = replayPreferences.current;
        replayPreferences.current = null;
        const available = readCollection();
        const retainedStakes = available.storageError ? [] : (preference?.stakes ?? []).filter(id => available.cards.some(card => card.id === id));
        let retained = 0;
        if (preference) {
          // Reuse only cards actually dealt; keep the original draw probabilities.
          if (preference.active && prepared.player.hand.includes(preference.active)) {
            prepared = moveCard(prepared, 'PLAYER', preference.active, { zone: 'ACTIVE' });
            retained++;
          }
          preference.bench.forEach((id, slotIndex) => {
            if (id && prepared.player.hand.includes(id)) {
              prepared = moveCard(prepared, 'PLAYER', id, { zone: 'BENCH', slotIndex });
              retained++;
            }
          });
          setMovement(`已沿用本次抽到的 ${retained} 張陣容；其餘請補選。押卡偏好保留 ${retainedStakes.length}/${MAX_STAKE_CARDS} 張，請重新確認。`);
          if (available.storageError) setStakeError(available.storageError);
        }
        setState(prepared);
        setMatch(null);
        battleToken.current = null; setLegal([]); setLiveNotice(null); setBattleView(null);
        setStakeCardIds(retainedStakes);
        setInspection(null);
        setGuideRequest(null);
        setPrepareView('formation');
      })
      .catch((cause) => { if (!disposed) setError(cause instanceof Error ? cause.message : '發牌暫時無法連線，請點下方按鈕再試一次。'); });
    return () => { disposed = true; };
  }, [cards, seed]);

  /** 從目前的佈陣開戰。種子固定，同一局可重播。 */
  const start = useCallback(async () => {
    if (!state || starting.current || recovering || settlement?.saved === false) return;
    starting.current = true;
    setStakeError('');
    try {
      if (ownedStake.length && (stakeCardIds.length < 1 || stakeCardIds.length > MAX_STAKE_CARDS)) throw new Error(`正式戰必須選 1～${MAX_STAKE_CARDS} 張押注卡。`);
      const representative = ownedStake.find(card => card.id === stakeCardIds[0]);
      // 開戰交給後端：種子、難度（押注戰＝困難首領、體驗戰＝簡單）、易經判斷都由後端決定。
      const opened = await callBattle({ type: 'START', tableToken: tableToken.current, playerTeam: fieldTeam(state, 'PLAYER'), opponentTeam: fieldTeam(state, 'OPPONENT'), stakeCardId: stakeCardIds.length ? representative?.cardId ?? null : null, stakeCount: stakeCardIds.length });
      battleToken.current = opened.token; setLegal(opened.legal); setLiveNotice(opened.notice); setBattleView(opened.view);
      const next = opened.match;
      setOutcome(null); setSettlement(null); setBattleStake(representative?.cardId || null);
      setBattleVoiceId(crypto.randomUUID());
      setInspection(null);
      setAutomatic(true);
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
  }, [state, stakeCardIds, ownedStake, recovering, settlement]);

  /** 套用後端回傳：戰局、票、可出招清單、首領提示；押注戰打完連戰果一起交給收藏帳本。 */
  const applyReply = useCallback((reply: BattleReply) => {
    battleToken.current = reply.token; setLegal(reply.legal); setLiveNotice(reply.notice); setBattleView(reply.view);
    setMatch(reply.match); playRound(reply.match);
    controlScroll.current?.scrollTo({ top: 0 });
    if (reply.outcome && pendingBattle.current) {
      const pending = pendingBattle.current;
      pendingBattle.current = null;
      setOutcome(reply.outcome);
      pending.resolve({ ok: true, stake: reply.outcome });
    }
  }, [playRound]);

  const step = useCallback(async (body: Record<string, unknown>) => {
    if (!match || match.status !== 'PLAYING' || !battleToken.current || !beginPlayback()) return;
    try { applyReply(await callBattle({ ...body, token: battleToken.current })); }
    catch (cause) { resetPlayback(); setAutomatic(false); setStakeError(cause instanceof Error ? cause.message : '戰場暫時無法連線，請再按一次。'); }
  }, [match, beginPlayback, resetPlayback, applyReply]);

  /**
   * 出招：只把「玩家要出哪一招」送給後端；易經怎麼回、誰贏，全部後端算。
   * **畫面不是裁判**。
   */
  const act = useCallback((action: Action) => { void step({ type: 'ACTION', action }); }, [step]);
  /** 自動連擊：請後端依基礎規則替玩家決定下一招。 */
  const autoStep = useCallback(() => { void step({ type: 'AUTO' }); }, [step]);

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
  // 戰果（勝負、易經技術判斷、獎勵張數）改由後端在最後一招一併算好送回（applyReply），這裡不再計算。

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
    replayPreferences.current = match?.status === 'FINISHED' && state ? { active: state.player.active, bench: [...state.player.bench], stakes: [...stakeCardIds] } : null;
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
    if ((!stakeCardIds.every(id => ownedStake.some(card => card.id === id)) || stakeCardIds.length < 1 || stakeCardIds.length > MAX_STAKE_CARDS) && !isTrial) return { ready: false as const, reason: `押注要選 1～${MAX_STAKE_CARDS} 張（目前 ${stakeCardIds.length}/${MAX_STAKE_CARDS}）` };
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
          {match?.status === 'PLAYING' || settling || settlement?.saved === false ? <span>對戰中</span> : <Link href="/">回首頁</Link>}
          <h1>五卡押注戰場</h1>
          <span>{match?.status === 'FINISHED' && !playing ? '本場結束' : match ? `第 ${match.round} 回合` : '準備出戰'}</span>
        </header>
        {error ? (
          <div role="alert" className={styles.loading}>
            <p>{error}</p>
            <button type="button" className={styles.restart} onClick={() => { setError(null); setLoadAttempt(n => n + 1); }}>重新載入卡池</button>
          </div>
        ) : !state ? <p className={styles.loading}>正在發牌…</p> : (
          <div className={styles.split} data-battle-split data-inspecting={Boolean(inspection)} data-preparing={!match} data-stake-review={!match && prepareView === 'stake'}>
            <BattleArena state={state} cards={cards} match={match} view={battleView} onInspect={inspectCard} playing={playing}
              onAttack={match?.status === 'PLAYING' && !playing ? (() => { const a = legal.find(x => x.type === 'ATTACK'); return a ? () => act(a) : null; })() : null}
              onSwap={match?.status === 'PLAYING' && !playing ? (action) => act(action) : null}
              onSkill={match?.status === 'PLAYING' && !playing ? (action) => act(action) : null} />
            <section className={styles.controls} aria-label="手部操控" data-battle-controls data-preparing={!match}>
              <div className={styles.controlsHeading}>
                {!match && !inspection ? <nav className={styles.prepareNav} aria-label="出戰準備">
                  <button type="button" aria-pressed={prepareView === 'formation'} onClick={() => openPreparation('formation')}>選卡佈陣</button>
                  <button type="button" aria-pressed={prepareView === 'stake'} onClick={() => openPreparation('stake')}>{isTrial ? '體驗確認' : '押注確認'}</button>
                  <button type="button" aria-pressed={prepareView === 'help'} onClick={() => openPreparation('help')}>玩法說明</button>
                </nav> : <><strong>{inspection ? '能力與相剋' : playing ? '動作演出中' : match?.status === 'FINISHED' ? '對戰結果' : automatic ? '自動連擊中' : '選擇本回合動作'}</strong>
                  <span>{inspection ? '查看不消耗回合' : '戰況同步顯示'}</span></>}
              </div>
              <div className={styles.controlScroll} ref={controlScroll} key={match ? 'battle' : 'prepare'} data-control-scroll>
                {inspection && <BattleCardGuide key={`${inspection.side}-${inspection.cardId}`} cardId={inspection.cardId}
                  live={Boolean(match?.[inspection.side].team.some(fighter => fighter.cardId === inspection.cardId))}
                  liveGuide={battleView?.guides[inspection.side][inspection.cardId] ?? null}
                  enemyGuide={match && battleView ? (() => { const otherSide = inspection.side === 'player' ? 'opponent' : 'player'; const other = match[otherSide]; return battleView.guides[otherSide][other.team[other.active].cardId] ?? null; })() : null}
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
                {outcome && !playing && <BeastStakeResult outcome={namedStakeOutcome(outcome, id => cards.find(card => card.id === id)?.name ?? '神獸卡')}
                  card={cards.find(card => card.id === (outcome.gainedCardId ?? outcome.forfeitedCardId ?? outcome.stakes.player))}
                  cards={cards} settlement={settlement} isReplay={false} retrying={settling} onRetry={() => void retrySettlement()} />}
                {match ? (
                  <>
                    {/* 首領預告放在操作區最上方：收在戰報裡客戶看不到，就不算預告。文字由後端 bossNotice 產生送來。 */}
                    {liveNotice && <p role="status" aria-live="polite" className={`${styles.notice} ${styles.bossLive}`} data-boss-live>🐉 {liveNotice}</p>}
                    <BattlePace match={match} automatic={automatic} blocked={playing || Boolean(inspection)} canAct={legal.length > 0} onAutomatic={setAutomatic} onAuto={autoStep} />
                    <BattlePanel match={match} view={battleView} onAction={act} busy={playing} compact cards={cards} />
                    {match.status === 'PLAYING' && <p className={styles.notice} data-battle-stake>{battleStake
                      ? `💎 押注：${cards.find(card => card.id === battleStake)?.name}`
                      : '🎮 體驗戰'}</p>}
                    {match.status === 'PLAYING' && <details className={styles.details}><summary>離開本場</summary><p>回首頁會中斷本局，押卡不扣除。</p><Link href="/">回首頁</Link></details>}
                    {match.status === 'FINISHED' && !playing && isTrial && (
                      <p role="status" className={styles.notice} data-battle-result={match.winner}>體驗戰結束：押注 0 張・贏得 0 張・輸掉 0 張。</p>
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
                      <h2>{isTrial ? '體驗戰確認' : `選押注卡・1～${MAX_STAKE_CARDS} 張`}</h2>
                      {!isTrial && <p className={styles.notice} data-boss-notice>困難：易經是首領，會先在戰報預告，再用寶珠封印、合體破壞、背水模式；雙方數值相同。</p>}
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
                        <li><strong>押 1～{MAX_STAKE_CARDS} 張就能開戰</strong><p>{isTrial ? '本場免押注，不發卡、不沒收。' : `輸少贏多：贏了押注卡全保留，至少再得同樣張數，打得越漂亮越多，最多 ${MAX_REWARD_CARDS} 張；輸了只扣本場押注。`}</p></li>
                        <li><strong>開戰後自動一路連擊</strong><p>自動替你出手直到分出勝負；想自己選攻擊、技能或換卡，就按「暫停」。</p></li>
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
                    riskNotice={state.player.active ? `${placed < opponentPlaced ? `你 ${placed} 隻、對手 ${opponentPlaced} 隻，可補後備。` : ''}${!isTrial && stakeCardIds.length ? `本場押 ${stakeCardIds.length} 張：輸了只失去這 ${stakeCardIds.length} 張；贏了至少再得 ${stakeCardIds.length} 張，最多 ${MAX_REWARD_CARDS} 張。` : ''}` : undefined}
                  />
                </div>
              ) : match?.status === 'FINISHED' && !playing && !inspection ? (
                <div className={styles.footer}>
                  {(isTrial || settlement?.saved) && <StarterPackAfterBattle completed="battlefield" />}
                  <button type="button" className={styles.restart} disabled={settling || settlement?.saved === false} onClick={redeal}>{settling ? '正在保存卡片結算…' : settlement?.saved === false ? '請先重試保存結果' : '沿用可用選擇，再打一場'}</button>
                  {!settling && settlement?.saved !== false && <Link href="/" className={styles.homeLink}>回首頁</Link>}
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

/** 相剋戰力手冊由後端算好；外層載入一次，交給所有戰鬥元件照印。 */
export default function BattlefieldPage() {
  const guideBook = useFetchedGuideBook();
  return <GuideBookProvider value={guideBook}><BattlefieldScreen /></GuideBookProvider>;
}
