'use client';

import type { BaziCustomerView } from './adapter';
import { CustomerAccordion, CustomerEvidenceDrawer } from './CustomerAccordion';
import { TenGodSection } from './TenGodSection';
import { DaYunTimeline } from './DaYunTimeline';
import { AnnualLuckSection } from './AnnualLuckSection';

/**
 * LEVEL 2｜老師專業解盤
 * 固定順序：日主月令 → 四柱骨架 → 十神 → 五行強弱 → 大運 → 流年 → 老師總判
 * 預設只展開「老師總判」，其餘 Accordion；每個判定附「看依據」。
 */
export function TeacherSummary({ view }: { view: BaziCustomerView }) {
  const t = view.teacher;
  const sec = (idx: number) => t.sections[idx];

  return (
    <div className="space-y-3">
      {/* 老師總判（預設展開，首屏最多五塊、每塊 2-3 行） */}
      <section className="rounded-[22px] border border-amber-200/25 bg-amber-100/[0.05] p-5">
        <p className="text-xs font-black tracking-[0.18em] text-amber-200/85">老師總判</p>
        <h3 className="mt-2 text-xl font-black leading-8 text-[color:var(--text-main)]">{t.chartSummary}</h3>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-black text-amber-100">【核心格局】</p>
            <p className="mt-1 text-base font-semibold leading-7 text-white/75">{view.structurePattern.primaryPattern}</p>
            <CustomerEvidenceDrawer items={[
              { label: '日主', value: `${view.dayMaster.stem}${view.dayMaster.element}（${view.dayMaster.level}）` },
              { label: '格局訊號', value: t.signals.structure },
            ]} />
          </div>
          <div>
            <p className="text-sm font-black text-amber-100">【主要力量】</p>
            <p className="mt-1 text-base font-semibold leading-7 text-white/75">{t.tenGodsDominant.join('、') || '十神分布平均'}｜用神 {view.gods.usefulGod}、喜神 {view.gods.joyGod}</p>
            <CustomerEvidenceDrawer items={[{ label: '日主訊號', value: t.signals.dayMaster }]} />
          </div>
          <div>
            <p className="text-sm font-black text-amber-100">【結構阻力】</p>
            <p className="mt-1 text-base font-semibold leading-7 text-white/75">忌神 {view.gods.avoidGod}{t.tenGodsMissing.length > 0 ? `｜缺位：${t.tenGodsMissing.join('、')}` : ''}</p>
          </div>
          <div>
            <p className="text-sm font-black text-amber-100">【目前運勢主題】</p>
            <p className="mt-1 text-base font-semibold leading-7 text-white/75">{t.summary}</p>
          </div>
          <div>
            <p className="text-sm font-black text-amber-100">【第一調整方向】</p>
            <p className="mt-1 text-base font-semibold leading-7 text-white/75">{t.signals.elementFocus}</p>
          </div>
        </div>
      </section>

      {/* ① 日主與月令 */}
      <CustomerAccordion title="① 日主與月令">
        <p className="text-base font-semibold leading-7 text-white/70">{t.signals.dayMaster}</p>
        <div className="mt-3 space-y-2">
          {t.strengthFactors.slice(0, 3).map((f) => (
            <div key={f.id} className="rounded-2xl bg-white/[0.03] px-4 py-2.5">
              <div className="flex items-center justify-between text-sm font-black">
                <span className="text-white/85">{f.label}</span>
                <span className={f.status === 'support' ? 'text-emerald-200' : f.status === 'pressure' ? 'text-rose-200' : 'text-white/50'}>
                  {f.status === 'support' ? '扶助' : f.status === 'pressure' ? '壓力' : '中性'}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/55">{f.detail}</p>
            </div>
          ))}
        </div>
      </CustomerAccordion>

      {/* ② 四柱骨架（老師視角文案，來自後端解讀段落） */}
      {sec(0) && (
        <CustomerAccordion title={`② ${sec(0).title}`}>
          {sec(0).basis && <p className="mb-2 text-xs font-black text-white/40">{sec(0).basis}</p>}
          <p className="text-base font-semibold leading-7 text-white/70">{sec(0).content}</p>
        </CustomerAccordion>
      )}

      {/* ③ 十神結構 */}
      <CustomerAccordion title="③ 十神結構">
        <TenGodSection ranked={t.tenGodsRanked} dominant={t.tenGodsDominant} missing={t.tenGodsMissing} />
        {sec(1) && <p className="mt-3 text-base font-semibold leading-7 text-white/70">{sec(1).content}</p>}
      </CustomerAccordion>

      {/* ④ 五行強弱 */}
      <CustomerAccordion title="④ 五行強弱">
        <div className="space-y-2">
          {t.strengthFactors.map((f) => (
            <div key={f.id} className="rounded-2xl bg-white/[0.03] px-4 py-2.5">
              <p className="text-sm font-black text-white/85">{f.label} <span className="ml-2 text-white/45">{f.score}</span></p>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/55">{f.detail}</p>
            </div>
          ))}
        </div>
      </CustomerAccordion>

      {/* ⑤ 大運 */}
      <CustomerAccordion title="⑤ 大運">
        <DaYunTimeline daYun={t.daYun} />
      </CustomerAccordion>

      {/* ⑥ 流年 */}
      <CustomerAccordion title="⑥ 流年">
        <AnnualLuckSection annual={t.annual} />
      </CustomerAccordion>

      {/* 其餘老師解讀段落 */}
      {t.sections.slice(2).map((s) => (
        <CustomerAccordion key={s.title} title={s.title}>
          {s.basis && <p className="mb-2 text-xs font-black text-white/40">{s.basis}</p>}
          <p className="text-base font-semibold leading-7 text-white/70">{s.content}</p>
        </CustomerAccordion>
      ))}
    </div>
  );
}
