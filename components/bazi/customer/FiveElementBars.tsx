'use client';

import type { CustomerElementBar } from './adapter';
import { ELEMENT_COLOR } from './adapter';

/** 五條水平能量帶：只顯示後端 weighted 百分比，不重算 */
export function FiveElementBars({ bars }: { bars: CustomerElementBar[] }) {
  const max = Math.max(...bars.map((b) => b.percent), 1);
  return (
    <div className="space-y-2.5">
      {bars.map((b) => {
        const c = ELEMENT_COLOR[b.element] ?? { bar: 'bg-white/40', text: 'text-white/70' };
        return (
          <div key={b.element} className="flex items-center gap-3">
            <span className={`w-6 shrink-0 font-serif text-lg font-black ${c.text}`}>{b.element}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/8">
              <span className={`block h-full rounded-full ${c.bar}`} style={{ width: `${Math.max(4, (b.percent / max) * 100)}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-bold text-white/55">{b.percent}%</span>
          </div>
        );
      })}
    </div>
  );
}
