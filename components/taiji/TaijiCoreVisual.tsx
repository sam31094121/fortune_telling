'use client';

import styles from './TaijiCoreVisual.module.css';

type TaijiCoreVisualProps = {
  active?: boolean;
  className?: string;
};

/**
 * Stage 1 (太極) core: a vector-perfect yin-yang circle.
 * Rendered as SVG so the totem never gets cropped, stretched, or squashed
 * regardless of the surrounding container's aspect ratio.
 */
export default function TaijiCoreVisual({ active = false, className = '' }: TaijiCoreVisualProps) {
  return (
    <svg
      className={`${styles.svg} ${active ? styles.active : ''} ${className}`.trim()}
      viewBox="-140 -140 280 280"
      role="img"
      aria-label="太極"
    >
      <defs>
        <filter id="taijiCoreGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="taijiLightGradient" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fffdf5" />
          <stop offset="100%" stopColor="#f3d98a" />
        </radialGradient>
        <radialGradient id="taijiDarkGradient" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#2a2140" />
          <stop offset="100%" stopColor="#05040a" />
        </radialGradient>
      </defs>

      <circle className={styles.outerRing} cx="0" cy="0" r="121" />

      <g className={styles.fish} filter="url(#taijiCoreGlow)">
        <path
          d="M 0 -120 A 120 120 0 0 0 0 120 A 60 60 0 0 0 0 0 A 60 60 0 0 1 0 -120 Z"
          fill="url(#taijiDarkGradient)"
        />
        <circle cx="0" cy="-60" r="17" fill="#f5f7fb" />
      </g>

      <g className={styles.fish} filter="url(#taijiCoreGlow)">
        <path
          d="M 0 -120 A 60 60 0 0 0 0 0 A 60 60 0 0 1 0 120 A 120 120 0 0 0 0 -120 Z"
          fill="url(#taijiLightGradient)"
        />
        <circle cx="0" cy="60" r="17" fill="#11151d" />
      </g>
    </svg>
  );
}
