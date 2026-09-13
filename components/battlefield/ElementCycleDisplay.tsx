'use client';

import { memo } from 'react';
import styles from './ElementCycleDisplay.module.css';
import ElementOrbDisplay from './ElementOrbDisplay';
import type { BeastElement } from '@/lib/beast-game/elements';

const ELEMENTS_IN_CYCLE: BeastElement[] = ['AIR', 'EARTH', 'WATER', 'FIRE', 'SPACE'];

const ElementCycleDisplay = memo(function ElementCycleDisplay() {
  return (
    <div className={styles.cycleContainer}>
      <h3>⚡ 元素相生相剋環</h3>

      <div className={styles.orbitSystem}>
        {/* 中心軌跡圓 */}
        <svg className={styles.cycleBackground} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          {/* 中心圓環 */}
          <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(125, 211, 252, 0.2)" strokeWidth="1" />

          {/* 相剋箭頭連線 */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="rgba(251, 146, 60, 0.6)" />
            </marker>
          </defs>

          {/* 五條箭頭線連接各元素 */}
          {[0, 1, 2, 3, 4].map(i => {
            const angle1 = (i * 72) * (Math.PI / 180);
            const angle2 = ((i + 1) * 72) * (Math.PI / 180);
            const x1 = 100 + 70 * Math.cos(angle1);
            const y1 = 100 + 70 * Math.sin(angle1);
            const x2 = 100 + 70 * Math.cos(angle2);
            const y2 = 100 + 70 * Math.sin(angle2);

            // 計算箭頭起點（靠近目標點）
            const scale = 0.85;
            const startX = 100 + 70 * scale * Math.cos(angle1);
            const startY = 100 + 70 * scale * Math.sin(angle1);
            const endX = 100 + 70 * scale * Math.cos(angle2);
            const endY = 100 + 70 * scale * Math.sin(angle2);

            return (
              <line
                key={i}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="rgba(251, 146, 60, 0.4)"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </svg>

        {/* 五顆寶珠排成五邊形 */}
        <div className={styles.orbPositions}>
          {ELEMENTS_IN_CYCLE.map((element, i) => {
            const angle = (i * 72) * (Math.PI / 180);
            const x = 70 * Math.cos(angle);
            const y = 70 * Math.sin(angle);

            return (
              <div
                key={element}
                className={styles.orbPosition}
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                <ElementOrbDisplay element={element} size="small" animated />
              </div>
            );
          })}
        </div>
      </div>

      {/* 相剋說明 */}
      <div className={styles.relationText}>
        <p><strong>風剋地</strong> → <strong>地剋水</strong> → <strong>水剋火</strong> → <strong>火剋空</strong> → <strong>空剋風</strong></p>
        <small>外圈箭頭表示「誰剋誰」的方向</small>
      </div>
    </div>
  );
});

export default ElementCycleDisplay;
