'use client';

import { useEffect, useRef } from 'react';
import UnifiedTaijiCore from '@/components/UnifiedTaijiCore';

type TaijiStandaloneCardProps = {
  className?: string;
  showLabel?: boolean;
  limitToLiangyi?: boolean;
  showThreeLayerMaterial?: boolean;
  holdEvolutionStages?: boolean;
  adaptiveEntry?: boolean;
};

type TaijiMaterialLayer = {
  layer: 'origin' | 'liangyi' | 'handoff';
  symbol: string;
  role: string;
};

const TAIJI_THREE_LAYER_MATERIAL: TaijiMaterialLayer[] = [
  {
    layer: 'origin',
    symbol: 'circle-s-curve-yin-yang',
    role: 'The Taiji totem keeps the complete origin, boundary, S-curve, and breathing field.',
  },
  {
    layer: 'liangyi',
    symbol: 'same-path-split-merge',
    role: 'Liangyi evolution reads only the original Taiji path and preserves the same split and merge curve.',
  },
  {
    layer: 'handoff',
    symbol: 'bagua-platform-handoff',
    role: 'The Taiji totem provides direction only and does not overwrite any module data.',
  },
];

// 視差傾斜上限（度）：小幅度才高級，過大會暈
const PARALLAX_MAX_DEG = 7;

function buildTaijiMaterialSignature() {
  return TAIJI_THREE_LAYER_MATERIAL.map((item) => item.layer + ':' + item.symbol).join('|');
}

export default function TaijiStandaloneCard({
  className = '',
  showLabel = false,
  limitToLiangyi = false,
  showThreeLayerMaterial = false,
  holdEvolutionStages = false,
  adaptiveEntry = false,
}: TaijiStandaloneCardProps) {
  const cardClassName = ['taiji-standalone-card taiji-open-stage taiji-parallax-stage', className].filter(Boolean).join(' ');
  const materialSignature = showThreeLayerMaterial ? buildTaijiMaterialSignature() : undefined;
  const cardRef = useRef<HTMLDivElement>(null);

  // 視差傾斜：原生事件監聽，滑鼠移動時整組三層跟著微傾斜，離開回正
  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof window === 'undefined') return;

    const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    const setTilt = (tiltX: number, tiltY: number) => {
      node.style.setProperty('--taiji-parallax-x', `${tiltX.toFixed(2)}deg`);
      node.style.setProperty('--taiji-parallax-y', `${tiltY.toFixed(2)}deg`);
    };

    const onMove = (event: PointerEvent) => {
      if (reducedQuery?.matches) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // 以卡片中心為原點：滑鼠往右→往右傾，往上→往後仰
      const ratioX = (event.clientX - rect.left) / rect.width - 0.5;
      const ratioY = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt(ratioX * PARALLAX_MAX_DEG * 2, ratioY * -PARALLAX_MAX_DEG * 2);
    };

    const onReset = () => setTilt(0, 0);

    node.addEventListener('pointermove', onMove, { passive: true });
    node.addEventListener('pointerleave', onReset, { passive: true });
    node.addEventListener('pointercancel', onReset, { passive: true });

    return () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onReset);
      node.removeEventListener('pointercancel', onReset);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={cardClassName}
      data-taiji-material-layers={showThreeLayerMaterial ? TAIJI_THREE_LAYER_MATERIAL.length : undefined}
      data-taiji-material-signature={materialSignature}
      data-taiji-kindness="three-act-depth-v6"
      data-taiji-performance="three-act-depth-v6"
    >
      <div className="taiji-kindness-screen" aria-hidden="true">
        <span className="taiji-kindness-screen__act taiji-kindness-screen__act-core" />
        <span className="taiji-kindness-screen__act taiji-kindness-screen__act-stars" />
        <span className="taiji-kindness-screen__act taiji-kindness-screen__act-space" />
      </div>
      <UnifiedTaijiCore
        showLabel={showLabel}
        limitToLiangyi={limitToLiangyi}
        holdEvolutionStages={holdEvolutionStages}
        adaptiveEntry={adaptiveEntry}
        cleanThreeAct
      />
    </div>
  );
}
