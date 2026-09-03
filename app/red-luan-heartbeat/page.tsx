'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import FriendlyChoiceCard from '@/components/FriendlyChoiceCard';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage, IDENTITY_TARGET_UPDATED_EVENT } from '@/lib/identity-split-client';
import { RED_LUAN_ARCHIVE_COPY, RED_LUAN_PUBLIC_ARCHIVED } from '@/lib/red-luan-public-access';

type Evidence = { label: string; targetBranch: string; evidence: string };
type TimelineEvidence = { label: string; ruleId: string; ruleVersion: string; evidenceBranches: string[]; evidence: string; source: string; precision: string };
type AnnualRhythm = { year: number; annualBranch: string; status: 'RULE_HIT' | 'NO_RULE_HIT'; precision: string; evidence: TimelineEvidence[]; limitation: string };
type MonthlyRhythm = {
  year: number; monthIndex: number; monthBranch: string; jieqi: string; lunarLabel: string; gregorianHint: string;
  status: 'RULE_HIT' | 'NO_RULE_HIT'; precision: 'SOLAR_TERM_MONTH_BRANCH'; hitCount: number;
  evidence: TimelineEvidence[]; limitation: string;
};
type AffinityProfile = {
  status: 'READY';
  branches: Array<{ label: string; branch: string; zodiac: string; direction: string; trait: string; ruleId: string; basis: string }>;
  spouseStars: Array<{ palace: string; star: string; trait: string }>;
  selfReportedType: string;
  selfReportedLabel: string;
  limitations: string[];
};
type IChingReading = {
  hexagram: { name: string; kingWen: number; glyph: string; upperName: string; lowerName: string; upperSymbol: string; lowerSymbol: string; changingLine: number; essence: string; judgment: string; advice: string };
  patternName: string;
  ritualOpening: string;
  spark: { title: string; heaven: string; human: string; earth: string; fire: string };
  onion: Array<{ layer: string; text: string }>;
  closing: string;
  seedText: string;
};
type BaziSignal = { annualYear: number; annualBranch: string; inputCompleteness: string; natalEvidence: Evidence[]; annualTriggers: Evidence[]; limitations: string[]; sources: Array<{ title: string; reference: string }> };
type ZiweiSignal = { status: 'READY' | 'UNAVAILABLE_BIRTH_TIME_REQUIRED'; inputCompleteness: string; palaces?: Array<{ palace: string; earthlyBranch: string; majorStars: string[]; minorStars: string[] }>; limitations: string[] };
type RelationshipStatus = 'SINGLE_NEVER_MARRIED' | 'DATING' | 'MARRIED' | 'SEPARATED' | 'DIVORCED' | 'WIDOWED';
type FamilyResponsibility = 'NO_CHILDREN_OR_PRIMARY_CARE' | 'LIVE_WITH_OR_CARE_FOR_PARENTS' | 'HAS_CHILDREN' | 'CARE_FOR_OTHER_FAMILY';
type CurrentExpectation = 'MEET_SOMEONE' | 'STABLE_RELATIONSHIP' | 'MARRIAGE_PLANNING' | 'REPAIR_RELATIONSHIP';
/** Server-side marker for a question the customer chose not to answer. */
type Unspecified = 'UNSPECIFIED';
type AttractedType = 'WARM_STEADY' | 'BRIGHT_OUTGOING' | 'CLEAR_RATIONAL' | 'MATURE_CARING' | 'FREE_INSPIRED';
/** `''` is the local "not chosen yet" state; the API turns it into UNSPECIFIED. */
type SelfReportedContext = {
  currentExpectation: CurrentExpectation | '';
  attractedType: AttractedType | '';
  relationshipStatus: RelationshipStatus | '';
  familyResponsibility: FamilyResponsibility | '';
};
type ContextField = keyof SelfReportedContext;
type Reading = {
  person: { name: string; birthDate: string; hourKnown: boolean };
  relationshipPosition: {
    relationshipStatus: RelationshipStatus | Unspecified;
    familyResponsibility: FamilyResponsibility | Unspecified;
    currentExpectation: CurrentExpectation | Unspecified;
    attractedType: AttractedType | Unspecified;
    usage: 'REFLECTION_GUIDANCE_ONLY';
  };
  affinity: AffinityProfile;
  ichingReading: IChingReading;
  contextAlignment: {
    mode: 'REFLECTION_GUIDANCE_ONLY';
    alignmentStatus: 'EVIDENCE_AVAILABLE' | 'NO_VERIFIED_YEARLY_RULE_HIT';
    calculationOrder: {
      stageOne: { label: 'BAZI_ZIWEI_EVIDENCE'; baziStatus: 'PASSED' | 'BLOCKED'; ziweiStatus: 'READY' | 'UNAVAILABLE_BIRTH_TIME_REQUIRED'; evidenceFrozenBeforeContext: true };
      stageTwo: { label: 'RELATIONSHIP_CONTEXT_ALIGNMENT'; status: 'COMPUTED'; inputFields: ['relationshipStatus', 'familyResponsibility', 'currentExpectation']; providedFields: ContextField[]; unspecifiedFields: ContextField[] };
    };
    contextCompleteness: 'NONE' | 'PARTIAL' | 'COMPLETE';
    relationshipPosition: { relationshipStatus: RelationshipStatus | Unspecified; familyResponsibility: FamilyResponsibility | Unspecified; currentExpectation: CurrentExpectation | Unspecified };
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
    monthlyRhythm: {
      status: 'READY';
      precision: 'SOLAR_TERM_MONTH_BRANCH';
      year: number;
      months: MonthlyRhythm[];
      peakMonths: MonthlyRhythm[];
      limitation: string;
    };
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
  currentExpectation: '', attractedType: '', relationshipStatus: '', familyResponsibility: '',
};

const ATTRACTED_TYPE_OPTIONS: Array<{ value: AttractedType; label: string }> = [
  { value: 'WARM_STEADY', label: '溫柔穩定型' },
  { value: 'BRIGHT_OUTGOING', label: '明亮外向型' },
  { value: 'CLEAR_RATIONAL', label: '理性清楚型' },
  { value: 'MATURE_CARING', label: '成熟照顧型' },
  { value: 'FREE_INSPIRED', label: '自由靈感型' },
];

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

const CONTEXT_GROUPS: Array<{
  field: ContextField;
  title: string;
  reason: string;
  tone: 'pink' | 'cyan' | 'amber';
  options: ReadonlyArray<{ value: string; label: string }>;
}> = [
  { field: 'currentExpectation', title: '你想先看哪個方向？', reason: '決定下面的引導從哪一種節奏開始講。', tone: 'pink', options: CURRENT_EXPECTATION_OPTIONS },
  { field: 'attractedType', title: '你比較容易被哪一型吸引？', reason: '拿來跟命盤算出的有緣方向對照，看合不合得上。', tone: 'pink', options: ATTRACTED_TYPE_OPTIONS },
  { field: 'relationshipStatus', title: '目前的關係現況', reason: '只用來調整界線與步調的建議語氣。', tone: 'cyan', options: RELATIONSHIP_STATUS_OPTIONS },
  { field: 'familyResponsibility', title: '現在主要的生活責任', reason: '用來估算你實際可運用的時間，不做家庭狀況推論。', tone: 'amber', options: FAMILY_RESPONSIBILITY_OPTIONS },
];

const CONTEXT_FIELD_LABELS: Record<ContextField, string> = {
  currentExpectation: '期待方向',
  attractedType: '喜歡的類型',
  relationshipStatus: '關係現況',
  familyResponsibility: '生活責任',
};

/** Renders a stored position, including the deliberate "left blank" state. */
function contextValueLabel(field: ContextField, value: string) {
  if (!value || value === 'UNSPECIFIED') return '未填寫・中性引導';
  const group = CONTEXT_GROUPS.find((item) => item.field === field);
  return group?.options.find((option) => option.value === value)?.label ?? '未填寫・中性引導';
}

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

/**
 * One optional context question. Every group can be skipped or cleared: the
 * chart evidence is already frozen by the time these are asked, so a blank
 * answer only means the guidance for that dimension stays neutral.
 */
function ContextChoiceGroup({
  title,
  reason,
  tone,
  value,
  options,
  disabled,
  onChange,
}: {
  title: string;
  reason: string;
  tone: 'pink' | 'cyan' | 'amber';
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <legend className="px-1 text-sm font-black text-amber-50">{title}</legend>
      <p className="mt-1 text-xs leading-5 text-white/50">{reason}　可以跳過。</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <FriendlyChoiceCard
            key={option.value}
            active={value === option.value}
            title={option.label}
            tone={tone}
            compact
            disabled={disabled}
            onClick={() => onChange(value === option.value ? '' : option.value)}
          />
        ))}
      </div>
      {value && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('')}
          className="mt-3 text-xs font-bold text-white/45 underline underline-offset-4 transition hover:text-white/70 disabled:opacity-50"
        >
          清除這一題
        </button>
      )}
    </fieldset>
  );
}

function CalculationEvidence({ result }: { result: Reading['result'] }) {
  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-2xl border border-white/12 bg-slate-950/70 p-4"><EvidenceList title="本命・紅鸞／天喜／咸池桃花" items={result.bazi.natalEvidence} empty="本命四柱中未見這些規則現位；這不代表關係好或不好。" /><div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm font-black text-white/80">來源</p>{result.bazi.sources.map((source) => <p key={source.title} className="mt-2 text-xs leading-5 text-white/60">{source.title}：{source.reference}</p>)}</div></section>
      <section className="rounded-2xl border border-rose-200/20 bg-rose-400/[0.06] p-4"><h3 className="text-lg font-black text-white">未來 {result.annualRhythm.length} 年</h3><p className="mt-2 text-sm leading-7 text-white/65">紅鸞、天喜、咸池桃花、天乙貴人與日支六合／六沖分開列證；沒有權重分數。</p><div className="mt-4 space-y-3">{result.annualRhythm.map((year) => <article key={year.year} className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-black text-white">{year.year} 年・{year.annualBranch}年</h4><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${year.status === 'RULE_HIT' ? 'border-rose-200/30 bg-rose-300/10 text-rose-100' : 'border-white/10 text-white/45'}`}>{year.status === 'RULE_HIT' ? '有規則命中' : '無本組規則命中'}</span></div>{year.evidence.length > 0 ? <ul className="mt-3 space-y-3">{year.evidence.map((item) => <li key={`${year.year}-${item.ruleId}-${item.evidence}`} data-rule-id={item.ruleId} data-rule-version={item.ruleVersion} className="text-sm leading-6 text-white/75"><span className="font-black text-rose-100">{item.label}</span>　{item.evidence}<span className="mt-1 block text-[11px] text-white/45">{ruleIdentifierLabel(item.ruleId)}｜{ruleVersionLabel(item.ruleVersion)}｜證據 {item.evidenceBranches.join('・')}｜{item.source}</span></li>)}</ul> : <p className="mt-3 text-sm text-white/55">本年度未命中目前已驗證的規則；這不等於沒有關係機會。</p>}<p className="mt-3 text-[11px] leading-5 text-white/40">精度：年度地支。{year.limitation}</p></article>)}</div></section>
      <section className="rounded-2xl border border-amber-200/20 bg-amber-300/[0.06] p-4">
        <p className="text-xs font-black tracking-[0.18em] text-amber-200">月份節奏・{result.monthlyRhythm.year} 年十二節氣月</p>
        <h3 className="mt-2 text-lg font-black text-white">與年度同一組規則，改以流月地支觸發</h3>
        <div className="mt-4 space-y-2">
          {result.monthlyRhythm.months.map((month) => (
            <article key={month.monthIndex} className={`rounded-2xl border p-3 ${month.status === 'RULE_HIT' ? 'border-amber-200/30 bg-black/20' : 'border-white/10 bg-white/[0.03]'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-black text-white">{month.lunarLabel}・{month.monthBranch}月　<span className="text-xs font-bold text-white/55">{month.jieqi}起　{month.gregorianHint}</span></h4>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${month.status === 'RULE_HIT' ? 'border-amber-200/30 bg-amber-300/10 text-amber-100' : 'border-white/10 text-white/40'}`}>{month.status === 'RULE_HIT' ? `命中 ${month.hitCount} 條` : '無規則命中'}</span>
              </div>
              {month.evidence.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {month.evidence.map((item) => (
                    <li key={`${month.monthIndex}-${item.ruleId}-${item.evidence}`} data-rule-id={item.ruleId} data-rule-version={item.ruleVersion} className="text-xs leading-5 text-white/70">
                      <span className="font-black text-amber-100">{item.label}</span>　{item.evidence}
                      <span className="mt-1 block text-[10px] text-white/40">{ruleIdentifierLabel(item.ruleId)}｜{ruleVersionLabel(item.ruleVersion)}｜精度：節氣月支</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-white/45">{result.monthlyRhythm.limitation}</p>
      </section>
      <section className="rounded-2xl border border-violet-200/20 bg-violet-400/[0.07] p-4"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black tracking-[0.18em] text-violet-200">紫微本命夫妻宮</p><span className="rounded-full border border-violet-200/20 px-2 py-1 text-[10px] font-black text-violet-100">{ziweiStatusLabel(result.ziwei.status)}</span></div>{result.ziwei.status === 'READY' ? <div className="mt-4 space-y-3">{result.ziwei.palaces?.map((palace) => <article key={`${palace.palace}-${palace.earthlyBranch}`} className="rounded-2xl border border-white/10 bg-black/15 p-4"><h4 className="font-black text-white">{palace.palace}・{palace.earthlyBranch}</h4><p className="mt-2 text-sm leading-6 text-white/75">主星：{palace.majorStars.join('、') || '—'}</p><p className="mt-1 text-sm leading-6 text-white/60">輔星：{palace.minorStars.join('、') || '—'}</p></article>)}</div> : <p className="mt-3 rounded-2xl border border-violet-200/15 bg-violet-300/[0.08] p-4 text-sm leading-7 text-violet-50">尚未填出生時辰，因此不顯示紫微夫妻宮資料，也不以預設時辰代替。</p>}<p className="mt-3 text-xs leading-6 text-white/50">{result.crossCheck.summary} {result.crossCheck.limitation}</p></section>
    </div>
  );
}

function RedLuanHeartbeatExperience() {
  const [form, setForm] = useState<BirthProfile>(EMPTY_FORM);
  const [context, setContext] = useState<SelfReportedContext>(EMPTY_CONTEXT);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const [openedLayer, setOpenedLayer] = useState(0);
  const [alignmentChoice, setAlignmentChoice] = useState('');
  const [reflectionChoice, setReflectionChoice] = useState('');
  /** The context the visible reading was actually built from. */
  const [appliedContext, setAppliedContext] = useState<SelfReportedContext>(EMPTY_CONTEXT);

  useEffect(() => {
    const clearIdentityError = () => setError((current) => (current === getIdentityRequiredMessage() ? '' : current));
    window.addEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
    return () => window.removeEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
  }, []);

  function birthMissingFields(profile: BirthProfile) {
    const timeUnknown = profile.timeUnknown === true || profile.birthHourBranch === 'unknown';
    return [
      (profile.name ?? '').trim().length < 2 ? 'name' : '',
      !profile.birthDate ? 'birthDate' : '',
      !profile.gender ? 'gender' : '',
      timeUnknown || !profile.birthHourBranch ? 'birthHourBranch' : '',
    ].filter(Boolean);
  }

  async function submit(profile: BirthProfile, submittedContext: SelfReportedContext = context, mode: 'initial' | 'refine' = 'initial') {
    if (loading) return;
    if (!getAnalysisIdentityTarget()) {
      setError(getIdentityRequiredMessage());
      document.querySelector('.identity-split-selector, [aria-label="選擇本次分析對象"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const nextMissing = birthMissingFields(profile);
    setMissing(nextMissing);
    if (nextMissing.length > 0) {
      setError('請先完成含出生時辰的資料；紅鸞結果必須同時通過八字與紫微核對。');
      document.querySelector(`[data-field="${nextMissing[0]}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    // The relationship-position questions are intentionally not gated here: chart
    // evidence is frozen before that stage, so blanks cost the customer nothing.
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
          relationshipStatus: submittedContext.relationshipStatus,
          familyResponsibility: submittedContext.familyResponsibility,
          currentExpectation: submittedContext.currentExpectation,
          attractedType: submittedContext.attractedType,
        }),
      });
      const payload = await response.json() as Reading & { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || payload.message || '目前無法完成核對，請稍後再試。');
      setReading(payload);
      setAppliedContext(submittedContext);
      setAlignmentChoice('');
      if (mode === 'initial') {
        setOpenedLayer(0);
        setReflectionChoice('');
      }
      const anchor = mode === 'refine' ? 'red-luan-layer-1' : 'red-luan-result';
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
    setError('');
  }

  const contextDirty = (Object.keys(EMPTY_CONTEXT) as ContextField[]).some((field) => context[field] !== appliedContext[field]);
  const answeredCount = (Object.keys(EMPTY_CONTEXT) as ContextField[]).filter((field) => context[field]).length;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 pb-16 sm:px-6">
      <header className="rounded-3xl border border-rose-200/25 bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.18),transparent_44%),linear-gradient(135deg,rgba(31,17,34,0.98),rgba(9,17,35,0.98))] p-6 shadow-[0_18px_60px_rgba(244,63,94,0.13)]">
        <p className="text-xs font-black tracking-[0.22em] text-rose-200">個人關係主題參考</p>
        <h1 className="mt-2 font-serif text-3xl font-black text-rose-50">桃花・紅鸞心動</h1>
        <p className="mt-3 text-sm leading-7 text-white/75">填寫自己的出生資料，核對傳統文化中的年度關係主題訊號。這不是配對，也不預測事件。</p>
      </header>

      <section className="red-luan-unified-flow mt-5 rounded-3xl border border-white/12 bg-slate-950/70 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.35)]">
        <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-black tracking-[0.16em] text-amber-200">單人資料・沿用八字正式輸入</p><h2 className="mt-1 text-xl font-black text-white">你的出生資料</h2></div><span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70">只填一位</span></div>
        <IdentitySplitSelector className="mb-5" nextStepLabel="接著填出生資料" />
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
        <p className="mt-3 rounded-2xl border border-violet-200/15 bg-violet-300/[0.06] px-4 py-3 text-xs leading-6 text-violet-50/75">出生時辰是本功能的必要資料：系統會先核對八字四柱，再建立紫微本命夫妻宮；任一項無法確認，就不生成紅鸞解讀。</p>

        <button
          type="button"
          disabled={loading}
          onClick={() => { void submit(form); }}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-amber-100/65 bg-amber-300/20 px-6 py-4 text-sm font-black text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.16)] transition disabled:opacity-60"
        >
          {loading ? '確定性規則核對中…' : '開始核對關係主題'}
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-white/45">關係現況等問題留到結果頁再問，想跳過也可以。</p>
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
          <p className="mt-2 text-sm leading-7 text-white/70">規則證據一經算出就凍結，易經表達層只負責轉述，不會改寫它。你可以逐層閱讀、停下或略過行動選擇；本服務不是心理診斷或確定預測。</p>
          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="桃花紅鸞五層探索進度">
            {ONION_LAYERS.map((layer, index) => <li key={layer.title}><button type="button" disabled={index > openedLayer} onClick={() => document.getElementById(`red-luan-layer-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} aria-current={index === openedLayer ? 'step' : undefined} className={`h-full w-full rounded-2xl border px-3 py-3 text-left transition ${index <= openedLayer ? 'border-cyan-200/25 bg-cyan-300/[0.08] text-white' : 'border-white/10 bg-white/[0.03] text-white/35'}`}><span className="text-[10px] font-black tracking-[0.12em]">第 {index + 1} 層{index > openedLayer ? '・鎖定' : ''}</span><strong className="mt-1 block text-sm">{layer.title}</strong><span className="mt-1 block text-[10px] leading-4 opacity-70">{layer.subtitle}</span></button></li>)}
          </ol>
        </header>

        <section id="red-luan-spark" className="scroll-mt-5 rounded-3xl border border-rose-200/30 bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.16),transparent_46%),rgba(15,23,42,0.86)] p-5 shadow-[0_18px_52px_rgba(244,63,94,0.14)]">
          <p className="text-xs font-black tracking-[0.18em] text-rose-200">易經起卦・{reading.ichingReading.spark.title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-5xl leading-none text-rose-100" aria-hidden="true">{reading.ichingReading.hexagram.glyph}</span>
            <div>
              <h3 className="text-2xl font-black text-white">{reading.ichingReading.patternName}</h3>
              <p className="mt-1 text-sm font-bold text-rose-100/80">{reading.ichingReading.hexagram.name}・第 {reading.ichingReading.hexagram.kingWen} 卦（{reading.ichingReading.hexagram.upperSymbol}{reading.ichingReading.hexagram.lowerSymbol}）・動爻第 {reading.ichingReading.hexagram.changingLine} 爻</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200/25 bg-amber-300/[0.08] p-4">
            <p className="text-xs font-black tracking-[0.14em] text-amber-100">{reading.result.monthlyRhythm.year} 年・最容易勾動的月份</p>
            {reading.result.monthlyRhythm.peakMonths.length > 0 ? (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {reading.result.monthlyRhythm.peakMonths.map((month) => (
                    <div key={month.monthIndex} className="rounded-2xl border border-amber-200/30 bg-black/25 p-3">
                      <p className="text-lg font-black text-amber-50">{month.lunarLabel}・{month.monthBranch}月</p>
                      <p className="mt-1 text-xs font-bold text-amber-100/80">{month.jieqi}起　{month.gregorianHint}</p>
                      <p className="mt-2 text-[11px] leading-5 text-white/60">命中 {month.hitCount} 條規則：{month.evidence.map((item) => item.label).join('、')}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-6 text-white/55">月份以節氣為界，不是國曆一號起算。這幾個月是流月地支踩中你命盤紅鸞、天喜、桃花或貴人位的窗口，證據可以往下翻查；命中不等於一定發生什麼事。</p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-7 text-white/70">{reading.result.monthlyRhythm.year} 年十二個節氣月裡，這組規則都沒有命中你的月支。今年的節奏在「養」不在「動」——不是沒有機會，是機會不從時間這一路來。</p>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.06] p-4">
            <p className="text-xs font-black tracking-[0.14em] text-cyan-100">跟你比較容易來電的方向</p>
            {reading.affinity.branches.length > 0 ? (
              <div className="mt-3 space-y-2">
                {reading.affinity.branches.filter((row, index, all) => all.findIndex((item) => item.branch === row.branch) === index).map((row) => (
                  <div key={row.branch} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-sm font-black text-white">{row.branch}・屬{row.zodiac}　<span className="text-cyan-100/80">{row.direction}</span></p>
                    <p className="mt-1 text-xs leading-5 text-white/65">{row.trait}</p>
                  </div>
                ))}
              </div>
            ) : <p className="mt-2 text-sm leading-7 text-white/70">本命四柱未見這組神煞現位，方位這一路先不強斷。</p>}
            {reading.affinity.spouseStars.length > 0 && (
              <p className="mt-3 text-xs leading-6 text-white/60">紫微夫妻宮再補一筆：{reading.affinity.spouseStars.map((star) => `${star.star}（${star.trait}）`).join('、')}。</p>
            )}
            <p className="mt-3 text-xs leading-6 text-white/50">你自己填的是「{reading.affinity.selfReportedLabel}」，只放在這裡跟命盤方向對照，不參與任何運算。{reading.affinity.selfReportedType === 'UNSPECIFIED' ? '想對照的話，往下第二層可以補填。' : ''}</p>
          </div>

          <div className="mt-4 space-y-2">
            {[reading.ichingReading.spark.heaven, reading.ichingReading.spark.human, reading.ichingReading.spark.earth, reading.ichingReading.spark.fire].map((line) => (
              <p key={line.slice(0, 12)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/78">{line}</p>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-5 text-white/45">起卦依據：{reading.ichingReading.seedText}（梅花易數生辰起卦，同一生辰永遠同一卦，可回查驗算）。此為文化探索，不是心理診斷或確定預測。</p>
        </section>

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
          <p className="text-xs font-black tracking-[0.18em] text-rose-200">第二層・此刻位置</p>
          <h3 className="mt-2 text-xl font-black text-white">想讓引導更貼近你嗎？</h3>
          <p className="mt-2 text-sm leading-7 text-white/65">上面的命盤證據已經算完並凍結了，跟下面填不填無關。這幾題只決定引導的語氣要往哪個方向講，你可以全部跳過、只答一題，或隨時改。</p>

          <div className="mt-4 space-y-3">
            {CONTEXT_GROUPS.map((group) => (
              <div key={group.field} data-context-field={group.field}>
                <ContextChoiceGroup
                  title={group.title}
                  reason={group.reason}
                  tone={group.tone}
                  value={context[group.field]}
                  options={group.options}
                  disabled={loading}
                  onChange={(value) => updateContext(group.field, value as SelfReportedContext[typeof group.field])}
                />
              </div>
            ))}
          </div>

          {contextDirty && (
            <button
              type="button"
              disabled={loading}
              onClick={() => { void submit(form, context, 'refine'); }}
              className="mt-4 w-full rounded-2xl border border-amber-100/60 bg-amber-300/20 px-4 py-3 text-sm font-black text-amber-50 transition disabled:opacity-60"
            >
              {loading ? '更新引導中…' : answeredCount > 0 ? `套用這 ${answeredCount} 項，更新引導` : '清空選擇，改回中性引導'}
            </button>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {CONTEXT_GROUPS.map((group) => (
              <div key={group.field} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-xs text-white/45">{CONTEXT_FIELD_LABELS[group.field]}</p>
                <p className="mt-2 text-sm font-black text-white">{contextValueLabel(group.field, reading.relationshipPosition[group.field])}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-white/50">未填的項目一律走中性引導，系統不會回推。四題全部留白也照樣算得出月份與卦象——第一層證據在這之前就已經凍結，不受這裡影響。</p>
          <button type="button" onClick={() => openLayer(2)} className="mt-5 w-full rounded-2xl border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-50">打開第三層・情境交叉 →</button>
        </section>}

        {openedLayer >= 2 && <section id="red-luan-layer-2" className="scroll-mt-5 rounded-3xl border border-amber-200/20 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_48%),rgba(15,23,42,0.82)] p-5">
          <p className="text-xs font-black tracking-[0.18em] text-amber-200">第三層・情境交叉</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><h3 className="text-xl font-black text-white">此刻的關係位置・已完成情境運算</h3><span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-100">僅供反思引導</span></div>
          <p className="mt-2 text-sm leading-7 text-white/70">這是客戶自述與已驗證年度規則證據的交叉呈現，用來增加引導貼合度。關係情境運算依你的自述調整引導，不改變八字排盤、紅鸞規則、年份證據或品質門控，也不代表命盤計算精準度提高。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.06] p-4"><p className="text-xs font-black text-cyan-100">第一階段・先完成並凍結</p><p className="mt-2 text-sm font-bold text-white">八字：{statusLabel(reading.contextAlignment.calculationOrder.stageOne.baziStatus)}｜紫微：{ziweiStatusLabel(reading.contextAlignment.calculationOrder.stageOne.ziweiStatus)}</p><p className="mt-2 text-xs leading-5 text-white/55">出生資料標準化 → 八字確定性規則 → 時辰足夠時使用既有紫微引擎；證據先凍結。</p></div>
            <div className="rounded-2xl border border-amber-200/20 bg-amber-300/[0.06] p-4"><p className="text-xs font-black text-amber-100">第二階段・再做情境交叉</p><p className="mt-2 text-sm font-bold text-white">關係位置：已完成運算（填寫 {reading.contextAlignment.calculationOrder.stageTwo.providedFields.length} 項、留白 {reading.contextAlignment.calculationOrder.stageTwo.unspecifiedFields.length} 項）</p><p className="mt-2 text-xs leading-5 text-white/55">只調整心理學自我反思與易經式文化引導，不能回頭改寫第一階段；留白的項目走中性引導。</p></div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {CONTEXT_GROUPS.map((group) => (
              <div key={group.field} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] font-black tracking-[0.12em] text-white/45">{CONTEXT_FIELD_LABELS[group.field]}</p>
                <p className="mt-2 text-sm font-black text-white">{contextValueLabel(group.field, reading.relationshipPosition[group.field])}</p>
              </div>
            ))}
          </div>
          <section className="mt-4 rounded-2xl border border-rose-200/15 bg-rose-300/[0.06] p-4"><p className="text-xs font-black tracking-[0.14em] text-rose-100">與年度規則證據並列</p><p className="mt-2 text-sm leading-7 text-white/70">{reading.contextAlignment.annualEvidence.years.length > 0 ? `目前已驗證規則共有 ${reading.contextAlignment.annualEvidence.evidenceCount} 筆證據，出現在 ${reading.contextAlignment.annualEvidence.years.join('、')} 年；只作為可留意的年度節奏。` : '目前年度範圍內沒有本組已驗證規則命中；這不代表沒有關係機會。'}</p></section>
          <h4 className="mt-5 text-lg font-black text-amber-50">{reading.contextAlignment.themeTitle}</h4>
          <p className="mt-1 text-xs leading-5 text-white/55">以下三個方向由後端逐一組合：你填寫的項目走對應引導，留白的項目走中性引導。可任選一項，也可以不選；這不是人格分析或心理測驗。</p>
          <div className="mt-4 grid gap-3">{reading.contextAlignment.actionDirections.map((direction) => <button key={direction.id} type="button" onClick={() => setAlignmentChoice(direction.id)} aria-pressed={alignmentChoice === direction.id} className={`rounded-2xl border p-4 text-left transition ${alignmentChoice === direction.id ? 'border-amber-100/40 bg-amber-200/15' : 'border-white/10 bg-black/10'}`}><strong className="text-sm text-amber-50">{direction.title}</strong><span className="mt-2 block text-sm leading-6 text-white/75">易經式比喻：{direction.symbolism}</span><span className="mt-2 block text-sm leading-6 text-white/70">自我反思：{direction.reflectionQuestion}</span><span className="mt-2 block text-xs leading-5 text-emerald-100">可選小步：{direction.action}</span></button>)}</div>
          {alignmentChoice && <p className="mt-4 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.06] p-4 text-sm leading-7 text-emerald-50">你選擇先從「{reading.contextAlignment.actionDirections.find((item) => item.id === alignmentChoice)?.title}」開始。這只是可修改、可停止的自我反思方向。</p>}
          <p className="mt-4 text-[11px] leading-5 text-white/45">不推斷焦慮、依附型態、創傷、性格或未填資訊；不作心理診斷或婚姻預測；自述資料不送入易經表達層。</p>
          <button type="button" onClick={() => openLayer(3)} className="mt-5 w-full rounded-2xl border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-50">打開第四層・問心 →</button>
        </section>}

        {openedLayer >= 3 && <section id="red-luan-layer-3" className="scroll-mt-5 rounded-3xl border border-amber-200/20 bg-amber-300/[0.06] p-5">
          <p className="text-xs font-black tracking-[0.18em] text-amber-200">第四層・問心</p><h3 className="mt-2 text-xl font-black text-white">{reading.contextAlignment.guidancePrompt}</h3><p className="mt-2 text-sm leading-7 text-white/70">這不是系統對你內心的判斷。請自行選一個此刻願意嘗試的方向，也可以只閱讀、不採取行動。</p>
          <div className="mt-4 grid gap-3">{REFLECTION_CHOICES.map((choice) => <button key={choice.id} type="button" onClick={() => setReflectionChoice(choice.id)} aria-pressed={reflectionChoice === choice.id} className={`rounded-2xl border p-4 text-left transition ${reflectionChoice === choice.id ? 'border-amber-100/40 bg-amber-200/15' : 'border-white/10 bg-black/10'}`}><strong className="text-sm text-white">{choice.label}</strong><span className="mt-1 block text-xs leading-5 text-white/60">{choice.note}</span></button>)}</div>
          {reflectionChoice && <p className="mt-4 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.06] p-4 text-sm leading-7 text-emerald-50">你選擇了「{REFLECTION_CHOICES.find((choice) => choice.id === reflectionChoice)?.label}」。這只是你自己的探索方向，隨時可以更改或停止。</p>}
          <button type="button" onClick={() => openLayer(4)} className="mt-5 w-full rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-50">打開第五層・易經引導 →</button>
        </section>}

        {openedLayer >= 4 && <section id="red-luan-layer-4" className="scroll-mt-5 space-y-4">
          <section className="rounded-3xl border border-rose-200/20 bg-rose-400/[0.07] p-5">
            <p className="text-xs font-black tracking-[0.18em] text-rose-200">易經卜卦・{reading.ichingReading.patternName}</p>
            {reading.ichingReading.ritualOpening.split('\n').filter(Boolean).map((line) => (
              <p key={line.slice(0, 14)} className="mt-3 text-sm leading-7 text-white/78">{line}</p>
            ))}
            <div className="mt-4 space-y-2">
              {reading.ichingReading.onion.map((step) => (
                <article key={step.layer} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black tracking-[0.14em] text-rose-100">{step.layer}</p>
                  <p className="mt-2 text-sm leading-7 text-white/78">{step.text}</p>
                </article>
              ))}
            </div>
            <p className="mt-4 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.06] p-4 text-sm leading-7 text-emerald-50">{reading.ichingReading.closing}</p>
            <p className="mt-3 text-[11px] leading-5 text-white/45">卦義出自六十四卦知識庫，起卦依生辰（梅花易數）決定；同一生辰永遠同一卦，可回查驗算。這是文化探索與自我反思，不是心理診斷。</p>
          </section>
          <section className="rounded-3xl border border-cyan-200/20 bg-cyan-300/[0.06] p-5"><p className="text-xs font-black tracking-[0.18em] text-cyan-200">第五層・易經引導</p><div className="mt-2 flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-white">{reading.result.culturalReading.status === 'READY' ? '易經文化表達層' : '文化引導目前鎖定'}</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${reading.result.culturalReading.gate.status === 'PASSED' ? 'border-emerald-200/20 text-emerald-100' : 'border-rose-200/20 text-rose-100'}`}>門控：{statusLabel(reading.result.culturalReading.gate.status)}</span></div><p className="mt-2 text-xs leading-5 text-white/50">易經表達層只把已通過的證據寫成文化反思，不是超自然權威，也不參與排盤或預言。</p>
            {reading.result.culturalReading.status === 'READY' ? <><p className="mt-3 text-sm leading-7 text-white/75">{reading.result.culturalReading.summary}</p><div className="mt-4 space-y-3">{reading.result.culturalReading.yearlyGuidance?.map((item) => <article key={`${item.year}-${item.theme}`} className="rounded-2xl border border-white/10 bg-black/15 p-4"><h4 className="font-black text-cyan-50">{item.year}・{item.theme}</h4><p className="mt-2 text-sm leading-6 text-white/70">{item.reflection}</p><p className="mt-2 text-sm leading-6 text-cyan-100">行動參考：{item.action}</p></article>)}</div></> : <p className="mt-3 rounded-2xl border border-rose-200/15 bg-rose-300/[0.06] p-4 text-sm leading-7 text-white/70">{reading.result.culturalReading.status === 'UNAVAILABLE_AI_NOT_CONFIGURED' ? '後端證據已完成，但文化表達服務未設定，因此不以假文字代替。' : reading.result.culturalReading.status === 'BLOCKED_BY_VALIDATION' ? `資料尚未通過完整品質門控，易經表達層不會收到未驗證結果。${reading.result.culturalReading.gate.reasons.join('；')}。` : '文化表達服務暫時無法使用；後端規則證據仍維持原樣。'}</p>}
            <p className="mt-3 text-[11px] leading-5 text-white/45">門控檢查到 {reading.result.culturalReading.gate.evidenceCount} 筆具規則編號的主引擎年度證據；品質門控通過前不會傳給表達層。固定排除：{reading.result.culturalReading.gate.withheldFields.join('、')}。</p>
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
