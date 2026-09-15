'use client';

import { useEffect } from 'react';
import { chooseAI, legalActions, type Action, type Match } from '@/lib/beast-game/interactive';
import styles from './BattlePace.module.css';

/**
 * 自動＝一路連擊到戰鬥結束（懶人玩法，長輩友善，2026-09-15）。
 *
 * 原本技能就緒、前鋒倒下都會停下來等玩家，實測每一回合都卡住，
 * 按「自動／暫停」也不會繼續——客戶以為壞掉。
 * 現在自動替玩家出手，用的是和對手「易經」同一套規則（chooseAI）：
 * 倒下換最健康的後備、技能條件合適才放、否則普攻——雙方規則對稱，也不會補血互拖到八十回合。
 * 它只決定「按哪一顆合法的鍵」，勝負仍全部由後端運算。
 */
function nextAutoAction(match: Match): Action | null {
  return legalActions(match, 'player').length ? chooseAI(match, 'player') : null;
}

/** Only schedules a legal action; all combat stays on the server. */
export default function BattlePace({ match, automatic, blocked, onAutomatic, onAction }: {
  match: Match; automatic: boolean; blocked: boolean;
  onAutomatic: (enabled: boolean) => void; onAction: (action: Action) => void;
}) {
  const next = match.status === 'PLAYING' ? nextAutoAction(match) : null;
  const delay = match.revision === 0 ? 500 : 1400;
  const running = automatic && !blocked && Boolean(next) && match.status === 'PLAYING';

  useEffect(() => {
    const pause = () => { if (document.hidden) onAutomatic(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, [onAutomatic]);

  useEffect(() => {
    if (!running || !next || document.hidden) return;
    const timer = window.setTimeout(() => {
      if (!document.hidden) onAction(next);
    }, delay);
    return () => window.clearTimeout(timer);
    // next 由 match.revision 決定；用 revision 當依據，避免同一回合重複排程
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, match.revision, onAction, delay]);

  if (match.status !== 'PLAYING') return null;
  return <section className={styles.pace} aria-label="戰鬥節奏">
    <div className={styles.heading}>
      <strong role="status">{blocked ? '⚙' : running ? '▶ 自動連擊' : '⏸ 暫停'}</strong>
      <button type="button" disabled={blocked} aria-pressed={automatic} onClick={() => onAutomatic(!automatic)}>{automatic ? '暫停' : '自動'}</button>
    </div>
    <div key={`${match.revision}:${running}`} className={styles.track} style={{ visibility: running ? 'visible' : 'hidden' }} aria-label={running ? `${delay / 1000} 秒後推進` : undefined}><span style={{ animationDuration: `${delay}ms` }} /></div>
  </section>;
}
