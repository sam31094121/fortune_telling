'use client';

import UnifiedTaijiCore from '@/components/UnifiedTaijiCore';

type TaijiStandaloneCardProps = {
  className?: string;
  showLabel?: boolean;
};

export default function TaijiStandaloneCard({ className = '', showLabel = false }: TaijiStandaloneCardProps) {
  return (
    <div className={`taiji-standalone-card taiji-open-stage ${className}`.trim()}>
      <UnifiedTaijiCore showLabel={showLabel} />
    </div>
  );
}
