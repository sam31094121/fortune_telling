'use client';
/**
 * 神獸戰隊 v0.9｜五元素寶珠戰 5v5（寶珠戰卡片 → /beast-game/match3-preview → 自選出陣 → 本元件）
 * 10/30 鈺勝定案：功能＋版面以 5v5 截圖為準（敵方五隻、各自 ⏳ 反擊倒數、點選指定目標、我方五張點卡設優先、
 * 滿能量點「技能」、7×5 盤、回合＋靜音、底部「連線模式／清除連線／發動連線攻擊」常駐）；寶珠只沿用目前形狀寶石樣式（不降級）。
 * 規則不變：拖過相鄰同色 ≥3 放開發動、普通威力上限 10、≥4 生成魔法珠、剛好 5 顆魔法珠＋五珠技、每顆 +10 能量、
 * 每 3 步反擊、只有主屬性相同的卡出手、克制表 elements.ts、同屬性輔助拿一半能量。卡面只讀 .v2 新卡與 card-face-stats。
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { BeastCardFace } from './BeastCardTile';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import type { BeastElement } from '@/lib/beast-game/elements';
import {
  ENERGY_MAX, MAGIC_ORB_MIN_LENGTH, MATCH3_ORB_ELEMENTS, MATCH3_ORB_LABEL, NORMAL_POWER_CAP, SKILL5_LENGTH,
  buildEvents, computeHits, emptyMagic, energyGains, generateDragBoard, resolveDrag, seededRng, skillAmount,
  DEFAULT_SAME_ELEMENT_RULE, attackingTeam, leadIds, chooseLead, type LeadChoice, shareEnergy, validTeamIds, type SameElementRule,
  MATCH3_ENEMY_NAMES, enemyNamesFor, makeFoe, aliveTarget, damageFoe, counterPhase, linkDamage, linkProblem, LINK_ENERGY_COST, LINK_MIN_CARDS,
  match3Mode, type Match3ModeConfig, type Match3ModeId,
  type Board, type Cell, type MagicGrid, type Match3Event, type Match3Fighter, type Match3Foe, type Rng,
} from '@/lib/beast-game/match3';
import { DragPathSvg, dragHint, useDragChain } from './useDragChain';
import { applyGuardianStrike, GUARDIAN_LIST, GUARDIAN_MAGIC_BONUS_CAP, GUARDIAN_MAGIC_MULT, guardianStrikeBonuses, isGuardianMagicEnabled, resolveGuardianActivations, type GuardianActivation } from '@/lib/beast-game/match3/guardian-magic';
import { GuardianSkillFx, GuardianCharge } from './bead/GuardianSkillFx';
import styles from './Match3Board.module.css';

interface Unit extends Match3Fighter { name: string; thumbnail: string; maxHp: number; energy: number }
interface Foe extends Match3Foe { name: string; thumbnail: string }
declare global { interface Window { __match3Events?: Match3Event[] } }

export const ORB_COLOR: Record<BeastElement, string> = { AIR: '#2f9e7e', SPACE: '#8d6fd1', WATER: '#2c74d0', FIRE: '#e0532c', EARTH: '#c39324' };

/** 我方：外部 teamIds 合法照選的順序，否則五元素各一張（風空水火地）。敵方：固定五隻正式卡（enemies.json）。 */
export function pickLineup(rng: Rng, teamIds?: readonly string[] | null, mode: Match3ModeConfig = match3Mode()): { team: Unit[]; enemies: Foe[] } {
  const pool = playableCards().filter((c) => CARD_FACE_STATS[c.id]);
  const shuffled = pool.slice().sort(() => rng() - 0.5);
  const team: Unit[] = [];
  const foeNames = enemyNamesFor(mode.id);
  const unit = (c: (typeof pool)[number]): Unit => { const s = CARD_FACE_STATS[c.id]; return { id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, attack: s.attack, hp: s.hp, maxHp: s.hp, energy: 0 }; };
  if (validTeamIds(teamIds, pool.map((c) => c.id))) for (const id of teamIds) team.push(unit(pool.find((c) => c.id === id)!));
  else for (const el of MATCH3_ORB_ELEMENTS) {
    const c = shuffled.find((x) => x.element === el && !foeNames.includes(x.name)); if (c) team.push(unit(c));
  }
  const enemies: Foe[] = [];
  for (const nm of foeNames) { const c = pool.find((x) => x.name === nm); if (c) enemies.push({ ...makeFoe(c.id, c.element, mode), name: c.name, thumbnail: c.art.thumbnail }); }
  return { team, enemies };
}

const ORB_CLASS: Record<BeastElement, string> = { AIR: styles.air, SPACE: styles.space, WATER: styles.water, FIRE: styles.fire, EARTH: styles.earth };
const k = (r: number, c: number) => r * 1000 + c;
/** 可斜連模式（config diagonal:true）的提示字。 */
const DIAG_TIP = '按住寶珠拖過相鄰同色珠（≥3，可斜連）放開攻擊';

const OrbCell = memo(function OrbCell({ r, c, e, mp, sel, flash, shake, drop }: { r: number; c: number; e: BeastElement; mp: number; sel: boolean; flash: boolean; shake: boolean; drop: boolean }) {
  const cls = [styles.orb, ORB_CLASS[e], sel ? styles.sel : '', flash ? styles.flash : '', shake ? styles.shake : '', drop ? styles.drop : '', mp > 0 ? styles.magic : ''].join(' ');
  return (
    <div role="gridcell" data-r={r} data-c={c} data-el={e} data-magic={mp || undefined} className={cls}
      aria-label={`${MATCH3_ORB_LABEL[e]}${mp ? `魔法珠威力${mp}` : '珠'}`}>
      <span className={styles.gem} aria-hidden="true" /><span className={styles.lbl} aria-hidden="true">{MATCH3_ORB_LABEL[e]}</span>
      {mp > 0 && <span className={styles.power} aria-hidden="true">{mp}</span>}
    </div>
  );
});

function changedCells(prev: Board, next: Board): Set<number> {
  const s = new Set<number>();
  next.forEach((row, r) => row.forEach((x, c) => { if (prev[r]?.[c] !== x) s.add(k(r, c)); }));
  return s;
}

function beep(freq: number) {
  try {
    const W = window as unknown as { __m3ac?: AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? W.webkitAudioContext; if (!AC) return;
    const ac = (W.__m3ac ??= new AC()); const o = ac.createOscillator(); const g = ac.createGain();
    o.frequency.value = freq; g.gain.setValueAtTime(0.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.2);
  } catch { /* 無音效環境略過 */ }
}

export interface Match3BoardProps { seed?: number; teamIds?: readonly string[] | null; sameElementRule?: SameElementRule; onRepick?: () => void; mode?: Match3ModeId }
export default function Match3Board({ seed, teamIds, sameElementRule = DEFAULT_SAME_ELEMENT_RULE, onRepick, mode }: Match3BoardProps) {
  const cfg = match3Mode(mode);
  const [init, setInit] = useState<{ rng: Rng; seed: number; team: Unit[]; enemies: Foe[]; board: Board } | null>(null);
  const key = teamIds?.join(',') ?? '';
  useEffect(() => {
    const s = seed ?? (Date.now() % 100000); const rng = seededRng(s);
    setInit({ rng, seed: s, ...pickLineup(rng, teamIds, cfg), board: generateDragBoard(rng, cfg.rows, cfg.cols, cfg.diagonal) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, key, cfg.id]);
  if (!init) return <section className={styles.wrap} aria-busy="true" />;
  return <Match3Game key={key + cfg.id} init={init} teamIds={teamIds} rule={sameElementRule} onRepick={onRepick} cfg={cfg} />;
}

function Match3Game({ init, teamIds, rule, onRepick, cfg }: { cfg: Match3ModeConfig; init: { rng: Rng; seed: number; team: Unit[]; enemies: Foe[]; board: Board }; teamIds?: readonly string[] | null; rule: SameElementRule; onRepick?: () => void }) {
  const rngRef = useRef<Rng>(init.rng);
  const [board, setBoard] = useState<Board>(init.board);
  const [magic, setMagic] = useState<MagicGrid>(() => emptyMagic(init.board));
  const [team, setTeam] = useState<Unit[]>(init.team);
  const [foes, setFoes] = useState<Foe[]>(init.enemies);
  const [target, setTarget] = useState(0);
  const [moves, setMoves] = useState(0);
  const [totalDmg, setTotalDmg] = useState(0);
  const [lastDmg, setLastDmg] = useState(0);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<Set<number>>(new Set());
  const [drop, setDrop] = useState<Set<number>>(new Set());
  const [banner, setBanner] = useState<{ text: string; kind: 'magic' | 'skill' | 'counter' | 'info' } | null>(null);
  const [hitTeam, setHitTeam] = useState<Set<string>>(new Set());
  const [hitFoe, setHitFoe] = useState<number | null>(null);
  const [attacked, setAttacked] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<LeadChoice>({});
  const [linkMode, setLinkMode] = useState(false);
  const [debug, setDebug] = useState(false);
  const [pulse, setPulse] = useState(false);
  useEffect(() => { setDebug(new URLSearchParams(window.location.search).get('debug') === '1'); }, []);
  const [link, setLink] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [help, setHelp] = useState(false);
  const [log, setLog] = useState(cfg.diagonal ? DIAG_TIP : '按住寶珠拖過相鄰同色珠（≥3）放開攻擊');
  const [busy, setBusy] = useState(false);
  // 10/31 四象魔法珠：演出佇列（模式 guardian:true 且旗標 NEXT_PUBLIC_GUARDIAN_MAGIC=1 才會有內容）
  const gOn = !!cfg.guardian && isGuardianMagicEnabled();
  const [gfx, setGfx] = useState<Array<{ act: GuardianActivation; bonus: number; fxId: number }>>([]);
  const nextGfx = useCallback(() => setGfx((q) => q.slice(1)), []);
  const fxSeq = useRef(0);
  const [info, setInfo] = useState(false);
  const [shortMsg, setShortMsg] = useState('');
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const showBanner = (text: string, kind: 'magic' | 'skill' | 'counter' | 'info') => { setBanner({ text, kind }); later(() => setBanner(null), 1400); };
  const sound = (f: number) => { if (!muted) beep(f); };

  // 測試專用：?m3debug=1 才掛上（ko＝我方倒下、foeHp＝設敵方 HP），不改任何卡的真實數值。
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('m3debug') !== '1') return;
    (window as unknown as { __m3Debug?: unknown }).__m3Debug = {
      ko: (i: number) => setTeam((t) => t.map((u, j) => (j === i ? { ...u, hp: 0 } : u))),
      foeHp: (i: number, hp: number) => setFoes((f) => f.map((x, j) => (j === i ? { ...x, hp } : x))),
      fillEnergy: () => setTeam((t) => t.map((u) => ({ ...u, energy: ENERGY_MAX }))),
      load: (b: Board, m: MagicGrid) => { setBoard(b); setMagic(m); },
    };
    return () => { delete (window as unknown as { __m3Debug?: unknown }).__m3Debug; };
  }, []);

  const teamHp = team.reduce((s, u) => s + Math.max(0, u.hp), 0);
  const over = foes.every((f) => f.hp <= 0) ? 'win' : teamHp <= 0 ? 'lose' : null;
  const ti = aliveTarget(foes, target);
  const leads = leadIds(team, rule === 'tap-lead' ? chosen : {});

  const restart = useCallback(() => {
    const rng = rngRef.current; const n = pickLineup(rng, teamIds, cfg); const b = generateDragBoard(rng, cfg.rows, cfg.cols, cfg.diagonal);
    setTeam(n.team); setFoes(n.enemies); setTarget(0); setBoard(b); setMagic(emptyMagic(b)); setMoves(0); setTotalDmg(0); setLastDmg(0); setBanner(null);
    setLink([]); setLinkMode(false); setLog('新的一局。' + (cfg.diagonal ? DIAG_TIP : '按住寶珠拖過相鄰同色珠（≥3）放開攻擊'));
  }, [teamIds, cfg]);

  /** 一步結束：敵方各自倒數，歸零者反擊。 */
  const endStep = (t: Unit[], f: Foe[], msg: string) => {
    const cp = counterPhase(t, f, cfg.counterEvery);
    if (cp.hits.length) {
      setHitTeam(new Set(cp.hits.map((h) => h.targetId))); later(() => setHitTeam(new Set()), 600);
      const txt = cp.hits.map((h) => `${f[h.enemy].name}→${t.find((u) => u.id === h.targetId)?.name} −${h.damage}`).join('、');
      later(() => showBanner(`敵方反擊！${txt}`, 'counter'), 500); sound(160);
      msg += `；敵方反擊：${txt}`;
    }
    setTeam(cp.team); setFoes(cp.foes); setLog(msg);
  };

  const release = (path: Cell[]) => {
    if (busy || over || ti < 0) return;
    const res = resolveDrag(board, path, rngRef.current, magic, 50, cfg.diagonal);
    if (!res.valid) {
      setShake(new Set(path.map((p) => k(p.r, p.c)))); later(() => setShake(new Set()), 340);
      const why = path.length < 3 ? `只連了 ${path.length} 顆，至少要 3 顆同色相連才會發動。` : '這條路線不成立，再試一次。';
      setLog(why); setShortMsg(why); later(() => setShortMsg(''), 1800);
      return;
    }
    const el = res.element!;
    const foe = foes[ti];
    const hits = computeHits(res.steps, attackingTeam(team, rule, chosen), foe.element);
    const gActs = gOn && res.magicTriggered.length ? resolveGuardianActivations(res.magicTriggered, team, rngRef.current) : [];
    const gBon = guardianStrikeBonuses(hits, gActs, team);
    const gShow = gActs.map((act, i) => ({ act, bonus: gBon[i], fxId: ++fxSeq.current }));
    const gTotal = gBon.reduce((a, b) => a + b, 0);
    { const ids = new Set(hits.filter((h) => h.amount > 0 && h.attackerId).map((h) => h.attackerId as string)); setAttacked(ids); later(() => setAttacked(new Set()), 900); }
    const gains = energyGains(res);
    const events = buildEvents(res.steps, hits, { magicSpawn: res.magicSpawn, magicTriggered: res.magicTriggered, skill5Element: res.skill5 ? el : null, energy: gains });
    for (const ev of events) if (ev.type === 'clear') {
      const pub = { element: ev.element, count: ev.count, cascadeStep: ev.cascadeStep, eligible: ev.eligible, power: ev.power, target: foe.id, ...(ev.magic ? { magic: true, magicPower: ev.magicPower } : {}), ...(ev.skill5 ? { skill5: true } : {}) };
      (window.__match3Events ??= []).push(pub as unknown as Match3Event); console.log('[match3]', pub);
    } else if (ev.type !== 'attack') { (window.__match3Events ??= []).push(ev); console.log('[match3]', ev); }
    const baseDealt = hits.reduce((s, h) => s + h.amount, 0);
    const dealt = baseDealt + gTotal;
    setBusy(true); sound(520 + res.chainLength * 40);
    const frames = res.steps.map((st, i) => ({ before: i === 0 ? board : res.steps[i - 1].boardAfter, mag: i === 0 ? magic : res.steps[i - 1].magicAfter,
      cells: new Set(st.groups.flatMap((g) => g.cells.map((c) => k(c.r, c.c)))) }));
    frames.forEach((fr, i) => later(() => { setBoard(fr.before); setMagic(fr.mag); setFlash(fr.cells); }, i * 300));
    later(() => {
      setFlash(new Set()); setDrop(changedCells(board, res.board)); later(() => setDrop(new Set()), 360);
      setBoard(res.board); setMagic(res.magic); setBusy(false);
      const gs = applyGuardianStrike(foes, ti, baseDealt, gTotal);
      const nf = gs.foes;
      for (const g of gShow) { const ev = { type: 'guardianMagic', guardian: g.act.guardian.id, skill: g.act.guardian.skillId, orbElement: g.act.orbElement, chain: g.act.chain, bonus: g.bonus, target: gs.bonusTarget >= 0 ? foes[gs.bonusTarget].id : null }; (window.__match3Events ??= []).push(ev as unknown as Match3Event); console.log('[match3]', ev); }
      if (gShow.length) setGfx((q) => [...q, ...gShow]);
      if (dealt > 0) { setHitFoe(ti); later(() => setHitFoe(null), 500); }
      setMoves((m) => m + 1); setLastDmg(dealt); setTotalDmg((s) => s + dealt);
      const lbl = MATCH3_ORB_LABEL[el];
      let msg = `${res.chainLength} 顆連珠・連鎖 ${res.steps.length}・本步傷害 ${dealt}`;
      if (dealt === 0) msg += `（隊伍沒有存活的${lbl}屬性主攻）`;
      if (res.chainLength > NORMAL_POWER_CAP) msg += `（普通威力上限 ${NORMAL_POWER_CAP} 顆）`;
      if (res.skill5) showBanner(`五珠技！${lbl}屬性卡能量集滿`, 'skill');
      else if (res.magicSpawn) showBanner(`生成${lbl}魔法珠・威力 ${res.magicSpawn.power}`, 'magic');
      else if (res.magicTriggered.length) showBanner('魔法珠引爆！能量集滿', 'skill');
      if (res.magicSpawn) msg += `，生成魔法珠（威力 ${res.magicSpawn.power}）`;
      if (res.reshuffled) msg += '；沒有可走的步，已重新洗盤';
      for (const g of gShow) msg += `，${g.act.guardian.name}發動「${g.act.guardian.skillName}」+${g.bonus}${gs.bonusTarget >= 0 && gs.bonusTarget !== ti ? `（轉給${foes[gs.bonusTarget].name}）` : ''}`;
      if (nf[ti].hp <= 0) msg += `；${foe.name}倒下`;
      endStep(shareEnergy(team, gains, rule, chosen), nf, msg);
    }, frames.length * 300);
  };

  /** 點卡：連線模式＝加入／移出連線；否則設為優先（同屬性多張＝改當主攻）。 */
  const tapAlly = (u: Unit) => {
    if (u.hp <= 0 || over || busy) return;
    if (linkMode) {
      if (link.includes(u.id)) { setLink(link.filter((x) => x !== u.id)); return; }
      if (u.energy < LINK_ENERGY_COST) { setLog(`${u.name}能量 ${u.energy}，連線需要 ${LINK_ENERGY_COST}。`); return; }
      setLink([...link, u.id]); setLog(`已連線 ${link.length + 1} 張（至少 ${LINK_MIN_CARDS} 張）。`); return;
    }
    const dup = team.filter((x) => x.element === u.element).length > 1;
    setChosen(chooseLead(team, chosen, u.id));
    setLog(dup ? `${u.name}設為${MATCH3_ORB_LABEL[u.element]}屬性優先（主攻），其他同屬性卡改當輔助（拿一半能量）。` : `${u.name}是${MATCH3_ORB_LABEL[u.element]}屬性主攻；消${MATCH3_ORB_LABEL[u.element]}珠由它出手。`);
  };

  const unleash = (u: Unit) => {
    if (busy || over || u.hp <= 0 || ti < 0 || u.energy < ENERGY_MAX) return;
    const foe = foes[ti]; const amt = skillAmount(u.attack, u.element, foe.element);
    setFoes(damageFoe(foes, ti, amt)); setHitFoe(ti); later(() => setHitFoe(null), 500);
    setTeam(team.map((x) => (x.id === u.id ? { ...x, energy: 0 } : x))); setLastDmg(amt); setTotalDmg((s) => s + amt);
    showBanner(`${u.name}技能 −${amt}`, 'skill'); sound(880);
    setLog(`${u.name}發動技能，對${foe.name}造成 ${amt} 點傷害（不算步數）。`);
  };

  const problem = linkProblem(team, link);
  const fireLink = () => {
    if (!linkMode || problem || over || busy || ti < 0) return;
    const cards = link.map((id) => team.find((u) => u.id === id)!);
    const amt = linkDamage(cards.map((c) => c.attack)); const foe = foes[ti];
    setFoes(damageFoe(foes, ti, amt)); setHitFoe(ti); later(() => setHitFoe(null), 500);
    setTeam(team.map((u) => (link.includes(u.id) ? { ...u, energy: u.energy - LINK_ENERGY_COST } : u)));
    setLastDmg(amt); setTotalDmg((s) => s + amt); setLink([]); setLinkMode(false);
    showBanner(`連線攻擊 ${cards.length} 張 −${amt}`, 'skill'); sound(990);
    setLog(`連線攻擊：${cards.map((c) => c.name).join('＋')} 對${foe.name}造成 ${amt} 點傷害（不算步數）。`);
  };
  const fireSub = !linkMode ? `需 ${LINK_MIN_CARDS} 張卡各 ${LINK_ENERGY_COST} 能量` : problem === 'tooFew' ? `再選 ${LINK_MIN_CARDS - link.length} 張` : problem === 'energyLow' ? `每張需 ${LINK_ENERGY_COST} 能量` : problem ? '有卡已倒下' : `${link.length} 張・預估 ${linkDamage(link.map((id) => team.find((u) => u.id === id)?.attack ?? 0))}`;

  const drag = useDragChain(board, !busy && !over, release, cfg.diagonal);
  const dragEl = drag.path.length ? board[drag.path[0].r][drag.path[0].c] : null;
  const hint = dragEl ? dragHint(drag.path.length, MATCH3_ORB_LABEL[dragEl], NORMAL_POWER_CAP, MAGIC_ORB_MIN_LENGTH, SKILL5_LENGTH) : '';
  const onPath = new Set(drag.path.map((p) => k(p.r, p.c)));
  const chargeG = gOn && dragEl && drag.path.length >= MAGIC_ORB_MIN_LENGTH && drag.path.some((p) => (magic[p.r]?.[p.c] ?? 0) > 0)
    ? team.filter((u) => u.hp > 0).map((u) => GUARDIAN_LIST.find((g) => g.id === u.id)).find((g) => g && (dragEl === 'EARTH' || g.element === dragEl)) ?? null : null;
  const busyTap = () => { if (busy && !over) { setShortMsg('結算中，稍候再拖'); later(() => setShortMsg(''), 1200); } };
  const M = !!cfg.minimal;
  const ruleText = `${cfg.diagonal ? '本模式可斜連：上下左右與四個斜角都算相鄰。' : ''}拖過相鄰同色珠 3 顆以上放開攻擊目前目標；只有主屬性相同的卡出手。連 4 顆以上生成魔法珠，剛好 5 顆觸發五珠技（該屬性卡能量集滿）。每顆 +10 能量，滿 100 點「技能」。每隻敵人 ⏳ 倒數到 0 就反擊（本模式每 ${cfg.counterEvery} 步）。連線模式：點選 2 張以上、每張 50 能量的卡，按「發動連線攻擊」。`;
  const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, Math.round((a / b) * 100)))}%`;

  return (
    <section className={styles.wrap} style={{ ['--accent' as string]: cfg.accent }} aria-label={`${cfg.title}｜${cfg.subtitle}`} data-mode={cfg.id} data-cols={cfg.cols} data-rows={cfg.rows}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <div className={styles.kicker} data-testid="match3-badge">{cfg.badge}</div>
          <h1 className={styles.title} data-testid="match3-title">{cfg.title}<small className={styles.subtitle}>｜{cfg.subtitle}</small></h1>
        </div>
        {M && <button type="button" className={styles.infoBtn} data-testid="match3-info" aria-expanded={info} aria-haspopup="dialog" aria-label="說明" onClick={() => setInfo(true)}><span aria-hidden="true">?</span>說明</button>}
        <button type="button" className={styles.mute} aria-pressed={muted} aria-label={muted ? '開啟音效' : '靜音'} onClick={() => setMuted(!muted)}>{muted ? '🔇' : '🔊'}</button>
        <div className={styles.round} data-testid="match3-round">回合 {moves + 1}</div>
      </header>
      {!M && <div className={styles.sub} data-testid="match3-sub">5 對 5・{cfg.cols * cfg.rows} 顆寶珠{cfg.diagonal ? '・可斜連' : ''}・敵方：{cfg.enemyHint ?? foes.map((f) => f.name).join('・')}</div>}
      {debug && <div className={styles.sub} data-testid="match3-debug">[debug] 正式神獸卡 5v5・{cfg.cols}×{cfg.rows}＝{cfg.cols * cfg.rows} 顆寶珠・敵方 HP {cfg.enemyHp}／攻 {cfg.enemyAtk}／每 {cfg.counterEvery} 步反擊【待平衡】{cfg.diagonal ? '・可斜連' : ''}・seed {init.seed}</div>}

      {!M && <div className={styles.secHead}><span>敵方神獸（點選指定目標；⏳ 為反擊倒數）</span><span>{over === 'win' ? '勝利' : over === 'lose' ? '落敗' : '戰鬥進行中'}</span></div>}
      <div className={styles.foes} data-testid="match3-enemies">
        {foes.map((f, i) => (
          <button type="button" key={f.id} data-testid="match3-enemy" data-id={f.id} data-hp={f.hp} data-cd={f.cd} data-target={i === ti ? '1' : '0'}
            disabled={f.hp <= 0} onClick={() => { if (f.hp > 0) { setTarget(i); setLog(`目標改為${f.name}。`); } }}
            aria-pressed={i === ti} aria-label={`${f.name}，${MATCH3_ORB_LABEL[f.element]}屬性，HP ${f.hp}/${f.maxHp}，${f.cd} 步後反擊${i === ti ? '，目前目標' : '，點擊設為目標'}`}
            className={`${styles.foe} ${i === ti ? styles.foeOn : ''} ${f.hp <= 0 ? styles.down : ''} ${hitFoe === i ? styles.allyHit : ''} ${f.cd === 1 && f.hp > 0 ? styles.foeHot : ''}`}
            style={{ ['--ec' as string]: ORB_COLOR[f.element] }}>
            <span className={styles.cd} data-testid="match3-counter" aria-hidden="true">⏳{f.cd}</span>
            <div className={styles.foeArt} role="img" aria-label={f.name} style={{ backgroundImage: `url(${f.thumbnail})` }} />
            <div className={styles.foeName}>{f.name}</div>
            <div className={`${styles.bar} ${styles.foeBar}`} role="progressbar" aria-label={`${f.name}生命`} aria-valuenow={f.hp} aria-valuemax={f.maxHp}><span style={{ width: pct(f.hp, f.maxHp) }} /></div>
            <div className={styles.foeHp}>HP {f.hp}</div>
            {i === ti && <span className={styles.tgt} aria-hidden="true">🎯</span>}
          </button>
        ))}
      </div>
      {!M && <><p className={styles.hint} data-testid="match3-hint" aria-live="polite">{hint || shortMsg || (cfg.diagonal ? DIAG_TIP : '按住寶珠拖過相鄰同色珠（≥3）放開攻擊')}</p>
      <button type="button" className={styles.helpBtn} aria-expanded={help} onClick={() => setHelp(!help)}>玩法說明</button>
      {help && <p className={styles.help}>{cfg.diagonal ? '本模式可斜連：上下左右與四個斜角都算相鄰。' : ''}拖過相鄰同色珠 3 顆以上放開攻擊目前目標；只有主屬性相同的卡出手。連 4 顆以上生成魔法珠，剛好 5 顆觸發五珠技（該屬性卡能量集滿）。每顆 +10 能量，滿 100 點「技能」。每隻敵人 ⏳ 倒數到 0 就反擊（本模式每 {cfg.counterEvery} 步）。連線模式：點選 2 張以上、每張 50 能量的卡，按「發動連線攻擊」。</p>}

      {!log.startsWith('按住寶珠') && log ? <p className={styles.log} aria-live="polite" data-testid="match3-log">{log}</p> : <span data-testid="match3-log" aria-live="polite" hidden />}</>}
      {M && <span data-testid="match3-log" aria-live="polite" className={styles.srOnly}>{log}</span>}

      <div ref={drag.ref} className={`${styles.board} ${cfg.cols > 7 ? styles.dense : ''} ${M ? styles.boardMin : ''}`} data-busy={busy ? '1' : undefined} onPointerDownCapture={busyTap} style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))` }} role="grid" aria-label="寶珠盤面（按住拖曳相鄰同色珠）" data-testid="match3-board" {...drag.handlers}>
        {board.map((row, r) => row.map((e, c) => { const kk = k(r, c); return (
          <OrbCell key={`${r}-${c}`} r={r} c={c} e={e} mp={magic[r]?.[c] ?? 0} sel={onPath.has(kk)} flash={flash.has(kk)} shake={shake.has(kk)} drop={drop.has(kk)} />); }))}
        <DragPathSvg points={drag.points} color={dragEl ? ORB_COLOR[dragEl] : '#fff'} />
        {chargeG && dragEl && <GuardianCharge element={dragEl === 'EARTH' ? 'EARTH' : chargeG.element} name={dragEl === 'EARTH' ? '四象' : chargeG.name} />}
        {M && (hint || shortMsg || busy) && <div className={styles.toast} data-testid="match3-hint" aria-live="polite">{hint || shortMsg || '結算中…'}</div>}
        {gfx[0] && <GuardianSkillFx key={gfx[0].fxId} act={gfx[0].act} bonus={gfx[0].bonus} onDone={nextGfx} />}
        {banner && <div className={`${styles.banner} ${styles['b_' + banner.kind]}`} data-testid="match3-banner" role="status">{banner.text}</div>}
      </div>
      {!M && <div className={styles.legend} aria-hidden="true">{MATCH3_ORB_ELEMENTS.map((e) => <span key={e}><i style={{ background: ORB_COLOR[e] }} />{MATCH3_ORB_LABEL[e]}</span>)}</div>}

      {M ? <div className={styles.dmgRow}><span data-testid="match3-damage">傷害 {totalDmg}</span>{lastDmg > 0 && <small>本步 {lastDmg}</small>}</div>
        : <div className={styles.secHead}><span>出戰神獸（點卡設優先；滿能量點「技能」）</span><span data-testid="match3-damage">傷害 {totalDmg}</span></div>}
      <div className={`${styles.team} ${linkMode ? styles.linkOn : ''}`}>
        {team.map((u) => {
          const down = u.hp <= 0;
          const full = !down && u.energy >= ENERGY_MAX;
          const dup = team.filter((x) => x.element === u.element).length > 1;
          const lead = rule === 'all-attack' || leads.has(u.id);
          const inLink = link.includes(u.id);
          return (
            <div key={u.id} data-testid="match3-ally" data-id={u.id} data-el={u.element} data-energy={u.energy} data-hp={u.hp} data-lead={lead ? '1' : '0'} data-link={inLink ? '1' : undefined} data-attacked={attacked.has(u.id) ? '1' : undefined}
              className={`${styles.ally} ${down ? styles.down : ''} ${full ? styles.allyFull : ''} ${hitTeam.has(u.id) ? styles.allyHit : ''} ${attacked.has(u.id) ? styles.allyAttack : ''} ${dup && lead ? styles.allyLead : ''} ${inLink ? styles.allyLink : ''}`}
              style={{ ['--ec' as string]: ORB_COLOR[u.element] }}>
              <button type="button" className={styles.allyBtn} disabled={down} onPointerDown={(e) => e.stopPropagation()} onClick={() => tapAlly(u)} aria-pressed={linkMode ? inLink : dup ? lead : undefined}
                aria-label={`${u.name}，${MATCH3_ORB_LABEL[u.element]}屬性${dup ? (lead ? '，主攻' : '，輔助') : ''}，HP ${u.hp}/${u.maxHp}，能量 ${u.energy}/${ENERGY_MAX}${linkMode ? (inLink ? '，已連線' : '，點擊加入連線') : ''}`}>
                <div className={styles.allyCard}><BeastCardFace card={{ id: u.id, name: u.name, thumbnail: u.thumbnail, element: u.element }} /></div>
                <div className={styles.bar}><span style={{ width: pct(u.hp, u.maxHp) }} /></div>
                <div className={styles.energy}><span style={{ width: pct(u.energy, ENERGY_MAX) }} /></div>
                <div className={styles.allyMeta}>{down ? '已倒下' : `${MATCH3_ORB_LABEL[u.element]}${dup ? (lead ? '・主攻' : '・輔助') : ''} ${u.energy}`}</div>
              </button>
              {full && !linkMode && <button type="button" className={styles.skill} data-testid="match3-skill" onPointerDown={(e) => e.stopPropagation()} onClick={() => unleash(u)}>技能</button>}
            </div>
          );
        })}
      </div>
      {onRepick && !M && <div className={styles.repick}><button type="button" data-testid="open-picker" onClick={onRepick}>重新選卡</button></div>}

      <div className={styles.actionBar} role="toolbar" aria-label="連線攻擊" data-testid="match3-actionbar">
        <button type="button" className={`${linkMode ? styles.on : ''} ${pulse ? styles.pulse : ''}`} data-testid="match3-link-mode" aria-pressed={linkMode} onClick={() => { setLinkMode(!linkMode); if (linkMode) setLink([]); }}>{linkMode ? '連線模式：開' : '連線模式'}</button>
        <button type="button" onClick={() => setLink([])} disabled={!link.length}>清除連線</button>
        <button type="button" className={styles.fire} aria-disabled={!linkMode || !!problem || !!over} onClick={() => { if (!linkMode) { setLog(`先按左下「連線模式」，再點 ${LINK_MIN_CARDS} 張以上、每張至少 ${LINK_ENERGY_COST} 能量的卡。`); setPulse(true); setTimeout(() => setPulse(false), 1600); return; } if (problem || over) { setLog(fireSub); return; } fireLink(); }} data-testid="match3-link-fire">發動連線攻擊<small>{fireSub}</small></button>
      </div>

      {M && info && (
        <div className={styles.infoMask} onClick={() => setInfo(false)}>
          <div className={styles.infoPanel} role="dialog" aria-modal="true" aria-label="說明" data-testid="match3-info-panel" onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoHead}><strong>說明</strong><button type="button" aria-label="關閉說明" onClick={() => setInfo(false)} autoFocus>✕</button></div>
            <h3>本局</h3>
            <p data-testid="match3-sub">{cfg.badge}・5 對 5・{cfg.cols}×{cfg.rows}＝{cfg.cols * cfg.rows} 顆寶珠{cfg.diagonal ? '・可斜連' : ''}。敵方：{cfg.enemyHint ?? foes.map((f) => f.name).join('・')}</p>
            <p>正式神獸卡 5v5・敵方 HP {cfg.enemyHp}／攻 {cfg.enemyAtk}／每 {cfg.counterEvery} 步反擊【待平衡】・seed {init.seed}・{over === 'win' ? '勝利' : over === 'lose' ? '落敗' : '戰鬥進行中'}</p>
            <h3>怎麼玩</h3>
            <p>按住寶珠拖過相鄰同色珠（≥3{cfg.diagonal ? '，可斜連' : ''}）放開攻擊。</p>
            <p>{ruleText}</p>
            <h3>敵方與出戰</h3>
            <p>敵方神獸：點選指定目標；⏳ 為反擊倒數。出戰神獸：點卡設優先；滿能量點「技能」。</p>
            <div className={styles.legendIn}>{MATCH3_ORB_ELEMENTS.map((e) => <span key={e}><i style={{ background: ORB_COLOR[e] }} />{MATCH3_ORB_LABEL[e]}</span>)}</div>
            {gOn && <><h3>四象魔法珠</h3><p>引爆魔法珠時，隊伍裡在場的四象神獸出招：風→{GUARDIAN_LIST.find((g) => g.element === 'AIR')?.name}、火→{GUARDIAN_LIST.find((g) => g.element === 'FIRE')?.name}、空→{GUARDIAN_LIST.find((g) => g.element === 'SPACE')?.name}、水→{GUARDIAN_LIST.find((g) => g.element === 'WATER')?.name}；地珠＝隊伍裡在場的四象隨機一隻。該段傷害 ×{GUARDIAN_MAGIC_MULT}，加成每次最多 +{GUARDIAN_MAGIC_BONUS_CAP}【待平衡】；目標已倒下時加成轉給下一隻存活敵人。演出點一下或按 Esc 可略過。</p></>}
            {onRepick && <div className={styles.repick}><button type="button" data-testid="open-picker" onClick={() => { setInfo(false); onRepick(); }}>重新選卡</button></div>}
            {log && <><h3>上一步</h3><p data-testid="match3-info-log">{log}</p></>}
          </div>
        </div>
      )}
      {over && (
        <div className={styles.result} role="dialog" aria-label="對戰結果" data-testid="match3-result" data-result={over}>
          <div className={styles.resultTitle}>{over === 'win' ? '勝利' : '這局先到這裡'}</div>
          <p>{over === 'win' ? `共 ${moves} 步擊退敵方五隻神獸，總傷害 ${totalDmg}。` : '敵方守住了，再來一局吧。'}</p>
          <button type="button" className={styles.again} onClick={restart}>再來一局</button>
        </div>
      )}
      <span hidden data-testid="match3-last-damage">{lastDmg}</span>
    </section>
  );
}
