'use client';
/**
 * 神獸戰隊 v0.8｜五元素三消戰場（獨立入口 /beast-game/match3，旗標預設關閉）
 * 10/30 規則：手指／滑鼠拖過相鄰同色珠，放開才發動；3 顆以上消除，4 顆以上生成魔法珠，剛好 5 顆五珠技。
 * 五元素各一張卡：消哪色充哪張卡能量；只有主屬性相同的卡出手。敵方每 3 步反擊。
 * 卡面只引用 BeastCardFace（全站統一完整卡面），數值只讀 card-face-stats（不改）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BeastCardFace } from './BeastCardTile';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import type { BeastElement } from '@/lib/beast-game/elements';
import {
  ENEMY_COUNTER_EVERY, ENERGY_MAX, MAGIC_ORB_MIN_LENGTH, MATCH3_ORB_ELEMENTS, MATCH3_ORB_LABEL, NORMAL_POWER_CAP, SKILL5_LENGTH,
  attackOutcome, attackOutcomeText, buildEvents, computeHits, emptyMagic, energyGains, generateDragBoard, resolveDrag, seededRng, skillAmount,
  DEFAULT_SAME_ELEMENT_RULE, attackingTeam, leadIds, chooseLead, type LeadChoice, shareEnergy, validTeamIds, type SameElementRule,
  type Board, type Cell, type MagicGrid, type Match3Event, type Match3Fighter, type Rng,
} from '@/lib/beast-game/match3';
import { dragHint, useDragChain } from './useDragChain';
import styles from './Match3Board.module.css';
import { BeadLink } from './bead/BeadLink';
import { useBannerQueue } from './bead/useBannerQueue';
import { BeadBurst, CascadeLabel, type BurstCell } from './bead/BeadBurst';
import { BEAD_TIMING, stepDuration } from '@/lib/beast-game/match3/bead-visual-config';
import bp from './bead/BeadPolish.module.css';
import { BoardCell } from './bead/BoardCell';
import { SoundToggle } from './bead/SoundToggle';
import { getBeadSound } from '@/lib/beast-game/match3/bead-sound';
import { applyGuardianBonus, isGuardianMagicEnabled, resolveGuardianActivations, type GuardianActivation } from '@/lib/beast-game/match3/guardian-magic';
import { GuardianSkillFx } from './bead/GuardianSkillFx';

interface Unit extends Match3Fighter { name: string; thumbnail: string; maxHp: number; energy: number }
import type {} from '@/lib/beast-game/match3/event-bus'; // window.__match3Events 的共用宣告

export const ORB_COLOR: Record<BeastElement, string> = { AIR: '#2f9e7e', SPACE: '#8d6fd1', WATER: '#2c74d0', FIRE: '#e0532c', EARTH: '#c39324' }; // 10/30：與 CSS 珠色 --c 同一組，拖曳線／能量條／珠子顏色一致;

/** 預設五元素各挑一張（順序固定 風空水火地）；外部傳入合法 teamIds（5 張、同屬性可重複）則照選的順序。敵方從其餘卡隨機一張。 */
export function pickLineup(rng: Rng, teamIds?: readonly string[] | null): { team: Unit[]; enemy: Unit } {
  const pool = playableCards().filter((c) => CARD_FACE_STATS[c.id]);
  const shuffled = pool.slice().sort(() => rng() - 0.5);
  const team: Unit[] = [];
  const unit = (c: (typeof pool)[number]): Unit => { const s = CARD_FACE_STATS[c.id]; return { id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, attack: s.attack, hp: s.hp, maxHp: s.hp, energy: 0 }; };
  if (validTeamIds(teamIds, pool.map((c) => c.id))) for (const id of teamIds) team.push(unit(pool.find((c) => c.id === id)!));
  else for (const el of MATCH3_ORB_ELEMENTS) {
    const c = shuffled.find((x) => x.element === el); if (!c) continue;
    team.push(unit(c));
  }
  const e = shuffled.find((c) => !team.some((t) => t.id === c.id))!;
  const es = CARD_FACE_STATS[e.id];
  const hp = es.hp * team.length;
  return { team, enemy: { id: e.id, name: e.name, element: e.element, thumbnail: e.art.thumbnail, attack: es.attack, hp, maxHp: hp, energy: 0 } };
}

const k = (r: number, c: number) => r * 1000 + c;

function changedCells(prev: Board, next: Board): Set<number> {
  const s = new Set<number>();
  next.forEach((row, r) => row.forEach((x, c) => { if (prev[r]?.[c] !== x) s.add(k(r, c)); }));
  return s;
}

/** 盤面與出陣是隨機的，只在瀏覽器端產生，避免伺服器與瀏覽器畫面不一致。 */
export interface Match3BoardProps { seed?: number; teamIds?: readonly string[] | null; sameElementRule?: SameElementRule }
export default function Match3Board({ seed, teamIds, sameElementRule = DEFAULT_SAME_ELEMENT_RULE }: Match3BoardProps) {
  const [init, setInit] = useState<{ rng: Rng; team: Unit[]; enemy: Unit; board: Board } | null>(null);
  const key = teamIds?.join(',') ?? '';
  useEffect(() => {
    const rng = seededRng(seed ?? Date.now());
    setInit({ rng, ...pickLineup(rng, teamIds), board: generateDragBoard(rng) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, key]);
  if (!init) return <section className={styles.wrap} aria-busy="true" />;
  return <Match3Game key={key} init={init} teamIds={teamIds} rule={sameElementRule} />;
}

function Match3Game({ init, teamIds, rule }: { init: { rng: Rng; team: Unit[]; enemy: Unit; board: Board }; teamIds?: readonly string[] | null; rule: SameElementRule }) {
  const rngRef = useRef<Rng>(init.rng);
  const [board, setBoard] = useState<Board>(init.board);
  const [magic, setMagic] = useState<MagicGrid>(() => emptyMagic(init.board));
  const [team, setTeam] = useState<Unit[]>(init.team);
  const [enemy, setEnemy] = useState<Unit>(init.enemy);
  const [moves, setMoves] = useState(0);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<Set<number>>(new Set());
  const [drop, setDrop] = useState<Set<number>>(new Set());
  const [banner, setBanner, showBanner] = useBannerQueue(); // v3：橫幅排隊，不重疊
  const [hitTeam, setHitTeam] = useState<string | null>(null);
  const [attacked, setAttacked] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<LeadChoice>({});
  // 10/31 四象魔法珠：演出佇列（旗標 NEXT_PUBLIC_GUARDIAN_MAGIC=1 才會有內容）
  const [gfx, setGfx] = useState<Array<{ act: GuardianActivation; bonus: number }>>([]);
  const nextGfx = useCallback(() => setGfx((q) => q.slice(1)), []);
  // 測試專用：只在網址帶 ?m3debug=1 時掛上，用來把指定隊員 HP 設 0 驗證倒下換人；不改任何卡的真實數值。
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('m3debug') !== '1') return;
    (window as unknown as { __m3Debug?: unknown }).__m3Debug = { ko: (i: number) => setTeam((t) => t.map((u, k) => (k === i ? { ...u, hp: 0 } : u))) };
    return () => { delete (window as unknown as { __m3Debug?: unknown }).__m3Debug; };
  }, []);
  const [log, setLog] = useState('手指或滑鼠按住一顆寶珠，拖過相鄰的同色珠，放開就發動。');
  const [busy, setBusy] = useState(false);
  const [shortMsg, setShortMsg] = useState('');
  const [burst, setBurst] = useState<{ id: number; cells: BurstCell[] } | null>(null);
  const [stepNo, setStepNo] = useState(0);
  const [popOrder, setPopOrder] = useState<Map<number, number>>(new Map());
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const teamHp = team.reduce((s, u) => s + Math.max(0, u.hp), 0);
  const teamMax = team.reduce((s, u) => s + u.maxHp, 0);
  const over = enemy.hp <= 0 ? 'win' : teamHp <= 0 ? 'lose' : null;
  const untilCounter = ENEMY_COUNTER_EVERY - (moves % ENEMY_COUNTER_EVERY);

  const restart = useCallback(() => {
    const rng = rngRef.current; const n = pickLineup(rng, teamIds); const b = generateDragBoard(rng);
    setTeam(n.team); setEnemy(n.enemy); setBoard(b); setMagic(emptyMagic(b)); setMoves(0); setBanner(null);
    setLog('新的一局。按住寶珠，拖過相鄰同色珠，放開發動。');
  }, [teamIds]);

  const release = (path: Cell[]) => {
    if (busy || over) return;
    const res = resolveDrag(board, path, rngRef.current, magic);
    if (!res.valid) {
      setShake(new Set(path.map((p) => k(p.r, p.c)))); later(() => setShake(new Set()), 340);
      const why = path.length < 3 ? `只連了 ${path.length} 顆，至少要 3 顆同色相連才會發動。` : '這條路線不成立，再試一次。';
      getBeadSound()?.cancel();
      setLog(why); setShortMsg(why); later(() => setShortMsg(''), 1800);
      return;
    }
    const el = res.element!;
    const baseHits = computeHits(res.steps, attackingTeam(team, rule, chosen), enemy.element);
    const gActs = isGuardianMagicEnabled() && res.magicTriggered.length ? resolveGuardianActivations(res.magicTriggered, team, rngRef.current) : [];
    const hits = applyGuardianBonus(baseHits, gActs);
    const gShow = gActs.map((a) => ({ act: a, bonus: hits.filter((h) => h.chain === a.chain && h.element === a.orbElement).reduce((n, h) => n + (h.guardianBonus ?? 0), 0) }));
    for (const g of gShow) { const ev = { type: 'guardianMagic', guardian: g.act.guardian.id, skill: g.act.guardian.skillId, orbElement: g.act.orbElement, chain: g.act.chain, bonus: g.bonus }; (window.__match3Events ??= []).push(ev as unknown as Match3Event); console.log('[match3]', ev); }
    { const ids = new Set(hits.filter((h) => h.amount > 0 && h.attackerId).map((h) => h.attackerId as string)); setAttacked(ids); later(() => setAttacked(new Set()), 900); }
    const gains = energyGains(res);
    const events = buildEvents(res.steps, hits, { magicSpawn: res.magicSpawn, magicTriggered: res.magicTriggered, skill5Element: res.skill5 ? el : null, energy: gains });
    for (const ev of events) if (ev.type === 'clear') {
      const pub = { element: ev.element, count: ev.count, cascadeStep: ev.cascadeStep, eligible: ev.eligible, power: ev.power, ...(ev.magic ? { magic: true, magicPower: ev.magicPower } : {}), ...(ev.skill5 ? { skill5: true } : {}) };
      (window.__match3Events ??= []).push(pub as Match3Event); console.log('[match3]', pub);
    } else if (ev.type !== 'attack') { (window.__match3Events ??= []).push(ev); console.log('[match3]', ev); }
    const dealt = hits.reduce((s, h) => s + h.amount, 0);
    // 顯示時序修正：放開當下就換成本步訊息（結算中），不再停留上一步的文字直到動畫結束
    setLog(`${MATCH3_ORB_LABEL[el]}珠連 ${res.chainLength} 顆，結算中…`);
    setBusy(true);
    const frames = res.steps.map((st, i) => ({ before: i === 0 ? board : res.steps[i - 1].boardAfter, mag: i === 0 ? magic : res.steps[i - 1].magicAfter,
      cells: new Set(st.groups.flatMap((g) => g.cells.map((c) => k(c.r, c.c)))) }));
    const pathIdx = new Map(path.map((p, i) => [k(p.r, p.c), i]));
    const starts = frames.reduce<number[]>((a, _fr, i) => [...a, i === 0 ? 0 : a[i - 1] + stepDuration(frames[i - 1].cells.size)], []);
    const total = starts[starts.length - 1] + stepDuration(frames[frames.length - 1].cells.size);
    frames.forEach((fr, i) => later(() => {
      const order = i === 0 ? pathIdx : new Map([...fr.cells].map((x, j) => [x, j]));
      getBeadSound()?.chime(fr.cells.size);
      setBoard(fr.before); setMagic(fr.mag); setFlash(fr.cells); setPopOrder(order); setStepNo(i + 1);
      setBurst({ id: Date.now() + i, cells: [...fr.cells].map((x) => ({ r: Math.floor(x / 1000), c: x % 1000, el: fr.before[Math.floor(x / 1000)][x % 1000], order: order.get(x) ?? 0 })) });
    }, starts[i]));
    later(() => {
      setFlash(new Set()); setDrop(changedCells(board, res.board)); later(() => getBeadSound()?.thud(), BEAD_TIMING.fallMs); later(() => setDrop(new Set()), BEAD_TIMING.fallMs + BEAD_TIMING.fallRowStaggerMs * 5);
      later(() => { setBurst(null); setStepNo(0); }, BEAD_TIMING.stepLabelMs);
      setBoard(res.board); setMagic(res.magic); setBusy(false);
      const nextEnemyHp = Math.max(0, enemy.hp - dealt);
      setEnemy({ ...enemy, hp: nextEnemyHp });
      const m = moves + 1; setMoves(m);
      let nextTeam = shareEnergy(team, gains, rule, chosen);
      const lbl = MATCH3_ORB_LABEL[el];
      let msg = `${lbl}珠連 ${res.chainLength} 顆`;
      // 10/30 修正：依拖曳顏色各自結算，分開「已倒下」與「隊伍沒有」；其他顏色的連鎖傷害另外列出。
      const own = attackOutcome(team, hits, el);
      msg += attackOutcomeText(own, lbl);
      const extra = dealt - (own.kind === 'hit' ? own.amount : 0);
      if (extra > 0) msg += `，連鎖其他顏色追加 ${extra} 點`;
      if (res.steps.length > 1) msg += `，連鎖 ${res.steps.length} 段`;
      if (res.magicTriggered.length) msg += `，引爆魔法珠（威力 ${res.magicTriggered.reduce((s, t) => s + t.power, 0)}）`;
      if (res.chainLength > NORMAL_POWER_CAP) msg += `（普通威力上限 ${NORMAL_POWER_CAP} 顆）`;
      if (res.skill5) getBeadSound()?.skill5();
      if (res.magicSpawn) later(() => getBeadSound()?.magic(), res.skill5 ? 900 : 0);
      if (res.skill5) showBanner(`五珠技！${lbl}屬性卡能量集滿`, 'skill');
      if (res.magicSpawn) showBanner(`生成${lbl}魔法珠・威力 ${res.magicSpawn.power}`, 'magic');
      else if (res.magicTriggered.length) showBanner('魔法珠引爆！能量集滿', 'skill');
      for (const g of gShow) msg += `，${g.act.guardian.name}發動「${g.act.guardian.skillName}」（四象加成 +${g.bonus}）`;
      if (gShow.length) setGfx((q) => [...q, ...gShow]);
      if (res.magicSpawn) msg += `，生成魔法珠（威力 ${res.magicSpawn.power}）`;
      if (res.reshuffled) msg += '；沒有可走的步，已重新洗盤';
      if (nextEnemyHp > 0 && m % ENEMY_COUNTER_EVERY === 0) {
        const alive = nextTeam.filter((u) => u.hp > 0);
        const target = alive[Math.floor(rngRef.current() * alive.length)];
        if (target) {
          nextTeam = nextTeam.map((u) => (u.id === target.id ? { ...u, hp: Math.max(0, u.hp - enemy.attack) } : u));
          msg += `；${enemy.name}反擊${target.name} ${enemy.attack} 點`;
          setHitTeam(target.id); later(() => setHitTeam(null), 600);
          later(() => showBanner(`敵方反擊！${target.name} −${enemy.attack}`, 'counter'), res.skill5 || res.magicSpawn ? 900 : 0);
        }
      }
      setTeam(nextTeam);
      setLog(msg + '。');
    }, total);
  };

  /** 點隊員：同屬性多張且不是主攻＝改當主攻（能量滿也一併發動技能）；其餘照舊（能量滿發動、不滿提示）。 */
  const tapAlly = (u: Unit) => {
    if (u.hp <= 0 || over) return;
    const dup = team.filter((x) => x.element === u.element).length > 1;
    if (dup && rule === 'tap-lead' && !leadIds(team, chosen).has(u.id)) {
      setChosen(chooseLead(team, chosen, u.id));
      setLog(`${u.name}成為${MATCH3_ORB_LABEL[u.element]}屬性主攻，其他同屬性卡改當輔助（拿一半能量）。`);
      if (u.energy < ENERGY_MAX) return;
    }
    unleash(u);
  };

  const unleash = (u: Unit) => {
    if (busy || over || u.hp <= 0) return;
    if (u.energy < ENERGY_MAX) { setLog(`${u.name}能量 ${u.energy}/${ENERGY_MAX}，消${MATCH3_ORB_LABEL[u.element]}珠可以充能。`); return; }
    const amt = skillAmount(u.attack, u.element, enemy.element);
    setEnemy({ ...enemy, hp: Math.max(0, enemy.hp - amt) });
    setTeam(team.map((x) => (x.id === u.id ? { ...x, energy: 0 } : x)));
    showBanner(`${u.name}發動技能 −${amt}`, 'skill');
    setLog(`${u.name}能量全開，造成 ${amt} 點傷害（不算步數）。`);
  };

  const drag = useDragChain(board, !busy && !over, release);
  const dragEl = drag.path.length ? board[drag.path[0].r][drag.path[0].c] : null;
  const hint = dragEl ? dragHint(drag.path.length, MATCH3_ORB_LABEL[dragEl], NORMAL_POWER_CAP, MAGIC_ORB_MIN_LENGTH, SKILL5_LENGTH) : '';
  const onPath = new Set(drag.path.map((p) => k(p.r, p.c)));
  const prevLen = useRef(0);
  useEffect(() => { const n = drag.path.length; if (n > prevLen.current) getBeadSound()?.tick(n); prevLen.current = n; }, [drag.path.length]);
  const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, Math.round((a / b) * 100)))}%`;

  return (
    <section className={`${styles.wrap} ${bp.lux}`} aria-label="五元素三消戰場">
      <div className={styles.enemy}>
        <div className={styles.enemyCard}><BeastCardFace card={{ id: enemy.id, name: enemy.name, thumbnail: enemy.thumbnail, element: enemy.element }} /></div>
        <div className={styles.enemyInfo}>
          <div className={styles.name}>{enemy.name}<span className={styles.tag}>{MATCH3_ORB_LABEL[enemy.element]}</span></div>
          <div className={styles.bar} role="progressbar" aria-label="敵方生命" aria-valuenow={enemy.hp} aria-valuemax={enemy.maxHp}><span style={{ width: pct(enemy.hp, enemy.maxHp) }} /></div>
          <div className={styles.meta}>{enemy.hp} / {enemy.maxHp}</div>
          <div className={`${styles.counter} ${untilCounter === 1 ? styles.counterHot : ''}`} data-testid="match3-counter" aria-live="polite">
            <span className={styles.pips} aria-hidden="true">{Array.from({ length: ENEMY_COUNTER_EVERY }, (_, i) => <i key={i} className={i < moves % ENEMY_COUNTER_EVERY ? styles.pipOn : ''} />)}</span>
            {untilCounter === 1 ? '下一步敵方反擊！' : `敵方反擊倒數 ${untilCounter} 步`}
          </div>
        </div>
      </div>

      <p className={styles.hint} data-testid="match3-hint" aria-live="polite">{hint || shortMsg || '拖滿 4 顆生成魔法珠，剛好 5 顆觸發五珠技'}</p>

      <div ref={drag.ref} className={`${styles.board} ${bp.board}`} role="grid" aria-label="寶珠盤面（按住拖曳相鄰同色珠）" data-testid="match3-board" {...drag.handlers}>
        {board.map((row, r) => row.map((e, c) => { const kk = k(r, c); return (
          <BoardCell key={`${r}-${c}`} r={r} c={c} e={e} color={ORB_COLOR[e]} mp={magic[r]?.[c] ?? 0} sel={onPath.has(kk)} pop={flash.has(kk)}
            shake={shake.has(kk)} fall={drop.has(kk)} order={popOrder.get(kk) ?? 0} />); }))}
        <BeadLink points={drag.points} el={dragEl} />
        {burst && <BeadBurst key={burst.id} cells={burst.cells} />}
        <CascadeLabel step={stepNo} />
        {gfx[0] && <GuardianSkillFx key={`${gfx[0].act.chain}-${gfx[0].act.guardian.id}-${moves}`} act={gfx[0].act} bonus={gfx[0].bonus} onDone={nextGfx} />}
        {banner && <div className={`${styles.banner} ${styles['b_' + banner.kind]} ${banner.kind === 'magic' || banner.kind === 'skill' ? bp.leaf : ''}`} data-testid="match3-banner" role="status">{banner.text}</div>}
      </div>

      <p className={styles.log} aria-live="polite" data-testid="match3-log">{log}</p>
      <SoundToggle />

      <div className={styles.team}>
        {team.map((u) => {
          const down = u.hp <= 0;
          const full = !down && u.energy >= ENERGY_MAX;
          const dup = team.filter((x) => x.element === u.element).length > 1;
          const lead = !dup || rule === 'all-attack' || leadIds(team, rule === 'tap-lead' ? chosen : {}).has(u.id);
          return (
            <button type="button" key={u.id} data-testid="match3-ally" data-el={u.element} data-energy={u.energy} data-lead={lead ? '1' : '0'} data-attacked={attacked.has(u.id) ? '1' : undefined} disabled={u.hp <= 0}
              onPointerDown={(e) => e.stopPropagation()} onClick={() => { if (!down) tapAlly(u); }} aria-disabled={down || undefined} aria-pressed={dup ? lead : undefined} aria-label={`${u.name}，${MATCH3_ORB_LABEL[u.element]}屬性${dup ? (lead ? '，主攻' : '，輔助，點擊改當主攻') : ''}，能量 ${u.energy}/${ENERGY_MAX}${full ? '，點擊發動技能' : ''}`}
              className={`${styles.ally} ${u.hp <= 0 ? styles.down : ''} ${full ? styles.allyFull : ''} ${hitTeam === u.id ? styles.allyHit : ''} ${attacked.has(u.id) ? styles.allyAttack : ''} ${dup && lead ? styles.allyLead : ''}`}
              style={{ ['--ec' as string]: ORB_COLOR[u.element] }}>
              <div className={styles.allyCard}><BeastCardFace card={{ id: u.id, name: u.name, thumbnail: u.thumbnail, element: u.element }} /></div>
              <div className={styles.bar}><span style={{ width: pct(u.hp, u.maxHp) }} /></div>
              <div className={styles.energy}><span style={{ width: pct(u.energy, ENERGY_MAX) }} /></div>
              <div className={styles.allyMeta}>{down ? '已倒下' : full ? '能量滿・點我' : `${MATCH3_ORB_LABEL[u.element]}${dup ? (lead ? '・主攻' : '・輔助') : ''} ${u.energy}%`}</div>
            </button>
          );
        })}
      </div>
      <div className={styles.meta}>我方合計 {teamHp} / {teamMax}　·　步數 {moves}</div>

      {over && (
        <div className={styles.result} role="dialog" aria-label="對戰結果">
          <div className={styles.resultTitle}>{over === 'win' ? '勝利' : '這局先到這裡'}</div>
          <p>{over === 'win' ? `共 ${moves} 步擊退${enemy.name}。` : `${enemy.name}守住了，再來一局吧。`}</p>
          <button type="button" className={styles.again} onClick={restart}>再來一局</button>
        </div>
      )}
    </section>
  );
}
