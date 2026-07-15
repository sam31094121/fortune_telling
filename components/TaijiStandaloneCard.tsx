'use client';

import UnifiedTaijiCore from '@/components/UnifiedTaijiCore';

type TaijiStandaloneCardProps = {
  className?: string;
};

export default function TaijiStandaloneCard({ className = '' }: TaijiStandaloneCardProps) {
  return (
    <div className={`taiji-standalone-card ${className}`.trim()}>
      <UnifiedTaijiCore />
    </div>
  );
}
