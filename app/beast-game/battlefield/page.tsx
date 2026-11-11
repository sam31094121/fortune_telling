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
import BattleArena from '@/components/battlefield/BattleArena';
import BattleCardGuide from '@/components/battlefield/BattleCardGuide';
import BattleStartGuide from '@/components/battlefield/BattleStartGuide';
import { nextStakeSelection, preparationGuidance, type PreparationStep } from '@/components/battlefield/preparation-guidance';
import type { BeastElement } from '@/lib/beast-game/elements';
import styles from '@/components/battlefield/BattleScreen.module.css';
import {
  moveCard,
  type BattleState,
} from '@/lib/beast-game/battlefield';
import BattlePanel from '@/components/battlefield/BattlePanel';
import BattleDock from '@/components/battlefield/BattleDock';
import { canStartBattle, fieldTeam } from '@/lib/beast-game/battle-bridge';
import type { Action, Match } from '@/lib/beast-game/interactive';
import type { BattleView } from '@/lib/beast-game/battle-view';
import StakeSlot, { type StakeCard } from '@/components/battlefield/StakeSlot';
import { readCollection, runOwnedStakesDuel, countByCard, subscribeCollection, retryStakeSettlement, recoverPendingDuel, resumeOwnedStakesDuel, releaseLiveBattle, saveLiveBattle, updateLiveBattleToken, BATTLE_HELD, type LiveBattle, type Settlement } from '@/lib/beast-collection';
import type { StakeOutcome } from '@/lib/beast-collection-ledger';
import { namedStakeOutcome } from '@/lib/beast-stake-presentation';
import BeastStakeResult from '@/components/BeastStakeResult';
import BeastBattleVoice from '@/components/BeastBattleVoice';
import StarterPackAfterBattle from '@/components/StarterPackAfterBattle';
import FreeBattleShards from '@/components/battlefield/FreeBattleShards';
import type { BattleReward } from '@/lib/beast-game/battle-reward';
import OwnedCampaignPreparation from '@/components/battlefield/OwnedCampaignPreparation';
import OwnedCardCultivation from '@/components/battlefield/OwnedCardCultivation';
import { readOwnedCardCampaignProgress } from '@/lib/beast-collection';
import { useCombatPlayback } from '@/components/battlefield/useCombatPlayback';
import BattlePace from '@/components/battlefield/BattlePace';
import { GuideBookProvider, useFetchedGuideBook } from '@/components/battlefield/GuideBookContext';
import { MAX_REWARD_CARDS, MAX_STAKE_CARDS } from '@/lib/beast-game/stake-rules';

/** 一副牌的張數。六十張是卡池，不是一副牌全部上桌。 */


type CampaignReply = { campaign?: { wins: number; stage: number }; campaignToken?: string };
type BattleReply = CampaignReply & { ok: true; match: Match; token: string; legal: Action[]; view: BattleView; notice: string | null; outcome?: StakeOutcome; action?: Action; reward?: BattleReward | null };
type DealReply = CampaignReply & { ok: true; table: BattleState; deckIds: string[]; opening: { player: string[]; opponent: string[] }; tableToken: string };

/**
 * 困難戰場的運算全部在後端 /api/beast-game/battlefield（2026-09-15 業主定調：前端只負責顯示易經）。
 * 這裡只送出佈陣與出招，拿回結果顯示；不自己算勝負、易經判斷或押注。
 */
/** 2026-10-17 beast card：發牌失敗時給客人看的固定說明（不顯示程式錯誤原文）。 */
const DEAL_RETRY_MESSAGE = '發牌暫時沒有完成，請點下方「重新載入卡池」再試一次。押注卡與收藏不受影響。';

async function callBattle<T = BattleReply>(body: Record<string, unknown>, timeoutMs = 30000): Promise<T> {
  const res = await fetch('/api/beast-game/battlefield', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
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
  const dealCampaignToken = useRef<string | null>(null);
  /** 後端送來的可出招清單與首領提示——前端不自己判斷。 */
  const [legal, setLegal] = useState<Action[]>([]);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [battleView, setBattleView] = useState<BattleView | null>(null);
  const { playing, begin: beginPlayback, play: playRound, reset: resetPlayback } = useCombatPlayback();
  // 懶人玩法：開戰就自動一路連擊到結束（2026-09-15）；原本困難模式每一回合都要手動按。
  const [automatic, setAutomatic] = useState(false);
  const [battleHelp, setBattleHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(secureSeed);
  const [teamCopies, setTeamCopies] = useState<string[]>([]);
  const confirmedTeam = useRef<Array<{id:string;cardId:string}> | null>(null);
  const [teamReady, setTeamReady] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [campaignStage, setCampaignStage] = useState<number | null>(null);
  const [cultivationOpen, setCultivationOpen] = useState(false);
  /** 正式戰押 1～20 張收藏紀錄；每個 id 都是可追溯的實際卡片副本。 */
  const [stakeCardIds, setStakeCardIds] = useState<string[]>([]);
  const [ownedStake, setOwnedStake] = useState<StakeCard[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [outcome, setOutcome] = useState<StakeOutcome | null>(null);
  /** 後端算好、重播驗證過的戰績獎勵（戰利碎片）；進行中一律 null，不提前揭曉。 */
  const [reward, setReward] = useState<BattleReward | null>(null);
  const settlementProgress = useRef<{campaignToken:string;wins:number} | undefined>(undefined);
  const [battleStake, setBattleStake] = useState<string | null>(null);
  const [battleVoiceId, setBattleVoiceId] = useState('');
  const [settling, setSettling] = useState(false);
  const [stakeError, setStakeError] = useState('');
  const [movement, setMovement] = useState('');
  const [recovering, setRecovering] = useState(true);
  const alive = useRef(true);
  const starting = useRef(false);
  const pendingBattle = useRef<{ resolve: (value: CampaignReply & { ok: true; stake: StakeOutcome }) => void; reject: (reason: Error) => void } | null>(null);
  /** 押注戰進行中的 matchId：每招回來把最新戰局票存起來，重新整理才能接續。 */
  const liveMatchId = useRef<string | null>(null);
  /** 已接續上一場：之後到的發牌結果不可蓋掉戰局。 */
  const resumedBattle = useRef(false);
  const [resumeNotice, setResumeNotice] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [inspection, setInspection] = useState<{ cardId: string; side: 'player' | 'opponent' } | null>(null);
  const controlScroll = useRef<HTMLDivElement>(null);
  // Refs for stable callbacks — always holds the latest value without adding to deps arrays
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
        if (recovered.liveBattle) { void resumeLive(recovered.liveBattle); return; }
        if (recovered.result?.stake) setOutcome(recovered.result.stake);
        if (recovered.settlement) setSettlement(recovered.settlement);
        if (recovered.interrupted) setMovement('上一場已中斷，押注卡未扣除。請重新選卡。');
      }).catch(cause => { if (alive.current) setStakeError(cause instanceof Error ? cause.message : '暫時無法讀取押注紀錄。'); })
        .finally(() => { if (alive.current) setRecovering(false); });
    }, 0);
    return () => {
      alive.current = false; clearTimeout(timer);
      // 押注戰進行中離開頁面：押注卡繼續押著，回到戰場接續原戰局（不能靠離開來逃避輸的結算）。
      const held = Object.assign(new Error('本場保留中，回到戰場即可接續。'), { name: BATTLE_HELD });
      pendingBattle.current?.reject(liveMatchId.current ? held : new Error('本場中斷，押注卡未扣除。'));
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
        setCards(loadedCards);
      })
      .catch(() => { if (!disposed) setError('卡池暫時無法載入，請點下方按鈕再試一次。收藏不受影響。'); })
      .finally(() => clearTimeout(timer));
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [loadAttempt]);

  // The signed campaign owns progress and the opponent; paid play uses explicit owned copies.
  useEffect(() => {
    if (!cards.length || recovering || resumedBattle.current || readCollection().pending) return;
    let disposed = false;
    setDealing(true);
    void (async () => {
      const progress = await readOwnedCardCampaignProgress();
      const collection = progress.collection;
      const entries = confirmedTeam.current;
      if (entries && !entries.every(e => collection.cards.some(c => c.id === e.id && c.cardId === e.cardId))) {
        confirmedTeam.current = null; setTeamReady(false); setTeamCopies([]);
        throw new Error('上陣副本已變更，請重新選五張。');
      }
      const dealt = await callBattle<DealReply>({type:'DEAL',campaign:true,campaignToken:progress.campaignToken,...(entries ? {selectedEntries:entries} : {})});
      if (disposed || resumedBattle.current) return;
      tableToken.current = dealt.tableToken;
      dealCampaignToken.current = dealt.campaignToken ?? null;
      setCampaignStage(dealt.campaign?.stage ?? null);
      let prepared = dealt.table;
      const order = entries?.map(e => e.cardId) ?? dealt.opening.player;
      order.forEach((id,index) => { prepared = moveCard(prepared,'PLAYER',id,index === 0 ? {zone:'ACTIVE'} : {zone:'BENCH',slotIndex:index-1}); });
      setState(prepared); setMatch(null); battleToken.current = null;
      setLegal([]); setLiveNotice(null); setBattleView(null); setInspection(null);
      setTeamReady(Boolean(entries) || collection.cards.length === 0);
      setPrepareView(entries ? 'stake' : 'formation'); setError(null);
    })().catch(cause => { if(!disposed) setError(cause instanceof Error ? cause.message : DEAL_RETRY_MESSAGE); })
      .finally(() => { if(!disposed) setDealing(false); });
    return () => { disposed = true; };
  }, [cards, seed, recovering]);

  const confirmTeam = () => {
    const collection = readCollection();
    const entries = teamCopies.map(id => collection.cards.find(c => c.id === id));
    if(entries.length !== 5 || entries.some(e => !e) || new Set(entries.map(e => e?.cardId)).size !== 5) { setStakeError('請選五種仍在收藏的神獸。'); return; }
    confirmedTeam.current = entries.map(e => ({id:e!.id,cardId:e!.cardId}));
    setTeamReady(false); setStakeError(''); setSeed(secureSeed());
  };

  /** 從目前的佈陣開戰。種子固定，同一局可重播。 */
  const start = useCallback(async () => {
    if (!state || starting.current || recovering || dealing || !teamReady || settlement?.saved === false) return;
    starting.current = true;
    setStakeError('');
    try {
      const currentCollection = readCollection();
      if (currentCollection.storageError) throw new Error(currentCollection.storageError);
      if (currentCollection.cardCampaign?.token !== dealCampaignToken.current) {
        setTeamReady(false); setSeed(secureSeed());
        throw new Error('收藏或關卡已更新，正在重新準備；請再次確認本場押注。');
      }
      if (confirmedTeam.current && !confirmedTeam.current.every(e => currentCollection.cards.some(c => c.id === e.id && c.cardId === e.cardId))) throw new Error('上陣卡片已變更，請重新選隊。');
      if (ownedStake.length && (stakeCardIds.length < 1 || stakeCardIds.length > MAX_STAKE_CARDS)) throw new Error(`正式戰必須選 1～${MAX_STAKE_CARDS} 張押注卡。`);
      const representative = ownedStake.find(card => card.id === stakeCardIds[0]);
      const expectedCampaignToken = dealCampaignToken.current!;
      // 開戰交給後端：種子、難度（押注戰＝困難首領、體驗戰＝簡單）、易經判斷都由後端決定。
      const opened = await callBattle({ type: 'START', tableToken: tableToken.current, playerTeam: fieldTeam(state, 'PLAYER'), opponentTeam: fieldTeam(state, 'OPPONENT'), stakeCardId: stakeCardIds.length ? representative?.cardId ?? null : null, stakeCount: stakeCardIds.length });
      battleToken.current = opened.token; setLegal(opened.legal); setLiveNotice(opened.notice); setBattleView(opened.view); setReward(null);
      const next = opened.match;
      setOutcome(null); setSettlement(null); setBattleStake(representative?.cardId || null);
      setBattleVoiceId(crypto.randomUUID());
      setInspection(null);
      setAutomatic(false); // 2026-10-17 業主：開戰預設手動，客戶按「自動」才自動連擊
      if (!stakeCardIds.length) { setMatch(next); return; }
      setSettling(true);
      // Reserve the actual copy before combat. The shared transaction settles once or releases on interruption.
      const completed = await runOwnedStakesDuel(stakeCardIds, entries => new Promise<CampaignReply & { ok: true; stake: StakeOutcome }>((resolve, reject) => {
        if (!alive.current) { reject(new Error('本場中斷，押注卡未扣除。')); return; }
        const matchId = readCollection().pending?.id ?? null;
        if (matchId) {
          try { saveLiveBattle({ matchId, token: opened.token, startedAt: Date.now(), campaignToken:opened.campaignToken, campaignWins:opened.campaign?.wins, stakeCardId: representative?.cardId ?? null, table: state }); liveMatchId.current = matchId; }
          catch (cause) { reject(cause instanceof Error ? cause : new Error('戰局尚未保存，沒有開始戰鬥。')); return; }
        }
        pendingBattle.current = {
          resolve: result => resolve({ ok: true, campaign:result.campaign, campaignToken:result.campaignToken, stake: {
            ...result.stake,
            selectedEntries: entries,
            forfeitedEntryIds: result.stake.verdict === 'LOST' ? entries.map(entry => entry.id) : [],
          } }),
          reject,
        };
        setMatch(next);
      }), expectedCampaignToken);
      liveMatchId.current = null;
      if (alive.current && completed.result.stake) { setOutcome(completed.result.stake); setSettlement(completed.settlement); }
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === BATTLE_HELD)) liveMatchId.current = null;
      if (alive.current) setStakeError(cause instanceof Error ? cause.message : '還不能開戰，押注卡未扣除。');
    } finally { starting.current = false; if (alive.current) setSettling(false); }
  }, [state, stakeCardIds, ownedStake, recovering, settlement, dealing, teamReady]);

  /**
   * 重新整理後接續上一場（2026-10-19 業主定調）：同一張押注保留、同一場戰局，不重押、不先退回。
   * 票過期或驗章失敗才照舊退回押注卡；連不上就先保留，重新整理再試。
   */
  const resumeLive = useCallback(async (live: LiveBattle) => {
    let reply: BattleReply;
    try {
      const res = await fetch('/api/beast-game/battlefield', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'RESUME', token: live.token }), signal: AbortSignal.timeout(20000) });
      const data = await res.json().catch(() => null) as (BattleReply | { ok: false; error?: string } | null);
      if (res.status === 410 || res.status === 400) {
        await releaseLiveBattle(live.matchId);
        if (alive.current) setMovement('上一場已中斷，押注卡未扣除。請重新選卡。');
        return;
      }
      if (!res.ok || !data || !data.ok) throw new Error('fetch');
      reply = data;
    } catch {
      if (alive.current) setStakeError('暫時連不上戰場，上一場仍保留；請稍後重新整理接續。');
      return;
    } finally { if (alive.current) setRecovering(false); }
    if (!alive.current) return;
    resumedBattle.current = true;
    liveMatchId.current = live.matchId;
    if (live.table && typeof live.table === 'object') setState(live.table as BattleState);
    battleToken.current = reply.token; setLegal(reply.legal); setLiveNotice(reply.notice); setBattleView(reply.view); setReward(reply.reward ?? null);
    if (reply.outcome && reply.campaignToken && reply.campaign) settlementProgress.current = {campaignToken:reply.campaignToken,wins:reply.campaign.wins};
    setOutcome(null); setSettlement(null); setBattleStake(live.stakeCardId); setBattleVoiceId(crypto.randomUUID());
    setAutomatic(false); setInspection(null);
    setResumeNotice(`已接續上一場・第 ${reply.match.round} 回合・押注卡仍押著`);
    setSettling(true);
    try {
      const completed = await resumeOwnedStakesDuel(live.matchId, entries => new Promise<CampaignReply & { ok: true; stake: StakeOutcome }>((resolve, reject) => {
        if (!alive.current) { reject(Object.assign(new Error('本場保留中'), {name:BATTLE_HELD})); return; }
        setMatch(reply.match);
        const wrap = (stake: StakeOutcome, progress: CampaignReply) => resolve({ ok: true, campaign:progress.campaign,campaignToken:progress.campaignToken, stake: { ...stake, selectedEntries: entries, forfeitedEntryIds: stake.verdict === 'LOST' ? entries.map(entry => entry.id) : [] } });
        if (reply.outcome) { wrap(reply.outcome,reply); return; }
        pendingBattle.current = { resolve: result => wrap(result.stake,result), reject };
      }));
      liveMatchId.current = null;
      if (alive.current && completed.result.stake) { setOutcome(completed.result.stake); setSettlement(completed.settlement); }
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === BATTLE_HELD)) liveMatchId.current = null;
      if (alive.current) setStakeError(cause instanceof Error ? cause.message : '上一場暫時無法接續，押注卡仍保留。');
    } finally { if (alive.current) setSettling(false); }
  }, []);

  /** 套用後端回傳：戰局、票、可出招清單、首領提示；押注戰打完連戰果一起交給收藏帳本。 */
  const applyReply = useCallback((reply: BattleReply) => {
    if (reply.outcome && reply.campaignToken && reply.campaign) settlementProgress.current = {campaignToken:reply.campaignToken,wins:reply.campaign.wins};
    if (liveMatchId.current) updateLiveBattleToken(liveMatchId.current, reply.token);
    battleToken.current = reply.token; setLegal(reply.legal); setLiveNotice(reply.notice); setBattleView(reply.view); setReward(reply.reward ?? null);
    setMatch(reply.match); playRound(reply.match);
    controlScroll.current?.scrollTo({ top: 0 });
    if (reply.outcome && pendingBattle.current) {
      const pending = pendingBattle.current;
      pendingBattle.current = null;
      setOutcome(reply.outcome);
      pending.resolve({ ok: true, stake: reply.outcome, campaign:reply.campaign,campaignToken:reply.campaignToken });
    }
  }, [playRound]);

  const step = useCallback(async (body: Record<string, unknown>) => {
    if (!match || match.status !== 'PLAYING' || !battleToken.current || !beginPlayback()) return;
    const payload = { ...body, token: battleToken.current };
    try {
      // 正式站偶爾有一次請求卡十幾秒（2026-09-16 實測 AUTO 16 秒），畫面停在「動作演出中」像壞掉。
      // 戰局票無狀態、同一張票同一招結果相同，重送不會重複出招：先等 6 秒，沒回就自動再送一次。
      let reply: BattleReply;
      try { reply = await callBattle(payload, 6000); }
      catch (first) { if (!(first instanceof DOMException && (first.name === 'TimeoutError' || first.name === 'AbortError'))) throw first; reply = await callBattle(payload); }
      applyReply(reply);
    }
    catch (cause) { resetPlayback(); setAutomatic(false); setStakeError(cause instanceof Error ? cause.message : '戰場暫時無法連線，請再按一次。'); }
  }, [match, beginPlayback, resetPlayback, applyReply]);

  /**
   * 出招：只把「玩家要出哪一招」送給後端；易經怎麼回、誰贏，全部後端算。
   * **畫面不是裁判**。
   */
  const act = useCallback((action: Action) => { void step({ type: 'ACTION', action }); }, [step]);
  /** 自動連擊：請後端依基礎規則替玩家決定下一招。 */
  const autoStep = useCallback(() => { void step({ type: 'AUTO' }); }, [step]);
  // 自動模式保底：易經倒下、等後備上場的那一步（只有「繼續」可按）不能停在畫面上等人；1.2 秒沒動就替客戶按下去。
  useEffect(() => {
    if (!automatic || playing || !match || match.status !== 'PLAYING') return;
    if (!match.opponent.team[match.opponent.active].defeated) return;
    const attack = legal.find(action => action.type === 'ATTACK');
    if (!attack) return;
    const timer = window.setTimeout(() => act(attack), 1200);
    return () => window.clearTimeout(timer);
  }, [automatic, playing, match, legal, act]);

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
    try { setSettlement(await retryStakeSettlement(settlement.matchId, outcome, settlementProgress.current)); setStakeError(''); }
    catch (cause) { setStakeError(cause instanceof Error ? cause.message : '請重試保存。'); }
    finally { setSettling(false); }
  };
  const redeal = () => {
    if (settling || settlement?.saved === false) return;
    settlementProgress.current = undefined;
    resumedBattle.current = false; setResumeNotice('');
    confirmedTeam.current = null; setTeamReady(false); setTeamCopies([]); setStakeCardIds([]);
    setSettlement(null); setOutcome(null); setBattleStake(null); setMovement(''); setStakeError('');
    setSeed(secureSeed()); setError(null);
  };

  /*
    體驗戰：成長收藏空著的人免押注也能開戰。

    實測過的死路：新客戶沒有收藏卡＝押不了注＝完全開不了戰，
    只能先繞去成長中心。體驗戰把牆拆掉——不押卡、不發卡、不沒收，
    純粹讓人先打過一場、看懂相剋，再去領卡打正式戰。
    有收藏卡的人不走這條路：有東西可押的人就要押，賞罰才成立。
  */
  // 出戰陣容的回呼保持穩定：押注加碼時不會讓整排卡面（上百張）重畫。
  const toggleTeamCopy = useCallback((id: string) => { setTeamReady(false); setTeamCopies(current => current.includes(id) ? current.filter(e => e !== id) : [...current, id]); }, []);
  const confirmTeamRef = useRef(confirmTeam); confirmTeamRef.current = confirmTeam;
  const confirmTeamStable = useCallback(() => confirmTeamRef.current(), []);
  // 押注加碼：以卡種為單位，全部用函式型更新，連續快按也不會吃到舊狀態。
  const stakeLocked = settling || settlement?.saved === false;
  const addStakeCard = useCallback((cardId: string) => {
    if (stakeLocked) return;
    setStakeCardIds(current => {
      if (current.length >= MAX_STAKE_CARDS) return current;
      const next = ownedStake.find(card => card.cardId === cardId && !current.includes(card.id));
      return next ? [...current, next.id] : current;
    });
  }, [ownedStake, stakeLocked]);
  const removeStakeCard = useCallback((cardId: string) => {
    if (stakeLocked) return;
    setStakeCardIds(current => {
      for (let i = current.length - 1; i >= 0; i--) if (ownedStake.find(card => card.id === current[i])?.cardId === cardId) return [...current.slice(0, i), ...current.slice(i + 1)];
      return current;
    });
  }, [ownedStake, stakeLocked]);
  const clearStake = useCallback(() => { if (!stakeLocked) setStakeCardIds([]); }, [stakeLocked]);
  const isTrial = match ? !battleStake : ownedStake.length === 0;
  const formationCheck = useMemo(() => state ? canStartBattle(state) : { ready: false as const }, [state]);
  const startCheck = useMemo(() => {
    const base = formationCheck;
    if (dealing || !teamReady) return { ready: false as const, reason: '請親選五張並確認陣容' };
    if (recovering || settling) return { ready: false as const, reason: '正在核對押注紀錄…' };
    if (settlement?.saved === false) return { ready: false as const, reason: '請先保存上一場結果' };
    if (stakeError) return { ready: false as const, reason: '請先處理押注提示' };
    if (!base.ready) return base;
    // 佈陣完成之後才輪到押注：先後順序不能顛倒，
    // 不然客戶會先選好賭注、才發現主戰還沒放。
    if ((!stakeCardIds.every(id => ownedStake.some(card => card.id === id)) || stakeCardIds.length < 1 || stakeCardIds.length > MAX_STAKE_CARDS) && !isTrial) return { ready: false as const, reason: `押注要選 1～${MAX_STAKE_CARDS} 張（目前 ${stakeCardIds.length}/${MAX_STAKE_CARDS}）` };
    return base;
  }, [formationCheck, stakeCardIds, isTrial, recovering, settling, settlement, stakeError, ownedStake, dealing, teamReady]);
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
          {/* 對戰中節奏條固定在標題列正中，會蓋住標題變成「五…場」；對戰時標題文字透明（保留位置與讀屏），左側已寫「對戰中」。 */}
          <h1 style={match?.status === 'PLAYING' ? { color: 'transparent' } : undefined}>神獸押卡闖關</h1>
          <span>{match?.status === 'FINISHED' && !playing ? '本場結束' : match ? `第 ${match.round} 回合` : campaignStage ? '第 ' + campaignStage + ' 關' : '準備出戰'}</span>
        </header>
        {error ? (
          <div role="alert" className={styles.loading}>
            <p>{error}</p>
            <button type="button" className={styles.restart} onClick={() => { setError(null); setLoadAttempt(n => n + 1); }}>重新載入卡池</button>
          </div>
        ) : !state ? <p className={styles.loading}>正在發牌…</p> : (
          <div className={styles.split} data-battle-split data-dock={match ? 'true' : undefined} data-finished={match?.status === 'FINISHED' && !playing} data-inspecting={Boolean(inspection)} data-preparing={!match} data-stake-review={!match && prepareView === 'stake'}>
            <BattleArena state={state} cards={cards} match={match} view={battleView} onInspect={inspectCard} playing={playing}
              onSkill={match?.status === 'PLAYING' && !playing ? (action) => act(action) : null} />
            <section className={styles.controls} aria-label="手部操控" data-battle-controls data-preparing={!match}>
              <div className={styles.controlsHeading}>
                {!match && !inspection ? <nav className={styles.prepareNav} aria-label="出戰準備">
                  <button type="button" aria-pressed={prepareView === 'formation'} onClick={() => openPreparation('formation')}>選卡佈陣</button>
                  <button type="button" aria-pressed={prepareView === 'stake'} onClick={() => openPreparation('stake')}>{isTrial ? '體驗確認' : '押注確認'}</button>
                  <button type="button" aria-pressed={prepareView === 'help'} onClick={() => openPreparation('help')}>玩法說明</button>
                </nav> : <><strong>{inspection ? '能力與相剋' : playing ? '動作演出中' : match?.status === 'FINISHED' ? '對戰結果' : automatic ? '自動連擊中' : <span className={styles.srOnly}>選擇本回合動作</span>}</strong>
                  {inspection ? <span>查看不消耗回合</span> : match?.status === 'PLAYING' ? <button type="button" className={styles.helpDot} aria-expanded={battleHelp} aria-label="玩法說明" onClick={() => setBattleHelp(open => !open)}>？</button> : null}</>}
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
                    {battleHelp && match.status === 'PLAYING' && <section className={styles.battleHelp} data-battle-help aria-label="玩法說明">
                      <h2>玩法</h2>
                      <ol>
                        <li><strong>⚔ 攻擊</strong>　用目前出戰的神獸打一下。</li>
                        <li><strong>✦ 技能</strong>　用氣打出神獸的技能，冷卻中不能用。</li>
                        <li><strong>🔥 暴怒合體</strong>　條件到了才能按。</li>
                        <li><strong>▶ 自動</strong>　讓系統連續出招到分勝負。</li>
                        <li><strong>換人</strong>　點最下方的神獸卡。</li>
                      </ol>
                      <button type="button" className={styles.restart} onClick={() => setBattleHelp(false)}>知道了</button>
                    </section>}
                    <BattlePace match={match} automatic={automatic} blocked={playing || Boolean(inspection)} canAct={legal.length > 0} onAutomatic={setAutomatic} onAuto={autoStep} />
                    <BattlePanel match={match} view={battleView} onAction={act} busy={playing} compact cards={cards} />
                    {resumeNotice && match.status === 'PLAYING' && <p role="status" className={styles.notice} data-battle-resumed>↻ {resumeNotice}</p>}
                    {match.status === 'PLAYING' && <p className={styles.notice} data-battle-stake>{battleStake
                      ? `💎 押注：${cards.find(card => card.id === battleStake)?.name}`
                      : '🎮 體驗戰'}</p>}
                    {match.status === 'PLAYING' && <details className={styles.details}><summary>離開本場</summary><p>{battleStake ? '回首頁會保留本局與押注卡，回到戰場即可接續。' : '回首頁會中斷本局，押卡不扣除。'}</p><Link href="/">回首頁</Link></details>}
                    {match.status === 'FINISHED' && !playing && isTrial && (
                      <p role="status" className={styles.notice} data-battle-result={match.winner}>體驗戰結束：押注 0 張・贏得 0 張・輸掉 0 張。</p>
                    )}
                    {/* 戰利碎片（2026-11-08）：連勝、戰績、合體階加成。不動押卡經濟：體驗戰仍不發卡不押卡，押注戰要等押注結算保存成功才入帳；演出結束才顯示。 */}
                    {match.status === 'FINISHED' && !playing && (isTrial || settlement?.saved === true) && <FreeBattleShards reward={reward} />}
                    {match.status === 'FINISHED' && isTrial && <BeastBattleVoice id={`trial:${battleVoiceId}`}
                      text={`${match.winner === 'player' ? '恭喜獲勝！' : match.winner === 'opponent' ? '本場對手獲勝。' : '本場平手。'}這是免押體驗戰。押注零張，贏得零張，輸掉零張。可以換一組戰術再挑戰。`} />}
                  </>
                ) : (
                  <>
                    <div hidden={prepareView !== 'formation'}>
                      {ownedStake.length ? <>
                        <button type="button" className={styles.restart} onClick={() => setCultivationOpen(v => !v)}>{cultivationOpen ? '返回選隊' : '我的卡片・永久強化'}</button>
                        {cultivationOpen ? <OwnedCardCultivation onDone={() => setCultivationOpen(false)} onSaved={() => { confirmedTeam.current=null; tableToken.current=null; dealCampaignToken.current=null; setTeamReady(false); setTeamCopies([]); setStakeCardIds([]); }} /> : <OwnedCampaignPreparation owned={ownedStake} selected={teamCopies} busy={dealing || recovering || settling} onToggle={toggleTeamCopy} onConfirm={confirmTeamStable} />}
                        {new Set(ownedStake.map(c => c.cardId)).size < 5 && <p role="status">收藏不足五種，請先到<Link href="/growth-center#beast-collection">成長中心取得卡片</Link>；不會代填收藏。</p>}
                      </> : <p className={styles.notice}>首次免押體驗：五張體驗卡已就緒。完成後可領取既有首次幼子禮，再以收藏正式闖關。</p>}
                      {movement && <p role="status" className={styles.notice} data-card-move>{movement}</p>}
                    </div>
                    <section hidden={prepareView !== 'stake'} className={styles.confirmation} data-preparation-progress tabIndex={-1} aria-label="開戰前確認">
                      <h2>{isTrial ? '體驗戰確認' : `選押注卡・1～${MAX_STAKE_CARDS} 張`}</h2>
                      {!state.player.active && <p className={styles.notice}>建議先到「選卡佈陣」放好主戰，再決定本場押注。</p>}
                      <StakeSlot owned={ownedStake} selected={stakeCardIds} trial={isTrial} locked={settling || settlement?.saved === false}
                        steps={[]}
                        onSelect={cardId => { if (settling || settlement?.saved === false) return; setStakeCardIds(current => nextStakeSelection(current, cardId)); }}
                        onAddCard={addStakeCard} onRemoveCard={removeStakeCard} onClear={clearStake} />
                    </section>
                    <section hidden={prepareView !== 'help'} className={styles.help} aria-label="卡片戰鬥玩法說明">
                      <h2>先選卡，再出戰</h2>
                      <ol>
                        <li><strong>親選五種收藏神獸</strong><p>第一張為主戰，其餘四張為後備；確認五張後再選押注。</p></li>
                        <li><strong>戰前培養與押注分開</strong><p>我的卡片可消耗幼子永久強化。確認前顯示真實數值，戰鬥保留中不能強化。</p></li>
                        <li><strong>押 1～{MAX_STAKE_CARDS} 張就能開戰</strong><p>{isTrial ? '本場免押注，不發卡、不沒收。' : `輸少贏多：贏了押注卡全保留，至少再得同樣張數，打得越漂亮越多，最多 ${MAX_REWARD_CARDS} 張；輸了只扣本場押注。`}</p></li>
                        <li><strong>開戰後由你自己出手</strong><p>預設手動：自己選攻擊、技能或換卡；想讓它自動連擊到分出勝負，就按「自動」。</p></li>
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
                  {!isTrial && cultivationOpen && prepareView === 'formation' ? <button type="button" className={styles.restart} onClick={() => setCultivationOpen(false)}>返回選隊</button> : !isTrial && !teamReady ? <>
                    <p role="status">已選 {teamCopies.length}／5 張出戰卡</p>
                    <button type="button" className={styles.restart} disabled={dealing || recovering || settling || (prepareView === 'formation' && teamCopies.length !== 5)} onClick={() => prepareView === 'formation' ? confirmTeam() : openPreparation('formation')}>
                      {dealing ? '正在準備陣容…' : prepareView !== 'formation' ? '返回選卡佈陣' : teamCopies.length === 5 ? '確認五張，前往押注' : '請先選齊五張卡'}
                    </button>
                  </> : <BattleStartGuide
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
                  />}
                </div>
              ) : match?.status === 'FINISHED' && !playing && !inspection ? (
                <div className={styles.footer}>
                  {(isTrial || settlement?.saved) && <StarterPackAfterBattle completed="battlefield" onContinue={redeal} />}
                  <button type="button" className={styles.restart} disabled={settling || settlement?.saved === false} onClick={redeal}>{settling ? '正在保存卡片結算…' : settlement?.saved === false ? '請先重試保存結果' : match.winner === 'player' && !isTrial ? '保存完成・前往下一關選卡' : '重新選卡挑戰本關'}</button>
                  {!settling && settlement?.saved !== false && <Link href="/" className={styles.homeLink}>回首頁</Link>}
                </div>
              ) : null}
            </section>
            {match && <BattleDock match={match} view={battleView} cards={cards} busy={playing} playing={playing} onAction={act} onActiveTap={(() => { const attack = match.status === 'PLAYING' && !playing ? battleView?.legal.find(a => a.type === 'ATTACK') : undefined; return attack ? () => act(attack) : null; })()} activeTapLabel="attack" ragePartnerId={battleView?.fusionGuide && !battleView.fusionGuide.used ? battleView.fusionGuide.partnerCardId : null} />}
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
