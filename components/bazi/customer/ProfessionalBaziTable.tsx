'use client';

/**
 * LEVEL 3｜完整傳統八字命盤
 * 忠實呈現後端完整專業資料（老師／專業人士可核對）。
 * 傳統表格＋現代排版；只讀後端資料，不重算。
 */

const PILLAR_ORDER = ['year', 'month', 'day', 'hour'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProfessionalBaziTable({ result, hourUnknown }: { result: any; hourUnknown: boolean }) {
  const pc = result.professionalChart;
  return (
    <div className="space-y-4">
      {/* 出生資料 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]">出生資料</h4>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold leading-6 text-white/60">
          <p>曆法：{pc.calendar.calendarType === 'solar' ? '陽曆排盤' : '曆法排盤'}</p>
          <p>出生時間：{hourUnknown ? '時辰未提供' : `${pc.calendar.birthTime} · ${pc.calendar.shichen.label}`}</p>
          <p>時辰範圍：{hourUnknown ? '—' : pc.calendar.shichen.range}</p>
          <p>真太陽時：{pc.calendar.trueSolarTimeApplied ? '已套用' : '未套用（標準時）'}</p>
        </div>
      </section>

      {/* 四柱完整表 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]">四柱・藏干・十神</h4>
        <div className="mt-3 space-y-2">
          {PILLAR_ORDER.map((key) => {
            const detail = pc.pillarDetails[key];
            const hidden = pc.hiddenStemStructure[key] ?? [];
            const isUnknown = key === 'hour' && hourUnknown;
            return (
              <div key={key} className="rounded-2xl bg-black/20 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-black text-white/80">{detail.label}</span>
                  <span className="font-serif text-xl font-black text-amber-100">{isUnknown ? '時辰未提供' : detail.ganzhi}</span>
                </div>
                {!isUnknown && (
                  <div className="mt-2 space-y-1 text-sm font-semibold leading-6 text-white/55">
                    <p>天干十神：{detail.stemTenGod}｜地支主氣：{detail.branchMainElement} · {detail.branchMainTenGod}</p>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <p>藏干：{hidden.map((h: any) => `${h.roleLabel}${h.stem}${h.element}${h.tenGod}(${Math.round(h.weight * 100)}%)`).join('、')}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 五行分層統計（RAW 原始值放這層） */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]">五行分層統計</h4>
        <div className="mt-3 space-y-2 text-sm font-semibold leading-6 text-white/60">
          {Object.entries(pc.elementStatistics.percentages).map(([element, percent]) => (
            <p key={element}>
              {element}：{String(percent)}%（天干 {pc.elementStatistics.stems[element] ?? 0}・地支 {pc.elementStatistics.branches[element] ?? 0}・藏干 {pc.elementStatistics.hiddenStems[element] ?? 0}）
            </p>
          ))}
        </div>
      </section>

      {/* 完整十神分布 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]">完整十神分布</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pc.tenGodDistribution.ranked.map((item: any) => (
            <span key={item.tenGod} className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-sm font-bold text-white/70">{item.tenGod} {item.score}</span>
          ))}
        </div>
      </section>

      {/* 旺衰規則 + 用喜忌 + 格局 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]">旺衰・用喜忌・格局</h4>
        <div className="mt-3 space-y-1 text-sm font-semibold leading-6 text-white/60">
          <p>日主：{result.dayMaster.stem}{result.dayMaster.element}｜旺衰判定：{result.dayMaster.level}</p>
          <p>用神：{result.gods.usefulGod}｜喜神：{result.gods.joyGod}｜忌神：{result.gods.avoidGod}</p>
          <p>格局主軸：{pc.structurePattern.primaryPattern}｜輔助：{pc.structurePattern.supportingPattern}</p>
        </div>
        <div className="mt-3 space-y-1.5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pc.strengthFactors.map((f: any) => (
            <p key={f.id} className="text-sm font-semibold leading-6 text-white/55">・{f.label}（{f.score}）：{f.detail}</p>
          ))}
        </div>
      </section>

      {/* 完整大運 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]">完整大運</h4>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {result.luckCycles.map((c: any) => (
            <div key={c.ageRange} className="rounded-2xl bg-black/20 px-3 py-2.5 text-center">
              <p className="text-xs font-bold text-white/45">{c.ageRange}</p>
              <p className="font-serif text-lg font-black text-white/85">{c.pillar}</p>
              {c.tenGod && <p className="text-xs font-semibold text-white/50">{c.tenGod}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* 完整流年 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]">完整流年</h4>
        <div className="mt-3 space-y-1.5 text-sm font-semibold leading-6 text-white/60">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {result.annualFortunes.map((y: any) => (
            <p key={y.year}>{y.year}｜{y.pillar}｜{y.element}{y.tenGod ? `｜${y.tenGod}` : ''}</p>
          ))}
        </div>
      </section>

      {/* 引擎版本與資料完整度 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]">引擎版本與驗證</h4>
        <div className="mt-3 space-y-1 text-sm font-semibold leading-6 text-white/55">
          <p>引擎版本：{result.engineVersion}</p>
          {Object.entries(result.dataFlow?.rules ?? {}).map(([key, value]) => (
            <p key={key}>{key}：{value ? '通過' : '未通過'}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
