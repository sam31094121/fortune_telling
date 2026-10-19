import { SEAL_MOTIONS } from './seal-motion';
import styles from './GhostAsuraCard.module.css';

/** Purely decorative; unknown IDs get no invented imagery. */
export function SealMotion({ id }: { id: string }) {
  const scene = SEAL_MOTIONS[id];
  if (!scene) return null;
  return (
    <span className={styles.sealMotion} data-seal-motion={scene.motion} data-seal-scene={scene.scene} aria-hidden="true">
      <svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={scene.path} pathLength="1" />
      </svg>
    </span>
  );
}
