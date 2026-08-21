'use client';

import { useState } from 'react';
import type { CustomerAnnual } from './adapter';
import { ELEMENT_COLOR } from './adapter';

/** 流年：預設只顯示 3 年，點「查看完整流年」才展開 */
export function AnnualLuckSection({ annual }: { annual: CustomerAnnual[] }) {
  const [expanded, setExpanded] = useState(false);
  if (annual.length === 0) return null;
  const visible = expanded ? annual : annual.slice(0, 3);
  return (
    <div>
      <div className="space-y-2">
        {visible.map((item) => {
          const c = ELEMENT_COLOR[item.element] ?? { text: 'text-white/70' };
          return (
            <div key={item.year} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
              <div className="flex items-baseline gap-3">
                <span className="text-base font-black text-[color:var(--text-main)]">{item.year}</span>
                <span className="font-serif text-lg font-black text-white/85">{item.pillar}</span>
                <span className={`text-sm font-bold ${c.text}`}>{item.element}</span>
              </div>
              {item.tenGod && <span className="shrink-0 text-sm font-bold text-white/50">{item.tenGod}</span>}
            </div>
          );
        })}
      </div>
      {annual.length > 3 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-3 w-full rounded-full border border-white/12 bg-white/[0.04] py-2.5 text-sm font-bold text-white/65 transition hover:text-white">
          {expanded ? '收起流年' : `查看完整流年（共 ${annual.length} 年）`}
        </button>
      )}
    </div>
  );
}
