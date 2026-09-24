import styles from '@/components/battlefield/ElementOrbDisplay.module.css';
/** Shared complete reference material; state and palette belong to the orb root. */
export function ElementOrbVisual() {
  return <div className={styles.orbVisual}>
    <div className={styles.orbRing} />
    <div className={styles.orbCore} />
    <div className={styles.orbEdge} />
    <div className={styles.orbInner} />
  </div>;
}
