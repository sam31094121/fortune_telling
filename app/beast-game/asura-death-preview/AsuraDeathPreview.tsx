'use client';
/**
 * 阿修羅死亡動畫「整合＋觸發」預覽（只在 3030 副本）。
 * 流程：按鈕 → POST 預覽伺服端 → 用回傳 HP 比對產生擊倒事件（deriveServerKnockouts）→ AsuraDeathHost 播放。
 * 沿用 Match3Board.module.css 的 .foe／.foeArt／.down，驗證「播放中不套 .down 45%、播完才套」的銜接。
 */
import { useEffect, useRef, useState } from 'react';
import styles from '@/components/battlefield/Match3Board.module.css';
import AsuraDeathHost from '@/components/battlefield/asura-death/AsuraDeathHost';
import { deriveServerKnockouts, reservedGuardianBossRule, type KnockoutEvent } from '@/lib/beast-game/match3/knockout-events';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import { seededRng, selectProgressionEnemies } from '@/lib/beast-game/match3';
import { RIG_IMPACT_MS } from '@/lib/beast-game/beast-rig';

interface PFoe { id: string; name: string; thumbnail: string; hp: number; maxHp: number }
const initialFoes = (): PFoe[] => playableCards().filter(c => c.form === 'ADULT').slice(0, 5).map(c => ({ id: c.id, name: c.name, thumbnail: c.art.thumbnail, hp: 100, maxHp: 100 }));
/** 關卡情境：用既有 selectProgressionEnemies（與 Match3Board.pickLineup 同一卡池）排出第 N 關陣容；HP 統一 100 只為預覽。 */
const stageFoes = (stageNo: number): PFoe[] => {
  const pool = playableCards().filter(c => CARD_FACE_STATS[c.id]);
  return selectProgressionEnemies(pool, seededRng(20261109 + stageNo), stageNo - 1).map(c => ({ id: c.id, name: c.name, thumbnail: c.art.thumbnail, hp: 100, maxHp: 100 }));
};

export default function AsuraDeathPreview() {
  const root = useRef<HTMLElement>(null);
  const [foes, setFoes] = useState<PFoe[]>(initialFoes);
  const [targetState, setTarget] = useState(0);
  const target = targetState;
  /** 0＝自由預覽（手動標魔王）；1～8＝第 N 關（rig 模式關卡序號＝wins+1）。 */
  const [stageState, setStageNo] = useState(0);
  const stageNo = stageState;
  const [bossIds, setBossIds] = useState<ReadonlySet<string>>(new Set());
  const [events, setEvents] = useState<KnockoutEvent[]>([]);
  const [hold, setHold] = useState<ReadonlySet<string>>(new Set());
  const [useImpactDelay, setUseImpactDelay] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [clicks, setClicks] = useState(0);
  /** 測試魔王保底逾時：把魔王 failsafe 縮成 800ms（正式 5600ms）。 */
  const [fastBossFailsafe, setFastBossFailsafe] = useState(false);
  /** v3 預熱（與 Match3Board 同規則：鎖定目標＋HP≤30%，不含魔王）；關掉＝量未預熱。 */
  const [prewarm, setPrewarm] = useState(true);
  /** 模擬 rig 模式 retiredFoes：開播 300ms 後就把卡片從 DOM 拿掉（比正式更嚴：正式要等 settled 才退場）。 */
  const [retireMidPlay, setRetireMidPlay] = useState(false);
  const [retired, setRetired] = useState<ReadonlySet<string>>(new Set());
  const action = useRef(0);
  const delays = useRef(new Map<string, number>());
  const push = (s: string) => setLog(l => [...l.slice(-40), `${(performance.now() / 1000).toFixed(2)}s ${s}`]);

  // 記錄每個特效層 data-state 變化（健康檢查證據）
  useEffect(() => {
    const seen = new WeakMap<Element, string>();
    const scan = () => document.querySelectorAll('[data-testid="asura-death-fx"],[data-testid="boss-death-fx"]').forEach(el => {
      const st = el.getAttribute('data-state') ?? '';
      if (seen.get(el) !== st) { seen.set(el, st); push(`${el.getAttribute('data-testid')} → ${st}${el.getAttribute('data-order') ? ` order=${el.getAttribute('data-order')}` : ''}`); }
    });
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state'] });
    return () => mo.disconnect();
  }, []);

  const strike = async (amount: number, o?: { foes?: PFoe[]; target?: number; stage?: number }) => {
    const actionId = `preview:${++action.current}`;
    const before = o?.foes ?? foes;
    const target = o?.target ?? targetState;
    const stageNo = o?.stage ?? stageState;
    const r = await fetch('/api/beast-game/asura-death-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foes: before.map(({ id, hp, maxHp }) => ({ id, hp, maxHp })), target, amount, actionId }) });
    if (!r.ok) { push('伺服端拒絕，未套用'); return; }
    const res = await r.json() as { actionId: string; foes: { id: string; hp: number }[] };
    const after = before.map(f => ({ ...f, hp: res.foes.find(x => x.id === f.id)?.hp ?? f.hp }));
    const ko = deriveServerKnockouts(before, after, { actionId: res.actionId, source: 'preview', isFinalBoss: (foe, i, all) => bossIds.has(foe.id) || reservedGuardianBossRule(stageNo)(foe, i, all) });
    ((window as unknown as { __pvEvents?: KnockoutEvent[] }).__pvEvents ??= []).push(...ko.map(e => ({ ...e, stageNo } as KnockoutEvent & { stageNo: number })));
    setFoes(after);
    push(`伺服端回合 ${res.actionId}：目標 HP ${before[target].hp}→${after[target].hp}，擊倒事件 ${ko.length}${ko.map(e => e.isFinalBoss ? '（魔王分支）' : '（一般）').join('')}`);
    if (!ko.length) return;
    ko.forEach(e => delays.current.set(e.id, useImpactDelay ? RIG_IMPACT_MS : 0));
    setHold(h => new Set([...h, ...ko.map(e => e.foeId)]));
    setEvents(list => [...list.filter(e => !ko.some(n => n.id === e.id)), ...ko]);
  };
  const reset = () => { setRetired(new Set()); setEvents([]); setHold(new Set()); setFoes(initialFoes()); setBossIds(new Set()); setTarget(0); setStageNo(0); push('重置'); };
  /** 一鍵一般擊倒：自由預覽陣容、第 1 張，伺服端扣到 0。 */
  const oneClickRegular = () => { const f = initialFoes(); setRetired(new Set()); setEvents([]); setHold(new Set()); setBossIds(new Set()); setStageNo(0); setFoes(f); setTarget(0); push('一鍵一般擊倒'); void strike(1000, { foes: f, target: 0, stage: 0 }); };
  /** 一鍵魔王擊倒：第 8 關陣容、前四張護衛已倒下（未播），殿後四大神獸由伺服端扣到 0。 */
  const oneClickBoss = () => { const f = stageFoes(8).map((x, i) => i < 4 ? { ...x, hp: 0 } : x); setEvents([]); setHold(new Set()); setBossIds(new Set()); setStageNo(8); setFoes(f); setTarget(4); push('一鍵魔王擊倒（第 8 關殿後神獸）'); void strike(1000, { foes: f, target: 4, stage: 8 }); };
  /** 重送同一擊倒事件（與 Match3Board.queueKnockouts 相同的以 id 去重）：不應重播。 */
  const resendLast = () => { const last = events.at(-1); if (!last) return; push(`重送同一擊倒事件 ${last.id}（不應重播）`); setEvents(list => [...list.filter(e => e.id !== last.id), { ...last }]); };
  const isBoss = (f: PFoe, i: number) => bossIds.has(f.id) || reservedGuardianBossRule(stageNo)(f, i, foes);
  const warm = prewarm ? foes.flatMap((f, i) => f.hp > 0 && !retired.has(f.id) && (i === target || f.hp <= f.maxHp * 0.3) && !isBoss(f, i) ? [{ foeId: f.id, foeIndex: i }] : []) : [];
  const loadStage = (n: number) => { setRetired(new Set()); setEvents([]); setHold(new Set()); setBossIds(new Set()); setTarget(0); setStageNo(n); const f = n ? stageFoes(n) : initialFoes(); setFoes(f); push(n ? `載入第 ${n} 關陣容：${f.map(x => x.name).join('、')}` : '自由預覽'); };

  return <main style={{ minHeight: '100vh', background: '#0c0b10', color: '#e8e1d3', padding: 12, fontSize: 13 }}>
    <section ref={root} className={styles.wrap} data-testid="asura-death-preview" style={{ paddingBottom: 16 }}>
      <h1 style={{ fontSize: 16, margin: '4px 0 8px' }}>阿修羅死亡動畫・整合預覽（3030 副本）</h1>
      <div className={styles.foes} data-testid="match3-enemies" style={{ gridTemplateColumns: `repeat(${foes.length}, minmax(0, 1fr))` }}>
        {foes.map((f, i) => retired.has(f.id) ? null : <button type="button" key={`${stageNo}:${f.id}`} data-testid="match3-enemy" data-id={f.id} data-hp={f.hp} data-hold={hold.has(f.id) || undefined}
          className={`${styles.foe} ${i === target ? styles.foeOn : ''} ${f.hp <= 0 && !hold.has(f.id) ? styles.down : ''}`} onClick={() => setTarget(i)}
          aria-pressed={i === target}>
          <div className={styles.foeArt} role="img" aria-label={f.name} data-rig-target>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.thumbnail} alt="" draggable={false} decoding="async" />
          </div>
          <div className={styles.foeName}>{f.name}{bossIds.has(f.id) || reservedGuardianBossRule(stageNo)(f, i, foes) ? '・魔王' : ''}</div>
          <div className={styles.foeHp}>{f.hp}/{f.maxHp}</div>
        </button>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
        <button type="button" data-testid="pv-graze" onClick={() => void strike(30)}>擦傷 30（不應播）</button>
        <button type="button" data-testid="pv-ko" onClick={() => void strike(1000)}>一般擊倒</button>
        <button type="button" data-testid="pv-boss" onClick={() => { const id = foes[target].id; setBossIds(s => new Set([...s, id])); push(`預覽：把 ${foes[target].name} 標成魔王（規格待定）`); }}>把目標標成魔王</button>
        <label><input type="checkbox" checked={useImpactDelay} onChange={e => setUseImpactDelay(e.target.checked)} data-testid="pv-delay" /> 延遲到 rig 命中（{RIG_IMPACT_MS}ms）</label>
        <button type="button" data-testid="pv-one-regular" onClick={oneClickRegular}>一鍵一般擊倒</button>
        <button type="button" data-testid="pv-one-boss" onClick={oneClickBoss}>一鍵魔王擊倒</button>
        <button type="button" data-testid="pv-resend-same" onClick={resendLast}>重送同一擊倒事件（不應重播）</button>
        <label><input type="checkbox" checked={prewarm} onChange={e => setPrewarm(e.target.checked)} data-testid="pv-prewarm" /> v3 預熱（鎖定＋HP≤30%）</label>
        <label><input type="checkbox" checked={retireMidPlay} onChange={e => setRetireMidPlay(e.target.checked)} data-testid="pv-retire" /> 模擬 rig 退場（開播 300ms 拿掉卡片）</label>
        <label><input type="checkbox" checked={fastBossFailsafe} onChange={e => setFastBossFailsafe(e.target.checked)} data-testid="pv-boss-failsafe" /> 魔王保底逾時測試（800ms）</label>
        <label>情境 <select data-testid="pv-stage" value={stageNo} onChange={e => loadStage(Number(e.target.value))}
          style={{ background: '#1b2028', color: '#f6e9cd', border: '1px solid #b9a77a', borderRadius: 6, padding: '4px 6px', fontSize: 14 }}>
          <option value={0} style={{ background: '#1b2028', color: '#f6e9cd' }}>自由預覽</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n} style={{ background: '#1b2028', color: '#f6e9cd' }}>第 {n} 關{n === 8 ? '（殿後神獸＝魔王）' : ''}</option>)}
        </select></label>
        <button type="button" data-testid="pv-reset" onClick={reset}>重置</button>
        <button type="button" data-testid="pv-click" onClick={() => setClicks(c => c + 1)}>穿透點擊 {clicks}</button>
      </div>
      <ol data-testid="pv-log" style={{ fontSize: 11, lineHeight: 1.5, paddingLeft: 18, maxHeight: 260, overflow: 'auto' }}>{log.map((l, i) => <li key={i}>{l}</li>)}</ol>
      <AsuraDeathHost events={events} root={root} startDelayMs={ev => delays.current.get(ev.id) ?? 0} warm={warm} srcOf={id => foes.find(f => f.id === id)?.thumbnail}
        failsafeMs={{ regular: 3400, boss: fastBossFailsafe ? 800 : 5600 }}
        onEventStart={ev => { push(`onStart ${ev.isFinalBoss ? '魔王' : '一般'} ${ev.foeId}`); if (retireMidPlay && !ev.isFinalBoss) window.setTimeout(() => { setRetired(s => new Set([...s, ev.foeId])); push(`退場：${ev.foeId} 卡片已從 DOM 拿掉`); }, 300); }}
        onEventDone={(ev, info) => push(`onDone ${ev.foeId} ${info.durationMs}ms${info.order ? ` order=${info.order.join('-')}` : ''}${info.placeholder ? '（占位）' : ''}${info.cancelled ? '（取消）' : ''}`)}
        onSettled={ev => { setHold(h => { const n = new Set(h); n.delete(ev.foeId); return n; }); push(`settled ${ev.foeId}：恢復 .down 45%`); }} />
    </section>
  </main>;
}
