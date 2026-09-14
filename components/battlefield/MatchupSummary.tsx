'use client';

import { memo } from 'react';
import styles from './MatchupSummary.module.css';
import { describeMatchup } from '@/lib/beast-element-guide';
import type { BeastElement } from '@/lib/beast-game/elements';
import { ELEMENT_LABEL } from '@/lib/beast-game/elements';

interface MatchupSummaryProps {
  playerElement: BeastElement;
  opponentElement: BeastElement;
}

const MatchupSummary = memo(function MatchupSummary({
  playerElement,
  opponentElement,
}: MatchupSummaryProps) {
  const matchup = describeMatchup(playerElement, opponentElement);
  const icon = matchup.kind === 'ADVANTAGE' ? '▲' : matchup.kind === 'DISADVANTAGE' ? '▼' : '◉';
  const percent = matchup.kind !== 'NEUTRAL'
    ? `${matchup.kind === 'ADVANTAGE' ? '+' : '-'}${Math.abs(Math.round((matchup.multiplier - 1) * 100))}%`
    : '50/50';

  return (
    <details className={styles.matchupDetails} data-matchup={matchup.kind}>
      <summary className={styles.matchupSummary} title={matchup.reason}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.label}>相生相剋</span>
        <span className={styles.percent}>{percent}</span>
      </summary>

      <div className={styles.matchupContent}>
        <div className={styles.headline}>{matchup.headline}</div>
        <div className={styles.reason}>{matchup.reason}</div>

        <div className={styles.matchupGrid}>
          <div className={styles.fighter}>
            <div className={styles.element}>{ELEMENT_LABEL[playerElement]}</div>
            <div className={styles.role}>你</div>
          </div>
          <div className={styles.vs}>{icon}</div>
          <div className={styles.fighter}>
            <div className={styles.element}>{ELEMENT_LABEL[opponentElement]}</div>
            <div className={styles.role}>對手</div>
          </div>
        </div>
      </div>
    </details>
  );
});

export default MatchupSummary;
