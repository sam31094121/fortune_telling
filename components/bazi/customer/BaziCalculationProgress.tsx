'use client';

import { useEffect, useState } from 'react';

/**
 * 【AI 八字｜Real Calculation Ceremony V1】
 * THIS IS NOT A FAKE LOADING SCREEN. THIS IS A REAL CALCULATION STATUS UI.
 *
 * 鐵律：
 * - 每一個 ✓ 綁定後端 Professional Result 真實欄位；NO RESULT → NO CHECKMARK。
 * - 運算期間只顯示 PROCESSING（呼吸點），禁止 Timer 假完成。
 * - 結果回來後，逐項揭示「真實狀態」（揭示節奏是呈現，不是造假：狀態全部來自後端）。
 * - 核心沒有的項目 → UNAVAILABLE「目前未提供」，不得假裝完成。
 * - 未知時辰 → SKIPPED_BY_DATA_CONDITION，屬正常成功狀態，不是 Error。
 * - Adapter 只做映射，禁止任何八字計算。
 */

export type BaziProgressStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'UNAVAILABLE' | 'SKIPPED_BY_DATA_CONDITION' | 'FAILED';

export interface BaziCalculationProgressItem {
  key: string;
  label: string;
  status: BaziProgressStatus;
  source: 'BACKEND';
  note?: string;
}

export interface BaziCalculationProgressViewModel {
  calculationId: string;
  mode: 'FULL_BAZI' | 'PARTIAL_BAZI';
  overallStatus: 'PROCESSING' | 'COMPLETED' | 'PARTIAL_COMPLETED' | 'FAILED';
  pipelineState: string;
  items: BaziCalculationProgressItem[];
  missingRequiredFields: string[];
  unavailableOptionalFields: string[];
  fieldTraces: BaziFieldTrace[];
}

export type BaziFieldTraceStatus =
  | 'VALID_VALUE'
  | 'AVAILABLE'
  | 'MISSING'
  | 'USER_NOT_PROVIDED'
  | 'CORE_NOT_SUPPORTED'
  | 'CALCULATION_FAILED'
  | 'MAPPING_MISSING'
  | 'OPTIONAL_NOT_AVAILABLE';

export interface BaziFieldTrace {
  field: string;
  calculationId?: string;
  label: string;
  sourcePath: string;
  core: BaziFieldTraceStatus;
  professionalResult: BaziFieldTraceStatus;
  api: BaziFieldTraceStatus;
  adapter: BaziFieldTraceStatus;
  frontend: BaziFieldTraceStatus;
}

const PIPELINE_ORDER = [
  'INPUT_RECEIVED',
  'INPUT_VALIDATED',
  'INPUT_NORMALIZED',
  'CORE_PROCESSING',
  'CORE_COMPLETED',
  'PROFESSIONAL_RESULT_CREATED',
  'PROFESSIONAL_VALIDATED',
  'API_READY',
  'ADAPTER_COMPLETED',
  'AI_INTERPRETATION_COMPLETED',
  'CUSTOMER_VIEW_READY',
  'FINAL_VALIDATED',
  'COMPLETED',
] as const;

/* ==================== Adapter：Backend Result → ViewModel（零計算） ==================== */

const FULL_BAZI_REQUIRED_PROFESSIONAL_FIELDS = [
  { key: 'solarTerm', label: '節氣資訊', path: 'professionalChart.calendar.solarTerm' },
  { key: 'kongWang', label: '空亡', path: 'professionalChart.kongWang' },
  { key: 'twelveStages', label: '十二長生', path: 'professionalChart.twelveStages' },
  { key: 'interactions', label: '合沖刑害破', path: 'professionalChart.interactions' },
  { key: 'shenSha', label: '神煞／特星', path: 'professionalChart.shenSha' },
  { key: 'mingGong', label: '命宮', path: 'professionalChart.mingGong' },
  { key: 'taiYuan', label: '胎元', path: 'professionalChart.taiYuan' },
  { key: 'taiXi', label: '胎息', path: 'professionalChart.taiXi' },
];

const OPTIONAL_PROFESSIONAL_FIELDS = [
  { key: 'bloodType', label: '血型', path: 'input.bloodType', category: 'USER_NOT_PROVIDED' },
  { key: 'tenGodElementMap', label: '五行對應十神分類', path: 'professionalChart.fiveElementTenGodMap', category: 'MAPPING_MISSING' },
];

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

function hasProfessionalValue(value: unknown) {
  if (value == null) return false;
  if (Array.isArray(value)) return true;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return value !== '' && value !== 'NOT_CALCULATED' && value !== 'UNKNOWN';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateBaziProfessionalCompleteness(result: any, hourUnknown: boolean) {
  const requiredFields = hourUnknown
    ? FULL_BAZI_REQUIRED_PROFESSIONAL_FIELDS.filter((field) => field.key !== 'mingGong')
    : FULL_BAZI_REQUIRED_PROFESSIONAL_FIELDS;
  const requiredTraces: BaziFieldTrace[] = requiredFields.map((field) => {
    const available = hasProfessionalValue(readPath(result, field.path));
    return {
      field: field.key,
      label: field.label,
      sourcePath: field.path,
      core: 'AVAILABLE',
      professionalResult: available ? 'VALID_VALUE' : 'MAPPING_MISSING',
      api: available ? 'VALID_VALUE' : 'MISSING',
      adapter: available ? 'VALID_VALUE' : 'MISSING',
      frontend: available ? 'VALID_VALUE' : 'MISSING',
    };
  });
  const missingRequiredFields = requiredTraces
    .filter((trace) => trace.professionalResult !== 'VALID_VALUE')
    .map((trace) => `${trace.label}｜${trace.professionalResult}`);
  const unavailableOptionalFields = OPTIONAL_PROFESSIONAL_FIELDS
    .filter((field) => !hasProfessionalValue(readPath(result, field.path)))
    .map((field) => `${field.label}｜${field.category}`);

  return {
    valid: missingRequiredFields.length === 0,
    missingRequiredFields,
    unavailableOptionalFields,
    fieldTraces: requiredTraces,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toBaziProgressView(result: any, hourUnknown: boolean): BaziCalculationProgressViewModel {
  const pc = result?.professionalChart;
  const pipeline = pc?.pipeline;
  const completedStates: string[] = Array.isArray(pipeline?.completedStates) ? pipeline.completedStates : [];
  const pipelineDone = (state: string) => completedStates.includes(state);
  const has = (v: unknown) => v !== undefined && v !== null && v !== '';
  const arr = (v: unknown) => Array.isArray(v) && v.length > 0;
  const done = (v: boolean): BaziProgressStatus => (v ? 'COMPLETED' : 'FAILED');
  const completeness = validateBaziProfessionalCompleteness(result, hourUnknown);
  const items: BaziCalculationProgressItem[] = [
    { key: 'input', label: '出生資料確認', status: done(pipelineDone('INPUT_VALIDATED') && has(result?.input)), source: 'BACKEND' },
    { key: 'dateVerify', label: '出生日期驗證', status: done(pipelineDone('INPUT_VALIDATED') && has(pc?.calendar)), source: 'BACKEND' },
    {
      key: 'hourConfirm', label: '出生時辰確認',
      status: hourUnknown ? 'SKIPPED_BY_DATA_CONDITION' : done(pipelineDone('INPUT_VALIDATED') && has(pc?.calendar?.shichen?.label)),
      source: 'BACKEND', note: hourUnknown ? '未提供' : undefined,
    },
    {
      key: 'pillars', label: hourUnknown ? '三柱排定' : '四柱排定',
      status: done(pipelineDone('CORE_COMPLETED') && has(result?.pillars?.year) && has(result?.pillars?.month) && has(result?.pillars?.day)),
      source: 'BACKEND',
    },
    { key: 'stems', label: '天干確認', status: done(pipelineDone('CORE_COMPLETED') && ['year', 'month', 'day'].every((k) => has(result?.pillars?.[k]?.stem))), source: 'BACKEND' },
    { key: 'branches', label: '地支確認', status: done(pipelineDone('CORE_COMPLETED') && ['year', 'month', 'day'].every((k) => has(result?.pillars?.[k]?.branch))), source: 'BACKEND' },
    { key: 'hidden', label: '藏干建立', status: done(pipelineDone('CORE_COMPLETED') && ['year', 'month', 'day'].every((k) => arr(pc?.hiddenStemStructure?.[k]))), source: 'BACKEND' },
    { key: 'dayMaster', label: '日主判定', status: done(pipelineDone('CORE_COMPLETED') && has(result?.dayMaster?.stem)), source: 'BACKEND' },
    { key: 'tenGods', label: '十神建立', status: done(pipelineDone('CORE_COMPLETED') && arr(pc?.tenGodDistribution?.ranked)), source: 'BACKEND' },
    { key: 'elements', label: '五行結構分析', status: done(pipelineDone('CORE_COMPLETED') && has(pc?.elementStatistics?.percentages)), source: 'BACKEND' },
    { key: 'strength', label: '日主強弱分析', status: done(pipelineDone('CORE_COMPLETED') && arr(pc?.strengthFactors) && has(result?.dayMaster?.level)), source: 'BACKEND' },
    { key: 'usefulGod', label: '喜用神分析', status: done(pipelineDone('CORE_COMPLETED') && has(result?.gods?.usefulGod) && has(result?.gods?.joyGod)), source: 'BACKEND' },
    { key: 'avoidGod', label: '忌神分析', status: done(pipelineDone('CORE_COMPLETED') && has(result?.gods?.avoidGod)), source: 'BACKEND' },
    { key: 'pattern', label: '格局判定', status: done(pipelineDone('CORE_COMPLETED') && has(pc?.structurePattern?.primaryPattern)), source: 'BACKEND' },
    { key: 'solarTerm', label: '節氣校正', status: done(pipelineDone('CORE_COMPLETED') && hasProfessionalValue(pc?.calendar?.solarTerm)), source: 'BACKEND' },
    { key: 'kongWang', label: '空亡資料', status: done(pipelineDone('CORE_COMPLETED') && hasProfessionalValue(pc?.kongWang)), source: 'BACKEND' },
    { key: 'twelveStages', label: '十二長生', status: done(pipelineDone('CORE_COMPLETED') && hasProfessionalValue(pc?.twelveStages)), source: 'BACKEND' },
    { key: 'interactions', label: '合沖刑害破', status: done(pipelineDone('CORE_COMPLETED') && hasProfessionalValue(pc?.interactions)), source: 'BACKEND' },
    { key: 'taiYuan', label: '胎元', status: done(pipelineDone('CORE_COMPLETED') && hasProfessionalValue(pc?.taiYuan)), source: 'BACKEND' },
    { key: 'taiXi', label: '胎息', status: done(pipelineDone('CORE_COMPLETED') && hasProfessionalValue(pc?.taiXi)), source: 'BACKEND' },
    { key: 'mingGong', label: '命宮', status: hourUnknown ? 'SKIPPED_BY_DATA_CONDITION' : done(pipelineDone('CORE_COMPLETED') && hasProfessionalValue(pc?.mingGong)), source: 'BACKEND', note: hourUnknown ? '需出生時辰' : undefined },
    { key: 'shenSha', label: '神煞／特星', status: done(pipelineDone('CORE_COMPLETED') && hasProfessionalValue(pc?.shenSha)), source: 'BACKEND' },
    { key: 'daYun', label: '大運排定', status: done(pipelineDone('CORE_COMPLETED') && arr(result?.luckCycles)), source: 'BACKEND' },
    { key: 'annual', label: '流年建立', status: done(pipelineDone('CORE_COMPLETED') && arr(result?.annualFortunes)), source: 'BACKEND' },
    { key: 'verify', label: '基礎命盤資料驗證', status: done(pipelineDone('PROFESSIONAL_VALIDATED') && pc?.verification?.readyForInterpretation === true), source: 'BACKEND' },
    {
      key: 'professionalCompleteness',
      label: '台灣完整欄位檢查',
      status: done(pipelineDone('PROFESSIONAL_VALIDATED') && completeness.valid),
      source: 'BACKEND',
      note: completeness.valid ? undefined : `${completeness.missingRequiredFields.length} 項待接入`,
    },
    { key: 'teacher', label: 'AI 老師解析', status: done(pipelineDone('API_READY') && has(result?.aiDeepAnalysis?.summary)), source: 'BACKEND' },
  ];
  const anyFailed = items.some((i) => i.status === 'FAILED');
  return {
    calculationId: String(pipeline?.calculationId ?? result?.aiDeepAnalysis?.sourceChecksum ?? result?.engineVersion ?? 'unknown'),
    mode: hourUnknown ? 'PARTIAL_BAZI' : 'FULL_BAZI',
    overallStatus: anyFailed ? 'FAILED' : hourUnknown ? 'PARTIAL_COMPLETED' : 'COMPLETED',
    pipelineState: String(pipeline?.currentState ?? 'UNKNOWN'),
    items,
    missingRequiredFields: completeness.missingRequiredFields,
    unavailableOptionalFields: completeness.unavailableOptionalFields,
    fieldTraces: completeness.fieldTraces,
  };
}

/* ==================== Final Gate ==================== */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isTransitionListLegal(transitions: Array<{ from: string; to: string }> | undefined): boolean {
  if (!Array.isArray(transitions)) return false;
  return transitions.every((transition) => {
    const fromIndex = PIPELINE_ORDER.indexOf(transition.from as never);
    return fromIndex >= 0 && PIPELINE_ORDER[fromIndex + 1] === transition.to;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function runBaziFinalGate(result: any, hourUnknown: boolean, expectedCalculationId?: string): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!result) issues.push('result missing');
  if (!result?.professionalChart) issues.push('professionalResult missing');
  const pipeline = result?.professionalChart?.pipeline;
  if (!pipeline?.calculationId) issues.push('calculationId missing');
  if (expectedCalculationId && pipeline?.calculationId !== expectedCalculationId) issues.push('calculationId mismatch');
  if (!pipeline?.birthInputFingerprint) issues.push('birthInputFingerprint missing');
  if (!result?.professionalChart?.professionalResultId || pipeline?.professionalResultId !== result.professionalChart.professionalResultId) issues.push('professionalResultId mismatch');
  if (pipeline?.currentState !== 'API_READY') issues.push('pipeline not API_READY');
  if (!isTransitionListLegal(pipeline?.transitions)) issues.push('pipeline transition illegal');
  if (Array.isArray(pipeline?.illegalTransitions) && pipeline.illegalTransitions.length > 0) issues.push('pipeline illegal transition recorded');
  if (pipeline?.failureStage || pipeline?.failureReason) issues.push('pipeline failure recorded');
  const expectedMode = hourUnknown ? 'PARTIAL_BAZI' : 'FULL_BAZI';
  if (pipeline?.mode !== expectedMode || result?.professionalChart?.chartMode !== expectedMode) issues.push('mode mismatch');
  if (hourUnknown && pipeline?.validationStatus !== 'PARTIAL_VALID') issues.push('partial validation status invalid');
  if (!hourUnknown && pipeline?.validationStatus !== 'VALID') issues.push('full validation status invalid');
  const requiredPillars = hourUnknown ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'hour'];
  for (const k of requiredPillars) {
    if (!result?.pillars?.[k]?.stem || !result?.pillars?.[k]?.branch) issues.push(`pillar ${k} invalid`);
  }
  if (result?.professionalChart?.verification?.readyForInterpretation !== true) issues.push('verification not passed');
  const completeness = validateBaziProfessionalCompleteness(result, hourUnknown);
  if (!completeness.valid) {
    issues.push('professional completeness failed');
    completeness.missingRequiredFields.forEach((field) => issues.push(field));
  }
  return { passed: issues.length === 0, issues };
}

/* ==================== UI ==================== */

const STATUS_ICON: Record<BaziProgressStatus, { icon: string; cls: string }> = {
  PENDING: { icon: '·', cls: 'text-white/25' },
  PROCESSING: { icon: '●', cls: 'text-amber-200' },
  COMPLETED: { icon: '✓', cls: 'text-emerald-300' },
  UNAVAILABLE: { icon: '—', cls: 'text-white/30' },
  SKIPPED_BY_DATA_CONDITION: { icon: '－', cls: 'text-white/45' },
  FAILED: { icon: '✕', cls: 'text-rose-300' },
};

function ProgressRows({ items }: { items: BaziCalculationProgressItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const s = STATUS_ICON[item.status];
        return (
          <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.025] px-4 py-2">
            <span className="text-sm font-bold text-white/70">{item.label}</span>
            <span className={`shrink-0 text-sm font-black ${s.cls}`}>{s.icon}{item.note ? ` ${item.note}` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BaziCalculationCeremony({ phase, view, onOpenResult }: {
  phase: 'processing' | 'ceremony';
  view: BaziCalculationProgressViewModel | null;
  onOpenResult: () => void;
}) {
  const items = view?.items ?? [];
  const readyToOpen = phase === 'ceremony' && view;
  // 逐項揭示（狀態全部來自後端真實資料；揭示節奏只是呈現）＋ 儀式完成自動進入命盤
  const [revealed, setRevealed] = useState(0);
  const completedAll = items.filter((item) => item.status === 'COMPLETED');
  const totalReveal = completedAll.length;
  useEffect(() => {
    if (phase !== 'ceremony' || !view) return;
    setRevealed(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= totalReveal) clearInterval(timer);
    }, 120);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, view]);
  const allRevealed = phase === 'ceremony' && revealed >= totalReveal && totalReveal > 0;
  useEffect(() => {
    if (!allRevealed) return;
    // 真實儀式做完 → 1.4 秒後自動按下「查看命盤」，客戶不用再按
    const t = setTimeout(() => onOpenResult(), 1400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRevealed]);
  const completedItems = completedAll.slice(0, revealed);
  const unavailableItems = items.filter((item) => item.status === 'UNAVAILABLE');
  const skippedItems = items.filter((item) => item.status === 'SKIPPED_BY_DATA_CONDITION');
  const failedItems = items.filter((item) => item.status === 'FAILED');

  return (
    <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(165deg,rgba(14,14,18,0.97),rgba(22,20,16,0.94))] p-5 sm:p-6">
      <h3 className="text-xl font-black text-[color:var(--text-main)]">正在建立您的 AI 八字命盤</h3>
      <p className="mt-1.5 text-sm font-semibold text-white/50">完成勾選只來自後端真實資料；核心未提供的項目會分開標示，不補值。</p>

      <div className="mt-5 space-y-4">
        {phase === 'processing' ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
            <span className="text-amber-200">●</span>
            <span className="text-base font-bold text-white/75">TraditionalBaziCore 排盤運算中…（結果由後端真實回傳後才逐項確認）</span>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-emerald-100">認證通過中…</p>
                <p className="text-xs font-black text-emerald-200">{completedItems.length} / {totalReveal}</p>
              </div>
              <div className="space-y-1.5">
                {completedItems.map((item, idx) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.025] px-4 py-2" style={{ animation: 'fadeIn 200ms ease' }}>
                    <span className="text-sm font-bold text-white/70"><span className="mr-2 text-[11px] font-black text-emerald-300/70">{String(idx + 1).padStart(2, '0')}</span>{item.label}</span>
                    <span className="shrink-0 text-sm font-black text-emerald-300">✓ 通過</span>
                  </div>
                ))}
              </div>
            </div>

            {skippedItems.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-black text-white/55">依資料條件略過</p>
                <ProgressRows items={skippedItems} />
              </div>
            )}

            {unavailableItems.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white/45">核心目前未提供</p>
                  <p className="text-xs font-bold text-white/30">不補值、不推算</p>
                </div>
                <ProgressRows items={unavailableItems} />
              </div>
            )}

            {failedItems.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-black text-rose-100">未通過項目</p>
                <ProgressRows items={failedItems} />
                {view?.missingRequiredFields && view.missingRequiredFields.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-rose-300/15 bg-rose-500/[0.04] px-4 py-3">
                    <p className="text-sm font-black text-rose-100">需要逐項接入的台灣完整欄位</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {view.missingRequiredFields.map((field) => (
                        <span key={field} className="rounded-full border border-rose-200/20 bg-black/18 px-3 py-1 text-xs font-bold text-rose-100/80">{field}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {view?.unavailableOptionalFields && view.unavailableOptionalFields.length > 0 && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
                <p className="text-sm font-black text-white/45">非必要或使用者未提供</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {view.unavailableOptionalFields.map((field) => (
                    <span key={field} className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-xs font-bold text-white/45">{field}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {readyToOpen && view && (
        <div className="mt-5 rounded-2xl border border-emerald-200/25 bg-emerald-300/[0.06] p-5 text-center">
          {view.overallStatus === 'FAILED' ? (
            <>
              <p className="text-lg font-black text-rose-100">專業命盤資料尚未完整</p>
              <p className="mt-1 text-sm font-semibold text-white/60">基礎排盤可讀，但台灣完整格式仍有欄位尚未接入。</p>
            </>
          ) : view.overallStatus === 'PARTIAL_COMPLETED' ? (
            <>
              <p className="text-lg font-black text-emerald-100">三柱命盤建立完成</p>
              <p className="mt-1 text-sm font-semibold text-white/60">目前未提供出生時辰；補充時辰後可建立完整四柱命盤。</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-emerald-100">AI 八字命盤建立完成</p>
              <p className="mt-1 text-sm font-semibold text-white/60">目前核心可提供的專業排盤資料已完成運算與驗證。</p>
            </>
          )}
          <button
            type="button"
            onClick={onOpenResult}
            className="mt-4 w-full rounded-full border border-emerald-200/40 bg-emerald-300/15 py-3.5 text-base font-black text-emerald-50 transition hover:bg-emerald-300/25 active:scale-[0.99] sm:w-auto sm:px-10"
          >
            {view.overallStatus === 'FAILED' ? '查看目前資料' : view.overallStatus === 'PARTIAL_COMPLETED' ? '查看目前命盤' : '查看我的命盤'}
          </button>
        </div>
      )}
    </section>
  );
}

/** Final Gate 失敗畫面：不顯示半套假命盤 */
export function BaziGateFailed({ issues, onRetry, onCheckInput }: { issues: string[]; onRetry: () => void; onCheckInput: () => void }) {
  const fieldIssues = issues.filter((issue) => issue.includes('｜'));
  const systemIssues = issues.filter((issue) => !issue.includes('｜'));
  return (
    <section className="rounded-[24px] border border-rose-300/25 bg-rose-500/[0.06] p-5 text-center sm:p-6">
      <p className="text-lg font-black text-rose-100">命盤尚未完成</p>
      <p className="mt-1 text-sm font-semibold text-white/55">台灣完整八字欄位仍有資料未接入，系統不會宣稱完整完成。</p>
      {fieldIssues.length > 0 && (
        <div className="mt-4 rounded-2xl border border-rose-200/15 bg-black/18 px-4 py-3 text-left">
          <p className="text-sm font-black text-rose-100">需要逐項突破</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {fieldIssues.map((issue) => (
              <span key={issue} className="rounded-full border border-rose-200/20 bg-rose-300/[0.06] px-3 py-1 text-xs font-bold text-rose-100/85">{issue}</span>
            ))}
          </div>
        </div>
      )}
      {systemIssues.length > 0 && (
        <p className="mt-3 text-xs font-semibold leading-5 text-white/40">{systemIssues.join('；')}</p>
      )}
      <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
        <button type="button" onClick={onRetry} className="rounded-full border border-rose-200/40 bg-rose-300/12 px-8 py-3 text-sm font-black text-rose-50 transition hover:bg-rose-300/20">重新分析</button>
        <button type="button" onClick={onCheckInput} className="rounded-full border border-white/15 bg-white/[0.05] px-8 py-3 text-sm font-black text-white/70 transition hover:text-white">檢查出生資料</button>
      </div>
    </section>
  );
}
