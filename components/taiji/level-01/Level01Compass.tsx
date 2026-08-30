'use client';

import styles from './level01.module.css';

export function Level01Compass() {
  return (
    <div className={styles.compass} aria-hidden="true" data-level01-layer="world-reference">
      <span className={`${styles.compassMark} ${styles.north}`}>N</span>
      <span className={`${styles.compassMark} ${styles.east}`}>E</span>
      <span className={`${styles.compassMark} ${styles.south}`}>S</span>
      <span className={`${styles.compassMark} ${styles.west}`}>W</span>
    </div>
  );
}
