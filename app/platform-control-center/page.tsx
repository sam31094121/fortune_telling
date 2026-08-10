import Link from 'next/link';
import { buildPlatformControlCenter } from '@/lib/platform-control-center';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_LABEL = {
  ready: '穩定',
  review: '需檢查',
  disabled: '已停用',
  testing: '測試中',
} as const;

const MODE_LABEL = {
  on: '開啟',
  off: '關閉',
  test: '測試',
  gray: '灰度',
} as const;

function statusClass(status: keyof typeof STATUS_LABEL) {
  if (status === 'ready') return 'border-emerald-200/30 bg-emerald-300/10 text-emerald-100';
  if (status === 'review') return 'border-amber-200/30 bg-amber-300/10 text-amber-100';
  if (status === 'testing') return 'border-cyan-200/30 bg-cyan-300/10 text-cyan-100';
  return 'border-white/15 bg-white/5 text-[color:var(--text-sub)]';
}

export default function PlatformControlCenterPage() {
  const { data } = buildPlatformControlCenter();

  return (
    <div className="app-bg min-h-screen overflow-x-hidden">
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10">
        <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-amber-300/20 bg-black/20 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.18)] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">Platform Control Center</p>
            <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-[color:var(--text-main)] sm:text-5xl">天地人和 AI 全面統一管理中心</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.purpose}</p>
            <p className="mt-3 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-black text-emerald-100">{data.principle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <span className={`rounded-full border px-3 py-2 text-xs font-black ${statusClass(data.status)}`}>{STATUS_LABEL[data.status]}</span>
            <Link href="/growth-center" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white">成長中心</Link>
            <Link href="/" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white">回首頁</Link>
          </div>
        </header>

        <section className="mb-4 rounded-2xl border border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),rgba(15,23,42,0.78)_58%,rgba(2,6,23,0.96)_100%)] p-5 shadow-[0_18px_55px_rgba(16,185,129,0.12)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Master Platform Final Optimize</p>
              <h2 className="mt-2 text-2xl font-black leading-9 text-emerald-50 sm:text-3xl">{data.masterFinalOptimize.positioning.is}</h2>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.masterFinalOptimize.positioning.highestValue}</p>
            </div>
            <span className="shrink-0 rounded-full border border-emerald-200/25 bg-emerald-300/12 px-4 py-2 text-xs font-black text-emerald-100">{data.masterFinalOptimize.version}</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {data.masterFinalOptimize.systems.map((system) => (
              <div key={system.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                <p className="text-[10px] font-black tracking-[0.18em] text-[color:var(--text-muted)]">LAYER {system.layer}</p>
                <p className="mt-1 text-sm font-black text-[color:var(--text-main)]">{system.title}</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">{system.rule}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {data.masterFinalOptimize.newFeatureGate.map((check) => (
              <p key={check} className="rounded-full border border-emerald-200/20 bg-emerald-300/8 px-3 py-2 text-center text-xs font-black text-emerald-100">{check}</p>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.sections.map((section) => (
            <article key={section.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">{section.id}</p>
                  <h2 className="mt-2 text-lg font-black text-[color:var(--text-main)]">{section.title}</h2>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(section.status)}`}>{STATUS_LABEL[section.status]}</span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--text-sub)]">{section.purpose}</p>
              <p className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs font-bold leading-6 text-[color:var(--text-muted)]">{section.lockedRule}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Module Registry</p>
                <h2 className="mt-2 text-2xl font-black text-cyan-50">六張卡片統一登記</h2>
              </div>
              <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{data.moduleRegistry.length} modules</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {data.moduleRegistry.map((module) => (
                <div key={module.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-[color:var(--text-main)]">{module.order}. {module.title}</p>
                    <span className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-2 py-1 text-[10px] font-black text-emerald-100">{MODE_LABEL[module.featureMode]}</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] font-bold text-cyan-100">{module.id} · {module.apiHint}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--text-muted)]">{module.registrationRule}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Rule Center</p>
            <h2 className="mt-2 text-2xl font-black text-amber-50">平台規則中心</h2>
            <div className="mt-4 grid gap-2">
              {data.ruleCenter.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                  <p className="text-sm font-black text-[color:var(--text-main)]">{rule.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{rule.rule}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-violet-300/20 bg-violet-300/8 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">AI Center</p>
            <h2 className="mt-2 text-2xl font-black text-violet-50">唯一 AI Core</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.aiCenter.modelStrategy}</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{data.aiCenter.promptStrategy}</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">禁止重新呼叫</p>
              <p className="mt-2 text-xs font-mono font-bold leading-6 text-violet-100">{data.aiCenter.forbiddenAnalysisCalls.join(' · ')}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">AI 文案統一優化中心</p>
            <h2 className="mt-2 text-2xl font-black text-cyan-50">天地人和專屬語言</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.copywritingCenter.positioning.role}</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">禁止模糊詞</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.copywritingCenter.forbiddenWords.map((word) => (
                  <span key={word} className="rounded-full border border-rose-200/20 bg-rose-300/10 px-2.5 py-1 text-[10px] font-black text-rose-100">{word}</span>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {data.actionGuidance.requiredSteps.map((step) => (
                <p key={step.id} className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-bold leading-5 text-cyan-50">{step.title}：{step.outputRule}</p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/8 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Growth Center</p>
            <h2 className="mt-2 text-2xl font-black text-emerald-50">每週陪伴設定</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.growthCenter.rule}</p>
            <div className="mt-4 grid gap-2">
              {data.growthCenter.weeklyItems.map((item) => (
                <p key={item} className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-black text-emerald-50">{item}</p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-300/20 bg-sky-300/8 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200">AI Follow-Up System</p>
            <h2 className="mt-2 text-2xl font-black text-sky-50">補強追蹤中心</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.followUpSystem.highestPrinciple}</p>
            <p className="mt-3 rounded-xl border border-sky-200/15 bg-black/15 px-3 py-2 text-xs font-bold leading-6 text-sky-50">{data.followUpSystem.boundary}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {data.followUpSystem.quickReplies.map((reply) => (
                <p key={reply.id} className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-center text-xs font-black text-sky-50">{reply.label}</p>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.followUpSystem.forbiddenTopics.slice(0, 4).map((topic) => (
                <span key={topic} className="rounded-full border border-rose-200/20 bg-rose-300/10 px-2.5 py-1 text-[10px] font-black text-rose-100">禁：{topic}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-300/20 bg-rose-300/8 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-200">Feature Switch</p>
            <h2 className="mt-2 text-2xl font-black text-rose-50">功能開關中心</h2>
            <div className="mt-4 grid gap-2">
              {data.featureSwitches.map((feature) => (
                <div key={feature.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-[color:var(--text-main)]">{feature.title}</p>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${feature.mode === 'on' ? 'border-emerald-200/25 bg-emerald-300/10 text-emerald-100' : feature.mode === 'gray' ? 'border-cyan-200/25 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/5 text-[color:var(--text-muted)]'}`}>{MODE_LABEL[feature.mode]}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--text-muted)]">{feature.rule}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">System Monitor</p>
              <h2 className="mt-2 text-2xl font-black text-[color:var(--text-main)]">系統監控總覽</h2>
            </div>
            <p className="text-xs font-bold text-[color:var(--text-muted)]">更新時間：{data.updatedAt}</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.systemMonitor.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-[color:var(--text-main)]">{item.title}</p>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${statusClass(item.status)}`}>{STATUS_LABEL[item.status]}</span>
                </div>
                <p className="mt-1 font-mono text-[11px] font-bold text-cyan-100">{item.target}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--text-muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-emerald-300/20 bg-black/20 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Governance</p>
          <h2 className="mt-2 text-2xl font-black text-emerald-50">新增功能標準流程</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {data.governance.addFeatureProcess.map((step, index) => (
              <div key={step} className="rounded-xl border border-white/10 bg-black/15 p-3 text-center">
                <p className="text-[10px] font-black text-[color:var(--text-muted)]">STEP {index + 1}</p>
                <p className="mt-1 text-sm font-black text-[color:var(--text-main)]">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {data.governance.forbidden.map((rule) => (
              <p key={rule} className="rounded-xl border border-rose-300/15 bg-rose-300/8 px-3 py-2 text-xs font-bold leading-6 text-rose-100">{rule}</p>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
