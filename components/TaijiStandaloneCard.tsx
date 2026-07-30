'use client';

import UnifiedTaijiCore from '@/components/UnifiedTaijiCore';

type TaijiStandaloneCardProps = {
  className?: string;
  showLabel?: boolean;
  limitToLiangyi?: boolean;
};

export default function TaijiStandaloneCard({ className = '', showLabel = false, limitToLiangyi = false }: TaijiStandaloneCardProps) {
  return (
    <div className={`taiji-standalone-card taiji-open-stage ${className}`.trim()}>
      <div className="taiji-stage-bagua-field" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className={`taiji-stage-bagua-field__mark taiji-stage-bagua-field__mark--${index}`} />
        ))}
      </div>
      <UnifiedTaijiCore showLabel={showLabel} limitToLiangyi={limitToLiangyi} />
    </div>
  );
}
