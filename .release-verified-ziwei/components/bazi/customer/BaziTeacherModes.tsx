'use client';

import { useMemo, useState } from 'react';
import type { BaziCustomerView } from './adapter';
import { TeacherSummary } from './TeacherSummary';
import { CustomerEvidenceDrawer } from './CustomerAccordion';

type TeacherMode = 'CHART' | 'HORROR' | 'GHOST';

const TEACHERS: Array<{ id: TeacherMode; title: string; subtitle: string }> = [
  { id: 'CHART', title: '老師解命盤', subtitle: '結構、用神、運勢' },
  { id: 'HORROR', title: '恐怖解命盤', subtitle: '壓力訊號與風險窗口' },
  { id: 'GHOST', title: '鬼魅解命盤', subtitle: '象徵敘事與當下感應' },
];

function currentLuck(view: BaziCustomerView) {
  return view.timeContext.activeDaYun ?? view.teacher.daYun[0] ?? null;
}

/**
 * 三位老師只讀同一張 BaziCustomerView；不重算四柱、不改動既有核心。
 * 目前先提供可驗證的本地解讀模組，底層獨立 AI 服務會在後續任務另行接入。
 */
export function BaziTeacherModes({ view }: { view: BaziCustomerView }) {
  const [active, setActive] = useState<TeacherMode>('CHART');
  const evidence = useMemo(() => {
    const luck = currentLuck(view);
    const timing = view.timeContext;
    return [
      { label: '日主', value: `${view.dayMaster.stem}${view.dayMaster.element}（${view.dayMaster.level}）` },
      { label: '格局', value: view.structurePattern.primaryPattern },
      { label: '用神／忌神', value: `${view.gods.usefulGod}／${view.gods.avoidGod}` },
      { label: '當前大運', value: luck ? `${luck.ageRange}｜${luck.pillar}` : '核心未提供可對應的大運' },
      { label: '流年', value: view.teacher.annual[0] ? `${view.teacher.annual[0].year}｜${view.teacher.annual[0].pillar}` : '核心未提供流年資料' },
      { label: '當下情境', value: `${timing.age === null ? '年齡未能換算' : `${timing.age} 歲`}｜${timing.currentYear}｜${timing.dayNight}` },
    ];
  }, [view]);

  const pressureFactors = view.teacher.strengthFactors.filter((factor) => factor.status === 'pressure');
  const missing = view.teacher.tenGodsMissing.length > 0 ? view.teacher.tenGodsMissing.join('、') : '未見明顯缺位';
  const primaryLuck = currentLuck(view);

  return (
    <section className="space-y-4" aria-label="AI 八字三位老師解盤">
      <div className="rounded-[22px] border border-amber-200/20 bg-black/20 p-3">
        <p className="px-2 pb-2 text-[11px] font-black tracking-[0.16em] text-amber-200/75">同一張正式八字命盤・三位老師切換</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {TEACHERS.map((teacher) => {
            const selected = active === teacher.id;
            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => setActive(teacher.id)}
                aria-pressed={selected}
                className={`rounded-2xl border px-4 py-3 text-left transition ${selected ? 'border-amber-200/55 bg-amber-100/[0.12] text-amber-50' : 'border-white/10 bg-white/[0.03] text-white/65'}`}
              >
                <span className="block text-sm font-black">{teacher.title}</span>
                <span className="mt-1 block text-xs font-semibold opacity-65">{teacher.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="rounded-[20px] border border-cyan-200/20 bg-cyan-950/20 px-4 py-3">
        <p className="text-[11px] font-black tracking-[0.16em] text-cyan-100">當下時間層・不改本命盤</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-white/75">
          {view.timeContext.age === null ? '年齡資料待確認' : `目前 ${view.timeContext.age} 歲`}・{view.timeContext.currentYear} 年・{view.timeContext.dayNight}閱讀
          {view.timeContext.activeDaYun ? `・正在走 ${view.timeContext.activeDaYun.ageRange} 的 ${view.timeContext.activeDaYun.pillar} 大運` : '・大運區間未能對應'}
          {view.timeContext.annualLuck ? `・流年 ${view.timeContext.annualLuck.pillar}` : ''}
        </p>
      </section>

      {active === 'CHART' && <TeacherSummary view={view} />}

      {active === 'HORROR' && (
        <article className="rounded-[24px] border border-rose-300/25 bg-rose-950/20 p-5">
          <p className="text-xs font-black tracking-[0.18em] text-rose-200">恐怖解命盤・風險推演</p>
          <h4 className="mt-2 text-xl font-black text-white">壓力不是命定事件，而是現在最不能忽略的結構訊號。</h4>
          <div className="mt-4 space-y-3 text-base font-semibold leading-7 text-white/75">
            <p>你的命盤以「{view.structurePattern.primaryPattern}」為主軸；當忌神「{view.gods.avoidGod}」被外在壓力放大時，容易先出現節奏失衡與決策反覆，而不是立刻看得見的結果。</p>
            <p>目前需要盯住的缺口是：{missing}。{primaryLuck ? `現在 ${view.timeContext.age === null ? '的' : `${view.timeContext.age} 歲`}正走 ${primaryLuck.ageRange} 大運「${primaryLuck.pillar}」，這段時間應把選擇拆小、把資源留出緩衝。` : '核心未提供可對應大運，系統不虛構時間斷言。'}</p>
            {pressureFactors.length > 0 ? <p>核心已標記的壓力證據：{pressureFactors.map((factor) => `${factor.label}（${factor.detail}）`).join('；')}。</p> : <p>核心目前未標出直接壓力因子；此處不把氛圍敘事誤當作真實風險。</p>}
          </div>
          <CustomerEvidenceDrawer items={evidence} />
        </article>
      )}

      {active === 'GHOST' && (
        <article className="rounded-[24px] border border-violet-300/25 bg-violet-950/20 p-5">
          <p className="text-xs font-black tracking-[0.18em] text-violet-200">鬼魅解命盤・象徵敘事</p>
          <h4 className="mt-2 text-xl font-black text-white">同一張盤，換成一條從內在感受走出的線索。</h4>
          <div className="mt-4 space-y-3 text-base font-semibold leading-7 text-white/75">
            <p>「{view.dayMaster.stem}{view.dayMaster.element}」像命盤裡持續亮著的一點光：{view.teacher.signals.dayMaster}</p>
            <p>五行的焦點落在「{view.teacher.signals.elementFocus}」，它不是外在神祕力量，而是你在關係、工作與選擇裡反覆感到拉扯的象徵。</p>
            <p>{primaryLuck ? `在 ${view.timeContext.dayNight}閱讀的此刻，正走 ${primaryLuck.ageRange} 的「${primaryLuck.pillar}」；較適合先辨認哪些聲音是真正需要回應的，哪些只是短暫的擾動。` : '核心未提供可對應的大運區間，因此只保留盤面象徵，不虛構時間故事。'}</p>
          </div>
          <CustomerEvidenceDrawer items={evidence} />
        </article>
      )}
    </section>
  );
}
