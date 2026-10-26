'use client';

/**
 * 戰鬥畫面最下方的「出戰卡列」（三種難度共用）。
 *
 * 這一列就是玩家的出戰隊伍：帶入幾張神獸卡就排幾張，**沒有另外多一張卡站在前面作戰**。
 * - 點非主戰的卡：立即上場（沒有額外的換卡按鈕、沒有二次確認）。
 * - 點主戰的卡：簡單模式＝普通攻擊；其餘難度＝查看卡面與能力（由上層決定，onActiveTap）。
 * - 每張卡下方有一條生命能量條，一眼看出還剩多少。
 * - 有戰鬥動畫的神獸（目前白虎）出擊時，從這張卡跳出去咬對手，再回到這張卡。
 *
 * 這一層不判斷任何事：哪一張能換，只看後端送來的 view.legal 裡的 SWITCH 合法動作；
 * 生命值取自 Match；點了就是把那個動作原封不動交給 onAction。
 * 動畫演出中（busy）與對戰結束後列仍顯示，只是按不下去，卡片不會消失。
 */

import { memo, type CSSProperties } from 'react';
import type { Action, Match } from '@/lib/beast-game/interactive';
import type { BattleView } from '@/lib/beast-game/battle-view';
import { RIG_STRIKE_MS } from '@/lib/beast-game/beast-rig';
import { performedAction } from '@/lib/beast-game/combat-presentation';
import type { BattlefieldCardArt } from './GameBattlefield';
import { BeastThumb } from './BeastCardTile';
import BeastRigStage from './BeastRigStage';
import { useRigStrike } from './useRigStrike';
import styles from './BattleDock.module.css';

type Switch = Extract<Action, { type: 'SWITCH' }>;

const BattleDock = memo(function BattleDock({ match, view, cards, busy = false, playing = false, onAction, onActiveTap = null, activeTapLabel = 'inspect', ragePartnerId = null }: {
  match: Match;
  view?: BattleView | null;
  cards: BattlefieldCardArt[];
  /** 輸入鎖：演出中或等待後端回應 */
  busy?: boolean;
  /** 戰鬥演出中（用來決定要不要播白虎動畫） */
  playing?: boolean;
  onAction: (action: Action) => void;
  /** 點主戰那張卡要做的事；沒給＝主戰按不下去 */
  onActiveTap?: (() => void) | null;
  /** attack＝普通攻擊；inspect＝查看卡面與能力（只影響讀屏文字） */
  activeTapLabel?: 'attack' | 'inspect';
  /** 後端算好的暴怒合體搭檔（可合體時在那張卡上標一個小記號） */
  ragePartnerId?: string | null;
}) {
  const team = match.player.team;
  const switches = new Map<number, Switch>();
  for (const action of view?.legal ?? []) if (action.type === 'SWITCH') switches.set(action.index, action);
  const playingMatch = match.status === 'PLAYING';
  const rigState = useRigStrike(match, playing);
  // 這一局主戰做了什麼（攻擊／技能／暴怒合體／受控／接替／換卡）：標在主戰那張卡上，取自戰報，不自己判斷
  const performed = performedAction(match, 'player');

  return (
    <>
      <nav className={styles.dock} aria-label="出戰神獸・點卡上場或出擊" data-battle-dock data-count={team.length}>
        {team.map((fighter, index) => {
          const action = switches.get(index);
          const active = index === match.player.active;
          const art = cards.find(card => card.id === fighter.cardId);
          const hpPct = Math.max(0, Math.min(100, (fighter.hp / Math.max(1, fighter.maxHp)) * 100));
          const shieldPct = Math.max(0, Math.min(100 - hpPct, (fighter.shield / Math.max(1, fighter.maxHp)) * 100));
          const critical = hpPct <= 30 && fighter.hp > 0;
          const status = active ? (fighter.defeated ? '已倒下' : '出戰') : fighter.defeated ? '已倒下' : action ? '點卡上場' : '待命';
          const tappable = active && !fighter.defeated && Boolean(onActiveTap) && playingMatch;
          const label = active
            ? tappable
              ? (activeTapLabel === 'attack' ? `讓${fighter.name}普通攻擊` : `查看${fighter.name}的卡面與能力`)
              : fighter.defeated ? `已倒下 ${fighter.name}` : `目前主戰 ${fighter.name}`
            : fighter.defeated ? `已倒下 ${fighter.name}` : `換上 ${fighter.name}`;
          return (
            <button
              key={fighter.instanceId}
              type="button"
              className={styles.card}
              disabled={busy || !playingMatch || (active ? !tappable : !action)}
              aria-current={active ? 'true' : undefined}
              aria-label={label}
              data-dock-card={fighter.cardId}
              data-active={active}
              data-defeated={fighter.defeated}
              data-rig={active && rigState.strike}
              data-rage-partner={ragePartnerId === fighter.cardId && playingMatch}
              data-action={active ? performed ?? 'NONE' : undefined}
              style={{ '--rig-ms': `${RIG_STRIKE_MS}ms`, '--action-delay': `${rigState.delayMs}ms` } as CSSProperties}
              onClick={() => {
                if (active) onActiveTap?.();
                else if (action) onAction(action);
              }}
            >
              {art && <BeastThumb id={art.id} thumbnail={art.thumbnail} alt={art.name} draggable={false} />}
              {active && performed && (
                <em className={styles.cue} role="status" aria-label={performed === 'RAGE' ? '暴怒合體' : performed === 'SKILL' ? '技能' : performed === 'ATTACK' ? '攻擊' : performed === 'SKIP' ? '受控' : performed === 'REPLACEMENT' ? '接替' : '換卡'}>
                  {performed === 'RAGE' ? '🔥' : performed === 'SKILL' ? '✦' : performed === 'ATTACK' ? '⚔' : performed === 'SKIP' ? '⊘' : performed === 'REPLACEMENT' ? '⇄' : '⇌'}
                </em>
              )}
              <strong>{fighter.name}</strong>
              <span
                className={styles.energy}
                role="meter"
                aria-label={`${fighter.name}生命 ${fighter.hp}/${fighter.maxHp}${fighter.shield ? `，護盾 ${fighter.shield}` : ''}`}
                aria-valuemin={0}
                aria-valuemax={fighter.maxHp}
                aria-valuenow={fighter.hp}
                data-critical={critical}
              >
                <i style={{ width: `${hpPct}%` }} />
                {shieldPct > 0 && <b style={{ width: `${shieldPct}%`, left: `${hpPct}%` }} />}
              </span>
              <small>{status}・{fighter.hp}/{fighter.maxHp}</small>
            </button>
          );
        })}
      </nav>
      {/* 白虎動畫舞台：整個畫面層級的畫布，從出戰卡跳出去、回到出戰卡 */}
      {rigState.teamRig && <BeastRigStage rig={rigState.teamRig} playKey={rigState.playKey} delayMs={rigState.delayMs} />}
    </>
  );
});

export default BattleDock;
