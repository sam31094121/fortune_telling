'use client';

import HomeTranslatedText from '@/components/HomeTranslatedText';
import type { CustomerPillar } from './adapter';
import { ELEMENT_COLOR } from './adapter';
import { deriveBaziPillarBeast } from '@/lib/bazi-four-pillar-beasts';
import styles from './FourPillarsCard.module.css';

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
      <div className="grid grid-cols-4 gap-1 sm:gap-3">
        {pillars.map((p) => {
          const isDay = p.key === 'day';
          const isUnknownHour = p.key === 'hour' && hourUnknown;
          const stemColor = ELEMENT_COLOR[elementOf(p.stem) ?? '']?.text ?? 'text-[color:var(--text-main)]';
          const beastLink = isUnknownHour ? null : deriveBaziPillarBeast(p);
          return (
            <div
              key={p.key}
              className={`${styles.pillarCard} ${isDay ? styles.isDay : styles.isHour}`}
            >
              <p className={`${styles.pillarLabel} ${isDay ? styles.isDay : styles.isHour}`}>{p.label.replace('柱', '')}柱</p>
              {isUnknownHour ? (
                <>
                  <p className="mt-4 text-base font-black leading-6 text-white/40"><HomeTranslatedText text={"時辰"} /><br /><HomeTranslatedText text={"未提供"} /></p>
                  <p className="mt-3 text-xs font-bold text-white/35"><HomeTranslatedText text={"未定"} /></p>
                </>
              ) : (
                <>
                  <p className={`${styles.stemText} ${stemColor}`}>{p.stem}</p>
                  <p className={styles.branchText}>{p.branch}</p>
                  <p className={`${styles.tenGodText} ${isDay ? styles.isDay : styles.isHour}`}>{isDay ? '日主' : p.stemTenGod}</p>
                  {beastLink && (
                    <div className={`${styles.beastSection} ${isDay ? styles.isDay : styles.isHour}`}>
                      <img src={beastLink.beast.image} alt={`${p.label}${beastLink.beast.name}`} className={styles.beastImage} />
                      <p className={styles.beastName}>{beastLink.beast.name}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {hourUnknown && (
        <p className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm font-semibold leading-6 text-white/60"><HomeTranslatedText text={"目前為三柱分析；補充出生時辰後，可建立完整四柱。"} /></p>
      )}
    </div>
  );
}
