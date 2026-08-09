'use client';

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
  const cardClassName = ['taiji-standalone-card taiji-open-stage', className].filter(Boolean).join(' ');
  const materialSignature = showThreeLayerMaterial ? buildTaijiMaterialSignature() : undefined;

  return (
    <div
      className={cardClassName}
      data-taiji-material-layers={showThreeLayerMaterial ? TAIJI_THREE_LAYER_MATERIAL.length : undefined}
      data-taiji-material-signature={materialSignature}
      data-taiji-kindness="three-act-clean-v5"
      data-taiji-performance="three-act-clean-v5"
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
