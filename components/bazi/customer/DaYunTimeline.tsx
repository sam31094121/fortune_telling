'use client';

import { useState } from 'react';
import type { CustomerDaYun } from './adapter';

/** 大運水平時間軸：目前所在大運自動突出；點擊展開細節 */
export function DaYunTimeline({ daYun }: { daYun: CustomerDaYun[] }) {
  const [active, setActive] = useState<number | null>(null);
  const nowYear = new Date().getFullYear();
  if (daYun.length === 0) return null;
  return (
    <div>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
        {daYun.map((cycle, i) => {
          const isCurrent = cycle.startYear != null && cycle.endYear != null && nowYear >= cycle.startYear && nowYear <= cycle.endYear;
          const isActive = active === i;
          return (
            <button
              key={cycle.ageRange + cycle.pillar}
              type="button"
              onClick={() => setActive(isActive ? null : i)}
              className={`shrink-0 snap-start rounded-[18px] border px-4 py-3 text-center transition ${
                isCurrent
                  ? 'border-amber-200/55 bg-amber-100/[0.09]'
                  : isActive
                    ? 'border-white/25 bg-white/[0.06]'
                    : 'border-white/8 bg-white/[0.03]'
              }`}
            >
              <p className={`text-xs font-bold ${isCurrent ? 'text-amber-200' : 'text-white/50'}`}>{cycle.ageRange}{isCurrent ? ' · 目前' : ''}</p>
              <p className="mt-1 font-serif text-xl font-black text-[color:var(--text-main)]">{cycle.pillar}</p>
              {cycle.tenGod && <p className="mt-0.5 text-xs font-semibold text-white/45">{cycle.tenGod}</p>}
            </button>
          );
        })}
      </div>
      {active != null && daYun[active] && (
        <div className="mt-2 rounded-2xl bg-black/25 px-4 py-3">
          <p className="text-sm font-black text-[color:var(--text-main)]">{daYun[active].ageRange} · {daYun[active].pillar}{daYun[active].tenGod ? ` · ${daYun[active].tenGod}` : ''}</p>
          {(daYun[active].startYear || daYun[active].endYear) && (
            <p className="mt-1 text-sm font-semibold text-white/55">{daYun[active].startYear ?? ''}–{daYun[active].endYear ?? ''} 年</p>
          )}
          {daYun[active].focus && <p className="mt-1 text-sm font-semibold leading-6 text-white/65">{daYun[active].focus}</p>}
        </div>
      )}
    </div>
  );
}
