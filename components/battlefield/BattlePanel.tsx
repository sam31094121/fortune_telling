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
import {
  legalActions,
  profile,
  type Action,
  type Match,
  type Side,
} from '@/lib/beast-game/interactive';

/** 生命與護盾。護盾先扣，所以畫在血條上面一層。 */
export function VitalBar({ hp, maxHp, shield }: { hp: number; maxHp: number; shield: number }) {
  const life = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  // 護盾按同一條血量的比例畫，客戶才看得出「還要多打這麼多才見血」。
  const guard = Math.max(0, Math.min(100 - life, (shield / Math.max(1, maxHp)) * 100));
  return (
    <div className={styles.vital} role="img" aria-label={`生命 ${hp} / ${maxHp}${shield ? `，護盾 ${shield}` : ''}`}>
      <span className={styles.life} style={{ width: `${life}%` }} />
      {guard > 0 && <span className={styles.guard} style={{ width: `${guard}%`, left: `${life}%` }} />}
      <span className={styles.vitalText}>
        {hp} / {maxHp}{shield > 0 ? ` ＋${shield}` : ''}
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
        <strong>{label}・{fighter.name}</strong>
        <span className={styles.energy} aria-label={`氣 ${team.energy}`}>氣 {team.energy}</span>
      </div>
      <VitalBar hp={fighter.hp} maxHp={fighter.maxHp} shield={fighter.shield} />
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
  match, onAction, busy,
}: {
  match: Match;
  onAction: (action: Action) => void;
  busy?: boolean;
}) {
  if (match.status !== 'PLAYING') return null;
  const actions = legalActions(match, 'player');
  const active = match.player.team[match.player.active];
  const skill = profile(active.cardId);

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

export default function BattlePanel({
  match, onAction, busy,
}: {
  match: Match;
  onAction: (action: Action) => void;
  busy?: boolean;
}) {
  const finished = match.status === 'FINISHED';
  return (
    <section className={styles.panel} data-battle-panel data-status={match.status}>
      <FighterStatus match={match} side="opponent" label="對手" />
      <FighterStatus match={match} side="player" label="你" />

      {finished ? (
        <p className={styles.result} role="status" data-winner={match.winner ?? 'NONE'}>
          {match.winner === 'player' ? '你贏了' : match.winner === 'opponent' ? '對手獲勝' : '平手'}
          <small>共 {match.round - 1} 回合</small>
        </p>
      ) : (
        <BattleActionBar match={match} onAction={onAction} busy={busy} />
      )}

      <BattleLog match={match} />
    </section>
  );
}
