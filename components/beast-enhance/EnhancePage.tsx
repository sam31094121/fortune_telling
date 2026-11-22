'use client';
/**
 * 四大神獸強化頁（唯一的強化畫面；神獸戰鬥、寶石連線、星宿神獸首屏都從入口卡進來）。
 * 三步：① 層級總覽（四大神獸 → 本體 → 幼子，點大卡）→ ② 餵卡（點／長按加入材料，按「強化」）→ ③ 結果（小卡飛進大卡、+N、下一步）。
 * 前端只負責畫：張數、誰能吃誰、每堆上限、加成與星級全部來自伺服端（GET four-beasts、PREVIEW_TARGET、PREVIEW、FUSE）。
 * 卡庫讀不到時仍畫出固定層級與卡圖（數字「–」），顯示照實短句＋「重新讀取」。
 * 2026-11-20 疊到 v4 五星比例主線：誰能吃誰只看伺服端（PREVIEW_TARGET 的材料堆）；確認前不自動放入材料（業主 11-18：確認前不得自動選材料）；
 * 先點目標就顯示伺服端的兩款遊戲攻擊與下一星還差幾張；預覽標「尚未消耗」；存檔成功才說「升星成功／強化已保存」；未到整數攻擊照實說進度累積；
 * 未收藏的神獸說原因；五星封頂可查看不能餵；戰鬥未結束可查看、可返回原戰局，但不能加材料或強化。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { syncSharedCultivation, sharedRequest, sharedWalletHeaders, readSharedCultivation, SHARED_UPDATED, type SharedCultivationView } from '@/lib/beast-cultivation-client';
import { GAME_PATH, readEnhanceParams, type EnhanceFrom } from '@/lib/beast-food-chain-client';
import { fourBeastsTree, type EnhanceNode, type EnhanceGuardian } from '@/lib/beast-game/four-beasts-static';
import { loadFourBeasts } from '@/lib/beast-game/four-beasts-load';
import type { FourBeastsView } from '@/lib/beast-game/four-beasts-view';
import type { BatchLimits, CultivationBatchSummary } from '@/lib/beast-game/cultivation-batch';
import type { CultivationFeedback } from '@/lib/beast-game/cultivation-view';
import CardStarBar from '@/components/battlefield/CardStarBar';
import EnhanceIcon from './EnhanceIcon';
import s from './EnhancePage.module.css';

/** 固定層級（卡庫讀不到時照畫；卡號 → 卡圖也從這裡查）。 */
const STATIC_TREE = fourBeastsTree();
const THUMB = new Map(STATIC_TREE.flatMap(g => [g, ...g.mansions.flatMap(m => [m, m.young])]).map(n => [n.cardId, n.thumb]));
const ELEMENT_CLASS: Record<string, string> = { AIR: s.air, FIRE: s.fire, SPACE: s.space, WATER: s.water };
const GAME_LABEL: Record<EnhanceFrom, string> = { battle: '回到神獸戰鬥', orb: '回到寶石捷連線' };
/** 沒有來源遊戲時的下一步（2026-11-18 業主確認：成功後提供前往寶石捷連線選卡的入口，只導航、不代選、不開戰、不扣卡）。 */
const GO_LABEL: Record<EnhanceFrom, string> = { battle: '前往神獸戰鬥', orb: '前往寶石捷連線選卡' };
/** 預覽節流：停手 260ms 後算一次，長按中最久 900ms 更新一次。長按加速：300ms 後 +1／150ms → 0.6 秒起 +5 → 1.5 秒起 +50（加到伺服端上限就停）。 */
const PREVIEW_DEBOUNCE_MS = 260, PREVIEW_MAX_WAIT_MS = 900, HOLD_DELAY_MS = 300;
const HOLD_STEPS = [{ until: 600, every: 150, add: 1 }, { until: 1500, every: 100, add: 5 }, { until: Infinity, every: 100, add: 50 }] as const;
type AddResult = 'ok' | 'full' | 'none';
type Step = { kind: 'tree' } | { kind: 'feed'; copyId: string; cardId: string } | { kind: 'result'; copyId: string; cardId: string; summary: CultivationBatchSummary };
type Options = { copyId: string; revision: string; limits: BatchLimits; byId: Record<string, { feedback?: CultivationFeedback; error?: string }> };

/** 與戰鬥／保存共用同一把分頁鎖；瀏覽器沒有 Web Locks 時直接送（伺服端仍以 revision＋operationId 防重複）。 */
const withCollectionLock = <T,>(run: () => Promise<T>): Promise<T> => typeof navigator !== 'undefined' && navigator.locks
  ? navigator.locks.request('tdh-beast-collection', { ifAvailable: true }, lock => { if (!lock) throw new Error('另一分頁正在戰鬥或保存，請先完成。'); return run(); }) as Promise<T>
  : run();
const errorText = (e: unknown, fallback: string) => e instanceof Error && /[\u3400-\u9fff]/.test(e.message) ? e.message : fallback;

function Node({ node, size, offline, onPick, hint, active }: { node: EnhanceNode; size: 'big' | 'mid' | 'small'; offline: boolean; onPick?: () => void; hint?: boolean; active?: boolean }) {
  const maxed = node.stars?.toNext === null;
  const inner = <>
    <img src={node.thumb} alt="" draggable={false} loading={size === 'big' ? 'eager' : 'lazy'} decoding="async" />
    {!offline && node.owned > 1 && <i className={s.copies}>×{node.owned}</i>}
    {!offline && node.owned > 0 && node.bonusPercent !== '0' && <b className={s.pct}>+{node.bonusPercent}%</b>}
    {!offline && node.ready > 0 && !maxed && <em className={s.ready}>{node.ready}</em>}
    {!offline && maxed && <em className={s.maxed}><EnhanceIcon name="star" /></em>}
    {hint && <span className={s.hint}><EnhanceIcon name="tap" /></span>}
  </>;
  const cls = `${s.node} ${s[size]} ${offline ? s.offline : node.owned ? '' : s.unowned} ${!offline && node.ready > 0 && !maxed ? s.hot : ''} ${active ? s.active : ''}`;
  if (onPick && !offline && node.owned > 0 && node.copyId) return <button type="button" className={cls} data-card={node.cardId} data-shared-target={node.copyId} data-ready={node.ready} onClick={onPick} aria-label={`強化這張${node.ready ? `，有 ${node.ready} 張可吃` : ''}${maxed ? '，已五星封頂' : ''}`}>{inner}</button>;
  return <span className={cls} data-card={node.cardId} data-owned={offline ? undefined : node.owned} data-offline={offline || undefined}>{inner}</span>;
}

/**
 * P1-8（2026-11-17 健康檢查）：卡都在、卻沒有任何大卡可以吃（伺服端逐張標 NO_TARGET）時，畫面原本只剩 0，沒有任何提示。
 * 這裡只照伺服端的逐張狀態畫：缺的那張大卡（剪影）← ⬆ ← 手上等著餵的卡，旁邊一顆 ⚔ 鈕去神獸戰鬥。
 * 不算任何規則；固定在畫面底部（頁面底部本來就留了空間），出現時不推動上面的內容。
 */
function NoTargetCue({ view }: { view: FourBeastsView }) {
  const waiting = view.enhanceableCount === 0 ? view.materials.filter(m => m.status === 'NO_TARGET') : [];
  if (waiting.length === 0) return null;
  const groups = [...new Set(waiting.map(m => m.targetCardId))].map(targetCardId => ({ targetCardId, items: waiting.filter(m => m.targetCardId === targetCardId) }));
  return <aside className={s.cue} data-no-target-cue={waiting.length} aria-label={`還沒有可強化的大卡：${waiting.length} 張卡在等 ${groups.length} 張大卡。先去神獸戰鬥拿大卡，就能往上餵。`}>
    <span className={s.cueChain} aria-hidden="true">
      {groups.slice(0, 4).map(g => <span key={g.targetCardId} className={s.cueCol} data-missing-target={g.targetCardId}>
        <span className={s.ghost}>{THUMB.get(g.targetCardId) ? <img src={THUMB.get(g.targetCardId)} alt="" draggable={false} /> : null}</span>
        <EnhanceIcon name="up" className={s.cueUp} />
        <span className={s.cueFeed}><img src={g.items[0].thumb} alt="" draggable={false} />{g.items.length > 1 && <i>×{g.items.length}</i>}</span>
      </span>)}
    </span>
    <Link href={GAME_PATH.battle} className={s.cueGo} data-get-guardian aria-label="去神獸戰鬥拿大卡"><EnhanceIcon name="sword" /><EnhanceIcon name="up" className={s.cueGoUp} /></Link>
  </aside>;
}

/** 預覽與最後確認共用伺服端數值，不在前端重算成長。 */
function GrowthPreview({ summary }: { summary: CultivationBatchSummary }) {
  return <div className={s.previewDetails} data-growth-preview>
    <div className={s.previewTarget}><img src={THUMB.get(summary.targetCardId)} alt={summary.targetName} /><span><EnhanceIcon name="cards" />−{summary.count}<EnhanceIcon name="up" /></span></div>
    <dl>
      <div data-preview-orb><dt><EnhanceIcon name="bead" />寶石捷連線</dt><dd>{summary.beforeOrbAttack} → {summary.afterOrbAttack} <small>+{summary.addedBonus}</small></dd></div>
      <div data-preview-battle><dt><EnhanceIcon name="sword" />神獸戰鬥</dt><dd>{summary.beforeBattleAttack} → {summary.afterBattleAttack} <small>+{summary.addedBattleBonus}</small></dd></div>
      {summary.starsBefore && summary.starsAfter && <div data-preview-stars><dt><EnhanceIcon name="star" /></dt><dd>{summary.starsBefore.stars} → {summary.starsAfter.stars} / 5</dd></div>}
    </dl>
    <CardStarBar stars={summary.starsAfter} percent={summary.totalPercentAfter.label} />
    {summary.starsAfter && <progress className={s.starProgress} value={summary.starsAfter.fed} max={summary.starsAfter.capFeeds} aria-label="累計五星成長進度" />}
    <div className={s.materialReceipt} aria-label={`消耗材料 ${summary.count} 張，${summary.targetName}保留`}>{summary.materials.map(m => <span key={m.cardId} aria-label={`${m.name} ${m.count} 張`}><img src={THUMB.get(m.cardId)} alt={m.name} /><b>×{m.count}</b></span>)}</div>
  </div>;
}

function ConfirmEnhancement({ summary, busy, error, onCancel, onConfirm }: { summary: CultivationBatchSummary; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  return <dialog ref={dialog} className={s.confirmDialog} aria-labelledby="enhancement-confirm-title" data-enhancement-confirm onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="enhancement-confirm-title">確認強化</h2>
    <p>消耗 {summary.count} 張 · 保留{summary.targetName}</p>
    <GrowthPreview summary={summary} />
    {error && <p role="alert" data-confirm-error>{error}</p>}
    <div className={s.confirmActions}>
      <button type="button" className={s.textBtn} data-dismiss-enhancement disabled={busy} onClick={onCancel}>取消</button>
      <button type="button" className={s.primary} data-submit-enhancement disabled={busy} onClick={onConfirm}><EnhanceIcon name={busy ? 'wait' : 'check'} />確認消耗</button>
    </div>
  </dialog>;
}

export default function EnhancePage() {
  const [view, setView] = useState<FourBeastsView | null>(null);
  const [shared, setShared] = useState<SharedCultivationView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState<EnhanceFrom | null>(null);
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState<Step>({ kind: 'tree' });
  const [options, setOptions] = useState<Options | null>(null);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<{ key: string; summary: CultivationBatchSummary } | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [feedError, setFeedError] = useState('');
  const [lockOpen, setLockOpen] = useState(false);
  const [main, setMain] = useState<string[]>([]);
  const [hintPile, setHintPile] = useState<string | null>(null);
  const picksRef = useRef<Record<string, number>>({}), feedParam = useRef<string | null>(null), operation = useRef<string | null>(null);

  const getView = useCallback(async () => {
    const res = await fetch('/api/beast-game/four-beasts', { headers: sharedWalletHeaders(), cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) throw new Error(j?.error ?? '');
    return j.view as FourBeastsView;
  }, []);
  const load = useCallback(async (sync: boolean) => {
    setLoading(true);
    try {
      const r = await loadFourBeasts(sync ? syncSharedCultivation : async () => null, getView);
      if (r.synced) { setShared(r.synced); setMain(r.synced.protectedIds); }
      if (r.view) setView(r.view);
      setError(r.error ?? '');
      return r.view;
    } finally { setLoading(false); }
  }, [getView]);

  useEffect(() => {
    const p = readEnhanceParams(window.location.search);
    setFrom(p.from); feedParam.current = p.feed;
    void load(true);
    const update = () => { const v = readSharedCultivation(); if (v) setShared(v); };
    window.addEventListener(SHARED_UPDATED, update);
    return () => window.removeEventListener(SHARED_UPDATED, update);
  }, [load]);

  // 從遊戲「拿去強化」進來：伺服端說這張卡可以吃（READY）才直接進餵卡，並用手指提示那一堆（不自動放入；要玩家自己點、再按「強化」才送出）。
  useEffect(() => {
    if (!view) return;
    const feed = feedParam.current; feedParam.current = null;
    const first = view.guardians.findIndex(g => g.ready > 0 || g.mansions.some(m => m.ready > 0));
    if (first > 0) setTab(first);
    if (!feed) return;
    const m = view.materials.find(x => x.cardId === feed && x.status === 'READY' && x.targetCopyId);
    if (m?.targetCopyId) { openFeed(m.targetCopyId, m.targetCardId); setHintPile(feed); }
    window.history.replaceState(null, '', window.location.pathname + (from ? `?from=${from}` : ''));
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const offline = !view;
  const trees: EnhanceGuardian[] = view?.guardians ?? STATIC_TREE;
  const g = trees[tab];
  const nodes = useMemo(() => new Map(trees.flatMap(x => [x, ...x.mansions.flatMap(m => [m, m.young])]).map(n => [n.cardId, n])), [trees]);

  const openFeed = (copyId: string, cardId: string) => {
    setConfirmKey(null);
    setHintPile(null); picksRef.current = {}; setPicks({}); setPreview(null); setOptions(null); setFeedError(''); operation.current = null;
    setStep({ kind: 'feed', copyId, cardId });
  };
  const toTree = () => { picksRef.current = {}; setPicks({}); setPreview(null); setOptions(null); setFeedError(''); setHintPile(null); operation.current = null; setStep({ kind: 'tree' }); };

  // ② 餵卡：選定大卡就向伺服端取材料堆、每堆上限與第一張的加成（只讀）。
  const feedCopy = step.kind === 'feed' ? step.copyId : null;
  useEffect(() => {
    if (!feedCopy || !view) return;
    let active = true;
    sharedRequest({ type: 'PREVIEW_TARGET', revision: view.revision, targetId: feedCopy, piles: true }).then(r => {
      if (!active) return;
      const limits = r.batch as BatchLimits;
      setOptions({ copyId: feedCopy, revision: view.revision, limits, byId: Object.fromEntries((r.options ?? []).map((o: { materialId: string }) => [o.materialId, o])) });
      // 不預先放入任何材料（業主 11-18：確認前不得自動選材料）；全部由玩家點、長按或「加入可用材料」。
      picksRef.current = {}; setPicks({}); setFeedError('');
    }).catch(e => { if (active) setFeedError(errorText(e, '暫時讀不到可以吃的卡，稍後再試')); });
    return () => { active = false; };
  }, [feedCopy, view?.revision]); // eslint-disable-line react-hooks/exhaustive-deps

  const limits = options && options.copyId === feedCopy && options.revision === view?.revision ? options.limits : null;
  const total = Object.values(picks).reduce((a, b) => a + b, 0);
  const choices = useMemo(() => limits && feedCopy ? limits.piles.flatMap(p => p.ids.slice(0, Math.min(picks[p.cardId] ?? 0, p.max)).map(materialId => ({ targetId: feedCopy, materialId }))) : [], [limits, picks, feedCopy]);
  const key = limits && view ? `${view.revision}|${feedCopy}|${choices.length}|${limits.piles.map(p => `${p.cardId}:${Math.min(picks[p.cardId] ?? 0, p.max)}`).join(',')}` : '';
  const since = useRef<number | null>(null);
  useEffect(() => {
    if (!key || !choices.length || !view) { since.current = null; return; }
    const now = Date.now(); since.current ??= now;
    const wait = Math.max(0, Math.min(PREVIEW_DEBOUNCE_MS, PREVIEW_MAX_WAIT_MS - (now - since.current)));
    const body = { type: 'PREVIEW', summaryOnly: true, revision: view.revision, choices }, k = key;
    let active = true;
    const timer = window.setTimeout(() => { since.current = null; sharedRequest(body).then(r => { if (active) { setPreview({ key: k, summary: r.summary }); setFeedError(''); } }).catch(e => { if (active) setFeedError(errorText(e, '暫時算不出強化結果，稍後再試')); }); }, wait);
    return () => { active = false; window.clearTimeout(timer); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = !!preview && preview.key === key && choices.length > 0;

  const add = (cardId: string, n: number): AddResult => {
    if (!limits) return 'none';
    const pile = limits.piles.find(p => p.cardId === cardId); if (!pile) return 'none';
    const cur = picksRef.current, have = cur[cardId] ?? 0, sum = Object.values(cur).reduce((a, b) => a + b, 0);
    const step = Math.min(n, limits.max - sum, pile.max - have);
    if (step > 0) { const next = { ...cur, [cardId]: have + step }; picksRef.current = next; setPicks(next); }
    return limits.max - sum - Math.max(step, 0) <= 0 || pile.max - have - Math.max(step, 0) <= 0 ? 'full' : 'ok';
  };
  /** 「加入可用材料」：每堆加到伺服端給的上限，總數不超過伺服端的剩餘張數（五星封頂）；仍要按「強化」才送出。 */
  const addAll = () => { if (!limits) return; picksRef.current = {}; for (const p of limits.piles) add(p.cardId, p.max); setPicks({ ...picksRef.current }); };
  const removeOne = (cardId: string) => {
    stopHold();
    const next = { ...picksRef.current };
    if ((next[cardId] ?? 0) <= 1) delete next[cardId]; else next[cardId]--;
    picksRef.current = next; setPicks(next);
  };
  const hold = useRef<{ timer: number | null; start: number } | null>(null);
  const stopHold = () => { if (hold.current?.timer) window.clearTimeout(hold.current.timer); hold.current = null; };
  useEffect(() => stopHold, [feedCopy]);
  const press = (cardId: string) => {
    stopHold(); if (busy) return;
    if (add(cardId, 1) !== 'ok') return;
    const h = { timer: null as number | null, start: performance.now() }; hold.current = h;
    const tick = () => { if (hold.current !== h) return; const st = HOLD_STEPS.find(x => performance.now() - h.start < x.until)!; if (add(cardId, st.add) !== 'ok') { stopHold(); return; } h.timer = window.setTimeout(tick, st.every); };
    h.timer = window.setTimeout(tick, HOLD_DELAY_MS);
  };

  const fuse = async () => {
    if (!view || !feedCopy || step.kind !== 'feed' || !ready || confirmKey !== key || busy) return;
    setBusy(true); setFeedError(''); operation.current ??= crypto.randomUUID();
    try {
      const r = await withCollectionLock(() => sharedRequest({ type: 'FUSE', summaryOnly: true, revision: view.revision, operationId: operation.current, choices }));
      operation.current = null; picksRef.current = {}; setPicks({}); setPreview(null);
      setConfirmKey(null);
      setStep({ kind: 'result', copyId: step.copyId, cardId: step.cardId, summary: r.summary });
      void load(false); // 張數、星級、還能吃幾張：重新向伺服端讀
    } catch (e) { setFeedError(errorText(e, '這次沒有存到，請再按一次「確認消耗」')); }
    finally { setBusy(false); }
  };

  const saveMain = async () => {
    if (!shared || busy) return;
    setBusy(true); setError('');
    try {
      const r = await withCollectionLock(() => sharedRequest({ type: 'MAIN_TEAM', revision: shared.revision, operationId: crypto.randomUUID(), ids: main }));
      setShared(r.view); setMain(r.view.protectedIds); setLockOpen(false); void load(false);
    } catch (e) { setError(errorText(e, '主力沒有存到，請再試一次')); } finally { setBusy(false); }
  };
  const release = async () => {
    const id = shared?.pendingBattle; if (!id || busy) return;
    setBusy(true);
    try { if (id.startsWith('card:')) await (await import('@/lib/beast-collection')).releaseLiveBattle(id); else await sharedRequest({ type: 'RELEASE', battleId: id }); await load(true); }
    catch (e) { setError(errorText(e, '暫時無法結束這場戰鬥，稍後再試')); } finally { setBusy(false); }
  };

  const target = step.kind !== 'tree' ? nodes.get(step.cardId) ?? null : null;
  /** 目標這張副本的伺服端數值（連線攻擊、神獸戰鬥攻擊、星級）：取自共同卡庫檢視，前端不算。 */
  const targetCopy = step.kind !== 'tree' ? shared?.cards.find(c => c.id === step.copyId) ?? null : null;
  const blocked = !!view?.pendingBattle;
  const hintCard = !offline && step.kind === 'tree' ? (g.ready > 0 && g.stars?.toNext !== null ? g.cardId : g.mansions.find(m => m.ready > 0 && m.owned > 0 && m.stars?.toNext !== null)?.cardId) : undefined;
  const lockChanged = !!shared && main.length === 5 && (main.length !== shared.protectedIds.length || main.some(id => !shared.protectedIds.includes(id)));
  const stacks = useMemo(() => {
    const groups = new Map<string, { cardId: string; ids: string[] }>();
    for (const c of shared?.cards ?? []) { const k = `${c.cardId}|${c.bonus}|${c.fed}`; const e = groups.get(k); if (e) e.ids.push(c.id); else groups.set(k, { cardId: c.cardId, ids: [c.id] }); }
    return [...groups.values()];
  }, [shared]);
  const backHref = from ? GAME_PATH[from] : '/star-beasts';

  return <main className={s.page} data-enhance-page data-step={step.kind} data-offline={offline || undefined}>
    <header className={s.top}>
      {step.kind === 'tree'
        ? <Link href={backHref} className={s.iconBtn} aria-label="返回"><EnhanceIcon name="back" /></Link>
        : <button type="button" className={s.iconBtn} data-cancel-shared-fusion onClick={toTree} disabled={busy} aria-label="回到四大神獸總覽（不送出）"><EnhanceIcon name="back" /></button>}
      <h1 className={s.title}>四大神獸</h1>
      <p className={s.count} data-enhanceable-count={view?.enhanceableCount ?? ''} aria-label={view ? `可強化 ${view.enhanceableCount} 張` : '可強化張數讀取中'}>
        <EnhanceIcon name="cards" /><strong>{view ? view.enhanceableCount : '–'}</strong>
      </p>
    </header>
    <div className={s.sources}>
      <span data-source="duel" aria-label={`神獸戰鬥贏得 ${view?.sources.duel ?? '–'} 張`}><EnhanceIcon name="sword" /><b>{view ? view.sources.duel : '–'}</b></span>
      <span data-source="orb" aria-label={`寶石捷連線贏得 ${view?.sources.orb ?? '–'} 張`}><EnhanceIcon name="bead" /><b>{view ? view.sources.orb : '–'}</b></span>
      {!!view?.sources.other && <span data-source="other" aria-label={`其他來源 ${view.sources.other} 張`}><EnhanceIcon name="gift" /><b>{view.sources.other}</b></span>}
    </div>

    {error && <div role="alert" className={s.alert} data-load-error>{error}<button type="button" className={s.textBtn} disabled={loading || busy} onClick={() => void load(true)}><EnhanceIcon name="retry" />重新讀取</button></div>}
    {view?.pendingBattle && <div role="alert" className={s.alert} data-pending-battle><EnhanceIcon name="wait" />戰鬥還沒結束：可以先看，結算後才能強化{shared?.pendingBattleHref && <Link className={s.textBtn} href={shared.pendingBattleHref} data-return-pending-battle>返回原戰局</Link>}{shared?.pendingBattle ? <button type="button" className={s.textBtn} disabled={busy} onClick={() => void release()} aria-label="結束未完成戰局（不扣卡、不發獎）">結束未完成戰局</button> : !shared?.pendingBattleHref && <Link className={s.textBtn} href={backHref}>回到戰鬥</Link>}</div>}

    {step.kind === 'tree' && <>
      <nav className={s.tabs} aria-label="四大神獸">
        {trees.map((x, i) => { const n = offline ? 0 : x.ready + x.mansions.reduce((a, m) => a + m.ready, 0); return <button key={x.key} type="button" data-select-guardian={x.key.toLowerCase()} aria-pressed={i === tab} aria-label={`四大神獸第 ${i + 1} 位${n ? `，${n} 張可吃` : ''}`} onClick={() => setTab(i)} className={`${s.tab} ${ELEMENT_CLASS[x.element]}`}>
          <img src={x.thumb} alt="" draggable={false} />{n > 0 && <em className={s.ready}>{n}</em>}
        </button>; })}
      </nav>
      <section className={`${s.tree} ${ELEMENT_CLASS[g.element]}`} aria-label="強化層級：大卡吃小卡" aria-busy={loading && offline}>
        <div className={s.crown}><Node node={g} size="big" offline={offline} hint={hintCard === g.cardId} onPick={() => g.copyId && openFeed(g.copyId, g.cardId)} /></div>
        {!offline && g.owned === 0 && <p role="status" className={s.notOwned} data-not-owned={g.key.toLowerCase()}>尚未收藏這隻神獸，可先選下方已持有的卡片。</p>}
        <div className={s.flowRow} aria-hidden="true">{g.mansions.map(m => <span key={m.cardId} className={`${s.flow} ${!offline && view?.materials.some(x => x.cardId === m.cardId && x.targetCardId === g.cardId && x.status === 'READY') ? s.flowOn : ''}`}><EnhanceIcon name="up" /></span>)}</div>
        <div className={s.row}>{g.mansions.map(m => <Node key={m.cardId} node={m} size="mid" offline={offline} hint={hintCard === m.cardId} onPick={() => m.copyId && openFeed(m.copyId, m.cardId)} />)}</div>
        <div className={s.flowRow} aria-hidden="true">{g.mansions.map(m => <span key={m.young.cardId} className={`${s.flow} ${!offline && m.ready > 0 ? s.flowOn : ''}`}><EnhanceIcon name="up" /></span>)}</div>
        <div className={s.row}>{g.mansions.map(m => <Node key={m.young.cardId} node={m.young} size="small" offline={offline} />)}</div>
      </section>
      {view && <NoTargetCue view={view} />}
      {view && view.enhanceableCount === 0 && !view.materials.some(m => m.status === 'NO_TARGET') && <div className={s.getCards} data-get-cards>
        <Link href={GAME_PATH.battle} className={s.textBtn}><EnhanceIcon name="sword" />神獸戰鬥</Link>
        <Link href={GAME_PATH.orb} className={s.textBtn}><EnhanceIcon name="bead" />寶石捷連線</Link>
      </div>}
      {shared?.canProtectFive && <button type="button" className={`${s.textBtn} ${s.lockBtn}`} data-open-lock aria-expanded={lockOpen} onClick={() => setLockOpen(v => !v)}><EnhanceIcon name="lock" />主力 {shared.protectedIds.length}/5</button>}
      {lockOpen && shared && <section className={s.lock} aria-label="鎖定五隻主力（主力不會被吃）">
        <div className={s.lockGrid}>{stacks.map(({ cardId, ids }) => { const chosen = ids.find(id => main.includes(id)); return <button key={ids[0]} type="button" className={s.lockCard} data-main-copy={ids[0]} aria-pressed={!!chosen} disabled={busy} onClick={() => setMain(list => chosen ? list.filter(id => id !== chosen) : list.length < 5 ? [...list, ids[0]] : list)}>
          <img src={THUMB.get(cardId) ?? ''} alt="" />{chosen && <em className={s.lockMark}><EnhanceIcon name="lock" /></em>}{ids.length > 1 && <i className={s.copies}>×{ids.length}</i>}
        </button>; })}</div>
        <div className={s.lockActions}><span aria-hidden="true"><EnhanceIcon name="lock" />{main.length}/5</span>{lockChanged && <button type="button" className={s.primary} data-save-main disabled={busy} onClick={() => void saveMain()}><EnhanceIcon name="check" />確認主力</button>}</div>
      </section>}
    </>}

    {step.kind === 'feed' && target && <section className={s.feed} data-feed-step aria-label="餵卡">
      <div className={`${s.stage} ${ELEMENT_CLASS[trees.find(x => x.cardId === target.cardId || x.mansions.some(m => m.cardId === target.cardId))?.element ?? '']}`}>
        <span className={s.stageCard} data-target-stage data-shared-target={step.copyId} data-target-stars={targetCopy?.stars?.stars ?? target.stars?.stars}><img src={target.thumb} alt="" /></span>
        {targetCopy?.stars && <CardStarBar stars={targetCopy.stars} percent={targetCopy.bonusPercent} atCap={targetCopy.atBonusCap} />}
      </div>
      {targetCopy && <p className={s.growth} data-growth-readout>
        <span>連線攻擊 <b>{targetCopy.orbAttack}</b> · 神獸戰鬥 <b>{targetCopy.battleAttack}</b></span>
        {targetCopy.stars && <span>{targetCopy.stars.maxed ? '五星已滿 ✓' : <>下一星還差 <b>{targetCopy.stars.toNext}</b> 張</>}</span>}
      </p>}
      <div className={s.eatArrow} aria-hidden="true"><EnhanceIcon name="up" /><EnhanceIcon name="up" /></div>
      <div className={s.materialActions}>
        <button type="button" className={s.textBtn} data-pick-all-materials disabled={busy || blocked || !limits || limits.max <= 0} onClick={addAll}><EnhanceIcon name="cards" />加入可用材料</button>
        <button type="button" className={s.textBtn} data-clear-materials disabled={busy || total === 0} onClick={() => { picksRef.current = {}; setPicks({}); setPreview(null); }}><EnhanceIcon name="close" />清空選擇</button>
      </div>
      {!limits && !feedError && <div className={s.pileRow} aria-busy="true">{[0, 1, 2].map(i => <span key={i} className={`${s.pile} ${s.skeleton}`} />)}</div>}
      {limits && <div className={s.pileRow} role="group" aria-label="點一下加入一張，長按連續加入">
        {limits.piles.filter(p => p.max > 0).map(p => { const n = picks[p.cardId] ?? 0, o = options?.byId[p.ids[0]]; return <div key={p.cardId} className={s.pileControl}><button type="button" className={`${s.pile} ${n ? s.picked : ''}`} data-pile={p.cardId} data-picked={n} data-hint-pile={hintPile === p.cardId || undefined} disabled={busy || blocked}
          aria-label={`持有 ${p.ids.length} 張，已加入 ${n} 張${o?.feedback ? `，一張約 +${o.feedback.addedPercent.label}%` : ''}`}
          onPointerDown={ev => { if (ev.pointerType === 'mouse' && ev.button !== 0) return; try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch {} press(p.cardId); }}
          onPointerUp={stopHold} onPointerCancel={stopHold} onLostPointerCapture={stopHold} onContextMenu={ev => ev.preventDefault()}
          onClick={ev => { if (ev.detail === 0) { press(p.cardId); stopHold(); } }}>
          <img src={THUMB.get(p.cardId) ?? ''} alt="" draggable={false} />
          <i className={s.copies}>×{p.ids.length - n}</i>
          {n > 0 ? <em className={s.pickedChip}>+{n}</em> : o?.feedback ? <b className={s.pct}>+{o.feedback.addedPercent.label}%</b> : null}
          {hintPile === p.cardId && n === 0 && <span className={s.hint}><EnhanceIcon name="tap" /></span>}
        </button><button type="button" className={s.subtract} data-remove-material={p.cardId} aria-label="這種材料減一張" disabled={busy || blocked || n === 0} onClick={() => removeOne(p.cardId)}>−1</button></div>; })}
        {limits.piles.every(p => p.max <= 0) && <p role="status" className={s.noMaterial} data-no-material>{targetCopy?.stars?.maxed ? '五星已滿，不能再吃卡。' : '這張目前沒有可以吃的材料（鎖定主力不能當材料）。'}</p>}
        {limits.piles.every(p => p.max <= 0) && !targetCopy?.stars?.maxed && <div className={s.getCards} data-get-cards>
          <Link href={GAME_PATH.battle} className={s.textBtn}><EnhanceIcon name="sword" />神獸戰鬥</Link>
          <Link href={GAME_PATH.orb} className={s.textBtn}><EnhanceIcon name="bead" />寶石捷連線</Link>
        </div>}
      </div>}
      {ready && preview && <section aria-label="強化結果預覽" aria-live="polite"><GrowthPreview summary={preview.summary} /></section>}
      <div className={s.dock} data-dock>
        {feedError && <p role="alert" className={s.dockAlert} data-dock-alert>{feedError}</p>}
        {total > 0 && <p className={s.previewNote} data-preview-note>{ready && preview && preview.summary.addedBattleBonus === '0' ? '預覽・尚未消耗：比例成長還沒滿一點攻擊，進度會累積' : '預覽・尚未消耗'}</p>}
        <div className={s.dockRow}>
          <span className={s.sum} aria-label={`已加入 ${total} 張${preview && ready ? `，神獸戰鬥攻擊 +${preview.summary.addedBattleBonus}` : ''}`}>
            <span aria-hidden="true"><EnhanceIcon name="cards" />×<b data-hint-count={total > 0 ? '' : undefined}>{total}</b></span>
            <span aria-hidden="true" data-stale={ready ? undefined : 'true'}><EnhanceIcon name="sword" />+<b data-hint-attack>{ready && preview ? preview.summary.addedBattleBonus : '–'}</b></span>
          </span>
          <button type="button" className={s.iconBtn} data-cancel aria-label="清除已加入的卡" disabled={busy || total === 0} onClick={() => { picksRef.current = {}; setPicks({}); setPreview(null); }}><EnhanceIcon name="close" /></button>
          <button type="button" className={s.primary} data-confirm-fuse data-confirm-shared-fusion disabled={busy || !ready || blocked} onClick={() => setConfirmKey(key)}>{busy || (total > 0 && !ready) ? <EnhanceIcon name="wait" className={s.spin} /> : <EnhanceIcon name="check" />}強化</button>
        </div>
      </div>
      {confirmKey === key && ready && preview && !blocked && <ConfirmEnhancement summary={preview.summary} busy={busy} error={feedError} onCancel={() => setConfirmKey(null)} onConfirm={() => void fuse()} />}
    </section>}

    {step.kind === 'result' && target && <section className={s.result} data-result-step data-food-chain-feedback="saved" aria-live="polite" aria-label={`強化完成：吃了 ${step.summary.count} 張，神獸戰鬥攻擊 +${step.summary.addedBattleBonus}`}>
      <p className={s.resultLabel} data-fc-result-label>{step.summary.starsBefore && step.summary.starsAfter && step.summary.starsAfter.stars > step.summary.starsBefore.stars ? '升星成功・已保存' : '強化已保存'}</p>
      <div className={s.resultStage}>
        <span className={s.resultCard}><img src={target.thumb} alt="" /></span>
        {step.summary.materials.slice(0, 6).map((m, i) => <span key={m.cardId} className={s.fly} style={{ ['--i' as string]: i, ['--x' as string]: `${(i - Math.min(5, step.summary.materials.length - 1) / 2) * 44}px` }} aria-hidden="true"><img src={THUMB.get(m.cardId) ?? ''} alt="" /></span>)}
        <b className={s.plus} data-result-plus={step.summary.addedBattleBonus}>+{step.summary.addedBattleBonus}</b>
      </div>
      <div className={s.resultFacts} aria-hidden="true">
        <span><EnhanceIcon name="cards" />×{step.summary.count}</span>
        <span data-fc-orb><EnhanceIcon name="bead" />{step.summary.beforeOrbAttack}<EnhanceIcon name="up" className={s.rot} />{step.summary.afterOrbAttack}</span>
        <span data-fc-battle><EnhanceIcon name="sword" />{step.summary.beforeBattleAttack}<EnhanceIcon name="up" className={s.rot} />{step.summary.afterBattleAttack}</span>
        {step.summary.starsBefore && step.summary.starsAfter && step.summary.starsAfter.stars > step.summary.starsBefore.stars && <span data-star-up><EnhanceIcon name="star" />{step.summary.starsBefore.stars}<EnhanceIcon name="up" className={s.rot} />{step.summary.starsAfter.stars}</span>}
      </div>
      {step.summary.addedBattleBonus === '0' && <p className={s.resultNote} data-fc-zero>比例成長還沒滿一點攻擊，進度已累積</p>}
      <p className={s.resultNote} data-consumed-summary>已消耗材料 {step.summary.count} 張，{step.summary.targetName}保留。兩種遊戲共用成長。</p>
      <CardStarBar stars={step.summary.starsAfter} percent={step.summary.totalPercentAfter.label} />
      <div className={s.next} data-saved-growth>
        {step.summary.starsAfter?.toNext !== null && <button type="button" className={s.primary} data-again disabled={loading} onClick={() => openFeed(step.copyId, step.cardId)}><EnhanceIcon name="retry" />再強化</button>}
        <button type="button" className={s.textBtn} data-to-tree onClick={toTree}><EnhanceIcon name="cards" />看全部</button>
        {(from ? [from] : (['battle', 'orb'] as const)).map(f => <Link key={f} href={GAME_PATH[f]} className={s.textBtn} data-back-game={f}><EnhanceIcon name={f === 'battle' ? 'sword' : 'bead'} />{from ? GAME_LABEL[f] : GO_LABEL[f]}</Link>)}
      </div>
    </section>}
  </main>;
}
