'use client';

/**
 * 戰鬥畫面最下方的固定選卡列（三種難度共用）。
 *
 * 帶入幾張神獸卡，這裡就固定排幾張；點任何一張就立即上場，沒有額外的「換卡」按鈕、沒有二次確認。
 * 這一層不判斷任何事：哪一張能換，只看後端送來的 view.legal 裡的 SWITCH 合法動作；
 * 生命值取自 Match。點了就是把那個 SWITCH 動作原封不動交給 onAction。
 * 動畫演出中（busy）與對戰結束後列仍顯示，只是按不下去，卡片不會消失。
 */

import { memo } from 'react';
import type { Action, Match } from '@/lib/beast-game/interactive';
import type { BattleView } from '@/lib/beast-game/battle-view';
import type { BattlefieldCardArt } from './GameBattlefield';
import { BeastThumb } from './BeastCardTile';
import styles from './BattleDock.module.css';

type Switch = Extract<Action, { type: 'SWITCH' }>;

const BattleDock = memo(function BattleDock({ match, view, cards, busy = false, onAction }: {
  match: Match;
  view?: BattleView | null;
  cards: BattlefieldCardArt[];
  busy?: boolean;
  onAction: (action: Action) => void;
}) {
  const team = match.player.team;
  const switches = new Map<number, Switch>();
  for (const action of view?.legal ?? []) if (action.type === 'SWITCH') switches.set(action.index, action);
  const playing = match.status === 'PLAYING';

  return (
    <nav className={styles.dock} aria-label="神獸選擇・點卡即上場" data-battle-dock data-count={team.length}>
      {team.map((fighter, index) => {
        const action = switches.get(index);
        const active = index === match.player.active;
        const art = cards.find(card => card.id === fighter.cardId);
        const status = active ? (fighter.defeated ? '已倒下' : '主戰') : fighter.defeated ? '已倒下' : action ? '點卡上場' : '待命';
        return (
          <button
            key={fighter.instanceId}
            type="button"
            className={styles.card}
            disabled={busy || !playing || !action}
            aria-current={active ? 'true' : undefined}
            aria-label={`${active ? '目前主戰' : fighter.defeated ? '已倒下' : '換上'} ${fighter.name}`}
            data-dock-card={fighter.cardId}
            data-active={active}
            data-defeated={fighter.defeated}
            onClick={() => { if (action) onAction(action); }}
          >
            {art && <BeastThumb id={art.id} thumbnail={art.thumbnail} alt={art.name} draggable={false} />}
            <strong>{fighter.name}</strong>
            <span>{status}・{fighter.hp}/{fighter.maxHp}</span>
          </button>
        );
      })}
    </nav>
  );
});

export default BattleDock;
