'use client';
import Link from 'next/link';
/**
 * 神獸戰隊 v0.9｜五元素寶珠戰 5v5（寶珠戰卡片 → /beast-game/match3-preview → 自選出陣 → 本元件）
 * 10/30 鈺勝定案：功能＋版面以 5v5 截圖為準（敵方五隻、各自 ⏳ 反擊倒數、點選指定目標、我方五張點卡設優先、
 * 滿能量點「技能」、7×5 盤、回合＋靜音、底部「連線模式／清除連線／發動連線攻擊」常駐）；寶珠只沿用目前形狀寶石樣式（不降級）。
 * 規則不變：拖過相鄰同色 ≥3 放開發動、普通威力上限 10、≥4 生成魔法珠、剛好 5 顆魔法珠＋五珠技、每顆 +10 能量、
 * 每 3 步反擊、只有主屬性相同的卡出手、克制表 elements.ts、同屬性輔助拿一半能量。卡面只讀 .v2 新卡與 card-face-stats。
 */
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BeastCardFace } from './BeastCardTile';
import { useBannerQueue } from './bead/useBannerQueue';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import { getSkill } from '@/cards/skills';
import type { BeastElement } from '@/lib/beast-game/elements';
import {
  ENERGY_MAX, MAGIC_ORB_MIN_LENGTH, MATCH3_ORB_ELEMENTS, MATCH3_ORB_LABEL, NORMAL_POWER_CAP, SKILL5_LENGTH,
  buildEvents, computeHits, dragIntent, effectiveDragCount, isShieldFusionPath, emptyMagic, energyGains, generateDragBoard, resolveDrag, seededRng, skillAmount,
  DEFAULT_SAME_ELEMENT_RULE, attackingTeam, leadIds, chooseLead, type LeadChoice, shareEnergy, validTeamIds, type SameElementRule,
  MATCH3_ENEMY_NAMES, enemyNamesFor, makeFoe, aliveTarget, damageFoe, counterPhase, linkDamage, linkProblem, LINK_ENERGY_COST, LINK_MIN_CARDS,
  progressionStage, nextProgressionWins, selectProgressionEnemies, progressionEnemyStats,
  match3Mode, type Match3ModeConfig, type Match3ModeId,
  type Board, type Cell, type MagicGrid, type Match3Fighter, type Match3Foe, type Rng,
} from '@/lib/beast-game/match3';
import { DragPathSvg, dragHint, useDragChain } from './useDragChain';
import styles from './Match3Board.module.css';
import Match3ElementGlyph from './Match3ElementGlyph';
import { RIG_STRIKE_MS } from '@/lib/beast-game/beast-rig';
import Match3RigAttack, { Match3TargetArt, match3RigAttackers, type Match3Strike } from './Match3RigAttack';
import { readMatch3Progress, saveMatch3Progress, type Match3ProgressOwner } from '@/lib/beast-game/match3/progress-store';
import { readCampaign, settleWin, type CampaignSettlement } from '@/lib/beast-game/match3/hard-campaign-store';
import { validateCampaignTeam, campaignAttack, type HardCampaign } from '@/lib/beast-game/match3/hard-campaign';
import { createMatch3Sound, type Match3SoundCue } from './match3Sound';
import { runRefillPlayback } from '@/lib/beast-game/match3/refill-runner';
import { refillDisplaySteps, refillPresentation, refillLandingTimes, fusionShieldLayout, fusionDischarge, FUSION_CLEAR_AT_MS, FUSION_DISPLAY_MS, type RefillMotion } from '@/lib/beast-game/match3/refill-presentation';

interface Unit extends Match3Fighter { name: string; thumbnail: string; maxHp: number; energy: number; skillName?: string; description?: string }
interface Foe extends Match3Foe { name: string; thumbnail: string }
import type { Match3BusEvent } from '@/lib/beast-game/match3/event-bus';

export const ORB_COLOR: Record<BeastElement, string> = { AIR: '#2f9e7e', SPACE: '#8d6fd1', WATER: '#2c74d0', FIRE: '#e0532c', EARTH: '#c39324' };

/** 我方：外部 teamIds 合法照選的順序，否則五元素各一張（風空水火地）。敵方：固定五隻正式卡（enemies.json）。 */
export function pickLineup(rng: Rng, teamIds?: readonly string[] | null, mode: Match3ModeConfig = match3Mode(), wins = 0, campaign?: HardCampaign | null): { team: Unit[]; enemies: Foe[] } {
  const pool = playableCards().filter((c) => CARD_FACE_STATS[c.id]);
  const shuffled = pool.slice().sort(() => rng() - 0.5);
  const team: Unit[] = [];
  const foeNames = enemyNamesFor(mode.id);
  const unit = (c: (typeof pool)[number]): Unit => { const s = CARD_FACE_STATS[c.id]; const skill = getSkill(c.skills[0]); return { skillName: skill?.name, description: skill?.description, id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, attack: campaign ? campaignAttack(campaign, c.id) : s.attack, hp: s.hp, maxHp: s.hp, energy: 0 }; };
  if (validTeamIds(teamIds, pool.map((c) => c.id))) for (const id of teamIds) team.push(unit(pool.find((c) => c.id === id)!));
  else for (const el of MATCH3_ORB_ELEMENTS) {
    const c = shuffled.find((x) => x.element === el && !foeNames.includes(x.name)); if (c) team.push(unit(c));
  }
  const enemies: Foe[] = [];
  if (mode.id === 'hard45' || mode.id === 'hard45b') {
    for (const c of selectProgressionEnemies(pool, rng, wins)) {
      const s = progressionEnemyStats(c, wins);
      enemies.push({ id: c.id, element: c.element, hp: s.hp, maxHp: s.hp, attack: s.attack, cd: 1, name: c.name, thumbnail: c.art.thumbnail });
    }
    return { team, enemies };
  }
  for (const nm of foeNames) { const c = pool.find((x) => x.name === nm); if (c) enemies.push({ ...makeFoe(c.id, c.element, mode), name: c.name, thumbnail: c.art.thumbnail }); }
  return { team, enemies };
}

const ORB_CLASS: Record<BeastElement, string> = { AIR: styles.air, SPACE: styles.space, WATER: styles.water, FIRE: styles.fire, EARTH: styles.earth };
const k = (r: number, c: number) => r * 1000 + c;
/** 可斜連模式（config diagonal:true）的提示字。 */
const DIAG_TIP = '相鄰同色珠三顆起可消除（可斜連）；攻擊須達本關門檻';

const OrbCell = memo(function OrbCell({ r, c, e, mp, sel, flash, shake, drop, shield, fall, empty, reward }: { r: number; c: number; e: BeastElement; mp: number; shield: boolean; sel: boolean; flash: boolean; shake: boolean; drop: boolean; fall?: RefillMotion; empty?: boolean; reward?: boolean }) {
  if (empty) return <div role="gridcell" data-r={r} data-c={c} data-empty="true" className={`${styles.orb} ${styles.emptyCell}`} aria-label="待補珠空格" />;
  const cls = [styles.orb, ORB_CLASS[e], sel ? styles.sel : '', flash ? styles.flash : '', shake ? styles.shake : '', drop ? styles.drop : '', fall ? styles.falling : '', reward ? styles.reward : '', mp > 0 ? styles.magic : '', shield && mp >= 7 ? styles.shieldCell : ''].join(' ');
  return (
    <div role="gridcell" data-r={r} data-c={c} data-el={e} data-magic={mp || undefined} className={cls}
      data-fall-from={fall?.fromRow} data-fall-delay={fall?.delayMs}
      style={fall ? { ['--fall-offset' as string]: `calc(-${(r - fall.fromRow) * 100}% - ${r - fall.fromRow} * var(--orb-gap))`, ['--fall-delay' as string]: `${fall.delayMs}ms`, ['--fall-duration' as string]: `${fall.durationMs}ms`, ['--fall-opacity' as string]: fall.fromRow < 0 ? 0 : 1 } : undefined}
      aria-label={`${MATCH3_ORB_LABEL[e]}${mp ? `魔法珠威力${mp}` : '珠'}`}>
      <span className={styles.gem} aria-hidden="true" />
      {shield ? (mp < 7 && <Match3ElementGlyph element={e} className={styles.elementGlyph} />) : <span className={styles.lbl} aria-hidden="true">{MATCH3_ORB_LABEL[e]}</span>}
      {mp > 0 && (shield && mp >= 7 ? <img className={styles.shieldOrb} src="/pwa/save-shield-080.png" alt={`080 ${MATCH3_ORB_LABEL[e]}屬性清場盾牌`} draggable={false} /> : <span className={styles.power} aria-hidden="true">{mp}</span>)}
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

export interface Match3BoardProps { seed?: number; teamIds?: readonly string[] | null; sameElementRule?: SameElementRule; onRepick?: () => void; mode?: Match3ModeId; progressOwner?: Match3ProgressOwner; campaignEnabled?: boolean; onCampaignContinue?: () => void }
export default function Match3Board({ seed, teamIds, sameElementRule = DEFAULT_SAME_ELEMENT_RULE, onRepick, mode, progressOwner = null, campaignEnabled = false, onCampaignContinue }: Match3BoardProps) {
  const cfg = match3Mode(mode);
  const [init, setInit] = useState<{ rng: Rng; seed: number; wins: number; team: Unit[]; enemies: Foe[]; board: Board; owner: Match3ProgressOwner; revision: number } | null>(null);
  const revision = useRef(0);
  const [initError, setInitError] = useState('');
  const key = teamIds?.join(',') ?? '';
  useEffect(() => {
    const initialize = () => {
      const s = seed ?? (Date.now() % 100000); const rng = seededRng(s);
      const owner = cfg.id === 'medium' ? null : progressOwner;
      const campaign = campaignEnabled && owner ? readCampaign(owner) : null;
      if (campaignEnabled && (!campaign?.ok || !campaign.profile)) { setInitError(campaign?.error ?? '請先選擇主角及夥伴'); return; }
      if (campaign?.profile && !validateCampaignTeam(campaign.profile, teamIds ?? [])) { setInitError('請先選擇主角及四張已解鎖夥伴'); return; }
      const wins = cfg.id === 'medium' ? 0 : campaign?.profile?.wins ?? readMatch3Progress(owner);
      setInit({ rng, seed: s, wins, owner, revision: ++revision.current, ...pickLineup(rng, teamIds, cfg, wins, campaign?.profile), board: generateDragBoard(rng, cfg.rows, cfg.cols, cfg.diagonal, cfg.id === 'medium' ? 3 : progressionStage(wins).minChain) });
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, key, cfg.id, progressOwner, campaignEnabled]);
  if (initError) return <section className={styles.wrap} role="alert">{initError}<button type="button" onClick={onRepick}>返回我的卡片</button></section>;
  if (!init) return <section className={styles.wrap} aria-busy="true" />;
  return <Match3Game key={`${key}:${cfg.id}:${init.revision}`} init={init} teamIds={teamIds} rule={sameElementRule} onRepick={onRepick} cfg={cfg} campaignEnabled={campaignEnabled} onCampaignContinue={onCampaignContinue} />;
}

function Match3Game({ init, teamIds, rule, onRepick, cfg, campaignEnabled, onCampaignContinue }: { cfg: Match3ModeConfig; init: { rng: Rng; seed: number; wins: number; team: Unit[]; enemies: Foe[]; board: Board; owner: Match3ProgressOwner }; teamIds?: readonly string[] | null; rule: SameElementRule; onRepick?: () => void; campaignEnabled: boolean; onCampaignContinue?: () => void }) {
  const rigEnabled = cfg.id === 'hard45' || cfg.id === 'hard45b';
  const [wins, setWins] = useState(init.wins);
  const [progressSaveFailed, setProgressSaveFailed] = useState(false);
  const [campaignSettlement, setCampaignSettlement] = useState<CampaignSettlement | null>(null);
  const [savingReward, setSavingReward] = useState(false);
  const campaignMatchId = useRef<string | null>(null);
  const savingRewardRef = useRef(false);
  const stage = progressionStage(wins);
  const audio = useRef<ReturnType<typeof createMatch3Sound> | null>(null);
  const cue = useCallback((name: Match3SoundCue) => { if (!document.hidden) audio.current?.play(name); }, []);
  const impact = useCallback(() => cue('impact'), [cue]);
  const hadRig = useRef(false);
  const root = useRef<HTMLElement>(null);
  const strikeKey = useRef(0);
  const [strike, setStrike] = useState<Match3Strike | null>(null);
  const showStrike = (hits: readonly { attackerId?: string | null; amount: number }[], foe: Foe, after: Foe, charge = false) => {
    if (!rigEnabled) return;
    const attackerIds = match3RigAttackers(hits, foe.hp, after.hp);
    hadRig.current = attackerIds.length > 0;
    const next = attackerIds.length ? { key: ++strikeKey.current, targetId: foe.id, attackerIds } : null;
    setStrike(next);
    if (next && charge) cue('charge');
    if (!next && foe.hp > after.hp) cue('impact');
    if (next) later(() => setStrike(current => current?.key === next.key ? null : current), RIG_STRIKE_MS);
  };
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
  const [falling, setFalling] = useState<Map<number, RefillMotion>>(new Map());
  const [emptyCells, setEmptyCells] = useState<Set<number>>(new Set());
  const [rewards, setRewards] = useState<Set<number>>(new Set());
  const [clearMs, setClearMs] = useState(260);
  const [banner, setBanner, queuedBanner] = useBannerQueue();
  const [hitTeam, setHitTeam] = useState<Set<string>>(new Set());
  const [counterFoes, setCounterFoes] = useState<Set<number>>(new Set());
  const [hitFoe, setHitFoe] = useState<number | null>(null);
  const [attacked, setAttacked] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<LeadChoice>({});
  const [linkMode, setLinkMode] = useState(false);
  const [debug, setDebug] = useState(false);
  const [pulse, setPulse] = useState(false);
  useEffect(() => { setDebug(new URLSearchParams(window.location.search).get('debug') === '1'); }, []);
  const [link, setLink] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!rigEnabled) return;
    const controller = createMatch3Sound(); audio.current = controller;
    const hide = () => { if (document.hidden) controller.stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); controller.dispose(); if (audio.current === controller) audio.current = null; };
  }, [rigEnabled]);
  useEffect(() => { audio.current?.setMuted(muted); }, [muted]);
  const [help, setHelp] = useState(false);
  const [shieldBurst, setShieldBurst] = useState<BeastElement | null>(null);
  const [fusionBurst, setFusionBurst] = useState<BeastElement[] | null>(null);
  const [guardActive, setGuardActive] = useState(false);
  const [log, setLog] = useState(cfg.diagonal ? DIAG_TIP : '按住寶珠拖過相鄰同色珠（≥3）放開攻擊');
  const [busy, setBusy] = useState(false);
  const [shortMsg, setShortMsg] = useState('');
  const [refillEpoch, setRefillEpoch] = useState(0);
  const refillRun = useRef<AbortController | null>(null);
  const refillCommit = useRef<(() => void) | null>(null);
  useLayoutEffect(() => { const ack = refillCommit.current; refillCommit.current = null; ack?.(); }, [refillEpoch]);
  const timers = useRef(new Set<number>());
  const later = (fn: () => void, ms: number) => {
    const timer = window.setTimeout(() => { timers.current.delete(timer); fn(); }, ms);
    timers.current.add(timer);
  };
  useEffect(() => () => {
    refillRun.current?.abort(); refillCommit.current?.(); refillCommit.current = null;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.clear();
  }, []);
  const showBanner = (text: string, kind: 'magic' | 'skill' | 'counter' | 'info', visual = rigEnabled) => queuedBanner(text, kind, visual);
  const sound = (f: number) => { if (!muted) beep(f); };

  // 測試專用：?m3debug=1 才掛上（ko＝我方倒下、foeHp＝設敵方 HP），不改任何卡的真實數值。
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('m3debug') !== '1') return;
    (window as unknown as { __m3Debug?: unknown }).__m3Debug = {
      ko: (i: number) => setTeam((t) => t.map((u, j) => (j === i ? { ...u, hp: 0 } : u))),
      foeHp: (i: number, hp: number) => setFoes((f) => f.map((x, j) => (j === i ? { ...x, hp } : x))),
      fillEnergy: () => setTeam((t) => t.map((u) => ({ ...u, energy: ENERGY_MAX }))),
    };
    return () => { delete (window as unknown as { __m3Debug?: unknown }).__m3Debug; };
  }, []);

  const teamHp = team.reduce((s, u) => s + Math.max(0, u.hp), 0);
  const over = foes.every((f) => f.hp <= 0) ? 'win' : teamHp <= 0 ? 'lose' : null;
  const ti = aliveTarget(foes, target);
  const leads = leadIds(team, rule === 'tap-lead' ? chosen : {});

  const saveVictory = useCallback(async () => {
    if (!campaignEnabled || !init.owner || savingRewardRef.current) return;
    savingRewardRef.current = true; setSavingReward(true);
    try {
      campaignMatchId.current ??= window.crypto.randomUUID?.() ?? `orb-${window.crypto.getRandomValues(new Uint32Array(4)).join('-')}`;
      const result = await settleWin(init.owner, campaignMatchId.current, wins);
      setCampaignSettlement(result);
    } catch {
      setCampaignSettlement({ ok: false, saved: false, profile: null, error: '獎勵尚未保存，請重試。' });
    } finally { savingRewardRef.current = false; setSavingReward(false); }
  }, [campaignEnabled, init.owner, wins]);
  const campaignAwaiting = campaignEnabled && over === 'win' && !campaignSettlement?.saved;
  const wonCard = campaignSettlement?.saved && campaignSettlement.reward ? playableCards().find(c => c.id === campaignSettlement.reward!.cardId) : undefined;
  const wonSkill = wonCard ? getSkill(wonCard.skills[0]) : undefined;

  useEffect(() => {
    if (!rigEnabled || !over) return;
    if (campaignEnabled) { if (over === 'win') void saveVictory(); return; }
    setProgressSaveFailed(!saveMatch3Progress(init.owner, nextProgressionWins(wins, over === 'win')));
  }, [over, wins, rigEnabled, init.owner, campaignEnabled, saveVictory]);

  const restart = useCallback(() => {
    audio.current?.stop();
    if (campaignEnabled) { if (!campaignAwaiting) onCampaignContinue?.(); return; }
    setFalling(new Map()); setFlash(new Set()); setDrop(new Set()); setEmptyCells(new Set()); setRewards(new Set());
    setStrike(null); setShieldBurst(null); setFusionBurst(null); setGuardActive(false); setCounterFoes(new Set());
    const rng = rngRef.current; const nextWins = rigEnabled ? nextProgressionWins(wins, over === 'win') : 0; setWins(nextWins); const n = pickLineup(rng, teamIds, cfg, nextWins); const b = generateDragBoard(rng, cfg.rows, cfg.cols, cfg.diagonal, rigEnabled ? progressionStage(nextWins).minChain : 3);
    setTeam(n.team); setFoes(n.enemies); setTarget(0); setBoard(b); setMagic(emptyMagic(b)); setMoves(0); setTotalDmg(0); setLastDmg(0); setBanner(null);
    setLink([]); setLinkMode(false); setLog('新的一局。' + (cfg.diagonal ? DIAG_TIP : '按住寶珠拖過相鄰同色珠（≥3）放開攻擊'));
  }, [teamIds, cfg, wins, over, rigEnabled, campaignEnabled, campaignAwaiting, onCampaignContinue]);

  /** 困難版先完成我方攻擊，再由一張存活敵卡輪替反擊。 */
  const endStep = (t: Unit[], f: Foe[], msg: string, attack = true, forceCounter = false, shieldGuard = false) => {
    const cp = rigEnabled && !attack && !forceCounter ? { team: t, foes: f, hits: [] } : counterPhase(t, f, cfg.counterEvery, rigEnabled && !stage.simultaneous ? moves : undefined, rigEnabled && shieldGuard);
    const applyCounter = () => {
      setGuardActive(shieldGuard && cp.hits.length > 0);
      if (cp.hits.length) {
        setCounterFoes(new Set(cp.hits.map(h => h.enemy)));
        setHitTeam(new Set(cp.hits.map(h => h.targetId)));
        showBanner(shieldGuard ? '防禦合體：本輪反擊減傷一半' : '敵方反擊', 'counter');
        if (rigEnabled) cue(shieldGuard ? 'guard' : 'counter'); else sound(160);
        later(() => { setCounterFoes(new Set()); setHitTeam(new Set()); setGuardActive(false); }, 420);
      }
      setTeam(cp.team); setFoes(cp.foes); setLog(msg);
      if (rigEnabled) later(() => setBusy(false), cp.hits.length ? 420 : 0);
    };
    if (rigEnabled) {
      setBusy(true); setTeam(t); setFoes(f);
      later(applyCounter, attack ? (hadRig.current ? RIG_STRIKE_MS : 240) : 0);
    } else applyCounter();
  };

  const release = (path: Cell[]) => {
    if (busy || over || ti < 0) return;
    const res = resolveDrag(board, path, rngRef.current, magic, 50, cfg.diagonal, rigEnabled, rigEnabled ? stage.minChain : 3);
    if (!res.valid) {
      setShake(new Set(path.map((p) => k(p.r, p.c)))); later(() => setShake(new Set()), 340);
      const why = path.length < 3 ? `只連了 ${path.length} 顆，至少要 3 顆同色相連才能消除。` : '這條路線不成立，再試一次。';
      setLog(why); setShortMsg(why); later(() => setShortMsg(''), 1800);
      if (rigEnabled && res.reason === 'short' && path.length > 0) { setMoves(m => m + 1); endStep(team, foes, why, false, true); }
      return;
    }
    const el = res.element;
    const foe = foes[ti];
    const hits = computeHits(res.steps, attackingTeam(team, rule, chosen), foe.element);
    { const ids = new Set(hits.filter((h) => h.amount > 0 && h.attackerId).map((h) => h.attackerId as string)); setAttacked(ids); later(() => setAttacked(new Set()), 900); }
    const gains = energyGains(res);
    const events = buildEvents(res.steps, hits, { magicSpawn: res.magicSpawn, magicTriggered: res.magicTriggered, skill5Element: res.skill5 ? el : null, energy: gains });
    for (const ev of events) if (ev.type === 'clear') {
      const pub = { element: ev.element, count: ev.count, cascadeStep: ev.cascadeStep, eligible: ev.eligible, power: ev.power, target: foe.id, ...(ev.magic ? { magic: true, magicPower: ev.magicPower } : {}), ...(ev.skill5 ? { skill5: true } : {}) };
      (window.__match3Events ??= []).push(pub as Match3BusEvent); console.log('[match3]', pub);
    } else if (ev.type !== 'attack') { (window.__match3Events ??= []).push(ev); console.log('[match3]', ev); }
    const dealt = hits.reduce((s, h) => s + h.amount, 0);
    setBusy(true); if (!rigEnabled) sound(520 + res.chainLength * 40);
    const displaySteps = rigEnabled ? refillDisplaySteps(res) : res.steps;
    const frames = displaySteps.map((st, i) => ({ before: i === 0 ? board : displaySteps[i - 1].boardAfter, mag: i === 0 ? magic : displaySteps[i - 1].magicAfter,
      cells: new Set((st.clearedCells ?? st.groups.flatMap(g => g.cells)).map(c => k(c.r, c.c))) }));
    const fusionEffect = res.shieldFusion || !!res.shieldConversion;
    const shieldDelay = rigEnabled && fusionEffect ? FUSION_CLEAR_AT_MS : rigEnabled && res.magicTriggered.some(t => t.chain === 1 && t.power >= 7) ? 900 : 0;
    if (rigEnabled) cue(fusionEffect ? 'fusion' : shieldDelay ? 'shield' : dealt > 0 ? 'charge' : 'clear');
    if (shieldDelay) {
      if (fusionEffect) setFusionBurst(path.map(p => board[p.r][p.c]));
      else setShieldBurst(el);
    }
    let settleAt = shieldDelay + frames.length * 300;
    const playback = rigEnabled ? refillPresentation(displaySteps, window.matchMedia('(prefers-reduced-motion: reduce)').matches) : null;
    if (!rigEnabled) frames.forEach((fr, i) => later(() => { setBoard(fr.before); setMagic(fr.mag); setFlash(fr.cells); }, shieldDelay + i * 300));
    const settle = () => {
      setFlash(new Set()); setFalling(new Map()); setEmptyCells(new Set()); setRewards(new Set());
      if (!rigEnabled) { setDrop(changedCells(board, res.board)); later(() => setDrop(new Set()), 360); }
      setBoard(res.board); setMagic(res.magic); setBusy(false);
      const nf = damageFoe(foes, ti, dealt);
      showStrike(hits, foe, nf[ti]);
      if (dealt > 0) { setHitFoe(ti); later(() => setHitFoe(null), 500); }
      setMoves((m) => m + 1); setLastDmg(dealt); setTotalDmg((s) => s + dealt);
      const lbl = el ? MATCH3_ORB_LABEL[el] : '';
      let msg = `${res.chainLength} 格連珠、合計 ${rigEnabled ? res.effectiveLength : res.chainLength} 顆・連鎖 ${res.cascadeCount ?? res.steps.length}・本步傷害 ${dealt}`;
      if (res.shieldConversion) msg += `（同屬性盾牌合擊：其餘${lbl}寶珠轉為盾牌）`;
      else if (res.shieldFusion) msg += '（三盾清場充能：本輪反擊減傷一半、不疊加）';
      else if (!res.attackAllowed) msg += `（本關至少連 ${stage.minChain} 顆才有攻擊，這次只消除補珠）`;
      else if (dealt === 0) msg += `（隊伍沒有存活的${lbl}屬性主攻）`;
      if (res.chainLength > NORMAL_POWER_CAP) msg += `（普通威力上限 ${NORMAL_POWER_CAP} 顆）`;
      if (res.skill5) showBanner(`五珠技！${lbl}屬性卡能量集滿`, 'skill', rigEnabled);
      if (res.magicSpawn) showBanner(`生成${lbl}魔法珠・威力 ${res.magicSpawn.power}`, 'magic', rigEnabled);
      else if (res.magicTriggered.length && !res.shieldFusion) showBanner('魔法珠引爆！能量集滿', 'skill', rigEnabled);
      if (res.magicSpawn) msg += `，生成魔法珠（威力 ${res.magicSpawn.power}）`;
      if (res.reshuffled) msg += '；沒有可走的步，已重新洗盤';
      if (nf[ti].hp <= 0) msg += `；${foe.name}倒下`;
      endStep(shareEnergy(team, gains, rule, chosen), nf, msg, dealt > 0, rigEnabled, res.shieldFusion);
    };
    if (playback) {
      refillRun.current?.abort();
      const controller = new AbortController(); refillRun.current = controller;
      const paused = new Set<Animation>();
      void runRefillPlayback(playback.frames, {
        signal: controller.signal, initialDelayMs: fusionEffect ? FUSION_DISPLAY_MS : shieldDelay,
        intro: () => new Promise<void>(resolve => { refillCommit.current = resolve; setRefillEpoch(epoch => epoch + 1); }),
        commit: (phase, i) => new Promise<void>(resolve => {
          refillCommit.current = resolve;
          if (phase === 'clear') {
            if (i === 0) { setFusionBurst(null); setShieldBurst(null); if (fusionEffect) cue('clear'); }
            setFalling(new Map()); setRewards(new Set()); setClearMs(playback.frames[i].clearMs);
            setBoard(frames[i].before); setMagic(frames[i].mag); setFlash(frames[i].cells);
            setEmptyCells(new Set((i ? displaySteps[i - 1].emptyCells ?? [] : []).map(p => k(p.r, p.c))));
          } else {
            setFlash(new Set()); setBoard(displaySteps[i].boardAfter); setMagic(displaySteps[i].magicAfter);
            setEmptyCells(new Set((displaySteps[i].emptyCells ?? []).map(p => k(p.r, p.c))));
            setRewards(new Set((displaySteps[i].rewards ?? []).map(p => k(p.r, p.c))));
            setFalling(new Map(playback.frames[i].motions.map(motion => [k(motion.r, motion.c), motion])));
          }
          setRefillEpoch(epoch => epoch + 1);
        }),
        cues: i => {
          const motions = playback.frames[i].motions;
          const mergeAt = displaySteps[i].rewards?.length ? Math.max(0, ...motions.map(m => m.delayMs + m.durationMs)) : null;
          return [...refillLandingTimes(motions).filter(at => mergeAt === null || mergeAt - at >= 140).map(at => ({ at, kind: 'drop' as const })), ...(mergeAt === null ? [] : [{ at: mergeAt, kind: 'merge' as const }])];
        },
        cue: kind => cue(kind),
        pause: hidden => {
          if (hidden) for (const animation of drag.ref.current?.closest('[data-mode]')?.getAnimations({ subtree: true }) ?? []) {
            if (animation.playState === 'running') { paused.add(animation); animation.pause(); }
          } else { for (const animation of paused) {
            const target = (animation.effect as KeyframeEffect | null)?.target;
            if (target instanceof Element && target.isConnected && animation.playState === 'paused') animation.play();
          } paused.clear(); }
        },
        complete: () => { if (refillRun.current === controller) refillRun.current = null; settle(); },
      }).catch(error => { if (error?.name !== 'AbortError') console.error('[match3-refill]', error); });
    } else later(settle, settleAt);
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
    const damaged = damageFoe(foes, ti, amt);
    showStrike([{ attackerId: u.id, amount: amt }], foe, damaged[ti], true);
    setFoes(damaged); setHitFoe(ti); later(() => setHitFoe(null), 500);
    setTeam(team.map((x) => (x.id === u.id ? { ...x, energy: 0 } : x))); setLastDmg(amt); setTotalDmg((s) => s + amt);
    if (rigEnabled) { setMoves(m => m + 1); endStep(team.map(x => x.id === u.id ? { ...x, energy: 0 } : x), damaged, '技能攻擊完成', amt > 0); }
    showBanner(`${u.name}技能 −${amt}`, 'skill'); if (!rigEnabled) sound(880);
    setLog(`${u.name}發動技能，對${foe.name}造成 ${amt} 點傷害（${rigEnabled ? '計一回合，存活對手接著反擊' : '不算步數'}）。`);
  };

  const problem = linkProblem(team, link);
  const fireLink = () => {
    if (!linkMode || problem || over || busy || ti < 0) return;
    const cards = link.map((id) => team.find((u) => u.id === id)!);
    const amt = linkDamage(cards.map((c) => c.attack)); const foe = foes[ti];
    const damaged = damageFoe(foes, ti, amt);
    showStrike(cards.map(c => ({ attackerId: c.id, amount: amt })), foe, damaged[ti], true);
    setFoes(damaged); setHitFoe(ti); later(() => setHitFoe(null), 500);
    setTeam(team.map((u) => (link.includes(u.id) ? { ...u, energy: u.energy - LINK_ENERGY_COST } : u)));
    setLastDmg(amt); setTotalDmg((s) => s + amt); setLink([]); setLinkMode(false);
    if (rigEnabled) { setMoves(m => m + 1); endStep(team.map(u => link.includes(u.id) ? { ...u, energy: u.energy - LINK_ENERGY_COST } : u), damaged, '連線攻擊完成', amt > 0); }
    showBanner(`連線攻擊 ${cards.length} 張 −${amt}`, 'skill'); if (!rigEnabled) sound(990);
    setLog(`連線攻擊：${cards.map((c) => c.name).join('＋')} 對${foe.name}造成 ${amt} 點傷害（${rigEnabled ? '計一回合，存活對手接著反擊' : '不算步數'}）。`);
  };
  const fireSub = !linkMode ? `需 ${LINK_MIN_CARDS} 張卡各 ${LINK_ENERGY_COST} 能量` : problem === 'tooFew' ? `再選 ${LINK_MIN_CARDS - link.length} 張` : problem === 'energyLow' ? `每張需 ${LINK_ENERGY_COST} 能量` : problem ? '有卡已倒下' : `${link.length} 張・預估 ${linkDamage(link.map((id) => team.find((u) => u.id === id)?.attack ?? 0))}`;

  const drag = useDragChain(board, !busy && !over, release, cfg.diagonal, magic, rigEnabled);
  const dragEl = drag.path.length ? board[drag.path[0].r][drag.path[0].c] : null;
  const chainIntent = dragIntent(drag.path, magic, rigEnabled ? stage.minChain : 3, rigEnabled, board);
  const effectiveCount = rigEnabled ? effectiveDragCount(drag.path, magic) : drag.path.length;
  const hint = rigEnabled && isShieldFusionPath(drag.path, magic) ? chainIntent === 'attack' ? '同屬性盾牌合擊：其餘同色寶珠轉為盾牌' : '三盾清場充能：下一輪反擊減傷一半，不疊加' : dragEl && rigEnabled && drag.path.length >= 3 && effectiveCount < stage.minChain ? `合計 ${effectiveCount} 顆：只消除補珠，本關需 ${stage.minChain} 顆才會攻擊` : dragEl ? dragHint(effectiveCount, MATCH3_ORB_LABEL[dragEl], NORMAL_POWER_CAP, MAGIC_ORB_MIN_LENGTH, SKILL5_LENGTH) : '';
  const onPath = new Set(drag.path.map((p) => k(p.r, p.c)));
  const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, Math.round((a / b) * 100)))}%`;

  const actions = (
<div className={styles.actionBar} role="toolbar" aria-label="連線攻擊" data-testid="match3-actionbar">
        <button type="button" className={`${linkMode ? styles.on : ''} ${pulse ? styles.pulse : ''}`} data-testid="match3-link-mode" aria-pressed={linkMode} onClick={() => { setLinkMode(!linkMode); if (linkMode) setLink([]); }}>{linkMode ? '連線模式：開' : '連線模式'}</button>
        <button type="button" onClick={() => setLink([])} disabled={!link.length}>清除連線</button>
        <button type="button" className={styles.fire} aria-disabled={!linkMode || !!problem || !!over} onClick={() => { if (!linkMode) { setLog(`先按左下「連線模式」，再點 ${LINK_MIN_CARDS} 張以上、每張至少 ${LINK_ENERGY_COST} 能量的卡。`); setPulse(true); setTimeout(() => setPulse(false), 1600); return; } if (problem || over) { setLog(fireSub); return; } fireLink(); }} data-testid="match3-link-fire">發動連線攻擊<small>{fireSub}</small></button>
      </div>
  );

  return (
    <section ref={root} className={styles.wrap} onPointerDownCapture={() => audio.current?.unlock()} onKeyDownCapture={() => audio.current?.unlock()} style={{ ['--accent' as string]: cfg.accent }} aria-label={`${cfg.title}｜${cfg.subtitle}`} data-mode={cfg.id} data-cols={cfg.cols} data-rows={cfg.rows}>
      {rigEnabled && <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <clipPath id="match3-soft-space" clipPathUnits="objectBoundingBox"><path d="M .42 .1 Q .5 .02 .58 .1 L .9 .42 Q .98 .5 .9 .58 L .58 .9 Q .5 .98 .42 .9 L .1 .58 Q .02 .5 .1 .42 Z" /></clipPath>
          <clipPath id="match3-soft-fire" clipPathUnits="objectBoundingBox"><path d="M .42 .12 Q .5 -.02 .58 .12 L .94 .78 Q 1 .92 .84 .92 L .16 .92 Q 0 .92 .06 .78 Z" /></clipPath>
        </defs>
      </svg>}
      <header className={styles.head}>
        {rigEnabled && <Link href="/" className={styles.homeLink} data-testid="match3-home">回到首頁</Link>}
        {rigEnabled && onRepick && <div className={`${styles.repick} ${styles.repickTop}`}><button type="button" data-testid="open-picker" disabled={busy || campaignAwaiting} onClick={onRepick}>{campaignEnabled ? '我的卡片' : '重新選卡'}</button></div>}
        <div className={rigEnabled ? styles.srOnly : styles.headText}>
          <div className={styles.kicker} data-testid="match3-badge">{cfg.badge}</div>
          <h1 className={styles.title} data-testid="match3-title">{cfg.title}<small className={styles.subtitle}>｜{cfg.subtitle}</small></h1>
        </div>
        <button type="button" className={styles.mute} aria-pressed={muted} aria-label={muted ? '開啟音效' : '靜音'} onClick={() => { audio.current?.setMuted(!muted); setMuted(!muted); if (muted) audio.current?.unlock(); }}>{muted ? '🔇' : '🔊'}</button>
        <div className={styles.round} data-testid={rigEnabled ? 'match3-attack-threshold' : 'match3-round'}>{rigEnabled ? `${stage.label}·${stage.minChain}顆可攻擊` : `回合 ${moves + 1}`}</div>
        {rigEnabled && <span className={styles.srOnly} data-testid="match3-round">{stage.label}·{moves + 1}回合</span>}
        {rigEnabled && <button type="button" className={`${styles.helpBtn} ${styles.helpTop}`} aria-expanded={help} onClick={() => setHelp(!help)}>玩法與操作</button>}
      </header>
      {rigEnabled && help && actions}
      <div className={rigEnabled ? styles.srOnly : styles.sub} data-testid="match3-sub">{team.length} 對 {foes.length}・{cfg.cols * cfg.rows} 顆寶珠{cfg.diagonal ? '・可斜連' : ''}・敵方：{cfg.enemyHint ?? foes.map((f) => f.name).join('・')}</div>
      {debug && <div className={styles.sub} data-testid="match3-debug">[debug] 正式神獸卡 5v5・{cfg.cols}×{cfg.rows}＝{cfg.cols * cfg.rows} 顆寶珠・敵方 HP {cfg.enemyHp}／攻 {cfg.enemyAtk}／每 {cfg.counterEvery} 步反擊【待平衡】{cfg.diagonal ? '・可斜連' : ''}・seed {init.seed}</div>}

      <div className={rigEnabled ? styles.srOnly : styles.secHead}><span>敵方神獸（點選指定目標；⏳ 為反擊倒數）</span><span>{over === 'win' ? '勝利' : over === 'lose' ? '落敗' : '戰鬥進行中'}</span></div>
      <div className={`${styles.foes} ${rigEnabled && stage.simultaneous && counterFoes.size > 1 ? styles.fourBeastUnion : ''}`} style={rigEnabled ? { gridTemplateColumns: `repeat(${foes.length}, minmax(0, 1fr))` } : undefined} data-testid="match3-enemies">
        {foes.map((f, i) => (
          <button type="button" key={f.id} data-testid="match3-enemy" data-id={f.id} data-hp={f.hp} data-cd={f.cd} data-target={i === ti ? '1' : '0'}
            disabled={f.hp <= 0} onClick={() => { if (f.hp > 0) { setTarget(i); setLog(`目標改為${f.name}。`); } }}
            aria-pressed={i === ti} aria-label={`${f.name}，${MATCH3_ORB_LABEL[f.element]}屬性，HP ${f.hp}/${f.maxHp}，${f.cd} 步後反擊${i === ti ? '，目前目標' : '，點擊設為目標'}`}
            className={`${styles.foe} ${i === ti ? styles.foeOn : ''} ${f.hp <= 0 ? styles.down : ''} ${hitFoe === i ? styles.allyHit : ''} ${counterFoes.has(i) ? styles.foeAttack : ''} ${f.cd === 1 && f.hp > 0 ? styles.foeHot : ''}`}
            style={{ ['--ec' as string]: ORB_COLOR[f.element] }}>
            <span className={styles.cd} data-testid="match3-counter" aria-hidden="true">⏳{f.cd}</span>
            <div className={styles.foeArt} role="img" aria-label={f.name} data-rig-target={rigEnabled || undefined} style={rigEnabled ? undefined : { backgroundImage: `url(${f.thumbnail})` }}>{rigEnabled && <Match3TargetArt src={f.thumbnail} />}</div>
            <div className={styles.foeName}>{f.name}</div>
            <div className={`${styles.bar} ${styles.foeBar}`} role="progressbar" aria-label={`${f.name}生命`} aria-valuenow={f.hp} aria-valuemax={f.maxHp}><span style={{ width: pct(f.hp, f.maxHp) }} /></div>
            <div className={styles.foeHp}>HP {f.hp}</div>
            {i === ti && <span className={styles.tgt} aria-hidden="true">🎯</span>}
          </button>
        ))}
      </div>
      <p className={rigEnabled ? styles.srOnly : styles.hint} data-testid="match3-hint" aria-live="polite">{hint || shortMsg || (cfg.diagonal ? DIAG_TIP : '按住寶珠拖過相鄰同色珠（≥3）放開攻擊')}</p>
      {!rigEnabled && <button type="button" className={styles.helpBtn} aria-expanded={help} onClick={() => setHelp(!help)}>玩法說明</button>}
      {help && <p className={styles.help}>{rigEnabled ? '至少連過三格同色珠，普通珠算一顆，數字珠按其數字累加；例如三顆普通珠加數字五，合計八顆。合計七顆以上可獲得一顆 080 盾牌；之後以有效同色連線連入盾牌，清除整盤同色珠。至少三顆同屬性純盾牌連接會合擊，消耗本次連到的盾牌，按既有卡片與儲存顆數攻擊；其餘同屬性寶珠轉為盾牌，原本較高的數值保留。至少三顆不同顏色純盾牌連接，合體清除整盤對應顏色，依實際消除數量替對應卡片充能，最多充滿現有技能條；下一輪反擊減傷一半、不疊加，合體本身不攻擊。剩餘珠子先下落合成，再補新珠；自然連線累計四顆以上會保留數字，七顆以上變盾牌，三顆只消除。連線不能交叉、重疊或跳格。' : ''}{cfg.diagonal ? '本模式可斜連：上下左右與四個斜角都算相鄰。' : ''}拖過相鄰同色珠 3 顆以上可消除；本關連 {rigEnabled ? stage.minChain : 3} 顆以上放開才會攻擊目前目標；只有主屬性相同的卡出手。連 4 顆以上生成魔法珠，剛好 5 顆觸發五珠技（該屬性卡能量集滿）。每顆 +10 能量，滿 100 點「{rigEnabled ? '能量攻擊' : '技能'}」。{rigEnabled && '卡面列的是原始技能資料；本模式目前使用通用能量攻擊，獨有技能效果尚未接入。'}{rigEnabled ? '每次我方攻擊結束，對方接著反擊；連三顆起可消除補珠；未達本關攻擊顆數則我方傷害為零，仍換對方攻擊。第一關幼子、第二至第七關成獸；第八、九、十關依序加入一、二、三隻神獸，第十一關起四獸到齊才聯合反擊，之前由一張存活卡反擊。連珠攻擊門檻逐關提高至八顆，之後提高對方強度。獲勝升一關，落敗保留難度重試；本人進度保存在這個瀏覽器，親友進度只在本分頁保留，重新選擇親友會重來。生命歸零倒下，全隊倒下結算。' : <>每隻敵人 ⏳ 倒數到 0 就反擊（本模式每 {cfg.counterEvery} 步）。</>}連線模式：點選 2 張以上、每張 50 能量的卡，按「發動連線攻擊」。</p>}

      {!log.startsWith('按住寶珠') && log ? <p className={rigEnabled ? styles.srOnly : styles.log} aria-live="polite" data-testid="match3-log">{log}</p> : <span data-testid="match3-log" aria-live="polite" hidden />}

      <div ref={drag.ref} className={`${styles.board} ${cfg.cols > 7 ? styles.dense : ''}`} style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))`, ['--clear-duration' as string]: `${clearMs}ms` }} role="grid" aria-label="寶珠盤面（按住拖曳相鄰同色珠）" data-testid="match3-board" data-refill-epoch={rigEnabled ? refillEpoch : undefined} data-refilling={falling.size > 0 ? 'true' : undefined} data-chain-intent={rigEnabled ? chainIntent : undefined} aria-busy={rigEnabled ? busy : undefined} {...drag.handlers}>
        {board.map((row, r) => row.map((e, c) => { const kk = k(r, c); return (
          <OrbCell key={`${r}-${c}-${rigEnabled ? refillEpoch : 0}`} r={r} c={c} e={e} mp={magic[r]?.[c] ?? 0} shield={rigEnabled} sel={onPath.has(kk)} flash={flash.has(kk)} shake={shake.has(kk)} drop={drop.has(kk)} fall={falling.get(kk)} empty={emptyCells.has(kk)} reward={rewards.has(kk)} />); }))}
        {shieldBurst && <div className={styles.shieldBurst} style={{ color: ORB_COLOR[shieldBurst] }} role="status" aria-label="080 盾牌清除同色寶珠"><span /><img src="/pwa/save-shield-080.png" alt="" draggable={false} /></div>}
        {fusionBurst && <div className={styles.fusionBurst} data-testid="shield-fusion-effect" role="status" aria-label="盾牌合體" style={{ ['--fusion-duration' as string]: `${FUSION_DISPLAY_MS}ms`, ['--fusion-colors' as string]: `conic-gradient(${fusionBurst.map(e => ORB_COLOR[e]).join(',')})` }}><div className={styles.fusionHalo} /><svg className={styles.fusionLightning} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{fusionDischarge(fusionBurst, board).map(bolt => <polyline key={bolt.element} points={bolt.points} stroke={ORB_COLOR[bolt.element]} vectorEffect="non-scaling-stroke" />)}</svg>{fusionShieldLayout(fusionBurst.length).map((pose, i) => <span key={i} className={styles.fusionShield} data-fusion-element={fusionBurst[i]} data-primary={pose.primary || undefined} style={{ color: ORB_COLOR[fusionBurst[i]], width: `${pose.size}%`, ['--fusion-x' as string]: `${pose.x}%`, ['--fusion-y' as string]: `${pose.y}%`, ['--fusion-scale' as string]: pose.scale }}><img src="/pwa/save-shield-080.png" alt="" draggable={false} /></span>)}</div>}
        <DragPathSvg points={drag.points} color={dragEl ? ORB_COLOR[dragEl] : '#fff'} luminous={rigEnabled} />
        {banner && (banner.visual
          ? <div className={`${styles.chainEffect} ${banner.kind === 'skill' ? styles.chainCharged : ''} ${banner.kind === 'counter' ? styles.chainCounter : ''}`} data-testid="match3-chain-effect" role="status"><span className={styles.srOnly}>{banner.text}</span><span aria-hidden="true" className={styles.chainRing} /><span aria-hidden="true" className={styles.chainCore} /></div>
          : <div className={`${styles.banner} ${styles['b_' + banner.kind]}`} data-testid="match3-banner" role="status">{banner.text}</div>)}
      </div>
      {!rigEnabled && <div className={styles.legend} aria-hidden="true">{MATCH3_ORB_ELEMENTS.map((e) => <span key={e}><i style={{ background: ORB_COLOR[e] }} />{MATCH3_ORB_LABEL[e]}</span>)}</div>}

      <div className={rigEnabled ? styles.srOnly : styles.secHead}><span>出戰神獸（點卡設優先；滿能量點「技能」）</span><span data-testid="match3-damage">傷害 {totalDmg}</span></div>
      <div className={`${styles.team} ${linkMode ? styles.linkOn : ''}`}>
        {team.map((u) => {
          const down = u.hp <= 0;
          const full = !down && u.energy >= ENERGY_MAX;
          const dup = team.filter((x) => x.element === u.element).length > 1;
          const lead = rule === 'all-attack' || leads.has(u.id);
          const inLink = link.includes(u.id);
          return (
            <div key={u.id} data-testid="match3-ally" data-id={u.id} data-el={u.element} data-energy={u.energy} data-hp={u.hp} data-lead={lead ? '1' : '0'} data-link={inLink ? '1' : undefined} data-attacked={attacked.has(u.id) ? '1' : undefined} data-shield-guard={guardActive && !down ? 'true' : undefined}
              className={`${styles.ally} ${down ? styles.down : ''} ${full ? styles.allyFull : ''} ${hitTeam.has(u.id) ? styles.allyHit : ''} ${attacked.has(u.id) ? styles.allyAttack : ''} ${dup && lead ? styles.allyLead : ''} ${inLink ? styles.allyLink : ''} ${guardActive && !down ? styles.allyGuard : ''}`}
              style={{ ['--ec' as string]: ORB_COLOR[u.element] }}>
              <button type="button" className={styles.allyBtn} disabled={down} onPointerDown={(e) => e.stopPropagation()} onClick={() => tapAlly(u)} aria-pressed={linkMode ? inLink : dup ? lead : undefined}
                aria-label={`${u.name}，${MATCH3_ORB_LABEL[u.element]}屬性${dup ? (lead ? '，主攻' : '，輔助') : ''}，HP ${u.hp}/${u.maxHp}，能量 ${u.energy}/${ENERGY_MAX}${linkMode ? (inLink ? '，已連線' : '，點擊加入連線') : ''}`}>
                <div className={styles.allyCard} data-rig-source><BeastCardFace card={{ id: u.id, name: u.name, thumbnail: u.thumbnail, element: u.element, skillName: u.skillName, description: u.description }} /></div>
                <div className={styles.bar}><span style={{ width: pct(u.hp, u.maxHp) }} /></div>
                <div className={styles.energy}><span style={{ width: pct(u.energy, ENERGY_MAX) }} /></div>
                <div className={styles.allyMeta}>{down ? '已倒下' : `${MATCH3_ORB_LABEL[u.element]}${dup ? (lead ? '・主攻' : '・輔助') : ''} ${u.energy}`}</div>
              </button>
              {full && !linkMode && <button type="button" className={styles.skill} data-testid="match3-skill" onPointerDown={(e) => e.stopPropagation()} onClick={() => unleash(u)}>{rigEnabled ? '能量攻擊' : '技能'}</button>}
            </div>
          );
        })}
      </div>
      {!rigEnabled && onRepick && <div className={styles.repick}><button type="button" data-testid="open-picker" onClick={onRepick}>重新選卡</button></div>}

      {!rigEnabled && actions}

      {over && (
        <div className={styles.result} role="dialog" aria-label="對戰結果" data-testid="match3-result" data-result={over}>
          <div className={styles.resultTitle}>{over === 'win' ? '勝利' : '這局先到這裡'}</div>
          <p>{over === 'win' ? `共 ${moves} 步擊退敵方 ${foes.length} 隻神獸，總傷害 ${totalDmg}。` : '敵方守住了，再來一局吧。'}</p>
          {progressSaveFailed && <p role="alert">此瀏覽器無法儲存進度，關閉頁面後可能遺失。</p>}
          {campaignEnabled && over === 'win' && <div data-testid="campaign-victory-reward" aria-live="polite">
            {savingReward ? <p>正在保存本局獎勵…</p> : wonCard ? <>
              <p>多了一張{wonCard.name}！已存入寶珠「我的卡片」，可選作下一局夥伴。</p>
              <div className={styles.campaignRewardCard}><BeastCardFace card={{ id: wonCard.id, name: wonCard.name, element: wonCard.element, thumbnail: wonCard.art.thumbnail, skillName: wonSkill?.name, description: wonSkill?.description }} /></div>
              <button type="button" className={styles.again} disabled={busy} onClick={onRepick}>查看我的卡片</button>
            </> : <><p role="alert">{campaignSettlement?.error ?? '獎勵尚未保存。'}</p><button type="button" className={styles.again} onClick={() => void saveVictory()}>重試保存獎勵</button></>}
          </div>}
          <button type="button" className={styles.again} disabled={busy || campaignAwaiting} onClick={restart}>{rigEnabled ? (over === 'win' ? '挑戰下一關' : '原難度重試') : '再來一局'}</button>
        </div>
      )}
      {rigEnabled && <Match3RigAttack ids={team.map(u => u.id)} root={root} strike={strike} onImpact={impact} />}
      <span hidden data-testid="match3-last-damage">{lastDmg}</span>
    </section>
  );
}
