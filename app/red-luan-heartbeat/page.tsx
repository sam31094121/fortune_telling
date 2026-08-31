'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { RED_LUAN_ARCHIVE_COPY, RED_LUAN_PUBLIC_ARCHIVED } from '@/lib/red-luan-public-access';

type Evidence = { label: string; targetBranch: string; evidence: string };
type TimelineEvidence = { label: string; ruleId: string; ruleVersion: string; evidenceBranches: string[]; evidence: string; source: string; precision: string };
type AnnualRhythm = { year: number; annualBranch: string; status: 'RULE_HIT' | 'NO_RULE_HIT'; precision: string; evidence: TimelineEvidence[]; limitation: string };
type BaziSignal = { annualYear: number; annualBranch: string; inputCompleteness: string; natalEvidence: Evidence[]; annualTriggers: Evidence[]; limitations: string[]; sources: Array<{ title: string; reference: string }> };
type ZiweiSignal = { status: 'READY' | 'UNAVAILABLE_BIRTH_TIME_REQUIRED'; inputCompleteness: string; palaces?: Array<{ palace: string; earthlyBranch: string; majorStars: string[]; minorStars: string[] }>; limitations: string[] };
type RelationshipStatus = 'SINGLE_NEVER_MARRIED' | 'DATING' | 'MARRIED' | 'SEPARATED' | 'DIVORCED' | 'WIDOWED';
type FamilyResponsibility = 'NO_CHILDREN_OR_PRIMARY_CARE' | 'LIVE_WITH_OR_CARE_FOR_PARENTS' | 'HAS_CHILDREN' | 'CARE_FOR_OTHER_FAMILY';
type CurrentExpectation = 'MEET_SOMEONE' | 'STABLE_RELATIONSHIP' | 'MARRIAGE_PLANNING' | 'REPAIR_RELATIONSHIP';
type SelfReportedContext = {
  relationshipStatus: RelationshipStatus | '';
  familyResponsibility: FamilyResponsibility | '';
  currentExpectation: CurrentExpectation | '';
};
type Reading = {
  person: { name: string; birthDate: string; hourKnown: boolean };
  relationshipPosition: {
    relationshipStatus: RelationshipStatus;
    familyResponsibility: FamilyResponsibility;
    currentExpectation: CurrentExpectation;
    usage: 'REFLECTION_GUIDANCE_ONLY';
  };
  contextAlignment: {
    mode: 'REFLECTION_GUIDANCE_ONLY';
    alignmentStatus: 'EVIDENCE_AVAILABLE' | 'NO_VERIFIED_YEARLY_RULE_HIT';
    calculationOrder: {
      stageOne: { label: 'BAZI_ZIWEI_EVIDENCE'; baziStatus: 'PASSED' | 'BLOCKED'; ziweiStatus: 'READY' | 'UNAVAILABLE_BIRTH_TIME_REQUIRED'; evidenceFrozenBeforeContext: true };
      stageTwo: { label: 'RELATIONSHIP_CONTEXT_ALIGNMENT'; status: 'COMPUTED'; inputFields: ['relationshipStatus', 'familyResponsibility', 'currentExpectation'] };
    };
    relationshipPosition: { relationshipStatus: RelationshipStatus; familyResponsibility: FamilyResponsibility; currentExpectation: CurrentExpectation };
    annualEvidence: { precision: 'ANNUAL_BRANCH'; years: number[]; evidenceCount: number };
    themeTitle: string;
    guidancePrompt: string;
    actionDirections: Array<{ id: 'relationship_rhythm' | 'life_arrangement' | 'expectation_direction'; title: string; symbolism: string; reflectionQuestion: string; action: string }>;
    limitations: string[];
  };
  result: {
    normalizedBirth: { inputCalendarType: 'SOLAR' | 'LUNAR'; normalizedSolarDate: string; normalizedLunarDate: string; timezone: string; timePrecision: string; exactTime?: string; traditionalHour?: string; traditionalHourRange?: string };
    validation: { primaryEngine: string; primaryEngineVersion: string; primaryRuleSet: string; primaryStatus: 'PASSED' | 'BLOCKED'; qualityGateStatus: 'PASSED' | 'BLOCKED' | 'REVIEW_REQUIRED' | 'NOT_TESTED'; independentReference: string; goldenCases: string; totalCompared: number; matchedCount: number; differences: Array<{ path: string; severity: string; message: string }>; verifiedScope: string[]; unverifiedScope: string[] };
    bazi: BaziSignal;
    annualRhythm: AnnualRhythm[];
    monthlyRhythm: { status: 'UNAVAILABLE_RULE_SOURCE_REQUIRED'; precision: 'YEAR_ONLY'; limitation: string };
    ziwei: ZiweiSignal;
    crossCheck: { status: 'READY' | 'PARTIAL'; summary: string; limitation: string };
    iching: { limitation: string };
    culturalReading: {
      status: 'READY' | 'UNAVAILABLE_AI_NOT_CONFIGURED' | 'TEMPORARILY_UNAVAILABLE' | 'BLOCKED_BY_VALIDATION';
      provider: 'google' | 'none';
      gate: { status: 'PASSED' | 'BLOCKED'; evidenceCount: number; acceptedPrecision: string; withheldFields: string[]; reasons: string[] };
      summary?: string;
      yearlyGuidance?: Array<{ year: number; theme: string; reflection: string; action: string }>;
      limitations: string[];
    };
  };
};

const EMPTY_FORM: BirthProfile = {
  name: '', birthDate: '', birthTime: '', birthHourBranch: undefined, gender: '', calendarType: 'solar', timeUnknown: undefined,
};

const EMPTY_CONTEXT: SelfReportedContext = {
  relationshipStatus: '', familyResponsibility: '', currentExpectation: '',
};

const RELATIONSHIP_STATUS_OPTIONS: Array<{ value: RelationshipStatus; label: string }> = [
  { value: 'SINGLE_NEVER_MARRIED', label: '未婚單身' },
  { value: 'DATING', label: '交往中' },
  { value: 'MARRIED', label: '已婚' },
  { value: 'SEPARATED', label: '分居' },
  { value: 'DIVORCED', label: '離異' },
  { value: 'WIDOWED', label: '喪偶' },
];

const FAMILY_RESPONSIBILITY_OPTIONS: Array<{ value: FamilyResponsibility; label: string }> = [
  { value: 'NO_CHILDREN_OR_PRIMARY_CARE', label: '無子女／無主要照顧責任' },
  { value: 'LIVE_WITH_OR_CARE_FOR_PARENTS', label: '與父母同住或照顧父母' },
  { value: 'HAS_CHILDREN', label: '育有子女' },
  { value: 'CARE_FOR_OTHER_FAMILY', label: '照顧其他家人' },
];

const CURRENT_EXPECTATION_OPTIONS: Array<{ value: CurrentExpectation; label: string }> = [
  { value: 'MEET_SOMEONE', label: '認識對象' },
  { value: 'STABLE_RELATIONSHIP', label: '穩定交往' },
  { value: 'MARRIAGE_PLANNING', label: '婚姻規劃' },
  { value: 'REPAIR_RELATIONSHIP', label: '修復關係' },
];

const HOUR_BRANCH_KEYS = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'] as const;

function toTraditionalHourBranch(value?: string) {
  const index = HOUR_BRANCH_KEYS.indexOf(value as (typeof HOUR_BRANCH_KEYS)[number]);
  return index >= 0 ? SHICHEN_LIST[index]?.branch : undefined;
}

function statusLabel(status: string) {
  if (status === 'PASSED') return '已通過';
  if (status === 'BLOCKED') return '已鎖定';
  if (status === 'REVIEW_REQUIRED') return '需要覆核';
  if (status === 'NOT_TESTED') return '尚未完成交叉驗證';
  return '狀態待確認';
}

function timePrecisionLabel(precision: string) {
  if (precision === 'EXACT_TIME') return '精確時間';
  if (precision === 'TRADITIONAL_HOUR') return '傳統時辰';
  return '未知時辰';
}

function ziweiStatusLabel(status: ZiweiSignal['status']) {
  return status === 'READY' ? '本命資料可用' : '時辰不足，未計算';
}

function ruleIdentifierLabel(ruleId: string) {
  const labels: Record<string, string> = {
    RED_LUAN_BY_YEAR_BRANCH_V1: '紅鸞年支對照規則・第 1 版',
    TIAN_XI_OPPOSITE_RED_LUAN_V1: '天喜對宮規則・第 1 版',
    TW_SHENSHA_BASIC_V1_TAOHUA: '咸池桃花規則・第 1 版',
    TW_SHENSHA_BASIC_V1_TIANYI: '天乙貴人規則・第 1 版',
    DAY_BRANCH_SIX_COMBINE_V1: '日支六合規則・第 1 版',
    DAY_BRANCH_SIX_CLASH_V1: '日支六沖規則・第 1 版',
  };
  return labels[ruleId] ?? '已登錄規則版本';
}

function ruleVersionLabel(version: string) {
  if (version === 'STAR_STUDY_HONGLUAN_TIANXI_V1') return '紅鸞天喜規則集・第 1 版';
  if (version === 'TW_SHENSHA_BASIC_V1') return '基礎神煞規則集・第 1 版';
  if (version === 'TW_TRADITIONAL_BAZI_V1') return '傳統八字規則集・第 1 版';
  return '已登錄規則集';
}

const ONION_LAYERS = [
  { title: '命理底盤', subtitle: '八字＋可用紫微' },
  { title: '此刻位置', subtitle: '三格關係自述' },
  { title: '情境交叉', subtitle: '後端確定性引導' },
  { title: '問心', subtitle: '選擇自己的探索方向' },
  { title: '易經引導', subtitle: '門控後的文化說明' },
] as const;

const REFLECTION_CHOICES = [
  { id: 'observe', label: '先觀察年度節奏', note: '把訊號當成提醒，先留意生活中的人際變化。' },
  { id: 'connect', label: '主動增加連結機會', note: '安排一個低壓力的聚會、課程或共同興趣活動。' },
  { id: 'communicate', label: '練習清楚表達與界線', note: '先寫下自己重視的相處方式，再選擇合適時機溝通。' },
  { id: 'read-only', label: '這次只閱讀資料', note: '不必立刻採取行動；保留不同意或稍後再看的空間。' },
] as const;

function EvidenceList({ title, items, empty }: { title: string; items: Evidence[]; empty: string }) {
  return (
    <section className="rounded-2xl border border-rose-200/20 bg-rose-300/[0.06] p-4">
      <h3 className="text-sm font-black text-rose-100">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-white/80">
          {items.map((item, index) => <li key={`${item.label}-${item.evidence}-${index}`}><span className="font-black text-rose-200">{item.label}・{item.targetBranch}</span>　{item.evidence}</li>)}
        </ul>
      ) : <p className="mt-3 text-sm leading-6 text-white/65">{empty}</p>}
    </section>
  );
}

function ContextChoiceGroup<T extends string>({
  title,
  value,
  options,
  missing,
  disabled,
  onChange,
}: {
  title: string;
  value: T | '';
  options: Array<{ value: T; label: string }>;
  missing: boolean;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className={`rounded-2xl border p-4 ${missing ? 'border-rose-300/50 bg-rose-500/10' : 'border-white/10 bg-black/15'}`}>
      <legend className="px-1 text-sm font-black text-amber-50">{title}</legend>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-12 rounded-xl border px-3 py-3 text-left text-xs font-bold leading-5 transition disabled:opacity-60 ${value === option.value ? 'border-amber-200/70 bg-amber-300/15 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.12)]' : 'border-white/10 bg-white/[0.04] text-white/70'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {missing && !value && <p className="mt-3 text-xs font-bold text-rose-100">請選擇一項，再繼續探索。</p>}
    </fieldset>
  );
}

function CalculationEvidence({ result }: { result: Reading['result'] }) {
  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-2xl border border-white/12 bg-slate-950/70 p-4"><EvidenceList title="本命・紅鸞／天喜／咸池桃花" items={result.bazi.natalEvidence} empty="本命四柱中未見這些規則現位；這不代表關係好或不好。" /><div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm font-black text-white/80">來源</p>{result.bazi.sources.map((source) => <p key={source.title} className="mt-2 text-xs leading-5 text-white/60">{source.title}：{source.reference}</p>)}</div></section>
      <section className="rounded-2xl border border-rose-200/20 bg-rose-400/[0.06] p-4"><h3 className="text-lg font-black text-white">未來 {result.annualRhythm.length} 年</h3><p className="mt-2 text-sm leading-7 text-white/65">紅鸞、天喜、咸池桃花、天乙貴人與日支六合／六沖分開列證；沒有權重分數。</p><div className="mt-4 space-y-3">{result.annualRhythm.map((year) => <article key={year.year} className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-black text-white">{year.year} 年・{year.annualBranch}年</h4><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${year.status === 'RULE_HIT' ? 'border-rose-200/30 bg-rose-300/10 text-rose-100' : 'border-white/10 text-white/45'}`}>{year.status === 'RULE_HIT' ? '有規則命中' : '無本組規則命中'}</span></div>{year.evidence.length > 0 ? <ul className="mt-3 space-y-3">{year.evidence.map((item) => <li key={`${year.year}-${item.ruleId}-${item.evidence}`} data-rule-id={item.ruleId} data-rule-version={item.ruleVersion} className="text-sm leading-6 text-white/75"><span className="font-black text-rose-100">{item.label}</span>　{item.evidence}<span className="mt-1 block text-[11px] text-white/45">{ruleIdentifierLabel(item.ruleId)}｜{ruleVersionLabel(item.ruleVersion)}｜證據 {item.evidenceBranches.join('・')}｜{item.source}</span></li>)}</ul> : <p className="mt-3 text-sm text-white/55">本年度未命中目前已驗證的規則；這不等於沒有關係機會。</p>}<p className="mt-3 text-[11px] leading-5 text-white/40">精度：年度地支。{year.limitation}</p></article>)}</div></section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-black tracking-[0.18em] text-white/55">月份節奏</p><h3 className="mt-2 text-lg font-black text-white">目前未計算</h3><p className="mt-2 text-sm leading-7 text-white/70">{result.monthlyRhythm.limitation}</p></section>
      <section className="rounded-2xl border border-violet-200/20 bg-violet-400/[0.07] p-4"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black tracking-[0.18em] text-violet-200">紫微本命夫妻宮</p><span className="rounded-full border border-violet-200/20 px-2 py-1 text-[10px] font-black text-violet-100">{ziweiStatusLabel(result.ziwei.status)}</span></div>{result.ziwei.status === 'READY' ? <div className="mt-4 space-y-3">{result.ziwei.palaces?.map((palace) => <article key={`${palace.palace}-${palace.earthlyBranch}`} className="rounded-2xl border border-white/10 bg-black/15 p-4"><h4 className="font-black text-white">{palace.palace}・{palace.earthlyBranch}</h4><p className="mt-2 text-sm leading-6 text-white/75">主星：{palace.majorStars.join('、') || '—'}</p><p className="mt-1 text-sm leading-6 text-white/60">輔星：{palace.minorStars.join('、') || '—'}</p></article>)}</div> : <p className="mt-3 rounded-2xl border border-violet-200/15 bg-violet-300/[0.08] p-4 text-sm leading-7 text-violet-50">尚未填出生時辰，因此不顯示紫微夫妻宮資料，也不以預設時辰代替。</p>}<p className="mt-3 text-xs leading-6 text-white/50">{result.crossCheck.summary} {result.crossCheck.limitation}</p></section>
    </div>
  );
}

function RedLuanHeartbeatExperience() {
  const [form, setForm] = useState<BirthProfile>(EMPTY_FORM);
  const [context, setContext] = useState<SelfReportedContext>(EMPTY_CONTEXT);
  const [missing, setMissing] = useState<string[]>([]);
  const [contextMissing, setContextMissing] = useState<Array<keyof SelfReportedContext>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const [openedLayer, setOpenedLayer] = useState(0);
  const [alignmentChoice, setAlignmentChoice] = useState('');
  const [reflectionChoice, setReflectionChoice] = useState('');

  function birthMissingFields(profile: BirthProfile) {
    const timeUnknown = profile.timeUnknown === true || profile.birthHourBranch === 'unknown';
    return [
      (profile.name ?? '').trim().length < 2 ? 'name' : '',
      !profile.birthDate ? 'birthDate' : '',
      !profile.gender ? 'gender' : '',
      !timeUnknown && !profile.birthHourBranch ? 'birthHourBranch' : '',
    ].filter(Boolean);
  }

  async function submit(profile: BirthProfile) {
    if (loading) return;
    const nextMissing = birthMissingFields(profile);
    setMissing(nextMissing);
    if (nextMissing.length > 0) {
      setError('請先完成出生資料，再選擇此刻的關係位置。');
      document.querySelector(`[data-field="${nextMissing[0]}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const nextContextMissing = (Object.keys(context) as Array<keyof SelfReportedContext>).filter((key) => !context[key]);
    setContextMissing(nextContextMissing);
    if (nextContextMissing.length > 0) {
      setError('請完成此刻的關係位置；三項只用來選擇引導方向，不會改變命盤運算。');
      document.querySelector(`[data-context-field="${nextContextMissing[0]}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const timeUnknown = profile.timeUnknown === true || profile.birthHourBranch === 'unknown';
    const traditionalHour = timeUnknown ? undefined : toTraditionalHourBranch(profile.birthHourBranch);
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/red-luan-heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: (profile.name ?? '').trim(),
          birthDate: profile.birthDate,
          calendarType: 'SOLAR',
          timezone: 'Asia/Taipei',
          timePrecision: timeUnknown ? 'UNKNOWN_TIME' : 'TRADITIONAL_HOUR',
          birthHourBranch: traditionalHour,
          gender: profile.gender,
          relationshipStatus: context.relationshipStatus,
          familyResponsibility: context.familyResponsibility,
          currentExpectation: context.currentExpectation,
        }),
      });
      const payload = await response.json() as Reading & { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || payload.message || '目前無法完成核對，請稍後再試。');
      setReading(payload);
      setOpenedLayer(0);
      setAlignmentChoice('');
      setReflectionChoice('');
      requestAnimationFrame(() => document.getElementById('red-luan-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '目前無法完成核對，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  function openLayer(layer: number) {
    setOpenedLayer((current) => Math.max(current, layer));
    requestAnimationFrame(() => document.getElementById(`red-luan-layer-${layer}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function updateContext<Key extends keyof SelfReportedContext>(key: Key, value: SelfReportedContext[Key]) {
    setContext((current) => ({ ...current, [key]: value }));
    setContextMissing((current) => current.filter((item) => item !== key));
    setError('');
  }

  const contextComplete = Boolean(context.relationshipStatus && context.familyResponsibility && context.currentExpectation);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 pb-16 sm:px-6">
      <header className="rounded-3xl border border-rose-200/25 bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.18),transparent_44%),linear-gradient(135deg,rgba(31,17,34,0.98),rgba(9,17,35,0.98))] p-6 shadow-[0_18px_60px_rgba(244,63,94,0.13)]">
        <p className="text-xs font-black tracking-[0.22em] text-rose-200">個人關係主題參考</p>
        <h1 className="mt-2 font-serif text-3xl font-black text-rose-50">桃花・紅鸞心動</h1>
        <p className="mt-3 text-sm leading-7 text-white/75">填寫自己的出生資料，核對傳統文化中的年度關係主題訊號。這不是配對，也不預測事件。</p>
      </header>

      <section className="red-luan-unified-flow mt-5 rounded-3xl border border-white/12 bg-slate-950/70 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.35)]">
        <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-black tracking-[0.16em] text-amber-200">單人資料・沿用八字正式輸入</p><h2 className="mt-1 text-xl font-black text-white">你的出生資料</h2></div><span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70">只填一位</span></div>
        <UnifiedBirthForm
          value={form}
          fields={{ name: true, gender: true, birthDate: true, birthHourBranch: true, calendarType: true }}
          missing={missing}
          disabled={loading}
          isSubmitting={loading}
          submitLabel="開始核對關係主題"
          loadingLabel="確定性規則核對中…"
          dateAccent="amber"
          onChange={(profile) => setForm((current) => ({ ...current, ...profile }))}
          onSubmit={(profile) => { void submit(profile); }}
        />

        <section id="red-luan-relationship-context" className="mt-5 scroll-mt-5 border-t border-amber-200/20 pt-5">
          <h2 className="text-xl font-black text-white">5. 此刻的關係位置</h2>
          <p className="mt-2 text-sm font-bold text-white/65">選擇最貼近此刻的位置。</p>

          <div className="mt-4 space-y-3">
            <div data-context-field="relationshipStatus">
              <ContextChoiceGroup
                title="關係現況"
                value={context.relationshipStatus}
                options={RELATIONSHIP_STATUS_OPTIONS}
                missing={contextMissing.includes('relationshipStatus')}
                disabled={loading}
                onChange={(value) => updateContext('relationshipStatus', value)}
              />
            </div>
            <div data-context-field="familyResponsibility">
              <ContextChoiceGroup
                title="目前主要家庭責任"
                value={context.familyResponsibility}
                options={FAMILY_RESPONSIBILITY_OPTIONS}
                missing={contextMissing.includes('familyResponsibility')}
                disabled={loading}
                onChange={(value) => updateContext('familyResponsibility', value)}
              />
            </div>
            <div data-context-field="currentExpectation">
              <ContextChoiceGroup
                title="期待方向"
                value={context.currentExpectation}
                options={CURRENT_EXPECTATION_OPTIONS}
                missing={contextMissing.includes('currentExpectation')}
                disabled={loading}
                onChange={(value) => updateContext('currentExpectation', value)}
              />
            </div>
          </div>

        </section>
        <button
          type="button"
          disabled={loading}
          onClick={() => { void submit(form); }}
          className={`mt-5 inline-flex w-full items-center justify-center rounded-full border px-6 py-4 text-sm font-black transition disabled:opacity-60 ${contextComplete ? 'border-amber-100/65 bg-amber-300/20 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.16)]' : 'border-white/10 bg-white/[0.04] text-white/55'}`}
        >
          {loading ? '確定性規則核對中…' : contextComplete ? '開始核對關係主題' : '完成三項選擇後開始'}
        </button>
        {error && <p className="mt-5 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-100">{error}</p>}
      </section>
      <style jsx>{`
        .red-luan-unified-flow :global(.mega-friendly-form > p),
        .red-luan-unified-flow :global(.mega-friendly-form > button[type='submit']),
        .red-luan-unified-flow :global(.mega-friendly-form > section:last-child) {
          display: none;
        }
      `}</style>

      {reading && <section id="red-luan-result" className="mt-6 scroll-mt-5 space-y-4" aria-live="polite">
        <header className="rounded-3xl border border-cyan-200/25 bg-cyan-300/[0.08] p-5">
          <p className="text-xs font-black tracking-[0.18em] text-cyan-200">五層探索・由你決定步調</p>
          <h2 className="mt-2 text-2xl font-black text-white">{reading.person.name}的關係主題參考</h2>
          <p className="mt-2 text-sm leading-7 text-white/70">後端規則證據不會被 AI 改寫。你可以逐層閱讀、停下或略過行動選擇；本服務不是心理診斷或確定預測。</p>
          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="桃花紅鸞五層探索進度">
            {ONION_LAYERS.map((layer, index) => <li key={layer.title}><button type="button" disabled={index > openedLayer} onClick={() => document.getElementById(`red-luan-layer-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} aria-current={index === openedLayer ? 'step' : undefined} className={`h-full w-full rounded-2xl border px-3 py-3 text-left transition ${index <= openedLayer ? 'border-cyan-200/25 bg-cyan-300/[0.08] text-white' : 'border-white/10 bg-white/[0.03] text-white/35'}`}><span className="text-[10px] font-black tracking-[0.12em]">第 {index + 1} 層{index > openedLayer ? '・鎖定' : ''}</span><strong className="mt-1 block text-sm">{layer.title}</strong><span className="mt-1 block text-[10px] leading-4 opacity-70">{layer.subtitle}</span></button></li>)}
          </ol>
        </header>

        <section id="red-luan-layer-0" className="scroll-mt-5 rounded-3xl border border-cyan-200/20 bg-slate-950/75 p-5">
          <p className="text-xs font-black tracking-[0.18em] text-cyan-200">第一層・命理底盤</p>
          <h3 className="mt-2 text-xl font-black text-white">先完成八字＋可用紫微的確定性運算</h3>
          <p className="mt-2 text-sm leading-7 text-white/65">順序固定為出生資料標準化、八字規則、可用的紫微本命資料，再凍結可驗證證據；關係位置只會在下一階段加入，不會反向改寫本層。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-white/50">曆法與日期</p><p className="mt-2 text-sm font-bold text-white">原始：{reading.result.normalizedBirth.inputCalendarType === 'SOLAR' ? '國曆' : '農曆'}｜國曆 {reading.result.normalizedBirth.normalizedSolarDate}</p><p className="mt-1 text-xs leading-5 text-white/60">農曆：{reading.result.normalizedBirth.normalizedLunarDate}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-white/50">時間精度</p><p className="mt-2 text-sm font-bold text-white">{timePrecisionLabel(reading.result.normalizedBirth.timePrecision)}</p><p className="mt-1 text-xs leading-5 text-white/60">{reading.result.normalizedBirth.exactTime ? `精確時間 ${reading.result.normalizedBirth.exactTime}` : reading.result.normalizedBirth.traditionalHour ? `${reading.result.normalizedBirth.traditionalHour}時（${reading.result.normalizedBirth.traditionalHourRange}）` : '未知時辰；時柱未計算'}｜台北標準時間（東八區）</p></div>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-300/[0.06] p-4">
            <p className="text-xs font-black tracking-[0.16em] text-amber-200">品質門控</p>
            <h4 className="mt-2 text-lg font-black text-white">主引擎：{statusLabel(reading.result.validation.primaryStatus)}・整體：{statusLabel(reading.result.validation.qualityGateStatus)}</h4>
            <p className="mt-2 text-sm leading-7 text-white/75" data-engine={reading.result.validation.primaryEngine} data-rule-set={reading.result.validation.primaryRuleSet}>八字確定性核心・版本 {reading.result.validation.primaryEngineVersion}｜台灣傳統八字規則集。獨立第二來源與人工黃金案例尚未建立，因此不會偽稱三方來源已一致通過。</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-xs font-black text-emerald-100">已驗證範圍</p><ul className="mt-2 space-y-1 text-xs leading-5 text-white/70">{reading.result.validation.verifiedScope.map((item) => <li key={item}>• {item}</li>)}</ul></div><div><p className="text-xs font-black text-white/70">尚未驗證／不計算</p><ul className="mt-2 space-y-1 text-xs leading-5 text-white/60">{reading.result.validation.unverifiedScope.map((item) => <li key={item}>• {item}</li>)}</ul></div></div>
          </div>
          <CalculationEvidence result={reading.result} />
          <button type="button" onClick={() => openLayer(1)} className="mt-5 w-full rounded-2xl border border-rose-200/25 bg-rose-300/10 px-4 py-3 text-sm font-black text-rose-50">打開第二層・此刻位置 →</button>
        </section>

        {openedLayer >= 1 && <section id="red-luan-layer-1" className="scroll-mt-5 rounded-3xl border border-rose-200/20 bg-rose-400/[0.07] p-5">
          <p className="text-xs font-black tracking-[0.18em] text-rose-200">第二層・此刻位置</p><h3 className="mt-2 text-xl font-black text-white">你為這次關係主題選擇的位置</h3><p className="mt-2 text-sm leading-7 text-white/65">這三格是你主動提供的當下狀況，不是命盤推論。你可以核對、不同意或重新填寫；系統不會從中推斷未填資訊。</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs text-white/45">關係現況</p><p className="mt-2 text-sm font-black text-white">{RELATIONSHIP_STATUS_OPTIONS.find((item) => item.value === reading.relationshipPosition.relationshipStatus)?.label}</p></div><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs text-white/45">主要家庭責任</p><p className="mt-2 text-sm font-black text-white">{FAMILY_RESPONSIBILITY_OPTIONS.find((item) => item.value === reading.relationshipPosition.familyResponsibility)?.label}</p></div><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs text-white/45">期待方向</p><p className="mt-2 text-sm font-black text-white">{CURRENT_EXPECTATION_OPTIONS.find((item) => item.value === reading.relationshipPosition.currentExpectation)?.label}</p></div></div>
          <p className="mt-4 text-xs leading-6 text-white/50">本層只確認「此刻位置」，尚未改變或重算第一層證據。</p>
          <button type="button" onClick={() => openLayer(2)} className="mt-5 w-full rounded-2xl border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-50">打開第三層・情境交叉 →</button>
        </section>}

        {openedLayer >= 2 && <section id="red-luan-layer-2" className="scroll-mt-5 rounded-3xl border border-amber-200/20 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_48%),rgba(15,23,42,0.82)] p-5">
          <p className="text-xs font-black tracking-[0.18em] text-amber-200">第三層・情境交叉</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><h3 className="text-xl font-black text-white">此刻的關係位置・已完成情境運算</h3><span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-100">僅供反思引導</span></div>
          <p className="mt-2 text-sm leading-7 text-white/70">這是客戶自述與已驗證年度規則證據的交叉呈現，用來增加引導貼合度。關係情境運算依你的自述調整引導，不改變八字排盤、紅鸞規則、年份證據或品質門控，也不代表命盤計算精準度提高。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.06] p-4"><p className="text-xs font-black text-cyan-100">第一階段・先完成並凍結</p><p className="mt-2 text-sm font-bold text-white">八字：{statusLabel(reading.contextAlignment.calculationOrder.stageOne.baziStatus)}｜紫微：{ziweiStatusLabel(reading.contextAlignment.calculationOrder.stageOne.ziweiStatus)}</p><p className="mt-2 text-xs leading-5 text-white/55">出生資料標準化 → 八字確定性規則 → 時辰足夠時使用既有紫微引擎；證據先凍結。</p></div>
            <div className="rounded-2xl border border-amber-200/20 bg-amber-300/[0.06] p-4"><p className="text-xs font-black text-amber-100">第二階段・再做情境交叉</p><p className="mt-2 text-sm font-bold text-white">關係位置三格：已完成運算</p><p className="mt-2 text-xs leading-5 text-white/55">只調整心理學自我反思與易經式文化引導，不能回頭改寫第一階段。</p></div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-[10px] font-black tracking-[0.12em] text-white/45">關係現況</p><p className="mt-2 text-sm font-black text-white">{RELATIONSHIP_STATUS_OPTIONS.find((item) => item.value === reading.relationshipPosition.relationshipStatus)?.label}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-[10px] font-black tracking-[0.12em] text-white/45">支持系統</p><p className="mt-2 text-sm font-black text-white">{FAMILY_RESPONSIBILITY_OPTIONS.find((item) => item.value === reading.relationshipPosition.familyResponsibility)?.label}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-[10px] font-black tracking-[0.12em] text-white/45">期待方向</p><p className="mt-2 text-sm font-black text-white">{CURRENT_EXPECTATION_OPTIONS.find((item) => item.value === reading.relationshipPosition.currentExpectation)?.label}</p></div>
          </div>
          <section className="mt-4 rounded-2xl border border-rose-200/15 bg-rose-300/[0.06] p-4"><p className="text-xs font-black tracking-[0.14em] text-rose-100">與年度規則證據並列</p><p className="mt-2 text-sm leading-7 text-white/70">{reading.contextAlignment.annualEvidence.years.length > 0 ? `目前已驗證規則共有 ${reading.contextAlignment.annualEvidence.evidenceCount} 筆證據，出現在 ${reading.contextAlignment.annualEvidence.years.join('、')} 年；只作為可留意的年度節奏。` : '目前年度範圍內沒有本組已驗證規則命中；這不代表沒有關係機會。'}</p></section>
          <h4 className="mt-5 text-lg font-black text-amber-50">{reading.contextAlignment.themeTitle}</h4>
          <p className="mt-1 text-xs leading-5 text-white/55">以下三個方向由後端依你明確選擇的三項資料逐一組合。可任選一項，也可以不選；這不是人格分析或心理測驗。</p>
          <div className="mt-4 grid gap-3">{reading.contextAlignment.actionDirections.map((direction) => <button key={direction.id} type="button" onClick={() => setAlignmentChoice(direction.id)} aria-pressed={alignmentChoice === direction.id} className={`rounded-2xl border p-4 text-left transition ${alignmentChoice === direction.id ? 'border-amber-100/40 bg-amber-200/15' : 'border-white/10 bg-black/10'}`}><strong className="text-sm text-amber-50">{direction.title}</strong><span className="mt-2 block text-sm leading-6 text-white/75">易經式比喻：{direction.symbolism}</span><span className="mt-2 block text-sm leading-6 text-white/70">自我反思：{direction.reflectionQuestion}</span><span className="mt-2 block text-xs leading-5 text-emerald-100">可選小步：{direction.action}</span></button>)}</div>
          {alignmentChoice && <p className="mt-4 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.06] p-4 text-sm leading-7 text-emerald-50">你選擇先從「{reading.contextAlignment.actionDirections.find((item) => item.id === alignmentChoice)?.title}」開始。這只是可修改、可停止的自我反思方向。</p>}
          <p className="mt-4 text-[11px] leading-5 text-white/45">不推斷焦慮、依附型態、創傷、性格或未填資訊；不作心理診斷或婚姻預測；自述資料不送入 AI。</p>
          <button type="button" onClick={() => openLayer(3)} className="mt-5 w-full rounded-2xl border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-50">打開第四層・問心 →</button>
        </section>}

        {openedLayer >= 3 && <section id="red-luan-layer-3" className="scroll-mt-5 rounded-3xl border border-amber-200/20 bg-amber-300/[0.06] p-5">
          <p className="text-xs font-black tracking-[0.18em] text-amber-200">第四層・問心</p><h3 className="mt-2 text-xl font-black text-white">{reading.contextAlignment.guidancePrompt}</h3><p className="mt-2 text-sm leading-7 text-white/70">這不是系統對你內心的判斷。請自行選一個此刻願意嘗試的方向，也可以只閱讀、不採取行動。</p>
          <div className="mt-4 grid gap-3">{REFLECTION_CHOICES.map((choice) => <button key={choice.id} type="button" onClick={() => setReflectionChoice(choice.id)} aria-pressed={reflectionChoice === choice.id} className={`rounded-2xl border p-4 text-left transition ${reflectionChoice === choice.id ? 'border-amber-100/40 bg-amber-200/15' : 'border-white/10 bg-black/10'}`}><strong className="text-sm text-white">{choice.label}</strong><span className="mt-1 block text-xs leading-5 text-white/60">{choice.note}</span></button>)}</div>
          {reflectionChoice && <p className="mt-4 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.06] p-4 text-sm leading-7 text-emerald-50">你選擇了「{REFLECTION_CHOICES.find((choice) => choice.id === reflectionChoice)?.label}」。這只是你自己的探索方向，隨時可以更改或停止。</p>}
          <button type="button" onClick={() => openLayer(4)} className="mt-5 w-full rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-50">打開第五層・易經引導 →</button>
        </section>}

        {openedLayer >= 4 && <section id="red-luan-layer-4" className="scroll-mt-5 space-y-4">
          <section className="rounded-3xl border border-cyan-200/20 bg-cyan-300/[0.06] p-5"><p className="text-xs font-black tracking-[0.18em] text-cyan-200">第五層・易經引導</p><div className="mt-2 flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-white">{reading.result.culturalReading.status === 'READY' ? 'AI 文化表達層' : '文化引導目前鎖定'}</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${reading.result.culturalReading.gate.status === 'PASSED' ? 'border-emerald-200/20 text-emerald-100' : 'border-rose-200/20 text-rose-100'}`}>門控：{statusLabel(reading.result.culturalReading.gate.status)}</span></div><p className="mt-2 text-xs leading-5 text-white/50">AI 只負責把已通過證據寫成易經文化反思，不是超自然權威，也不參與排盤或預言。</p>
            {reading.result.culturalReading.status === 'READY' ? <><p className="mt-3 text-sm leading-7 text-white/75">{reading.result.culturalReading.summary}</p><div className="mt-4 space-y-3">{reading.result.culturalReading.yearlyGuidance?.map((item) => <article key={`${item.year}-${item.theme}`} className="rounded-2xl border border-white/10 bg-black/15 p-4"><h4 className="font-black text-cyan-50">{item.year}・{item.theme}</h4><p className="mt-2 text-sm leading-6 text-white/70">{item.reflection}</p><p className="mt-2 text-sm leading-6 text-cyan-100">行動參考：{item.action}</p></article>)}</div></> : <p className="mt-3 rounded-2xl border border-rose-200/15 bg-rose-300/[0.06] p-4 text-sm leading-7 text-white/70">{reading.result.culturalReading.status === 'UNAVAILABLE_AI_NOT_CONFIGURED' ? '後端證據已完成，但文化表達服務未設定，因此不以假文字代替。' : reading.result.culturalReading.status === 'BLOCKED_BY_VALIDATION' ? `資料尚未通過完整品質門控，AI 不會收到未驗證結果。${reading.result.culturalReading.gate.reasons.join('；')}。` : '文化表達服務暫時無法使用；後端規則證據仍維持原樣。'}</p>}
            <p className="mt-3 text-[11px] leading-5 text-white/45">門控檢查到 {reading.result.culturalReading.gate.evidenceCount} 筆具規則編號的主引擎年度證據；品質門控通過前不會傳給 AI。固定排除：{reading.result.culturalReading.gate.withheldFields.join('、')}。</p>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-black tracking-[0.18em] text-white/55">易經補卦狀態</p><p className="mt-2 text-sm leading-7 text-white/70">{reading.result.iching.limitation}</p></section>
        </section>}
      </section>}

      <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-100 underline underline-offset-4">⌂ 返回首頁</Link>
    </main>
  );
}

function RedLuanArchivedPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-3xl place-items-center px-4 py-8 sm:px-6">
      <section role="status" aria-live="polite" className="relative w-full overflow-hidden rounded-3xl border border-rose-200/30 bg-[radial-gradient(circle_at_50%_38%,rgba(251,113,133,0.18),transparent_30%),radial-gradient(circle_at_82%_22%,rgba(251,191,36,0.10),transparent_28%),linear-gradient(135deg,rgba(51,8,30,0.98),rgba(26,12,42,0.97)_58%,rgba(15,23,42,0.99))] p-7 text-center shadow-[0_24px_72px_rgba(244,63,94,0.15)] sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-white/[0.015]" />
        <div className="pointer-events-none absolute inset-x-12 top-[42%] h-px bg-gradient-to-r from-transparent via-rose-100/25 to-transparent shadow-[0_0_20px_rgba(251,113,133,0.22)]" />
        <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border border-rose-100/35 bg-rose-200/[0.08] font-serif text-4xl font-black text-rose-100/90 shadow-[0_0_38px_rgba(251,113,133,0.20)]" aria-hidden="true"><span className="absolute inset-2 rounded-full border border-amber-100/15" /><span className="absolute -inset-2.5 rounded-full border border-rose-100/10" /><span>鸞</span><span className="absolute -bottom-1 rounded-full border border-amber-100/25 bg-[#351020] px-2.5 py-0.5 text-[9px] font-black tracking-[0.18em] text-amber-50/80">封</span></div>
        <div className="relative mt-5">
          <h1 className="font-serif text-3xl font-black text-rose-50">{RED_LUAN_ARCHIVE_COPY.title}</h1>
          <p className="mt-3 text-sm font-black tracking-[0.16em] text-amber-50/80">{RED_LUAN_ARCHIVE_COPY.message}</p>
          <Link href="/" className="mt-7 inline-flex min-h-11 items-center justify-center text-sm font-black text-rose-100/80 underline decoration-rose-100/30 underline-offset-4 transition hover:text-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-100">返回首頁</Link>
        </div>
      </section>
    </main>
  );
}

export default function RedLuanHeartbeatPage() {
  return RED_LUAN_PUBLIC_ARCHIVED ? <RedLuanArchivedPage /> : <RedLuanHeartbeatExperience />;
}
