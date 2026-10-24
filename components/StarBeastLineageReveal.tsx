'use client';
import CatalogBeastCard from './battlefield/CatalogBeastCard';

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
  /** Optional display labels (e.g. English on /match); omitted = the original Chinese copy. */
  labels?: {
    adult: string;
    child: string;
    showChild: string;
    showAdult: string;
    showChildAria: (name: string) => string;
    showAdultAria: (name: string) => string;
  };
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
  labels,
}: Props) {
  const [view, setView] = useState<'adult' | 'child'>('adult');
  const isAdult = view === 'adult';
  const label = labels ? (isAdult ? labels.adult : labels.child) : isAdult ? '本命神獸' : '神獸幼子';

  useEffect(() => setView('adult'), [beast.name]);

  return (
    <div className={`relative ${className}`} aria-live="polite">
      <CatalogBeastCard name={beast.name} young={!isAdult} />
      <div className="relative bg-slate-950/90 p-3">
        <p className="text-xs font-black tracking-[0.14em] text-amber-100/90">{label}</p>
        {showName && <p className="mt-0.5 text-xs font-black text-white">{beast.name}</p>}
        <button
          type="button"
          aria-pressed={!isAdult}
          aria-label={labels ? (isAdult ? labels.showChildAria(beast.name) : labels.showAdultAria(beast.name)) : isAdult ? `深入查看${beast.name}的神獸幼子` : `返回${beast.name}的本命神獸`}
          onClick={() => setView(isAdult ? 'child' : 'adult')}
          className={buttonClassName}
        >
          {labels ? (isAdult ? labels.showChild : labels.showAdult) : isAdult ? '深入查看神獸幼子' : '返回本命神獸'}
        </button>
      </div>
    </div>
  );
}
