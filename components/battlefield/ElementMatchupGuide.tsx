'use client';

import { ELEMENT_LABEL, ELEMENT_COUNTER, ELEMENTS, BeastElement, ELEMENT_GENERATES } from '@/lib/beast-game/elements';
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
    <details className={`${styles.matchupGuide} ${className}`}>
      <summary aria-label="查看目前兩張卡的相生相剋" title="相生相剋">？</summary>
      <div className={styles.shortVerdict}>
        <span>我方 {playerLabel} · 易經 {opponentLabel}</span>
        <strong>{playerCounters ? '有利' : opponentCounters ? '不利' : playerGenerates || opponentGenerates ? '相生' : '無加成'}</strong>
      </div>
      <div className={styles.orbRow} role="img" aria-label={`五元素寶珠示意；我方${playerLabel}，易經${opponentLabel}`}>
        {ELEMENTS.map(element => (
          <span key={element} className={`${styles.elementSymbol} ${styles[`symbol-${element}`]} ${element === playerElement ? styles.orbMine : ''} ${element === opponentElement ? styles.orbOpponent : ''}`} aria-hidden="true">
            {ELEMENT_LABEL[element]}
          </span>
        ))}
      </div>
      <p className={styles.explanation}>
        {playerCounters && '我剋他 · 傷害 +20%'}
        {opponentCounters && '他剋我 · 傷害 −10%'}
        {(playerGenerates || opponentGenerates) && '相生不加傷害；合體看己方後備'}
        {!playerCounters && !opponentCounters && !playerGenerates && !opponentGenerates && '這兩張卡沒有元素加成'}
      </p>
    </details>
  );
}
