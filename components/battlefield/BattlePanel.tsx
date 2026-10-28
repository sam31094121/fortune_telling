'use client';

/**
 * 神獸戰場 V2・戰鬥面板
 * ============================================================================
 *
 * 業主定調〈二十四〉：戰場穩了才加 HP、攻擊、防禦、速度、技能、傷害、勝負。
 *
 * 【這一層不判斷任何事】
 *
 * 能出什麼招 → legalActions()
 * 出招之後怎樣 → advance()
 * 誰贏 → match.winner
 *
 * 全部來自 lib/beast-game/interactive.ts（已通過 test:beast-game 194 項）。
 * 這個面板只負責把它畫出來，**一個數值都不重算**。
 * 畫面自己算一次，就等於第二套核心，兩邊遲早給出不同答案。
 */

import styles from './BattlePanel.module.css';
import { memo, useEffect, useRef, useState } from 'react';
import type { BattlefieldCardArt } from './GameBattlefield';
import ElementOrbDisplay from './ElementOrbDisplay';
import {
  ELEMENT_FX,
  beastVoiceFor,
  createSoundPlayer,
  playBeastAction,
  playBeastRage,
  playClashSequence,
  playVictoryMusic,
  playDefeatMusic,
  type BattleElement,
} from '@/lib/beast-battle-fx';
import { performedAction, isDamagingAction, COMBAT_BEAT_MS } from '@/lib/beast-game/combat-presentation';
import { weaponFor } from '@/lib/beast-game/weapons';
import type { BeastElement } from '@/lib/beast-game/elements';
import type { BattleView } from '@/lib/beast-game/battle-view';
import {
  profile,
  type Action,
  type Match,
  type Side,
} from '@/lib/beast-game/interactive';
import WinStreakCounter from './WinStreakCounter';
import VictoryMoment from './VictoryMoment';
import UpgradePathHint from './UpgradePathHint';
import ShareBadge from './ShareBadge';
import { RIG_STRIKE_EVENT, rigFor } from '@/lib/beast-game/beast-rig';
import SoundEnhancer from './SoundEnhancer';

/** 生命與護盾。護盾先扣，所以畫在血條上面一層。 */
export function VitalBar({
  hp, maxHp, shield, beat,
}: {
  hp: number;
  maxHp: number;
  shield: number;
  /** 每次數值變動就換一次，用來重播一次掃光。不是動畫常駐。 */
  beat?: number;
}) {
  const life = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  // 護盾按同一條血量的比例畫，客戶才看得出「還要多打這麼多才見血」。
  const guard = Math.max(0, Math.min(100 - life, (shield / Math.max(1, maxHp)) * 100));
  // 三成以下轉紅並脈動。這不是裝飾，是「快沒了」的警告。
  const critical = life <= 30 && hp > 0;
  return (
    <div
      key={beat}
      className={[styles.vital, critical ? styles.critical : '', beat ? styles.struck : ''].filter(Boolean).join(' ')}
      role="img"
      aria-label={`生命 ${hp} / ${maxHp}${shield ? `，護盾 ${shield}` : ''}${critical ? '，命危' : ''}`}
    >
      <span className={styles.life} style={{ width: `${life}%` }} />
      {guard > 0 && <span className={styles.guard} style={{ width: `${guard}%`, left: `${life}%` }} />}
    </div>
  );
}

export function FighterStatus({ match, side, label }: { match: Match; side: Side; label: string }) {
  const team = match[side];
  const fighter = team.team[team.active];
  const sideSymbol = side === 'player' ? '◎' : '☯';
  return (
    <div className={styles.status}>
      <div className={styles.statusHead}>
        <strong className={styles.elementBadge}>
          {/* 元素寶珠：戰鬥中也看得出誰是什麼屬性，不必回頭看卡面。 */}
          <div className={styles.orbBadge}>
            <ElementOrbDisplay element={fighter.element} size="mini" animated={false} />
          </div>
          {sideSymbol}
        </strong>
        <span className={styles.energy} aria-label={`氣 ${team.energy}`}>⚡{team.energy}</span>
      </div>
      <VitalBar hp={fighter.hp} maxHp={fighter.maxHp} shield={fighter.shield} beat={match.revision} />
      {/*
        武器條。名字取自這一宿的身體部位，型別目前全是暴風型。
        **只是顯示**——傷害仍然由 interactive.ts 算，這裡一個數字都不參與。
      */}
      {(() => {
        const weapon = weaponFor(fighter.cardId, fighter.name, fighter.element);
        const glow = ELEMENT_FX[fighter.element as BattleElement]?.glow ?? '#94a3b8';
        return (
          <p className={styles.weapon} style={{ color: glow }} title={weapon.exposed}>
            <span className={styles.weaponClass}><span>{weapon.weaponClass}</span></span>
            <span className={styles.weaponName}>{weapon.name}</span>
            <span className={styles.weaponPart}>{weapon.part}</span>
          </p>
        );
      })()}
      <p className={styles.roster}>
        {team.team.map((f, index) => (
          <span key={f.instanceId} className={index === team.active ? styles.onField : f.defeated ? styles.down : ''} aria-label={f.defeated ? '已倒下' : index === team.active ? '主戰' : '待命'}>
            {f.defeated ? '✕' : index === team.active ? '●' : '○'}
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * 行動列。
 *
 * 只列出 legalActions() 給的動作——沒有氣就沒有技能鈕、
 * 冷卻中就沒有技能鈕、被打倒就只剩換位。**畫面不自己判斷能不能按**。
 */
export function BattleActionBar({
  match, view, onAction, busy, compact, attackOnCard, relaxed,
}: {
  match: Match;
  /** 後端送來的可出招清單與暴怒判斷；畫面照印，不自己判斷。 */
  view?: BattleView | null;
  onAction: (action: Action) => void;
  busy?: boolean;
  compact?: boolean;
  attackOnCard?: boolean;
  relaxed?: boolean;
}) {
  const [commandView, setCommandView] = useState<'rage' | null>(null);
  const commandDetail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (commandView) commandDetail.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, [commandView]);
  if (match.status !== 'PLAYING') return null;
  if (!view) return <p className={styles.activeHint} role="status">戰況同步中…</p>;
  const actions = view.legal;
  const active = match.player.team[match.player.active];
  const skill = profile(active.cardId);

  if (compact) {
    const attack = actions.find(action => action.type === 'ATTACK');
    const special = actions.find(action => action.type === 'SKILL');
    const rage = actions.find(action => action.type === 'RAGE');
    const rageReason = view.rageReason;
    const ragePartner = view.ragePartner;
    const fusionGuide = view.fusionGuide;
    // The core's forced-replacement phase consumes neither an attack nor a round.
    // Never label that transition as a normal attack that appears to do nothing.
    // 主戰倒下：接替走畫面最下方的固定選卡列（BattleDock），這裡只提示，不再另開後備清單。
    if (active.defeated) return <div className={styles.compactActions}>
      <p className={styles.activeHint} role="status" data-swap-guide>主戰已倒下——請點最下方的卡片接替上場；這一步不出招。</p>
    </div>;
    if (match.opponent.team[match.opponent.active].defeated && attack) return <div className={styles.compactActions}>
      <p className={styles.activeHint} role="status">易經已倒下，接下來由後備上場；這一步不出招。</p>
      <button type="button" className={styles.actionButton} disabled={busy} onClick={() => { setCommandView(null); onAction(attack); }}>繼續，易經換卡</button>
    </div>;
    return (
      <div className={styles.compactActions}>
        <p className={styles.activeHint} role="status" data-next-action aria-label={busy ? '出招中' : active.stunnedTurns > 0 ? '受控' : `氣 ${match.player.energy}`}>
          {busy ? '▶' : active.stunnedTurns > 0 ? '⊘' : `⚡${match.player.energy}`}{!busy && special && !active.stunnedTurns ? ' · ✦' : ''}
        </p>
        <div className={styles.primaryActions} role="group" aria-label="本回合指令">
          {/* 普通攻擊＝直接點最下方的主戰卡片；這裡只留技能與暴怒合體 */}
          <button type="button" className={styles.skillButton} disabled={busy || !special} aria-label={`技能 ${skill.skillName}`} onClick={() => special && onAction(special)}>
            <span aria-hidden="true">✦</span>
            <strong>技能</strong>
            <small>{active.cooldown > 0 ? `冷${active.cooldown}` : `⚡${skill.cost}`}</small>
          </button>
          <button type="button" className={`${styles.actionButton} ${!rage ? styles.rageUnavailable : ''}`} disabled={busy}
            aria-label={rage && ragePartner ? `暴怒合體・${fusionGuide.current.skillName}，${ragePartner.name}支援主戰，按一下出招` : `暴怒合體，${rageReason ?? '查看條件'}，按一下查看引導`}
            aria-expanded={!rage ? commandView === 'rage' : undefined}
            onClick={() => { if (rage) { setCommandView(null); onAction(rage); } else setCommandView(commandView === 'rage' ? null : 'rage'); }}>
            <span aria-hidden="true">🔥</span><strong>暴怒合體</strong><small title={rage && ragePartner ? `與${ragePartner.name}合體` : undefined}>{rage && ragePartner ? (fusionGuide.current.tier === 'NONE' ? `與${ragePartner.name}` : fusionGuide.current.skillName) : rageReason}</small>
          </button>
        </div>
        <div ref={commandDetail}>
        {commandView === 'rage' && !rage && <div className={styles.rageGuide} role="status">
          <strong>{fusionGuide.headline}</strong>
          {fusionGuide.steps.map(step => <span key={step.key}>{step.done ? '✓' : '○'} {step.label} {step.value}：{step.hint}</span>)}
        </div>}
        </div>
      </div>
    );
  }

  const label = (action: Action) => {
    if (action.type === 'ATTACK') return '普通攻擊';
    if (action.type === 'SKILL') return skill.skillName;
    if (action.type === 'RAGE') return '暴怒合體';
    return `換上 ${match.player.team[action.index].name}`;
  };

  return (
    <div className={styles.actions} role="group" aria-label="可執行的動作">
      {actions.length === 0 && <p className={styles.hint}>目前沒有可執行的動作。</p>}
      {actions.map((action) => (
        <button
          key={action.type === 'SWITCH' ? `switch-${action.index}` : action.type}
          type="button"
          className={action.type === 'SKILL' ? styles.skillButton : styles.actionButton}
          disabled={busy}
          onClick={() => onAction(action)}
          aria-label={action.type === 'SKILL' ? `技能 ${skill.skillName}：${skill.description}` : label(action)}
        >
          {label(action)}
          {action.type === 'SKILL' && <small className={styles.cost}>⚡{skill.cost}</small>}
        </button>
      ))}
    </div>
  );
}

/** 戰報。只顯示引擎寫下的那幾行，不補述、不改寫。 */
export function BattleLog({ match }: { match: Match }) {
  if (!match.log.length) return null;
  return (
    <ul className={styles.log} aria-label="這一回合發生什麼">
      {match.log.map((entry, index) => (
        <li key={index} className={entry.side === 'player' ? styles.mine : styles.theirs}>
          {entry.text}
        </li>
      ))}
    </ul>
  );
}

const BattlePanel = memo(function BattlePanel({
  match, view, onAction, busy, compact, relaxed, onBrowse, showLog = true,
}: {
  match: Match;
  view?: BattleView | null;
  onAction: (action: Action) => void;
  busy?: boolean;
  compact?: boolean;
  showLog?: boolean;
  attackOnCard?: boolean;
  /** 換卡改由畫面最下方的 BattleDock 負責；舊呼叫端仍可能傳 cards，這裡收下不用。 */
  cards?: BattlefieldCardArt[];
  relaxed?: boolean;
  onBrowse?: () => void;
}) {
  const finished = match.status === 'FINISHED';
  /*
    出手的聲音：靈魂、武器、動作走同一條時間軸。

    吼 → 蓄力 → 命中 → 餘響，全部取自同一張卡的音色，
    時間點與三維衝鋒動畫對齊（見 beastActionTimeline 的說明）。
    這裡只負責「什麼時候放」，放什麼、幾毫秒都在那條時間軸裡定義——
    畫面自己排一套順序，就會跟動畫對不上。
  */
  const sound = useRef<ReturnType<typeof createSoundPlayer> | null>(null);
  if (sound.current === null && typeof window !== 'undefined') sound.current = createSoundPlayer();
  useEffect(() => {
    return () => sound.current?.dispose();
  }, []);

  useEffect(() => {
    if (!sound.current || match.revision === 0) return;
    const timers: number[] = [];
    const cancels: Array<() => void> = [];

    // 偵測本回合是否造成 KO（重擊音效啟動 heavy=true）
    const allChanges = match.log.flatMap(e => e.changes ?? []);
    const isKoHit = (attackSide: 'player' | 'opponent') => {
      const defSide = attackSide === 'player' ? 'opponent' : 'player';
      const defCard = match[defSide].team[match[defSide].active].cardId;
      return allChanges.some(c => c.side === defSide && c.cardId === defCard && c.hpBefore > 0 && c.hpAfter <= 0);
    };

    // 玩家出招：三段式（含 heavy 判斷）+ SKILL 加砲聲
    const pAction = performedAction(match, 'player');
    if (pAction === 'ATTACK' || pAction === 'SKILL' || pAction === 'RAGE') {
      const fighter = match.player.team[match.player.active];
      const order = match.log.findIndex(e => e.side === 'player' && e.cardId === fighter.cardId);
      const heavy = isKoHit('player');
      // 有戰鬥動畫的神獸（且沒開減少動態）打出傷害招式：聲音等動畫「真正開始」的訊號再播，咬合那一聲才會落在 RIG_IMPACT_MS。
      // 監聽要在這一刻就掛上（動畫可能比計時器先起跑）；動畫沒載入、沒起跑時，過一會兒退回原本的時間軸，不能整場靜音。
      const rigged = pAction !== 'RAGE' && isDamagingAction(match, 'player') && rigFor(fighter.cardId) !== null
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (rigged) {
        let fired = false;
        const start = (withRig: boolean) => {
          if (fired || !sound.current) return;
          fired = true;
          cancels.push(playBeastAction(sound.current.play, fighter.cardId, fighter.element as BattleElement, 'player', heavy, withRig));
          if (pAction === 'SKILL') window.setTimeout(() => sound.current?.play('/audio/taiji/cc0-cannon-fire.ogg', heavy ? 0.52 : 0.38, 1), 80);
        };
        const onStart = () => start(true);
        window.addEventListener(RIG_STRIKE_EVENT, onStart, { once: true });
        cancels.push(() => window.removeEventListener(RIG_STRIKE_EVENT, onStart));
        timers.push(window.setTimeout(() => start(false), Math.max(0, order) * COMBAT_BEAT_MS + 1200));
      } else
      timers.push(window.setTimeout(() => {
        if (!sound.current) return;
        if (pAction === 'RAGE') {
          cancels.push(playBeastRage(sound.current.play, fighter.element as BattleElement));
        } else if (isDamagingAction(match, 'player')) {
          cancels.push(playBeastAction(sound.current.play, fighter.cardId, fighter.element as BattleElement, 'player', heavy, false));
          // 技能攻擊：加砲聲前奏，份量比普通攻擊重
          if (pAction === 'SKILL') window.setTimeout(() => sound.current?.play('/audio/taiji/cc0-cannon-fire.ogg', heavy ? 0.52 : 0.38, 1), 80);
        } else {
          const voice = beastVoiceFor(fighter.cardId);
          if (voice) sound.current.play(voice, .55, 1);
        }
      }, Math.max(0, order) * COMBAT_BEAT_MS));
    }

    // 對手出招：之前完全靜音，現在補上輕版三段交鋒聲
    const oAction = performedAction(match, 'opponent');
    if ((oAction === 'ATTACK' || oAction === 'SKILL' || oAction === 'RAGE') && isDamagingAction(match, 'opponent')) {
      const oFighter = match.opponent.team[match.opponent.active];
      const oOrder = match.log.findIndex(e => e.side === 'opponent' && e.cardId === oFighter.cardId);
      const oHeavy = isKoHit('opponent');
      timers.push(window.setTimeout(() => {
        if (!sound.current) return;
        cancels.push(oAction === 'RAGE'
          ? playBeastRage(sound.current.play, oFighter.element as BattleElement)
          : playClashSequence(sound.current.play, oFighter.element as BattleElement, oHeavy, oFighter.cardId));
      }, Math.max(0, oOrder) * COMBAT_BEAT_MS));
    }

    return () => { timers.forEach(id => window.clearTimeout(id)); cancels.forEach(fn => fn()); };
  }, [match]);
  useEffect(() => {
    if (!finished || busy || !sound.current) return;
    if (match.winner === 'player') playVictoryMusic(sound.current.play);
    else if (match.winner === 'opponent') playDefeatMusic(sound.current.play);
  }, [finished, busy, match.winner]);

  /* 計算連勝數和傷害值 */
  const calculateStreakAndDamage = () => {
    if (match.status !== 'FINISHED' || match.winner !== 'player') {
      return { streak: 0, totalDamage: 0, roundDamage: 0, isNewRecord: false };
    }
    const totalDamage = match.log.reduce((sum, entry) => {
      const change = entry.changes?.find(c => c.side === 'opponent' && c.cardId === match.opponent.team[match.opponent.active].cardId);
      const playerDamage = change ? Math.max(0, change.hpBefore - change.hpAfter) : 0;
      return sum + playerDamage;
    }, 0);
    const lastChange = match.log[match.log.length - 1]?.changes?.find(c => c.side === 'opponent');
    const lastRoundDamage = lastChange ? Math.max(0, lastChange.hpBefore - lastChange.hpAfter) : 0;
    // 沒有真的紀錄可比，不得宣稱「新紀錄」（2026-09-15 米其林：禁止造假）。
    return { streak: 1, totalDamage, roundDamage: lastRoundDamage, isNewRecord: false };
  };

  const { streak, totalDamage, roundDamage, isNewRecord } = calculateStreakAndDamage();
  const playerFighter = match.player.team[match.player.active];
  const playerElement = playerFighter?.element as BattleElement | undefined;
  const showVictory = match.status === 'FINISHED' && match.winner === 'player' && busy;

  return (
    <section className={compact ? styles.compactPanel : styles.panel} data-battle-panel data-status={match.status}>
      {/* 隱藏（2026-09-15）：連勝寫死 1、累計傷害只算最後一張，數字不實；又固定蓋住標題列。 */}
      {false && <WinStreakCounter streak={streak} totalDamage={totalDamage} roundDamage={roundDamage} isNewRecord={isNewRecord} />}
      <VictoryMoment active={showVictory} streak={streak} isNewRecord={isNewRecord} element={playerElement} />
      {/* 隱藏（2026-09-15）：元素不同就寫「剋」，沒查相剋表，會和後端「互不相剋」互相矛盾；按鈕無作用，又蓋住「再打一場」。相剋由後端戰報說明。 */}
      {false && <UpgradePathHint match={match} />}
      <ShareBadge match={match} streak={streak} totalDamage={totalDamage} />
      <SoundEnhancer match={match} streak={streak} isNewRecord={isNewRecord} />

      {/* HP 條已移到 BattleArena 各自卡片正下方，此處不再重複顯示 */}

      {!compact && <><FighterStatus match={match} side="opponent" label="易經" />
      <FighterStatus match={match} side="player" label="你" /></>}

      {/*
        相剋提示。這是「客戶學得到」的關鍵——
        規則早就成立（帶剋的幼子百分之百打贏被剋的四象），
        但客戶看不出來，打輸只會覺得對面比較強。
        所以出戰中就把「你剋他／他剋你」寫在血條下面。
      */}
      {!compact && (() => {
        // 對位說明由後端判斷送來（後端化第三階段 3B）。
        const matchup = view?.guides.matchup;
        if (!matchup) return null;
        const tone = matchup.kind === 'ADVANTAGE' ? styles.advantage
          : matchup.kind === 'DISADVANTAGE' ? styles.disadvantage : styles.neutral;
        return (
          <p className={`${styles.matchup} ${tone}`} data-matchup={matchup.kind}>
            <strong>{matchup.headline}</strong>
            <span>{matchup.reason}</span>
          </p>
        );
      })()}

      {finished && busy ? <p className={styles.activeHint} role="status">動作演出中，接著顯示結果…</p> : finished ? (
        <p className={styles.result} role="status" data-winner={match.winner ?? 'NONE'}>
          {match.winner === 'player' ? '你贏了' : match.winner === 'opponent' ? '易經獲勝' : '平手'}
          <small>共 {match.round - 1} 回合</small>
          {/*
            業主定調第三件：「輸掉時講得出原因，而不是只說『你輸了』。」
            把「我輸了」跟「我帶錯元素」接起來，客戶才學得到。
          */}
          <small data-outcome-reason>
            {view?.guides.outcome ?? ''}
          </small>
        </p>
      ) : (
        <BattleActionBar match={match} view={view} onAction={onAction} busy={busy} compact={compact} attackOnCard={false} relaxed={relaxed} />
      )}

      {showLog && (compact ? <details className={styles.battleDetails} onToggle={event => { if (event.currentTarget.open) onBrowse?.(); }}><summary>本回合戰報{match.log.length ? `・${match.log.length} 則` : ''}</summary><BattleLog match={match} /></details> : <BattleLog match={match} />)}
    </section>
  );
});
export default BattlePanel;
