'use client';

import { ELEMENT_LABEL, ELEMENT_COUNTER, BeastElement, ELEMENT_GENERATES } from '@/lib/beast-game/elements';
import styles from './ElementMatchupGuide.module.css';

interface ElementMatchupGuideProps {
  playerElement: BeastElement;
  opponentElement: BeastElement;
  className?: string;
}

export default function ElementMatchupGuide({
  playerElement,
  opponentElement,
  className = '',
}: ElementMatchupGuideProps) {
  const playerLabel = ELEMENT_LABEL[playerElement];
  const opponentLabel = ELEMENT_LABEL[opponentElement];

  // 判定相生相克關係
  const playerCounters = ELEMENT_COUNTER[playerElement] === opponentElement; // 我剋對方
  const opponentCounters = ELEMENT_COUNTER[opponentElement] === playerElement; // 對方剋我
  const playerGenerates = ELEMENT_GENERATES[playerElement] === opponentElement; // 我生對方
  const opponentGenerates = ELEMENT_GENERATES[opponentElement] === playerElement; // 對方生我

  return (
    <div className={`${styles.matchupGuide} ${className}`}>
      <div className={styles.elementPair}>
        {/* 玩家元素 */}
        <div className={styles.elementCard}>
          <span className={styles.elementLabel}>{playerLabel}</span>
          <span className={`${styles.elementSymbol} ${styles[`symbol-${playerElement}`]}`}>
            {getElementEmoji(playerElement)}
          </span>
        </div>

        {/* 關係指示器 */}
        <div className={styles.relationshipArea}>
          {playerCounters && (
            <div className={`${styles.relation} ${styles.advantage}`}>
              <span className={styles.relationIcon}>→</span>
              <span className={styles.relationText}>剋</span>
            </div>
          )}
          {opponentCounters && (
            <div className={`${styles.relation} ${styles.disadvantage}`}>
              <span className={styles.relationIcon}>←</span>
              <span className={styles.relationText}>被剋</span>
            </div>
          )}
          {playerGenerates && (
            <div className={`${styles.relation} ${styles.generates}`}>
              <span className={styles.relationIcon}>↻</span>
              <span className={styles.relationText}>生</span>
            </div>
          )}
          {opponentGenerates && (
            <div className={`${styles.relation} ${styles.generated}`}>
              <span className={styles.relationIcon}>↺</span>
              <span className={styles.relationText}>被生</span>
            </div>
          )}
          {!playerCounters && !opponentCounters && !playerGenerates && !opponentGenerates && (
            <div className={`${styles.relation} ${styles.neutral}`}>
              <span className={styles.relationIcon}>≈</span>
              <span className={styles.relationText}>無關</span>
            </div>
          )}
        </div>

        {/* 對方元素 */}
        <div className={styles.elementCard}>
          <span className={styles.elementLabel}>{opponentLabel}</span>
          <span className={`${styles.elementSymbol} ${styles[`symbol-${opponentElement}`]}`}>
            {getElementEmoji(opponentElement)}
          </span>
        </div>
      </div>

      {/* 說明文字 */}
      <p className={styles.explanation}>
        {playerCounters && `${playerLabel}剋${opponentLabel}，傷害 +20%`}
        {opponentCounters && `${opponentLabel}剋${playerLabel}，傷害 −10%`}
        {playerGenerates && `${playerLabel}生${opponentLabel}，相生關係`}
        {opponentGenerates && `${opponentLabel}生${playerLabel}，相生關係`}
        {!playerCounters && !opponentCounters && !playerGenerates && !opponentGenerates && '兩者無相生相剋關係'}
      </p>
    </div>
  );
}

function getElementEmoji(element: BeastElement): string {
  const emojiMap: Record<BeastElement, string> = {
    SPACE: '◆',
    AIR: '◈',
    WATER: '◊',
    FIRE: '◉',
    EARTH: '◇',
  };
  return emojiMap[element] || '●';
}
