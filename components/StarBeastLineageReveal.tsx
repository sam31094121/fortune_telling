'use client';

import { useEffect, useState } from 'react';

type LineageBeast = {
  name: string;
  image: string;
  youngDivineImage: string;
};

type Props = {
  beast: LineageBeast;
  context: string;
  className?: string;
  imageClassName?: string;
  overlayClassName?: string;
  buttonClassName?: string;
  showName?: boolean;
};

/**
 * Shared progressive disclosure for existing star-beast pairs.
 * The adult guardian is always the initial view; the related child is opt-in.
 */
export default function StarBeastLineageReveal({
  beast,
  context,
  className = '',
  imageClassName = '',
  overlayClassName = '',
  buttonClassName = '',
  showName = true,
}: Props) {
  const [view, setView] = useState<'adult' | 'child'>('adult');
  const isAdult = view === 'adult';
  const label = isAdult ? '本命神獸' : '神獸幼子';

  useEffect(() => setView('adult'), [beast.name]);

  return (
    <div className={`relative ${className}`} aria-live="polite">
      <img
        src={isAdult ? beast.image : beast.youngDivineImage}
        alt={`${beast.name}${label}${context}`}
        className={imageClassName}
      />
      <div className={overlayClassName}>
        <p className="text-[10px] font-black tracking-[0.14em] text-amber-100/90">{label}</p>
        {showName && <p className="mt-0.5 text-xs font-black text-white">{beast.name}</p>}
        <button
          type="button"
          aria-pressed={!isAdult}
          aria-label={isAdult ? `深入查看${beast.name}的神獸幼子` : `返回${beast.name}的本命神獸`}
          onClick={() => setView(isAdult ? 'child' : 'adult')}
          className={buttonClassName}
        >
          {isAdult ? '深入查看神獸幼子' : '返回本命神獸'}
        </button>
      </div>
    </div>
  );
}
