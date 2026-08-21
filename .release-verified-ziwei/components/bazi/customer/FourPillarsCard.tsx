'use client';

import type { CustomerPillar } from './adapter';
import { ELEMENT_COLOR } from './adapter';

/**
 * 四柱直式卡：上天干、中地支、下十神；日柱視覺權重最高。
 * 320px 仍四欄並排（縮間距），禁止橫向捲動。
 * 時辰未知：誠實顯示「時辰未提供」，不顯示假干支。
 */
export function FourPillarsCard({ pillars, hourUnknown, elementOf }: {
  pillars: CustomerPillar[];
  hourUnknown: boolean;
  elementOf: (stem: string) => string | undefined;
}) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {pillars.map((p) => {
          const isDay = p.key === 'day';
          const isUnknownHour = p.key === 'hour' && hourUnknown;
          const stemColor = ELEMENT_COLOR[elementOf(p.stem) ?? '']?.text ?? 'text-[color:var(--text-main)]';
          return (
            <div
              key={p.key}
              className={`flex flex-col items-center rounded-[18px] border px-1 py-4 text-center sm:px-3 sm:py-5 ${
                isDay
                  ? 'border-amber-200/45 bg-amber-100/[0.07]'
                  : 'border-white/8 bg-white/[0.03]'
              }`}
            >
              <p className={`text-sm font-black tracking-widest ${isDay ? 'text-amber-200' : 'text-white/50'}`}>{p.label.replace('柱', '')}柱</p>
              {isUnknownHour ? (
                <>
                  <p className="mt-4 text-base font-black leading-6 text-white/40">時辰<br />未提供</p>
                  <p className="mt-3 text-xs font-bold text-white/35">未定</p>
                </>
              ) : (
                <>
                  <p className={`mt-2 font-serif text-3xl font-black sm:text-4xl ${stemColor}`}>{p.stem}</p>
                  <p className="font-serif text-3xl font-black text-[color:var(--text-main)] sm:text-4xl">{p.branch}</p>
                  <p className={`mt-2 text-xs font-bold ${isDay ? 'text-amber-200' : 'text-white/55'}`}>{isDay ? '日主' : p.stemTenGod}</p>
                </>
              )}
            </div>
          );
        })}
      </div>
      {hourUnknown && (
        <p className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm font-semibold leading-6 text-white/60">
          目前為三柱分析；補充出生時辰後，可建立完整四柱。
        </p>
      )}
    </div>
  );
}
