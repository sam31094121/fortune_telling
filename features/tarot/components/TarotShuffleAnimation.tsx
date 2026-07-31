'use client';

import type { CSSProperties } from 'react';
import type { TarotSpreadType } from '@/features/tarot/types';

type TarotShuffleAnimationProps = {
  spreadType?: TarotSpreadType;
  requiredDrawCount?: number;
  deckSize?: number;
};

function buildShuffleCardStyle(index: number): CSSProperties {
  const midpoint = 12.5;
  const offset = index - midpoint;
  const lane = index % 2 === 0 ? -1 : 1;
  const weave = (index % 7) - 3;
  const cut = Math.floor(index / 2) % 4;
  return {
    ['--shuffle-x' as string]: `${offset * 0.16}rem`,
    ['--shuffle-y' as string]: `${Math.abs(offset) * 0.028}rem`,
    ['--shuffle-rot' as string]: `${offset * 1.05}deg`,
    ['--shuffle-soft-x' as string]: `${offset * 0.0288}rem`,
    ['--shuffle-soft-depth' as string]: `${(index + 1) * 0.049}px`,
    ['--shuffle-soft-rot' as string]: `${offset * 0.21}deg`,
    ['--shuffle-settle-x' as string]: `${offset * 0.256}rem`,
    ['--shuffle-settle-rot' as string]: `${offset * 1.47}deg`,
    ['--shuffle-compress-x' as string]: `${offset * 0.0672}rem`,
    ['--shuffle-compress-rot' as string]: `${offset * 0.4725}deg`,
    ['--shuffle-split-x' as string]: `${lane * 4.7}rem`,
    ['--shuffle-interlace-x' as string]: `${lane * -2.45}rem`,
    ['--shuffle-bridge-x' as string]: `${lane * 2.1}rem`,
    ['--shuffle-split-rot' as string]: `${lane * 15}deg`,
    ['--shuffle-interlace-rot' as string]: `${lane * -10}deg`,
    ['--shuffle-bridge-rot' as string]: `${lane * 8}deg`,
    ['--shuffle-yaw' as string]: `${lane * 13}deg`,
    ['--shuffle-weave' as string]: `${weave * 0.34}rem`,
    ['--shuffle-cut' as string]: `${cut * 0.18}rem`,
    ['--shuffle-delay' as string]: `${index * 24}ms`,
    ['--shuffle-z' as string]: index + 1,
    ['--shuffle-depth' as string]: `${(index + 1) * 0.14}px`,
  };
}

function buildParticleStyle(index: number): CSSProperties {
  const angle = (index / 28) * Math.PI * 2;
  const radius = 6.5 + (index % 6) * 0.58;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * 0.58;
  return {
    ['--particle-x' as string]: `${x}rem`,
    ['--particle-y' as string]: `${y}rem`,
    ['--particle-mid-x' as string]: `${x * 0.65}rem`,
    ['--particle-mid-y' as string]: `${y * 0.48}rem`,
    ['--particle-end-x' as string]: `${x * 0.18}rem`,
    ['--particle-end-y' as string]: `${y * 0.12}rem`,
    ['--particle-delay' as string]: `${index * 72}ms`,
    ['--particle-size' as string]: `${0.14 + (index % 4) * 0.045}rem`,
  };
}

export default function TarotShuffleAnimation({ requiredDrawCount = 3, deckSize = 78 }: TarotShuffleAnimationProps) {
  return (
    <section className="fortune-card tarot-ritual-shuffle border-cyan-300/25 p-5 text-center sm:p-7" role="status" aria-live="polite" aria-busy="true">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">SHUFFLING RITUAL</p>
      <h2 className="mt-3 font-serif text-3xl font-black leading-tight text-cyan-50 sm:text-4xl">78 張牌正在完整洗牌</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
        系統正在重新排列完整牌庫與正逆位。洗牌完成後會自然停成牌堆，再展開約 12 張牌背由你親手選 {requiredDrawCount} 張。
      </p>

      <div className="tarot-ritual-shuffle__stage mx-auto mt-8" aria-hidden="true">
        <div className="tarot-ritual-shuffle__halo" />
        <div className="tarot-ritual-shuffle__shadow" />
        <div className="tarot-ritual-shuffle__deck">
          {Array.from({ length: 26 }, (_, index) => (
            <span key={index} className="tarot-ritual-shuffle__card" style={buildShuffleCardStyle(index)} />
          ))}
          <strong>T</strong>
        </div>
        <div className="tarot-ritual-shuffle__particles">
          {Array.from({ length: 28 }, (_, index) => (
            <span key={index} style={buildParticleStyle(index)} />
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
        <div className="tarot-ritual-shuffle__note">
          <span>{deckSize}</span>
          <p>完整牌庫</p>
        </div>
        <div className="tarot-ritual-shuffle__note">
          <span>Fisher-Yates</span>
          <p>真實亂數重排</p>
        </div>
        <div className="tarot-ritual-shuffle__note">
          <span>{requiredDrawCount}</span>
          <p>親手抽牌</p>
        </div>
      </div>
    </section>
  );
}