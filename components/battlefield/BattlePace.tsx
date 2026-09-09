'use client';

import { useEffect } from 'react';
import { legalActions, type Action, type Match } from '@/lib/beast-game/interactive';
import styles from './BattlePace.module.css';

/** Only schedules a legal ordinary action; all combat stays on the server. */
export default function BattlePace({ match, automatic, blocked, onAutomatic, onAction }: {
  match: Match; automatic: boolean; blocked: boolean;
  onAutomatic: (enabled: boolean) => void; onAction: (action: Action) => void;
}) {
  const active = match.player.team[match.player.active];
  const replacingOpponent = match.opponent.team[match.opponent.active].defeated;
  const skillReady = legalActions(match, 'player').some(action => action.type === 'SKILL');
  const waiting = active.defeated || (match.revision > 0 && skillReady && !replacingOpponent);
  const delay = match.revision === 0 ? 900 : 3500;
  const running = automatic && !blocked && !waiting && match.status === 'PLAYING';

  useEffect(() => {
    const pause = () => { if (document.hidden) onAutomatic(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, [onAutomatic]);

  useEffect(() => {
    if (!running || document.hidden) return;
    const timer = window.setTimeout(() => {
      if (!document.hidden) onAction({ type: 'ATTACK' });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [running, match.revision, onAction, delay]);

  if (match.status !== 'PLAYING') return null;
  return <section className={styles.pace} aria-label="戰鬥節奏">
    <div className={styles.heading}>
      <strong role="status">{blocked ? '等待戰況確認' : active.defeated ? '選後備，接續戰鬥' : automatic && waiting ? '技能就緒・等你決定' : running ? replacingOpponent ? '對手後備即將上場' : '自動普通攻擊中' : '已暫停・可手動出招'}</strong>
      <button type="button" disabled={blocked} aria-pressed={automatic} onClick={() => onAutomatic(!automatic)}>{automatic ? '暫停自動' : '開啟自動'}</button>
    </div>
    <p>{waiting && !active.defeated ? '選技能或保留技能；詳細效果在說明。' : active.defeated ? '點後備接替，不消耗回合。' : '普通攻擊間隔 3.5 秒・技能就緒會等待。'}</p>
    <div key={`${match.revision}:${running}`} className={styles.track} style={{ visibility: running ? 'visible' : 'hidden' }} aria-label={running ? `${delay / 1000} 秒後推進` : undefined}><span style={{ animationDuration: `${delay}ms` }} /></div>
  </section>;
}
