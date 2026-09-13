'use client';

import { memo } from 'react';
import styles from './ElementBrandButton.module.css';

/**
 * 五元素寶珠品牌按鈕
 * ============================================================================
 *
 * 用5顆寶珠排成五角星形，配合相生相克箭頭
 * 中心連結五邊形排列，形成「五顆連珠」品牌標誌
 *
 * 超小迷你版本（18px 五珠 + 12px 軌道）
 * 視覺上形成可識別的品牌標誌，點擊打開相生相克互動面板
 */

const ELEMENTS_IN_CYCLE = ['AIR', 'EARTH', 'WATER', 'FIRE', 'SPACE'];

// 寶珠顏色（迷你版使用）
const ORB_COLORS: Record<string, { glow: string; ring: string }> = {
  SPACE: { glow: '#dfd8ff', ring: '#eee9ff' },
  AIR: { glow: '#8dffcd', ring: '#c6ffe1' },
  WATER: { glow: '#60edff', ring: '#c2fbff' },
  FIRE: { glow: '#ff9fc5', ring: '#ffd2e7' },
  EARTH: { glow: '#ffe198', ring: '#ffebb0' },
};

const ElementBrandButton = memo(function ElementBrandButton({
  onClick,
  ariaExpanded,
  ariaLabel = '元素相生相剋說明',
}: {
  onClick: () => void;
  ariaExpanded?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={styles.brandButton}
      onClick={onClick}
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
      title="五元素相生相剋"
    >
      {/* 五珠五角星品牌：迷你五連珠系統 */}
      <svg className={styles.brandMarkSvg} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* 相剋連線（淡色背景） */}
        <defs>
          <marker id="brandArrow" markerWidth="6" markerHeight="6" refX="5" refY="2.5" orient="auto">
            <polygon points="0 0, 6 2.5, 0 5" fill="rgba(251, 146, 60, 0.4)" />
          </marker>
        </defs>

        {/* 五條相剋箭頭 */}
        {[0, 1, 2, 3, 4].map(i => {
          const angle1 = (i * 72) * (Math.PI / 180);
          const angle2 = ((i + 1) * 72) * (Math.PI / 180);
          const radius = 35;
          const scale = 0.8;

          const x1 = 50 + radius * scale * Math.cos(angle1);
          const y1 = 50 + radius * scale * Math.sin(angle1);
          const x2 = 50 + radius * scale * Math.cos(angle2);
          const y2 = 50 + radius * scale * Math.sin(angle2);

          return (
            <line
              key={`arrow-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(251, 146, 60, 0.3)"
              strokeWidth="1"
              markerEnd="url(#brandArrow)"
            />
          );
        })}

        {/* 五顆寶珠迷你圓 */}
        {ELEMENTS_IN_CYCLE.map((element, i) => {
          const angle = (i * 72) * (Math.PI / 180);
          const x = 50 + 35 * Math.cos(angle);
          const y = 50 + 35 * Math.sin(angle);
          const colors = ORB_COLORS[element];

          return (
            <g key={element}>
              {/* 寶珠光暈 */}
              <circle
                cx={x}
                cy={y}
                r="2.5"
                fill={colors.glow}
                opacity="0.9"
                filter="url(#orbGlow)"
              />
              {/* 寶珠外環 */}
              <circle
                cx={x}
                cy={y}
                r="2.5"
                fill="none"
                stroke={colors.ring}
                strokeWidth="0.5"
                opacity="0.7"
              />
            </g>
          );
        })}

        {/* 中心五角星點 */}
        <circle cx="50" cy="50" r="3" fill="rgba(125, 211, 252, 0.5)" opacity="0.7" />

        {/* 寶珠發光濾鏡 */}
        <defs>
          <filter id="orbGlow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </button>
  );
});

export default ElementBrandButton;
