'use client';

import dynamic from 'next/dynamic';

const VisualGravityCore = dynamic(() => import('@/components/VisualGravityCore'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="aspect-square w-[min(20rem,calc(100vw-2rem))] rounded-full border border-cyan-300/15 bg-slate-950/30 shadow-[0_0_45px_rgba(34,211,238,0.14)]"
    />
  ),
});

type TaijiStandaloneCardProps = {
  className?: string;
};

export default function TaijiStandaloneCard({ className = '' }: TaijiStandaloneCardProps) {
  return (
    <div className={`taiji-standalone-card ${className}`.trim()}>
      <VisualGravityCore />
    </div>
  );
}
