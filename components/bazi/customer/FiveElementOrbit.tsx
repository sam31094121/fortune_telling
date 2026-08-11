'use client';

import type { FiveElementOrbitItem, FiveElementOrbitViewModel } from './adapter';

const ORBIT_POSITIONS: Record<FiveElementOrbitItem['element'], string> = {
  WOOD: 'left-1/2 top-[4%] -translate-x-1/2',
  FIRE: 'right-[7%] top-[31%]',
  EARTH: 'right-[18%] bottom-[6%]',
  METAL: 'left-[18%] bottom-[6%]',
  WATER: 'left-[7%] top-[31%]',
};

const ELEMENT_TONE: Record<FiveElementOrbitItem['element'], string> = {
  WOOD: 'border-emerald-300/45 bg-emerald-400/12 text-emerald-100',
  FIRE: 'border-rose-300/45 bg-rose-400/12 text-rose-100',
  EARTH: 'border-amber-300/45 bg-amber-500/12 text-amber-100',
  METAL: 'border-slate-200/45 bg-slate-200/12 text-slate-100',
  WATER: 'border-blue-300/45 bg-blue-400/12 text-blue-100',
};

function scaleClass(value: number | null) {
  if (value == null) return 'h-[78px] w-[78px]';
  if (value >= 28) return 'h-[92px] w-[92px]';
  if (value >= 20) return 'h-[86px] w-[86px]';
  if (value >= 12) return 'h-[80px] w-[80px]';
  return 'h-[74px] w-[74px]';
}

export function FiveElementOrbit({ view }: { view: FiveElementOrbitViewModel }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px] min-w-0">
      <div className="absolute inset-[13%] rounded-full border border-white/10" aria-hidden="true" />
      <div className="absolute inset-[30%] grid place-items-center rounded-full border border-white/10 bg-black/22">
        <p className="text-xs font-black text-white/40">日主</p>
        <p className="mt-1 font-serif text-2xl font-black text-amber-100">{view.centerLabel}</p>
      </div>

      {view.items.map((item) => (
        <div
          key={item.element}
          className={`absolute ${ORBIT_POSITIONS[item.element]} grid ${scaleClass(item.value)} place-items-center rounded-full border px-2 text-center ${ELEMENT_TONE[item.element]}`}
        >
          <div>
            <p className="font-serif text-2xl font-black leading-none">{item.label}</p>
            <p className="mt-1 text-sm font-black leading-4">{item.value == null ? '未提供' : `${item.value}%`}</p>
            <p className="mt-1 text-[12px] font-bold leading-4 text-white/55">
              {item.tenGodLabels.length > 0 ? item.tenGodLabels.join('／') : '十神映射未提供'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
