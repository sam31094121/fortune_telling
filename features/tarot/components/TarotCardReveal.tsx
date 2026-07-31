'use client';

import { useState } from 'react';
import type { TarotCard, TarotOrientation } from '@/features/tarot/types';

type TarotCardRevealProps = {
  card: TarotCard;
  orientation: TarotOrientation;
  compact?: boolean;
};

export default function TarotCardReveal({ card, orientation, compact = false }: TarotCardRevealProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const orientationLabel = orientation === 'upright' ? '正位' : '逆位';

  return (
    <div className={`tarot-card-reveal mx-auto w-full text-center ${compact ? 'max-w-[150px]' : 'max-w-[260px]'}`}>
      <div className="relative mx-auto aspect-[9/14] overflow-hidden rounded-[1.25rem] border border-amber-200/35 bg-slate-950 shadow-[0_22px_55px_rgba(0,0,0,0.32)]">
        {!imageFailed ? (
          <img
            src={card.imageUrl}
            alt={`${card.nameZh} ${orientationLabel}牌面`}
            onError={() => setImageFailed(true)}
            className={`h-full w-full object-cover ${orientation === 'reversed' ? 'rotate-180' : ''}`}
          />
        ) : (
          <div className={`flex h-full w-full flex-col items-center justify-center bg-slate-950 p-5 ${orientation === 'reversed' ? 'rotate-180' : ''}`} role="img" aria-label={`${card.nameZh} ${orientationLabel}牌面載入失敗，顯示文字替代牌面`}>
            <span className="text-5xl font-serif text-amber-100">T</span>
            <span className="mt-5 text-2xl font-black text-sky-50">{card.nameZh}</span>
            <span className="mt-2 text-sm text-[color:var(--text-sub)]">{card.nameEn}</span>
          </div>
        )}
      </div>
      <span className={`inline-flex rounded-full border border-amber-200/35 bg-amber-300/12 font-black text-amber-100 ${compact ? 'mt-2 px-3 py-1 text-xs' : 'mt-4 px-4 py-2 text-sm'}`}>
        {orientationLabel}
      </span>
    </div>
  );
}