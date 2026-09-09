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
import { effectiveStat } from '@/lib/beast-game/effects';
import { ELEMENT_LABEL } from '@/lib/beast-game/elements';
import { BattleEffectsLayer, useBattleEffects } from './BattleEffects';
import {
  ELEMENT_FX,
  createSoundPlayer,
  playBeastAction,
  playVictoryMusic,
  playDefeatMusic,
  type BattleElement,
} from '@/lib/beast-battle-fx';
import { weaponFor } from '@/lib/beast-game/weapons';
import { describeMatchup, explainOutcome } from '@/lib/beast-element-guide';
import type { BeastElement } from '@/lib/beast-game/elements';
import {
  legalActions,
  profile,
  type Action,
  type Match,
  type Side,
} from '@/lib/beast-game/interactive';

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
      <span className={styles.vitalText}>
        <b>{hp} / {maxHp}{shield > 0 ? ` ＋${shield}` : ''}</b>
      </span>
    </div>
  );
}

export function FighterStatus({ match, side, label }: { match: Match; side: Side; label: string }) {
  const team = match[side];
  const fighter = team.team[team.active];
  return (
    <div className={styles.status}>
      <div className={styles.statusHead}>
        <strong>
          {/* 元素色點：戰鬥中也看得出誰是什麼屬性，不必回頭看卡面。 */}
          <span
            className={styles.elementDot}
            style={{ color: ELEMENT_FX[fighter.element as BattleElement]?.glow ?? '#94a3b8' }}
            aria-hidden="true"
          />
          {label}・{fighter.name}
        </strong>
        <span className={styles.energy} aria-label={`氣 ${team.energy}`}>氣 {team.energy}</span>
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
          <span key={f.instanceId} className={index === team.active ? styles.onField : f.defeated ? styles.down : ''}>
            {f.defeated ? '✕' : index === team.active ? '●' : '○'}
          </span>
        ))}
        <span className={styles.rosterText}>
          {team.team.filter((f) => !f.defeated).length} / {team.team.length} 還能戰
        </span>
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
  match, onAction, busy, compact, cards = [], relaxed, onBrowse,
}: {
  match: Match;
  onAction: (action: Action) => void;
  busy?: boolean;
  compact?: boolean;
  cards?: BattlefieldCardArt[];
  relaxed?: boolean;
  onBrowse?: () => void;
}) {
  const [commandView, setCommandView] = useState<'swap' | 'help' | null>(null);
  const commandDetail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (commandView) commandDetail.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, [commandView]);
  if (match.status !== 'PLAYING') return null;
  const actions = legalActions(match, 'player');
  const active = match.player.team[match.player.active];
  const skill = profile(active.cardId);

  if (compact) {
    const attack = actions.find(action => action.type === 'ATTACK');
    const special = actions.find(action => action.type === 'SKILL');
    const switches = actions.filter((action): action is Extract<Action, { type: 'SWITCH' }> => action.type === 'SWITCH');
    // The core's forced-replacement phase consumes neither an attack nor a round.
    // Never label that transition as a normal attack that appears to do nothing.
    if (active.defeated) return <div className={styles.compactActions}>
      <p className={styles.activeHint} role="status">主戰已倒下，請選一張後備接替；這一步不出招。</p>
      <div className={styles.reserveCards} role="group" aria-label="選擇接替主戰的後備">
        {switches.map(action => {
          const fighter = match.player.team[action.index];
          const art = cards.find(card => card.id === fighter.cardId);
          return <button type="button" key={fighter.instanceId} className={styles.reserveCard} disabled={busy}
            aria-label={`換上 ${fighter.name}`} onClick={() => { setCommandView(null); onAction(action); }}>
            {art && <img src={art.thumbnail} alt="" draggable={false} /> /* eslint-disable-line @next/next/no-img-element */}
            <strong>{fighter.name}</strong><span>點卡接替・{fighter.hp}/{fighter.maxHp}</span>
          </button>;
        })}
      </div>
    </div>;
    if (match.opponent.team[match.opponent.active].defeated && attack) return <div className={styles.compactActions}>
      <p className={styles.activeHint} role="status">對手主戰已倒下，接下來由後備上場；這一步不出招。</p>
      <button type="button" className={styles.actionButton} disabled={busy} onClick={() => { setCommandView(null); onAction(attack); }}>繼續，對手換卡</button>
    </div>;
    return (
      <div className={styles.compactActions}>
        {!relaxed && !onBrowse && <p className={styles.activeHint} role="status">選一個動作</p>}
        <div className={styles.primaryActions} role="group" aria-label="本回合指令">
          <button type="button" className={styles.actionButton} disabled={busy || !attack} onClick={() => attack && onAction(attack)}>{relaxed && special ? '保留技能・普攻' : '普通攻擊'}<small>{ELEMENT_LABEL[active.element]}系・不耗氣</small></button>
          <button type="button" className={styles.skillButton} disabled={busy || !special} onClick={() => special && onAction(special)}>
            技能<small>{skill.skillName}・{active.defeated ? '請先換卡' : active.cooldown > 0 ? `冷卻 ${active.cooldown} 回合` : `耗氣 ${skill.cost}${!special ? '・氣不足' : ''}`}</small>
          </button>
          <button type="button" className={styles.actionButton} aria-expanded={commandView === 'swap' || active.defeated} onClick={() => { onBrowse?.(); setCommandView(commandView === 'swap' ? null : 'swap'); }}>換卡<small>{switches.length ? '查看可換上的後備' : '目前沒有可換後備'}</small></button>
          <button type="button" className={styles.actionButton} aria-expanded={commandView === 'help'} onClick={() => { onBrowse?.(); setCommandView(commandView === 'help' ? null : 'help'); }}>說明<small>只查看，不消耗回合</small></button>
        </div>
        <div ref={commandDetail}>
        {(commandView === 'swap' || active.defeated) && <>
        {!switches.length && <p className={styles.activeHint}>目前沒有可換上的後備，可使用仍可用的攻擊或技能。</p>}
        <div className={styles.reserveCards} role="group" aria-label="點戰鬥卡換上場" data-swap-guide>
          {match.player.team.map((fighter, index) => {
            const action = switches.find(candidate => candidate.index === index);
            const art = cards.find(card => card.id === fighter.cardId);
            return (
              <button key={fighter.instanceId} type="button" disabled={busy || !action}
                className={styles.reserveCard} aria-label={`${index === match.player.active ? '目前主戰' : fighter.defeated ? '已倒下' : '換上'} ${fighter.name}`}
                onClick={() => { if (action) { setCommandView(null); onAction(action); } }}>
                {art && <img src={art.thumbnail} alt="" draggable={false} /> /* eslint-disable-line @next/next/no-img-element */}
                <strong>{fighter.name}</strong>
                <span>{index === match.player.active ? '主戰' : fighter.defeated ? '已倒下' : '點卡換上'}・{fighter.hp}/{fighter.maxHp}</span>
              </button>
            );
          })}
        </div>
        </>}
        {commandView === 'help' && <section className={styles.commandHelp} aria-label="回合操作說明">
          <h3>{skill.skillName}</h3><p>{skill.description}</p>
          <p>{skill.role}型・攻 {effectiveStat(active, 'attack')}／防 {effectiveStat(active, 'defense')}／速 {effectiveStat(active, 'speed')}</p>
          <p>普通攻擊不耗氣；技能的氣量與冷卻會標在按鈕上。點「換卡」後，再親自選後備上場。</p>
          <button type="button" className={styles.actionButton} onClick={() => { setCommandView(null); onBrowse?.(); }}>收起說明</button>
        </section>}
        </div>
      </div>
    );
  }

  const label = (action: Action) => {
    if (action.type === 'ATTACK') return '普通攻擊';
    if (action.type === 'SKILL') return skill.skillName;
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
        >
          {label(action)}
          {action.type === 'SKILL' && <small className={styles.cost}>耗氣 {skill.cost}</small>}
        </button>
      ))}
      {actions.some((a) => a.type === 'SKILL') && (
        <p className={styles.skillDesc}>{skill.description}</p>
      )}
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
  match, onAction, busy, compact, cards, relaxed, onBrowse,
}: {
  match: Match;
  onAction: (action: Action) => void;
  busy?: boolean;
  compact?: boolean;
  cards?: BattlefieldCardArt[];
  relaxed?: boolean;
  onBrowse?: () => void;
}) {
  const finished = match.status === 'FINISHED';
  const { damagePopups, addDamagePopup } = useBattleEffects();
  const prevLogLength = useRef(match.log.length);

  /* 監聽戰報變化，觸發飄字 */
  useEffect(() => {
    const newLogCount = match.log.length - prevLogLength.current;
    if (newLogCount > 0) {
      const newLogs = match.log.slice(-newLogCount);
      newLogs.forEach((log) => {
        // 簡單解析傷害數字（格式：「xxx 造成 yyy 點傷害」或類似）
        const damageMatch = log.text.match(/造成\s+(\d+)\s+點傷害/);
        if (damageMatch) {
          const damage = parseInt(damageMatch[1], 10);
          const fighter = log.side === 'player'
            ? match.opponent.team[match.opponent.active]
            : match.player.team[match.player.active];

          // 固定位置（卡牌中心）
          addDamagePopup(damage, 100, 80, fighter.element as BeastElement, false);
        }
      });
      prevLogLength.current = match.log.length;
    }
  }, [match.revision, addDamagePopup]);

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

  const active = match.player.team[match.player.active];
  useEffect(() => {
    // revision 0 是還沒出過招——開場不放攻擊聲。
    if (match.status === 'FINISHED') {
      // 戰鬥結束時播放勝利或失敗音樂
      if (sound.current) {
        if (match.winner === 'player') {
          playVictoryMusic(sound.current.play);
        } else if (match.winner === 'opponent') {
          playDefeatMusic(sound.current.play);
        }
      }
      sound.current?.dispose();
      return;
    }
    if (!sound.current || match.revision === 0) return;
    const heavy = match.opponent.team.some((f) => f.defeated);
    return playBeastAction(sound.current.play, active.cardId, active.element as BattleElement, 'player', heavy);
  }, [match.revision, match.status, match.winner, active.cardId, active.element]);
  return (
    <section className={compact ? styles.compactPanel : styles.panel} data-battle-panel data-status={match.status}>
      {/* 戰鬥特效層 - 傷害飄字、閃光等 */}
      <BattleEffectsLayer popups={damagePopups} />

      {!compact && <><FighterStatus match={match} side="opponent" label="對手" />
      <FighterStatus match={match} side="player" label="你" /></>}

      {/*
        相剋提示。這是「客戶學得到」的關鍵——
        規則早就成立（帶剋的幼子百分之百打贏被剋的四象），
        但客戶看不出來，打輸只會覺得對面比較強。
        所以出戰中就把「你剋他／他剋你」寫在血條下面。
      */}
      {!compact && (() => {
        const mine = match.player.team[match.player.active];
        const foe = match.opponent.team[match.opponent.active];
        const matchup = describeMatchup(mine.element as BeastElement, foe.element as BeastElement);
        const tone = matchup.kind === 'ADVANTAGE' ? styles.advantage
          : matchup.kind === 'DISADVANTAGE' ? styles.disadvantage : styles.neutral;
        return (
          <p className={`${styles.matchup} ${tone}`} data-matchup={matchup.kind}>
            <strong>{matchup.headline}</strong>
            <span>{matchup.reason}</span>
          </p>
        );
      })()}

      {finished ? (
        <p className={styles.result} role="status" data-winner={match.winner ?? 'NONE'}>
          {match.winner === 'player' ? '你贏了' : match.winner === 'opponent' ? '對手獲勝' : '平手'}
          <small>共 {match.round - 1} 回合</small>
          {/*
            業主定調第三件：「輸掉時講得出原因，而不是只說『你輸了』。」
            把「我輸了」跟「我帶錯元素」接起來，客戶才學得到。
          */}
          <small data-outcome-reason>
            {explainOutcome(
              match.winner,
              describeMatchup(
                match.player.team[match.player.active].element as BeastElement,
                match.opponent.team[match.opponent.active].element as BeastElement,
              ),
            )}
          </small>
        </p>
      ) : (
        <BattleActionBar match={match} onAction={onAction} busy={busy} compact={compact} cards={cards} relaxed={relaxed} onBrowse={onBrowse} />
      )}

      {compact ? <details className={styles.battleDetails} onToggle={event => { if (event.currentTarget.open) onBrowse?.(); }}><summary>本回合戰報{match.log.length ? `・${match.log.length} 則` : ''}</summary><BattleLog match={match} /></details> : <BattleLog match={match} />}
    </section>
  );
});
export default BattlePanel;
