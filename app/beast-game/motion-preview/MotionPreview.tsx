'use client';
/**
 * 寶珠動效預覽（v0.8 動效組）。
 * - 盤面、補珠、敵人血量、能量與傷害都是「示範」：數值來自 lib/beast-game/motion-demo-config.ts（可調整預設值），
 *   不是引擎邏輯；正式盤面邏輯由 Grok Bot 負責，正式傷害由引擎計算。
 * - 下方五張卡：每個元素各一張「正式卡」，唯讀從 playableCards()/getCard() 取得；沒有就顯示空位，絕不用示範卡或舊卡。
 * - 規則：拖曳連線；3+ 攻擊（畫面強度上限 10）；4+ 生成魔珠（magicPower = N，不設上限）；剛好 5 顆 = 五珠技。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import BeadFx, { type BeadFxEvent } from '@/components/motion/BeadFx';
import {
  BEAD_ELEMENTS, ELEMENT_LABEL, ELEMENT_PALETTE, effectivePower, magicGlow, magicPowerFor, skill5For, type BeadElement,
} from '@/lib/beast-game/element-palette';
import { MOTION_DEMO_CONFIG as CFG, attackerFor, coverage, demoHit, demoSkillHit, energyGains, type Selection, type TeamSlot } from '@/lib/beast-game/motion-demo-config';
import { getCard, playableCards } from '@/lib/beast-game/registry';
import s from './MotionPreview.module.css';

const COLS = 7;
const ROWS = 5;
const COUNTS = [3, 4, 5, 6, 8, 10, 12];
const CASCADES = [1, 2, 3];
const ENEMIES = ['示範敵人 A', '示範敵人 B', '示範敵人 C'];

function seeded(seed: number) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; };
}
function makeBoard(seed: number): BeadElement[] {
  const r = seeded(seed);
  return Array.from({ length: COLS * ROWS }, () => { const v = r(); return v < .3 ? 'AIR' : v < .56 ? 'SPACE' : BEAD_ELEMENTS[2 + Math.floor(r() * 3)]; });
}
const adjacent = (a: number, b: number) => Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) + Math.abs((a % COLS) - (b % COLS)) === 1;

/** 可選的正式卡池（唯讀 playableCards()/getCard()）；不使用示範卡或舊卡。 */
type PoolCard = TeamSlot & { name: string; thumb: string };
function officialPool(): PoolCard[] {
  return playableCards().map((c) => getCard(c.id)).filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ id: c.id, element: c.element as BeadElement, name: c.name, thumb: c.art.thumbnail }))
    .sort((a, b) => BEAD_ELEMENTS.indexOf(a.element) - BEAD_ELEMENTS.indexOf(b.element) || a.id.localeCompare(b.id));
}

type Float = { id: number; text: string; color: string; idx: number };

export default function MotionPreview() {
  const pool = useMemo(officialPool, []);
  const [picks, setPicks] = useState<string[]>([]);
  const [team, setTeam] = useState<PoolCard[] | null>(null);
  const [selected, setSelected] = useState<Selection>({});
  const slots = team ?? [];
  const [events, setEvents] = useState<BeadFxEvent[]>([]);
  const [eligibleToggle, setEligibleToggle] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [energy, setEnergy] = useState<number[]>(() => Array(CFG.teamSize).fill(0));
  const [hp, setHp] = useState<number[]>(ENEMIES.map(() => CFG.enemyHp));
  const [enemyFloats, setEnemyFloats] = useState<Float[]>([]);
  const [cardFloats, setCardFloats] = useState<Float[]>([]);
  const [attacking, setAttacking] = useState<number | null>(null);
  const [skill5Card, setSkill5Card] = useState<number | null>(null);
  const [hitEnemy, setHitEnemy] = useState<number | null>(null);
  const [fxOrigin, setFxOrigin] = useState({ x: 50, y: 58 });
  const [fxTarget, setFxTarget] = useState({ x: 0, y: -160 });
  const seq = useRef(0);
  const arenaRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const enemyRefs = useRef<(HTMLDivElement | null)[]>([]);

  const attackerOf = (el: BeadElement) => attackerFor(slots, el, selected);
  const aliveTarget = () => { const i = hp.findIndex((h) => h > 0); return i < 0 ? 0 : i; };

  /** 依爆點（覆蓋層 %）算彈道到目標敵人的位移。 */
  const aim = (originPct: { x: number; y: number }, enemy: number) => {
    const a = arenaRef.current?.getBoundingClientRect(); const e = enemyRefs.current[enemy]?.getBoundingClientRect();
    if (!a || !e) return;
    const ox = a.left + (a.width * originPct.x) / 100, oy = a.top + (a.height * originPct.y) / 100;
    setFxOrigin(originPct); setFxTarget({ x: e.left + e.width / 2 - ox, y: e.top + e.height / 2 - oy });
  };
  const floatOn = (setter: typeof setEnemyFloats, f: Omit<Float, 'id'>) => {
    const id = ++seq.current; setter((x) => [...x, { ...f, id }]);
    window.setTimeout(() => setter((x) => x.filter((y) => y.id !== id)), 1100);
  };

  const fire = useCallback((ev: BeadFxEvent, originPct = { x: 50, y: 62 }) => {
    const target = aliveTarget();
    aim(originPct, target);
    setEvents((x) => [...x.slice(-10), ev]);
    (window.__match3Events ??= []).push(ev);
    console.log('[motion-demo]', ev);
    const h = demoHit(ev.count, ev.magic ? ev.magicPower ?? 0 : 0);
    const atk = attackerOf(ev.element);
    if (ev.eligible && atk >= 0) {
      setAttacking(atk); window.setTimeout(() => setAttacking(null), 420);
      window.setTimeout(() => {
        setHp((x) => x.map((v, i) => (i === target ? Math.max(0, v - h.total) : v)));
        setHitEnemy(target); window.setTimeout(() => setHitEnemy(null), 300);
        floatOn(setEnemyFloats, { text: `-${h.total}${ev.magic ? '!' : ''}`, color: ev.magic ? '#ffd76a' : ELEMENT_PALETTE[ev.element], idx: target });
      }, 520);
      const gains = energyGains(slots, ev.element, selected, ev.count, energy);
      setEnergy((x) => x.map((v, i) => Math.min(CFG.energyMax, v + (gains[i] ?? 0))));
      gains.forEach((g, i) => { if (g > 0) floatOn(setCardFloats, { text: i === atk && h.fillEnergy ? '能量全滿' : `+${g}`, color: ELEMENT_PALETTE[ev.element], idx: i }); });
      if (ev.skill5) { setSkill5Card(atk); window.setTimeout(() => setSkill5Card(null), 1100); }
    }
    setLog((g) => [
      `${ELEMENT_LABEL[ev.element]} ${ev.count} 顆（一般強度 ${effectivePower(ev.count)}）${ev.magic ? `＋魔珠 ${ev.magicPower}` : ''}${ev.skill5 ? '・五珠技' : ''}・第 ${ev.cascadeStep} 連鎖・${ev.eligible && atk >= 0 ? `${slots[atk].name}出手・傷害 ${h.total}` : '沒有同元素卡・不攻擊'}`,
      ...g,
    ].slice(0, 8));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp, slots, selected, energy]);

  const scripted = (el: BeadElement, count: number, cascadeStep: number, magicPower = 0) =>
    fire({ element: el, count, cascadeStep, eligible: eligibleToggle && attackerOf(el) >= 0, skill5: skill5For(count), magic: magicPower > 0, magicPower });

  const castSkill = (slot: number) => {
    const el = slots[slot]?.element;
    if (!el || energy[slot] < CFG.energyMax) return;
    setEnergy((x) => x.map((v, i) => (i === slot ? 0 : v)));
    const target = aliveTarget(); aim({ x: 50, y: 88 }, target);
    const ev: BeadFxEvent = { element: el, count: 10, cascadeStep: 1, eligible: true, magic: true, magicPower: 0 };
    setEvents((x) => [...x.slice(-10), ev]);
    setAttacking(slot); window.setTimeout(() => setAttacking(null), 420);
    const dmg = demoSkillHit();
    window.setTimeout(() => {
      setHp((x) => x.map((v, i) => (i === target ? Math.max(0, v - dmg) : v)));
      setHitEnemy(target); window.setTimeout(() => setHitEnemy(null), 300);
      floatOn(setEnemyFloats, { text: `技能 -${dmg}`, color: ELEMENT_PALETTE[el], idx: target });
    }, 520);
    setLog((g) => [`${slots[slot].name}（${ELEMENT_LABEL[el]}）發動技能・傷害 ${dmg}`, ...g].slice(0, 8));
  };

  // ----- 拖曳連線盤 -----
  const [seed, setSeed] = useState(20261029);
  const [board, setBoard] = useState<BeadElement[]>(() => makeBoard(20261029));
  const [magic, setMagic] = useState<number[]>(() => Array(COLS * ROWS).fill(0));
  const [spawning, setSpawning] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [shake, setShake] = useState(false);
  const dragging = useRef(false);
  const pathRef = useRef<number[]>([]);
  useEffect(() => { pathRef.current = path; }, [path]);
  const reshuffle = (n: number) => { setSeed(n); setBoard(makeBoard(n)); setMagic(Array(COLS * ROWS).fill(0)); };

  const cellAt = (x: number, y: number): number | null => {
    const el = boardRef.current; if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = Math.floor(((x - r.left) / r.width) * COLS), row = Math.floor(((y - r.top) / r.height) * ROWS);
    if (c < 0 || c >= COLS || row < 0 || row >= ROWS) return null;
    const cx = r.left + (c + .5) * (r.width / COLS), cy = r.top + (row + .5) * (r.height / ROWS);
    if (Math.hypot(x - cx, y - cy) > (r.width / COLS) * .45) return null;
    return row * COLS + c;
  };
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    const i = cellAt(e.clientX, e.clientY); if (i === null) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragging.current = true; setPath([i]);
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const i = cellAt(e.clientX, e.clientY); if (i === null) return;
    setPath((p) => {
      if (!p.length || p[p.length - 1] === i) return p;
      if (p.length >= 2 && p[p.length - 2] === i) return p.slice(0, -1);
      if (p.includes(i) || !adjacent(p[p.length - 1], i) || board[i] !== board[p[0]]) return p;
      return [...p, i];
    });
  };
  const up = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const p = pathRef.current;
    setPath([]);
    if (p.length < 3) {
      if (p.length) { setShake(true); window.setTimeout(() => setShake(false), 380); }
      return;
    }
    const element = board[p[0]];
    const usedMagic = p.reduce((a, i) => a + magic[i], 0);
    const br = boardRef.current?.getBoundingClientRect(), ar = arenaRef.current?.getBoundingClientRect();
    let origin = { x: 50, y: 62 };
    if (br && ar) {
      const cx = p.reduce((a, i) => a + (i % COLS) + .5, 0) / p.length, cy = p.reduce((a, i) => a + Math.floor(i / COLS) + .5, 0) / p.length;
      origin = { x: ((br.left - ar.left + (cx / COLS) * br.width) / ar.width) * 100, y: ((br.top - ar.top + (cy / ROWS) * br.height) / ar.height) * 100 };
    }
    fire({ element, count: p.length, cascadeStep: 1, eligible: eligibleToggle && attackerOf(element) >= 0, skill5: skill5For(p.length), magic: usedMagic > 0, magicPower: usedMagic }, origin);
    // 示範補珠（不是引擎掉落邏輯）；4+ 在最後一顆的位置生成魔珠
    const r = seeded(seed + p.length * 7919 + p[0] + Date.now() % 997);
    const spawnAt = p[p.length - 1];
    const mp = magicPowerFor(p.length);
    setBoard((b) => b.map((e, i) => (i === spawnAt && mp ? element : p.includes(i) ? BEAD_ELEMENTS[Math.floor(r() * 5)] : e)));
    setMagic((m) => m.map((v, i) => (i === spawnAt && mp ? mp : p.includes(i) ? 0 : v)));
    if (mp) { setSpawning(spawnAt); window.setTimeout(() => setSpawning(null), 700); }
  };
  const pathColor = path.length ? ELEMENT_PALETTE[board[path[0]]] : '#fff';
  const pts = path.map((i) => `${(i % COLS) * 10 + 5},${Math.floor(i / COLS) * 10 + 5}`).join(' ');

  if (!team) {
    const chosen = picks.map((id) => pool.find((c) => c.id === id)!).filter(Boolean);
    const cv = coverage(chosen, BEAD_ELEMENTS);
    const missing = BEAD_ELEMENTS.filter((e) => !cv[e]);
    const toggle = (id: string) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= CFG.teamSize ? p : [...p, id]));
    return (
      <main className={s.page} data-testid="team-picker">
        <h1 className={s.title}>選擇出戰卡 <span className={s.badge}>預覽版・非正式玩法</span></h1>
        <p className={s.note}>從正式卡中選 {CFG.teamSize} 張（可同元素）。已選 <b data-testid="pick-count">{chosen.length}</b> / {CFG.teamSize}</p>
        <div className={s.row} data-testid="coverage">
          {BEAD_ELEMENTS.map((e) => <span key={e} data-element={e} data-n={cv[e]} style={{ color: ELEMENT_PALETTE[e], opacity: cv[e] ? 1 : .45 }}>{ELEMENT_LABEL[e]}×{cv[e]}</span>)}
        </div>
        {chosen.length > 0 && missing.length > 0 && <p className={s.note} data-testid="no-attacker-warning">⚠ {missing.map((e) => ELEMENT_LABEL[e]).join('、')}沒有出手卡：消這些顏色不會攻擊（仍可出戰）</p>}
        {chosen.length === CFG.teamSize && <button type="button" data-testid="start-battle" onClick={() => { setTeam(chosen); setSelected({}); setEnergy(Array(CFG.teamSize).fill(0)); }}>開始戰鬥</button>}
        <div className={s.cards} style={{ flexWrap: 'wrap' }} data-testid="pool">
          {pool.map((c) => {
            const on = picks.includes(c.id);
            return (
              <button key={c.id} type="button" onClick={() => toggle(c.id)} data-card-id={c.id} data-element={c.element} aria-pressed={on}
                className={s.card} style={{ '--c': ELEMENT_PALETTE[c.element], opacity: on || picks.length < CFG.teamSize ? 1 : .4, outline: on ? '3px solid #fff' : 'none' } as CSSProperties}
                aria-label={`${ELEMENT_LABEL[c.element]}・${c.name}${on ? '・已選' : ''}`}>
                <img src={c.thumb} alt="" className={s.cardArt} draggable={false} />
                <span className={s.cardEl}>{ELEMENT_LABEL[c.element]}{on ? '✓' : ''}</span>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  return (
    <main className={s.page} data-testid="motion-preview">
      <h1 className={s.title}>寶珠動效預覽 <span className={s.badge}>預覽版・非正式玩法</span></h1>
      <p className={s.note}>拖曳連線，3 顆以上攻擊（畫面強度上限 10）；4 顆以上生成魔珠（強度 = 顆數，不設上限）；剛好 5 顆觸發五珠技（能量補滿）。數值是可調整的示範預設，真正傷害以引擎為準。</p>

      <div ref={arenaRef} className={s.arena} data-testid="stage">
        <div className={s.enemies}>
          {ENEMIES.map((name, i) => (
            <div key={name} ref={(el) => { enemyRefs.current[i] = el; }} className={`${s.enemy} ${hitEnemy === i ? s.enemyHit : ''} ${hp[i] <= 0 ? s.enemyDown : ''}`} data-testid={`enemy-${i}`}>
              <div className={s.enemyName}>{name}</div>
              <div className={s.hpBar}><i style={{ transform: `scaleX(${hp[i] / CFG.enemyHp})` }} /></div>
              <div className={s.hpText} data-testid={`enemy-hp-${i}`}>{hp[i]} / {CFG.enemyHp}</div>
              {enemyFloats.filter((f) => f.idx === i).map((f) => <span key={f.id} className={s.dmg} style={{ color: f.color }}>{f.text}</span>)}
            </div>
          ))}
        </div>

        <div className={s.boardHead}>
          <span>按住一顆珠，逐顆拖過相鄰同色珠，放開發動（拖回上一顆可撤銷）</span>
          <button type="button" onClick={() => reshuffle(seed + 1)}>重洗</button>
          <button type="button" data-testid="change-team" onClick={() => setTeam(null)}>換隊</button>
        </div>
        <div ref={boardRef} className={`${s.board} ${shake ? s.shake : ''}`} data-testid="drag-board"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {board.map((e, i) => {
            const k = path.indexOf(i);
            const m = magic[i];
            return (
              <div key={i} data-idx={i} data-elem={e} data-magic-power={m || undefined}
                className={`${s.bead} ${k >= 0 ? s.linked : ''} ${m ? s.magicBead : ''} ${spawning === i ? s.spawn : ''}`}
                style={{ '--c': ELEMENT_PALETTE[e], '--n': Math.min(Math.max(k, 0), 9), '--mg': magicGlow(m).toFixed(3) } as CSSProperties}>
                <span>{ELEMENT_LABEL[e]}</span>
                {m > 0 && <b className={s.magicBadge}>{m}</b>}
              </div>
            );
          })}
          <svg className={s.link} viewBox="0 0 70 50" preserveAspectRatio="none" aria-hidden="true">
            {path.length > 1 && <polyline points={pts} style={{ stroke: pathColor }} />}
          </svg>
        </div>
        <div className={s.count} data-testid="drag-count">{path.length ? `已連 ${path.length} 顆${path.length < 3 ? '（至少 3 顆）' : path.length === 5 ? '・五珠技' : path.length >= 4 ? '・會生成魔珠' : ''}` : '　'}</div>

        <div className={s.cards} data-testid="card-row">
          {slots.map((card, i) => {
            const el = card.element;
            const full = energy[i] >= CFG.energyMax;
            const isSel = attackerOf(el) === i;
            const tap = () => { if (full && isSel) castSkill(i); else setSelected((x) => ({ ...x, [el]: i })); };
            return (
              <button key={card.id + i} type="button" onClick={tap} data-element={el} data-card-id={card.id} data-selected={isSel} data-testid={`team-${i}`}
                className={`${s.card} ${attacking === i ? s.cardAttack : ''} ${full ? s.cardReady : ''} ${skill5Card === i ? s.cardSkill5 : ''}`}
                style={{ '--c': ELEMENT_PALETTE[el], outline: isSel ? '2px solid #fff' : 'none', outlineOffset: 2 } as CSSProperties}
                aria-pressed={isSel} aria-label={`${ELEMENT_LABEL[el]}・${card.name}${isSel ? '・出手卡' : '・點一下設為出手卡'}${full ? '・技能就緒' : ''}`}>
                <img src={card.thumb} alt="" className={s.cardArt} draggable={false} />
                <span className={s.cardEl}>{ELEMENT_LABEL[el]}{isSel ? '★' : ''}</span>
                <span className={s.energy}><i style={{ transform: `scaleX(${energy[i] / CFG.energyMax})` }} /></span>
                {full && <span className={s.readyTag}>技能</span>}
                {cardFloats.filter((f) => f.idx === i).map((f) => <span key={f.id} className={s.plus} style={{ color: f.color }}>{f.text}</span>)}
              </button>
            );
          })}
        </div>

        <BeadFx events={events} listenWindow={false} origin={fxOrigin} target={fxTarget} />
      </div>

      <label className={s.toggle}><input type="checkbox" checked={eligibleToggle} onChange={(e) => setEligibleToggle(e.target.checked)} data-testid="eligible" /> 有可出手神獸（eligible）</label>

      <section className={s.buttons} data-testid="scripted">
        {(['AIR', 'SPACE'] as BeadElement[]).map((el) => (
          <div key={el} className={s.group}>
            <b style={{ color: ELEMENT_PALETTE[el] }}>{ELEMENT_LABEL[el]}（專屬特效）</b>
            {CASCADES.map((c) => (
              <div key={c} className={s.row}>
                <span>連鎖 {c}</span>
                {COUNTS.map((n) => (
                  <button key={n} type="button" data-testid={`fx-${el}-${n}-${c}`} onClick={() => scripted(el, n, c)}>{n === 5 ? '5 五珠技' : `${n} 顆`}</button>
                ))}
              </div>
            ))}
            <div className={s.row}>
              <span>魔珠</span>
              {[4, 6, 12].map((mp) => (
                <button key={mp} type="button" data-testid={`fx-${el}-magic-${mp}`} onClick={() => scripted(el, 3, 1, mp)}>3＋魔珠{mp}</button>
              ))}
            </div>
          </div>
        ))}
        <div className={s.group}>
          <b>水／火／地（通用特效，同一路徑）</b>
          <div className={s.row}>
            {(['WATER', 'FIRE', 'EARTH'] as BeadElement[]).map((el) => (
              <button key={el} type="button" data-testid={`fx-${el}-4-1`} onClick={() => scripted(el, 4, 1)} style={{ color: ELEMENT_PALETTE[el] }}>{ELEMENT_LABEL[el]} 4 顆</button>
            ))}
            <button type="button" onClick={() => { setHp(ENEMIES.map(() => CFG.enemyHp)); setEnergy(Array(CFG.teamSize).fill(0)); }}>重置敵人／能量</button>
          </div>
        </div>
      </section>
      <ol className={s.log} data-testid="log">{log.map((l, i) => <li key={i}>{l}</li>)}</ol>
    </main>
  );
}
