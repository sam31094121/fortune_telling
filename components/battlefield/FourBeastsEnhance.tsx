'use client';
/**
 * 四大神獸強化頁：只負責畫。所有計數、誰能吃誰、能不能強化、加多少，都來自 GET /api/beast-game/four-beasts；
 * 確認強化走既有 /api/beast-game/cultivation FUSE（伺服器交易），成功後重新讀伺服器結果，不在前端加減。
 * 關係只用圖示與動畫表達（小卡往上飛進大卡），不放規則說明文字。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sharedRequest, syncSharedCultivation, sharedWalletHeaders } from '@/lib/beast-cultivation-client';
import type { FourBeastsView, EnhanceMaterial, EnhanceNode } from '@/lib/beast-game/four-beasts-view';
import s from './FourBeastsEnhance.module.css';

const ELEMENT_CLASS: Record<string, string> = { AIR: s.air, FIRE: s.fire, SPACE: s.space, WATER: s.water };

function Icon({ name }: { name: 'up' | 'lock' | 'empty' | 'wait' | 'stop' | 'sword' | 'bead' | 'cards' | 'check' | 'back' }) {
  const d = {
    up: 'M12 19V6 M6 11l6-6 6 6',
    lock: 'M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z',
    empty: 'M5 3h14v18H5z',
    wait: 'M7 3h10 M7 21h10 M8 3c0 5 8 5 8 9s-8 4-8 9 M16 3c0 5-8 5-8 9',
    stop: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M6 6l12 12',
    sword: 'M4 3l3 1 12 13-2 2L4 6z M3 17l4 4 M5 19l-2 2',
    bead: 'M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M6 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M18 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
    cards: 'M8 4h11v15H8z M5 7v14h11',
    check: 'M4 12l5 5L20 6',
    back: 'M15 5l-7 7 7 7',
  }[name];
  return <svg className={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

const STATUS_ICON = { READY: 'up', LOCKED: 'lock', NO_TARGET: 'empty', NO_MAIN: 'lock', PENDING: 'wait', BLOCKED: 'stop' } as const;
const STATUS_LABEL = { READY: '可強化', LOCKED: '主力鎖定中', NO_TARGET: '還沒有對應的大卡', NO_MAIN: '請先鎖定五隻主力', PENDING: '戰鬥尚未結算', BLOCKED: '目前不能強化' } as const;

function Node({ node, size, hot, sel }: { node: EnhanceNode; size: 'big' | 'mid' | 'small'; hot?: boolean; sel?: boolean }) {
  return <span className={`${s.node} ${s[size]} ${node.owned ? '' : s.unowned} ${node.ready ? s.ready : ''} ${hot ? s.hot : ''} ${sel ? s.sel : ''}`} data-card={node.cardId} data-owned={node.owned} data-ready={node.ready}>
    <img src={node.thumb} alt="" draggable={false} loading="lazy" decoding="async" />
    {node.owned > 0 && BigInt(node.bonus) > 0n && <b className={s.bonus}>+{node.bonus}</b>}
    {node.owned > 1 && <i className={s.copies}>×{node.owned}</i>}
    {node.ready > 0 && <em className={s.readyDot} aria-hidden="true">{node.ready}</em>}
  </span>;
}

export default function FourBeastsEnhance() {
  const [view, setView] = useState<FourBeastsView | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [guardian, setGuardian] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [eating, setEating] = useState<EnhanceMaterial | null>(null);
  const operation = useRef<string | null>(null);

  const load = useCallback(async (sync: boolean) => {
    setBusy(true);
    try {
      if (sync) await syncSharedCultivation();
      const r = await fetch('/api/beast-game/four-beasts', { headers: sharedWalletHeaders(), cache: 'no-store', signal: AbortSignal.timeout(20000) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? '卡庫暫時無法取得。');
      setView(j.view); setError('');
      return j.view as FourBeastsView;
    } catch (e) { setError(e instanceof Error && /[\u3400-\u9fff]/.test(e.message) ? e.message : '卡庫暫時無法取得，請重試。'); return null; }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(true).then(v => { if (v) { const i = v.guardians.findIndex(g => g.ready || g.mansions.some(m => m.ready)); if (i > 0) setGuardian(i); } }); }, [load]);

  const g = view?.guardians[guardian];
  const pick = view?.materials.find(m => m.copyId === picked) ?? null;
  const tray = view ? view.materials.filter(m => g && (m.targetCardId === g.cardId || g.mansions.some(x => x.cardId === m.targetCardId))) : [];

  const fuse = async () => {
    if (!view || !pick || pick.status !== 'READY' || !pick.targetCopyId || busy) return;
    setBusy(true); setError(''); operation.current ??= crypto.randomUUID();
    try {
      await navigator.locks.request('tdh-beast-collection', { ifAvailable: true }, lock => {
        if (!lock) throw new Error('另一分頁正在戰鬥或保存，請先完成。');
        return sharedRequest({ type: 'FUSE', revision: view.revision, operationId: operation.current, choices: [{ targetId: pick.targetCopyId, materialId: pick.copyId }] });
      });
      operation.current = null; setEating(pick); setPicked(null);
      window.setTimeout(() => setEating(null), 1100);
      await load(false);
    } catch (e) { setError(e instanceof Error ? e.message : '尚未確認保存，請重試同一次操作。'); }
    finally { setBusy(false); }
  };

  return <main className={s.page} data-four-beasts>
    <header className={s.top}>
      <Link href="/star-beasts" className={s.back} aria-label="回到星宿神獸卡片"><Icon name="back" /></Link>
      <h1 className={s.title}>四大神獸</h1>
      <p className={s.count} data-enhanceable-count={view?.enhanceableCount ?? ''} aria-label={view ? `可強化 ${view.enhanceableCount} 張` : '讀取中'}>
        <Icon name="cards" /><strong>{view ? view.enhanceableCount : '–'}</strong>
      </p>
    </header>
    <div className={s.sources} aria-label="卡片來源">
      <span data-source="duel" aria-label={`神獸戰鬥贏得 ${view?.sources.duel ?? 0} 張`}><Icon name="sword" />{view?.sources.duel ?? '–'}</span>
      <span data-source="orb" aria-label={`寶珠連線贏得 ${view?.sources.orb ?? 0} 張`}><Icon name="bead" />{view?.sources.orb ?? '–'}</span>
    </div>

    {error && <p role="alert" className={s.alert}>{error}<button type="button" disabled={busy} onClick={() => void load(true)}>重新讀取</button></p>}
    {view && !view.mainTeamReady && <p role="status" className={s.notice}><Icon name="lock" /><Link href="/beast-game/match3-hard">先鎖定五隻主力</Link></p>}
    {view?.pendingBattle && <p role="status" className={s.notice}><Icon name="wait" /><Link href="/beast-game/match3-hard">回到未結束的戰鬥</Link></p>}

    <nav className={s.tabs} aria-label="四大神獸">
      {(view?.guardians ?? [null, null, null, null]).map((x, i) => <button key={x?.key ?? i} type="button" disabled={!x} aria-pressed={i === guardian} aria-label={x ? `四大神獸 ${i + 1}` : '讀取中'} onClick={() => { setGuardian(i); setPicked(null); }} className={`${s.tab} ${x ? ELEMENT_CLASS[x.element] : ''}`}>
        {x ? <><img src={x.thumb} alt="" draggable={false} />{(x.ready + x.mansions.reduce((n, m) => n + m.ready, 0)) > 0 && <em className={s.readyDot}>{x.ready + x.mansions.reduce((n, m) => n + m.ready, 0)}</em>}</> : <span className={s.skeleton} />}
      </button>)}
    </nav>

    <section className={`${s.tree} ${g ? ELEMENT_CLASS[g.element] : ''}`} aria-label="強化層級" aria-busy={!view}>
      <div className={s.crown}>{g ? <Node node={g} size="big" hot={pick?.targetCardId === g.cardId} /> : <span className={`${s.node} ${s.big} ${s.skeleton}`} />}</div>
      <div className={s.flowRow} aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i} className={`${s.flow} ${g && g.mansions[i] && view?.materials.some(x => x.cardId === g.mansions[i].cardId && x.targetCardId === g.cardId && x.status === 'READY') ? s.flowOn : ''}`}><Icon name="up" /></span>)}</div>
      <div className={s.row}>{(g?.mansions ?? Array.from({ length: 7 }, () => null)).map((m, i) => m ? <Node key={m.cardId} node={m} size="mid" hot={pick?.targetCardId === m.cardId} sel={pick?.cardId === m.cardId} /> : <span key={i} className={`${s.node} ${s.mid} ${s.skeleton}`} />)}</div>
      <div className={s.flowRow} aria-hidden="true">{(g?.mansions ?? Array.from({ length: 7 }, () => null)).map((m, i) => <span key={i} className={`${s.flow} ${m && m.ready ? s.flowOn : ''}`}><Icon name="up" /></span>)}</div>
      <div className={s.row}>{(g?.mansions ?? Array.from({ length: 7 }, () => null)).map((m, i) => m ? <Node key={m.young.cardId} node={m.young} size="small" sel={pick?.cardId === m.young.cardId} /> : <span key={i} className={`${s.node} ${s.small} ${s.skeleton}`} />)}</div>
      {eating && <span className={s.eat} aria-hidden="true"><img src={eating.thumb} alt="" /></span>}
    </section>

    <section className={s.trayWrap} aria-label="可用的卡片">
      <div className={s.tray}>
        {tray.length === 0 && view && <span className={s.trayEmpty} aria-label="這一組目前沒有卡片"><Icon name="empty" /><Icon name="sword" /><Icon name="bead" /></span>}
        {tray.map(m => <button key={m.copyId} type="button" className={`${s.mat} ${m.status === 'READY' ? s.matReady : s.matOff}`} data-material={m.copyId} data-status={m.status} aria-pressed={picked === m.copyId} aria-label={`${STATUS_LABEL[m.status]}`} disabled={busy} onClick={() => setPicked(p => p === m.copyId ? null : m.copyId)}>
          <img src={m.thumb} alt="" draggable={false} loading="lazy" />
          <span className={s.matSource}><Icon name={m.source === 'DUEL' ? 'sword' : 'bead'} /></span>
          <span className={s.matStatus}><Icon name={STATUS_ICON[m.status]} /></span>
        </button>)}
      </div>
    </section>

    <div className={s.dock}>
      {pick && <div className={s.preview} data-preview aria-live="polite">
        <img src={pick.thumb} alt="" />
        <span className={s.arrow}><Icon name="up" /></span>
        <img className={s.previewBig} src={view?.guardians.flatMap(x => [x, ...x.mansions]).find(n => n.cardId === pick.targetCardId)?.thumb} alt="" />
        {pick.addedBonus && <b className={s.plus}>+{pick.addedBonus}</b>}
      </div>}
      <button type="button" className={s.go} data-fuse disabled={!pick || pick.status !== 'READY' || busy} onClick={() => void fuse()} aria-label="確認強化"><Icon name="check" /><span>強化</span></button>
    </div>
  </main>;
}
