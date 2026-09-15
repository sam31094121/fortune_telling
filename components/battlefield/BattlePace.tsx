'use client';

import { useEffect } from 'react';
import type { Match } from '@/lib/beast-game/interactive';
import styles from './BattlePace.module.css';

/**
 * 自動＝一路連擊到戰鬥結束（懶人玩法，長輩友善，2026-09-15）。
 *
 * 原本技能就緒、前鋒倒下都會停下來等玩家，實測每一回合都卡住，
 * 按「自動／暫停」也不會繼續——客戶以為壞掉。
 *
 * 下一招由後端依基礎規則決定（業主定調：易經與技能運算在後端，前端只負責顯示）。
 * 這一條只管「隔多久請後端出下一招」與暫停鍵，不自己判斷要出什麼。
 */
export default function BattlePace({ match, automatic, blocked, canAct, onAutomatic, onAuto }: {
  match: Match; automatic: boolean; blocked: boolean; canAct: boolean;
  onAutomatic: (enabled: boolean) => void; onAuto: () => void;
}) {
  const delay = match.revision === 0 ? 500 : 1400;
  const running = automatic && !blocked && canAct && match.status === 'PLAYING';

  useEffect(() => {
    const pause = () => { if (document.hidden) onAutomatic(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, [onAutomatic]);

  useEffect(() => {
    if (!running || document.hidden) return;
    const timer = window.setTimeout(() => {
      if (!document.hidden) onAuto();
    }, delay);
    return () => window.clearTimeout(timer);
    // 每一回合（revision）只排一次，避免同一回合重複請後端出招
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, match.revision, onAuto, delay]);

  if (match.status !== 'PLAYING') return null;
  return <section className={styles.pace} aria-label="戰鬥節奏">
    <div className={styles.heading}>
      <strong role="status">{blocked ? '⚙' : running ? '▶ 自動連擊' : '⏸ 暫停'}</strong>
      <button type="button" disabled={blocked} aria-pressed={automatic} onClick={() => onAutomatic(!automatic)}>{automatic ? '暫停' : '自動'}</button>
    </div>
    <div key={`${match.revision}:${running}`} className={styles.track} style={{ visibility: running ? 'visible' : 'hidden' }} aria-label={running ? `${delay / 1000} 秒後推進` : undefined}><span style={{ animationDuration: `${delay}ms` }} /></div>
  </section>;
}
