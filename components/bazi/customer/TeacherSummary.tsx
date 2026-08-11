'use client';

import type { BaziCustomerView } from './adapter';
import { CustomerAccordion, CustomerEvidenceDrawer } from './CustomerAccordion';
import { TenGodSection } from './TenGodSection';
import { DaYunTimeline } from './DaYunTimeline';
import { AnnualLuckSection } from './AnnualLuckSection';

/**
 * LEVEL 2｜老師專業解盤
 * 固定順序：日主月令 → 四柱骨架 → 十神 → 五行強弱 → 大運 → 流年 → 老師總判
 * 預設先展開第一步，結論放在依據之後；每個判定附「看依據」。
 */
export function TeacherSummary({ view }: { view: BaziCustomerView }) {
  const t = view.teacher;
  const sec = (idx: number) => t.sections[idx];
  const sequence = ['日主與月令', '四柱骨架', '十神結構', '五行強弱', '大運', '流年', '老師總判'];

  return (
    <div className="space-y-3">
      <section className="rounded-[20px] border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-black tracking-[0.18em] text-amber-200/80">解盤順序</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sequence.map((item, index) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
              <p className="text-[11px] font-black text-white/35">{String(index + 1).padStart(2, '0')}</p>
              <p className="mt-0.5 text-sm font-black leading-5 text-white/75">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ① 日主與月令 */}
      <CustomerAccordion title="① 日主與月令" defaultOpen>
        <p className="text-base font-semibold leading-7 text-white/70">{t.signals.dayMaster}</p>
        {sec(2) && <p className="mt-2 text-base font-semibold leading-7 text-white/60">{sec(2).content}</p>}
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
          <CustomerEvidenceDrawer items={[
            { label: '四柱', value: view.pillars.map((p) => `${p.label}${p.stem}${p.branch}`).join('、') },
            { label: '資料驗證', value: t.verified ? '第一層命盤已通過驗證' : '第一層命盤未通過驗證' },
          ]} />
        </CustomerAccordion>
      )}

      {/* ③ 十神結構 */}
      <CustomerAccordion title="③ 十神結構">
        <TenGodSection ranked={t.tenGodsRanked} dominant={t.tenGodsDominant} missing={t.tenGodsMissing} />
        {sec(1) && <p className="mt-3 text-base font-semibold leading-7 text-white/70">{sec(1).content}</p>}
        <CustomerEvidenceDrawer items={[
          { label: '格局訊號', value: t.signals.structure },
          { label: '主訊號', value: t.tenGodsDominant.join('、') || '分布平均' },
        ]} />
      </CustomerAccordion>

      {/* ④ 五行強弱 */}
      <CustomerAccordion title="④ 五行強弱">
        {sec(3) && <p className="mb-3 text-base font-semibold leading-7 text-white/70">{sec(3).content}</p>}
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
        {sec(4) && <p className="mb-3 text-base font-semibold leading-7 text-white/70">{sec(4).content}</p>}
        <DaYunTimeline daYun={t.daYun} />
      </CustomerAccordion>

      {/* ⑥ 流年 */}
      <CustomerAccordion title="⑥ 流年">
        <AnnualLuckSection annual={t.annual} />
      </CustomerAccordion>

      {/* ⑦ 老師總判：先看依據，再看結論 */}
      <section className="rounded-[22px] border border-amber-200/25 bg-amber-100/[0.05] p-5">
        <p className="text-xs font-black tracking-[0.18em] text-amber-200/85">⑦ 老師總判</p>
        <h3 className="mt-2 text-xl font-black leading-8 text-[color:var(--text-main)]">{t.chartSummary}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-black/18 px-4 py-3">
            <p className="text-sm font-black text-amber-100">核心格局</p>
            <p className="mt-1 text-base font-semibold leading-7 text-white/75">{view.structurePattern.primaryPattern}</p>
          </div>
          <div className="rounded-2xl bg-black/18 px-4 py-3">
            <p className="text-sm font-black text-amber-100">主要力量</p>
            <p className="mt-1 text-base font-semibold leading-7 text-white/75">{t.tenGodsDominant.join('、') || '十神分布平均'}｜用神 {view.gods.usefulGod}、喜神 {view.gods.joyGod}</p>
          </div>
          <div className="rounded-2xl bg-black/18 px-4 py-3">
            <p className="text-sm font-black text-amber-100">結構阻力</p>
            <p className="mt-1 text-base font-semibold leading-7 text-white/75">忌神 {view.gods.avoidGod}{t.tenGodsMissing.length > 0 ? `｜缺位：${t.tenGodsMissing.join('、')}` : ''}</p>
          </div>
          <div className="rounded-2xl bg-black/18 px-4 py-3">
            <p className="text-sm font-black text-amber-100">目前主題</p>
            <p className="mt-1 text-base font-semibold leading-7 text-white/75">{t.summary}</p>
          </div>
        </div>
        <CustomerEvidenceDrawer items={[
          { label: '日主', value: `${view.dayMaster.stem}${view.dayMaster.element}（${view.dayMaster.level}）` },
          { label: '格局訊號', value: t.signals.structure },
          { label: '五行排序', value: t.signals.elementFocus },
        ]} />
      </section>

      {/* 後續補強方向（Interpretation 後續資料，不參與重新排盤） */}
      {view.reinforcement.principle && (
        <CustomerAccordion title="後續補強方向">
          <p className="text-base font-black leading-7 text-white/85">{view.reinforcement.principle}</p>
          {view.reinforcement.basisSummary && <p className="mt-2 text-sm font-semibold leading-6 text-white/55">{view.reinforcement.basisSummary}</p>}
          <div className="mt-3 space-y-2">
            {view.reinforcement.priorityOrder.map((item) => (
              <div key={item.rank} className="rounded-2xl bg-white/[0.03] px-4 py-2.5">
                <p className="text-sm font-black text-white/85">{item.rank}. {item.displayName ?? item.title ?? ''}</p>
                {item.reason && <p className="mt-1 text-sm font-semibold leading-6 text-white/55">{item.reason}</p>}
              </div>
            ))}
          </div>
        </CustomerAccordion>
      )}

      {/* 其餘老師解讀段落 */}
      {t.sections.slice(5).map((s) => (
        <CustomerAccordion key={s.title} title={s.title}>
          {s.basis && <p className="mb-2 text-xs font-black text-white/40">{s.basis}</p>}
          <p className="text-base font-semibold leading-7 text-white/70">{s.content}</p>
        </CustomerAccordion>
      ))}
    </div>
  );
}
