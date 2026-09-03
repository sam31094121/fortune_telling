'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import FriendlyChoiceCard from '@/components/FriendlyChoiceCard';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage, IDENTITY_TARGET_UPDATED_EVENT, setAnalysisIdentityTarget } from '@/lib/identity-split-client';
 import { downloadRedLuanReminder, shareRedLuanReading, type RedLuanReminder } from '@/lib/red-luan-followup';
import { readCanonicalBirthProfile, saveCanonicalBirthProfile } from '@/lib/canonical-birth-profile-client';
import { fromUnifiedBirthProfile, toUnifiedBirthProfile } from '@/lib/canonical-birth-profile';
import { RED_LUAN_ARCHIVE_COPY, RED_LUAN_PUBLIC_ARCHIVED } from '@/lib/red-luan-public-access';

type Evidence = { label: string; targetBranch: string; evidence: string };
type TimelineEvidence = { label: string; ruleId: string; ruleVersion: string; evidenceBranches: string[]; evidence: string; source: string; precision: string };
type AnnualRhythm = { year: number; annualBranch: string; status: 'RULE_HIT' | 'NO_RULE_HIT'; precision: string; evidence: TimelineEvidence[]; limitation: string };
type MonthlyRhythm = {
  year: number; monthIndex: number; monthBranch: string; jieqi: string; lunarLabel: string; gregorianHint: string;
  status: 'RULE_HIT' | 'NO_RULE_HIT'; precision: 'SOLAR_TERM_MONTH_BRANCH'; hitCount: number;
  evidence: TimelineEvidence[]; limitation: string;
};
type Encounter = {
  gregorianYear: number; monthIndex: number; monthBranch: string; jieqi: string; lunarLabel: string;
  startsOn: string; endsOn: string; monthsAway: number; daysAway: number; daysLeft: number; isCurrent: boolean;
  kind: 'SOUL_RESONANCE' | 'BENEFACTOR' | 'BOTH';
  labels: string[]; monthLine: string; magnet: string; action: string; loveWords: string[]; mechanism: string[]; evidence: TimelineEvidence[];
};
type NextEncounters = {
  fromDate: string; soulResonance: Encounter | null; benefactor: Encounter | null;
  upcoming: Encounter[]; monthsScanned: number; limitation: string;
};
type AffinityProfile = {
  status: 'READY';
  branches: Array<{ label: string; branch: string; zodiac: string; direction: string; trait: string; appearance: string; careers: string[]; ruleId: string; basis: string }>;
  spouseStars: Array<{ palace: string; star: string; trait: string; career: string }>;
  onionLayers: Array<{ step: number; title: string; headline: string; detail: string }>;
  candidates: Array<{ rank: number; career: string; look: string; basis: string }>;
  typeHeadline: string;
  typeSummary: string;
  partnerGender: string;
  partnerLabel: string;
  selfReportedType: string;
  selfReportedLabel: string;
  limitations: string[];
};
type IChingReading = {
  hexagram: { name: string; kingWen: number; glyph: string; upperName: string; lowerName: string; upperSymbol: string; lowerSymbol: string; changingLine: number; essence: string; judgment: string; advice: string };
  patternName: string;
  ritualOpening: string;
  spark: { title: string; heaven: string; human: string; earth: string; fire: string };
  onion: Array<{ step: number; layer: string; point: string; term?: string }>;
  closing: string;
  karmicBond: { title: string; owed: string; lesson: string; reunion: string; note: string };
  teachers: Array<{ key: string; name: string; tagline: string; preview: string; opening: string; sections: Array<{ title: string; text: string }>; closing: string }>;
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
  nextEncounters: NextEncounters;
  ichingReading: IChingReading | null;
  unlocks?: { ziwei: boolean; hexagram: boolean; note: string };
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

// 必須與引擎的 ATTRACTED_TYPE_COPY 一字不差；測試會鎖住，避免兩邊各改各的。
const ATTRACTED_TYPE_OPTIONS: Array<{ value: AttractedType; label: string; note: string }> = [
  { value: 'WARM_STEADY', label: '溫柔穩定型', note: '話不用多，但讓人安心' },
  { value: 'BRIGHT_OUTGOING', label: '明亮外向型', note: '氣氛帶得起來，主動靠近' },
  { value: 'CLEAR_RATIONAL', label: '理性清楚型', note: '講道理、界線分明' },
  { value: 'MATURE_CARING', label: '成熟照顧型', note: '扛得住，也照顧得到你' },
  { value: 'FREE_INSPIRED', label: '自由靈感型', note: '有自己的世界，不被框住' },
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
  options: ReadonlyArray<{ value: string; label: string; note?: string }>;
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
  options: ReadonlyArray<{ value: string; label: string; note?: string }>;
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
            description={'note' in option ? (option as { note?: string }).note : undefined}
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

/** 內部規則名 → 客戶看得懂的字。 */
const LABEL_WORDS: Record<string, string> = {
  天乙貴人: '貴人',
  日支六合: '合得來',
  日支六沖: '容易起波瀾',
};

/** 結尾三個動作共用的摘要。 */
function reminderOf(reading: Reading): RedLuanReminder {
  const encounter = reading.nextEncounters.soulResonance ?? reading.nextEncounters.benefactor;
  return {
    name: reading.person.name,
    startsOn: encounter?.startsOn ?? '',
    endsOn: encounter?.endsOn ?? '',
    monthLine: encounter?.monthLine ?? '',
    typeHeadline: reading.affinity.typeHeadline,
    daysAway: encounter?.daysAway ?? 0,
    topCandidate: reading.affinity.candidates?.[0]?.career ?? '',
    url: typeof window === 'undefined' ? '' : `${window.location.origin}/red-luan-heartbeat`,
  };
}

const MONTH_DAY = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

/**
 * 倒數講成人話。天數比月數具體得多——「還有 23 天」會讓人想做點什麼，
 * 「還有 1 個月」不會（時間貼現，Temporal Discounting）。
 * 已經進到那個月裡面時改講還剩幾天，這是客戶被行事曆提醒回來時看到的那一句。
 */
function awayLabel(encounter: Encounter, fromDate: string) {
  if (encounter.isCurrent) {
    return encounter.daysLeft > 0 ? `就是這個月・還剩 ${encounter.daysLeft} 天` : '就是今天';
  }
  const crossesYear = encounter.startsOn.slice(0, 4) > fromDate.slice(0, 4);
  if (encounter.daysAway <= 45) return `還有 ${encounter.daysAway} 天`;
  return `${crossesYear ? '明年・' : ''}還有 ${encounter.monthsAway} 個月`;
}

/** 首屏那一句：什麼時候、是哪一種。 */
function EncounterCard({ encounter, fromDate, title, tone }: { encounter: Encounter | null; fromDate: string; title: string; tone: 'rose' | 'amber' }) {
  const ring = tone === 'rose' ? 'border-rose-200/30 bg-rose-300/[0.1]' : 'border-amber-200/30 bg-amber-300/[0.1]';
  const text = tone === 'rose' ? 'text-rose-100' : 'text-amber-100';
  const big = tone === 'rose' ? 'text-rose-50' : 'text-amber-50';
  if (!encounter) {
    return (
      <div className={`rounded-2xl border p-5 ${ring}`}>
        <p className={`text-sm font-black ${text}`}>{title}</p>
        <p className={`mt-2 text-xl font-black leading-tight ${big}`}>未來一年半內沒有命中</p>
        <p className="mt-2 text-sm leading-6 text-white/65">這一路的力道不在時間上；與其等，不如把自己準備好。</p>
      </div>
    );
  }
  return (
    <div className={`rounded-2xl border p-5 ${ring}`}>
      <p className={`text-sm font-black ${text}`}>{title}</p>
      <p className={`mt-2 text-3xl font-black leading-tight ${big}`}>
        {Number(encounter.startsOn.slice(0, 4))} 年 {Number(encounter.startsOn.slice(5, 7))} 月
      </p>
      <p className={`mt-1 text-base font-black ${text}`}>
        {MONTH_DAY(encounter.startsOn)} – {MONTH_DAY(encounter.endsOn)}　{awayLabel(encounter, fromDate)}
      </p>
      <p className="mt-1 text-xs font-bold text-white/45">農曆{encounter.lunarLabel}・{encounter.jieqi}起</p>
      <p className="mt-2 text-sm leading-6 text-white/70">{encounter.monthLine}</p>
      <p className="mt-3 text-sm leading-7 text-white/85">{encounter.magnet}</p>
      <p className="mt-2 rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.08] p-3 text-sm leading-7 text-emerald-50">{encounter.action}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {encounter.loveWords.map((word) => (
          <span key={word} className="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/70">{word}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * 折疊區塊：預設收起，但標題與徽章一直看得見，讓客戶知道底下還有東西。
 * 這不是隱藏——想深入就按開，關掉也不影響上面已經給出的結論。
 */
const RITUAL_LINES = [
  '把手心的溫度，透過螢幕傳過來……',
  '先靜下來，慢慢呼吸。心靜了，卦才感受得到你。',
  '卦成了。',
];

function Fold({
  title,
  badge,
  teaser,
  foldKey,
  opened,
  onToggle,
  children,
}: {
  title: string;
  badge?: string;
  teaser?: string;
  foldKey: string;
  opened: string[];
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = opened.includes(foldKey);
  return (
    <section className="overflow-hidden rounded-2xl border border-white/12 bg-black/20">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => onToggle(foldKey)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.03]"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-sm font-black text-white">{title}</span>
            {badge && <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-black text-white/55">{badge}</span>}
          </span>
          {teaser && !isOpen && <span className="mt-1 block text-xs leading-5 text-white/45">{teaser}</span>}
        </span>
        <span className={`shrink-0 text-xs font-black text-white/45 transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
      </button>
      {isOpen && <div className="border-t border-white/10 p-4">{children}</div>}
    </section>
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
  /** 洋蔥剝到第幾層（0 = 只開第一層）。 */
  const [peeled, setPeeled] = useState(0);
  const [teacherKey, setTeacherKey] = useState('iching');
  /** 目前展開的折疊區塊。預設全部收起，首屏只留客戶最想看的兩個答案。 */
  const [openedFolds, setOpenedFolds] = useState<string[]>([]);
  const [followUp, setFollowUp] = useState<'idle' | 'reminded' | 'shared' | 'copied' | 'failed'>('idle');
  /** 起卦儀式的第幾句；-1 代表沒有在進行。 */
  const [ritualStep, setRitualStep] = useState(-1);
  /** 上次填過的人；有的話就直接請他一鍵重看，不必再走一次表單。 */
  const [returningName, setReturningName] = useState('');

  /** 幫朋友算：切成訪客身分、清掉這次的結果與填答，捲回表單。 */
  function startGuestReading() {
    setAnalysisIdentityTarget('guest');
    setReading(null);
    setForm(EMPTY_FORM);
    setContext(EMPTY_CONTEXT);
    setAppliedContext(EMPTY_CONTEXT);
    setFollowUp('idle');
    setError('');
    setMissing([]);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function toggleFold(key: string) {
    setOpenedFolds((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  useEffect(() => {
    // 之前算過的人回來時直接認出他。被行事曆提醒回來的客戶最需要這個。
    const saved = readCanonicalBirthProfile();
    if (saved?.birthDate && saved.name) {
      const profile = toUnifiedBirthProfile(saved);
      if (profile.name && profile.birthDate && profile.gender) setReturningName(profile.name);
    }
  }, []);

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
      // 時辰是加值不是前提：沒有時辰照樣算得出月份與人選，只是少了卦象與紫微。
      '',
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
      setError('請先把姓名、生日和性別填完。');
      document.querySelector(`[data-field="${nextMissing[0]}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    // The relationship-position questions are intentionally not gated here: chart
    // evidence is frozen before that stage, so blanks cost the customer nothing.
    if (getAnalysisIdentityTarget() === 'self') {
      saveCanonicalBirthProfile(fromUnifiedBirthProfile(profile));
      setReturningName((profile.name ?? '').trim());
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
          relationshipStatus: submittedContext.relationshipStatus,
          familyResponsibility: submittedContext.familyResponsibility,
          currentExpectation: submittedContext.currentExpectation,
          attractedType: submittedContext.attractedType,
        }),
      });
      const payload = await response.json() as Reading & { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || payload.message || '目前無法完成核對，請稍後再試。');
      // 這個人已經看過儀式了（回訪一鍵重看），就不再演一次。
      if (mode === 'initial' && !returningName) {
        // 運算其實 0.3 秒就好了。這 2.4 秒是把手冊裡的卜卦儀式演完再揭曉——
        // 過程被看見時，結果才像卜出來的，而不是查表查出來的。
        for (let step = 0; step < RITUAL_LINES.length; step += 1) {
          setRitualStep(step);
          await new Promise((resolve) => { setTimeout(resolve, step === RITUAL_LINES.length - 1 ? 700 : 850); });
        }
        setRitualStep(-1);
      }
      setReading(payload);
      setAppliedContext(submittedContext);
      setAlignmentChoice('');
      if (mode === 'initial') {
        setOpenedLayer(0);
        setReflectionChoice('');
        setPeeled(0);
        setTeacherKey('iching');
        setOpenedFolds([]);
        setFollowUp('idle');
      }
      const anchor = mode === 'refine' ? 'red-luan-layer-1' : 'red-luan-result';
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '目前無法完成核對，請稍後再試。');
    } finally {
      setRitualStep(-1);
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
        <p className="text-xs font-black tracking-[0.22em] text-rose-200">桃花・紅鸞</p>
        <h1 className="mt-2 font-serif text-3xl font-black text-rose-50">桃花・紅鸞心動</h1>
        <p className="mt-3 text-sm leading-7 text-white/75">填生日和時辰，算出你下一次紅鸞心動是什麼時候、會碰到哪一型的人。</p>
      </header>

      <section className="red-luan-unified-flow mt-5 rounded-3xl border border-white/12 bg-slate-950/70 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.35)]">
        <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-black tracking-[0.16em] text-amber-200">只要生日和時辰</p><h2 className="mt-1 text-xl font-black text-white">你的出生資料</h2></div><span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70">只填一位</span></div>
        {/*
          回訪辨識：出生資料早就存著，表單也會自動帶入，但客戶回來時
          沒有任何東西告訴他「你的紅鸞月剩幾天」——他得自己再按一次才知道。
          被行事曆叫回來的人，第一眼就該看到這張。
        */}
        {returningName && !reading && !loading && (
          <div className="mb-5 rounded-2xl border border-rose-200/35 bg-rose-300/[0.1] p-4">
            <p className="text-sm font-black text-rose-50">{returningName}，歡迎回來</p>
            <p className="mt-1 text-xs leading-5 text-white/60">資料都還在，直接看你現在的紅鸞就好。</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => { void submit(form); }}
              className="mt-3 w-full rounded-2xl border border-rose-100/60 bg-rose-300/25 px-4 py-3 text-sm font-black text-rose-50 transition disabled:opacity-60"
            >
              直接看我的紅鸞 →
            </button>
          </div>
        )}
        <IdentitySplitSelector className="mb-5" nextStepLabel="接著填出生資料" />
        <UnifiedBirthForm
          value={form}
          fields={{ name: true, gender: true, birthDate: true, birthHourBranch: true, calendarType: true }}
          missing={missing}
          disabled={loading}
          isSubmitting={loading}
          submitLabel="算我的紅鸞"
          loadingLabel="推算中…"
          dateAccent="amber"
          onChange={(profile) => setForm((current) => ({ ...current, ...profile }))}
          onSubmit={(profile) => { void submit(profile); }}
        />
        <p className="mt-3 rounded-2xl border border-violet-200/15 bg-violet-300/[0.06] px-4 py-3 text-xs leading-6 text-violet-50/75">不知道時辰也可以算月份和人選；補上時辰還能多解鎖你的卦象。</p>

        <button
          type="button"
          disabled={loading}
          onClick={() => { void submit(form); }}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-amber-100/65 bg-amber-300/20 px-6 py-4 text-sm font-black text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.16)] transition disabled:opacity-60"
        >
          {loading ? '起卦中…' : '算我的紅鸞'}
        </button>
        {ritualStep >= 0 && (
          <div className="mt-4 rounded-2xl border border-rose-200/30 bg-rose-400/[0.08] p-6 text-center" role="status" aria-live="polite">
            <div className="flex flex-col-reverse items-center gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((line) => (
                <span
                  key={line}
                  className={`h-1.5 w-16 rounded-full transition-all duration-500 ${line <= ritualStep * 2 + 1 ? 'bg-rose-200/80' : 'bg-white/10'}`}
                />
              ))}
            </div>
            <p className="mt-4 text-sm font-bold leading-7 text-rose-50">{RITUAL_LINES[ritualStep]}</p>
          </div>
        )}
        <p className="mt-3 text-center text-xs leading-5 text-white/45">其他問題結果出來再問，想跳過也可以。</p>
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
        {/*
          結果頁只給兩個答案：什麼時候、會碰到誰。
          原本的五層進度條有四層寫「鎖定」，客戶還沒拿到東西就先看到四道關卡；
          免責與後端稽核資料也全部往後收，讓它們在「想查」時才出現。
        */}
        <header className="rounded-3xl border border-cyan-200/25 bg-cyan-300/[0.08] p-5">
          <h2 className="text-2xl font-black text-white">{reading.person.name}，這是你的紅鸞</h2>
        </header>

        {reading.affinity && <section id="red-luan-spark" className="scroll-mt-5 rounded-3xl border border-rose-200/30 bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.16),transparent_46%),rgba(15,23,42,0.86)] p-5 shadow-[0_18px_52px_rgba(244,63,94,0.14)]">

          {reading.nextEncounters && (
            <div className="mt-4 space-y-3">
              <EncounterCard
                encounter={reading.nextEncounters.soulResonance}
                fromDate={reading.nextEncounters.fromDate}
                title={reading.nextEncounters.soulResonance?.kind === 'BOTH' ? '下一次紅鸞心動・桃花和貴人同一個月' : '下一次紅鸞心動・會碰到跟你相吸的人'}
                tone="rose"
              />
              {reading.nextEncounters.benefactor
                && reading.nextEncounters.benefactor.startsOn !== reading.nextEncounters.soulResonance?.startsOn && (
                <EncounterCard
                  encounter={reading.nextEncounters.benefactor}
                  fromDate={reading.nextEncounters.fromDate}
                  title="下一次遇貴人"
                  tone="amber"
                />
              )}
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-rose-200/30 bg-rose-300/[0.1] p-5">
            <p className="text-sm font-black text-rose-100">{reading.affinity.partnerLabel === '對方' ? '對方長什麼樣子？' : `會跟你來電的，是哪一型的${reading.affinity.partnerLabel}？`}</p>
            <p className="mt-2 text-3xl font-black leading-tight text-rose-50">{reading.affinity.typeHeadline}</p>
            <div className="mt-4 space-y-2">
              {(reading.affinity.candidates ?? []).map((candidate) => (
                <div key={candidate.rank} className="flex items-start gap-3 rounded-2xl border border-white/12 bg-black/25 p-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-300/25 text-xs font-black text-rose-50">{candidate.rank}</span>
                  <span className="min-w-0">
                    <span className="block text-base font-black text-white">{candidate.career}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-white/60">{candidate.look}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/*
            未來一年的節奏一眼看完：客戶會為了「我今年還有幾次」而把這張卡存起來，
            也讓被行事曆叫回來的人知道下一次在哪，不必重算。
          */}
          {(reading.nextEncounters?.upcoming?.length ?? 0) > 0 && (
            <div className="mt-4 rounded-2xl border border-white/12 bg-black/25 p-4">
              <p className="text-sm font-black text-white">接下來一年，你有 {reading.nextEncounters.upcoming.filter((item) => item.daysAway <= 365).length} 次機會</p>
              <div className="mt-3 space-y-1.5">
                {reading.nextEncounters.upcoming.filter((item) => item.daysAway <= 365).map((item) => (
                  <div key={item.startsOn} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${item.isCurrent ? 'border-rose-200/50 bg-rose-300/15' : 'border-white/10 bg-white/[0.03]'}`}>
                    <span className={`w-20 shrink-0 text-sm font-black ${item.isCurrent ? 'text-rose-50' : 'text-white/80'}`}>
                      {Number(item.startsOn.slice(0, 4))}/{Number(item.startsOn.slice(5, 7))}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-white/60">{item.monthLine}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${item.kind === 'BENEFACTOR' ? 'bg-amber-300/20 text-amber-100' : 'bg-rose-300/20 text-rose-100'}`}>
                      {item.kind === 'BENEFACTOR' ? '貴人' : item.kind === 'BOTH' ? '桃花＋貴人' : '桃花'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-white/40">機會不等於一定發生，但這幾個月的節奏值得留意。</p>
            </div>
          )}
          {reading.ichingReading && <div className="mt-4 rounded-2xl border border-violet-200/30 bg-violet-400/[0.1] p-4">
            <p className="text-sm font-black text-violet-100">想聽誰替你解這一卦？</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(reading.ichingReading.teachers ?? []).map((teacher) => (
                <button
                  key={teacher.key}
                  type="button"
                  aria-pressed={teacherKey === teacher.key}
                  onClick={() => { setTeacherKey(teacher.key); setOpenedFolds((current) => (current.includes('teachers') ? current : [...current, 'teachers'])); }}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${teacherKey === teacher.key ? 'border-violet-100/70 bg-violet-300/25 text-violet-50 shadow-[0_0_22px_rgba(167,139,250,0.22)]' : 'border-white/12 bg-white/[0.05] text-white/70'}`}
                >
                  <span className="block text-lg font-black">{teacher.name}</span>
                  <span className="mt-1 block text-[11px] leading-4 opacity-75">{teacher.preview}</span>
                </button>
              ))}
            </div>
          </div>}

          {reading.unlocks && !reading.unlocks.hexagram && (
            <p className="mt-4 rounded-2xl border border-cyan-200/25 bg-cyan-300/[0.08] p-4 text-sm leading-7 text-cyan-50">🔒 {reading.unlocks.note}</p>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-white/45">以下想看再打開就好，不看也不影響上面的結論。</p>
            <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-black text-white/55">
              已拆 {openedFolds.filter((key) => key !== 'evidence').length} / {reading.ichingReading ? 5 : 2}
            </span>
          </div>

          <div className="mt-2 space-y-2">
            {reading.ichingReading && <>
            {/* 補填區原本埋在證據折疊的第二層裡，客戶找不到。提到頂層。 */}
            <Fold
              title="想讓引導更貼近你嗎？"
              badge={answeredCount > 0 ? `已填 ${answeredCount} 項` : '選填'}
              teaser="回答幾題，下面的引導會換成更貼近你的說法；全部跳過也不影響上面的答案"
              foldKey="refine"
              opened={openedFolds}
              onToggle={toggleFold}
            >
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
            </Fold>

            <Fold title="為什麼會是你？" badge="越後面越深" teaser={reading.ichingReading.onion?.[0]?.point} foldKey="psych" opened={openedFolds} onToggle={toggleFold}>
              <div className="space-y-2">
                {(reading.ichingReading.onion ?? []).map((layer) => (
                  <article key={layer.step} className="rounded-2xl border border-white/10 bg-black/22 p-4">
                    <p className="text-[10px] font-black tracking-[0.14em] text-cyan-100">第 {layer.step} 層・{layer.layer}</p>
                    <p className="mt-2 text-sm leading-7 text-white/85">{layer.point}</p>
                    {layer.term && <p className="mt-1 text-[11px] leading-5 text-white/40">{layer.term}</p>}
                  </article>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-white/40">心理學名詞是真實學術用語，可以自行查證。這是自我反思，不是心理診斷。</p>
            </Fold>
            </>}

            <Fold title="一層一層看他是誰" badge={`${(reading.affinity.onionLayers ?? []).length} 層`} teaser="他在哪一行、從哪個方向來，一層一層拆給你看" foldKey="onion" opened={openedFolds} onToggle={toggleFold}>
              <div className="space-y-2">
                {(reading.affinity.onionLayers ?? []).map((layer, index) => {
                  const unlocked = index <= peeled;
                  return (
                    <article key={layer.step} className={`rounded-2xl border p-4 transition ${unlocked ? 'border-cyan-200/25 bg-black/25' : 'border-white/10 bg-white/[0.03]'}`}>
                      <p className={`text-[10px] font-black tracking-[0.14em] ${unlocked ? 'text-cyan-100' : 'text-white/30'}`}>{layer.title}</p>
                      {unlocked ? (
                        <>
                          <p className="mt-2 text-lg font-black text-white">{layer.headline}</p>
                          <p className="mt-2 text-xs leading-6 text-white/65">{layer.detail}</p>
                        </>
                      ) : <p className="mt-2 text-sm font-bold text-white/35">🎁 未拆</p>}
                    </article>
                  );
                })}
              </div>
              {peeled < (reading.affinity.onionLayers ?? []).length - 1 && (
                <button type="button" onClick={() => setPeeled((current) => current + 1)} className="mt-3 w-full rounded-2xl border border-cyan-200/35 bg-cyan-300/12 px-4 py-3 text-sm font-black text-cyan-50 transition">再剝一層 →</button>
              )}
              {reading.affinity.selfReportedType !== 'UNSPECIFIED' && (
                <p className="mt-3 text-xs leading-6 text-white/50">你填的是「{reading.affinity.selfReportedLabel}」，放在這裡跟命盤方向對照，不參與運算。</p>
              )}
            </Fold>

            {reading.ichingReading && <>
            <Fold title={`你的卦・${reading.ichingReading.patternName}`} badge={reading.ichingReading.hexagram.glyph} teaser={`六十四格裡就「${reading.ichingReading.patternName}」這一格是你`} foldKey="hexagram" opened={openedFolds} onToggle={toggleFold}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-5xl leading-none text-rose-100" aria-hidden="true">{reading.ichingReading.hexagram.glyph}</span>
                <div>
                  <p className="text-xl font-black text-white">{reading.ichingReading.patternName}</p>
                  <p className="mt-1 text-sm font-bold text-rose-100/80">{reading.ichingReading.hexagram.name}・第 {reading.ichingReading.hexagram.kingWen} 卦（{reading.ichingReading.hexagram.upperSymbol}{reading.ichingReading.hexagram.lowerSymbol}）・動爻第 {reading.ichingReading.hexagram.changingLine} 爻</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {[reading.ichingReading.spark.heaven, reading.ichingReading.spark.human, reading.ichingReading.spark.earth, reading.ichingReading.spark.fire].map((line) => (
                  <p key={line.slice(0, 12)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/78">{line}</p>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-white/45">起卦依據：{reading.ichingReading.seedText}（梅花易數生辰起卦，同一生辰永遠同一卦，可回查驗算）。</p>
            </Fold>


            <Fold title={reading.ichingReading.karmicBond.title} badge="因果" teaser={reading.ichingReading.karmicBond.owed} foldKey="karmic" opened={openedFolds} onToggle={toggleFold}>
              <p className="text-sm leading-7 text-white/78">{reading.ichingReading.karmicBond.owed}</p>
              <p className="mt-2 text-sm leading-7 text-amber-100">{reading.ichingReading.karmicBond.lesson}</p>
              <p className="mt-2 rounded-2xl border border-rose-200/20 bg-rose-300/[0.08] p-4 text-sm leading-7 text-rose-50">{reading.ichingReading.karmicBond.reunion}</p>
              <p className="mt-3 text-[11px] leading-5 text-white/45">{reading.ichingReading.karmicBond.note}</p>
            </Fold>

            <Fold title="同一卦・兩種說法" badge="易經／鬼魅" teaser="兩位老師講法完全不同，挑一個聽" foldKey="teachers" opened={openedFolds} onToggle={toggleFold}>
              <div className="grid gap-2 sm:grid-cols-2">
                {(reading.ichingReading.teachers ?? []).map((teacher) => (
                  <button key={teacher.key} type="button" aria-pressed={teacherKey === teacher.key} onClick={() => setTeacherKey(teacher.key)} className={`rounded-2xl border px-4 py-3 text-left transition ${teacherKey === teacher.key ? 'border-violet-200/70 bg-violet-300/20 text-violet-50' : 'border-white/10 bg-white/[0.04] text-white/65'}`}>
                    <span className="block text-base font-black">{teacher.name}</span>
                    <span className="mt-1 block text-[11px] leading-4 opacity-75">{teacher.tagline}</span>
                  </button>
                ))}
              </div>
              {(() => {
                const teacher = (reading.ichingReading.teachers ?? []).find((item) => item.key === teacherKey) ?? (reading.ichingReading.teachers ?? [])[0];
                if (!teacher) return null;
                return (
                  <div className="mt-4 space-y-2">
                    {teacher.opening.split('\n').filter(Boolean).map((line) => <p key={line.slice(0, 14)} className="text-sm leading-7 text-white/78">{line}</p>)}
                    {teacher.sections.map((section) => (
                      <article key={section.title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black tracking-[0.14em] text-violet-100">{section.title}</p>
                        <p className="mt-2 text-sm leading-7 text-white/78">{section.text}</p>
                      </article>
                    ))}
                    {teacher.closing.split('\n').filter(Boolean).map((line) => <p key={line.slice(0, 14)} className="rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.06] p-4 text-sm leading-7 text-emerald-50">{line}</p>)}
                  </div>
                );
              })()}
            </Fold>
            </>}
          </div>

          <p className="mt-4 text-[11px] leading-5 text-white/45">月份以節氣為界，不是國曆一號起算。</p>
        </section>}

        {/* 完整推算過程：後端證據、品質門控、規則編號。想查的人才需要打開。 */}
        <Fold title="完整推算過程與證據" badge="想查再看" foldKey="evidence" opened={openedFolds} onToggle={toggleFold}>
        <div className="space-y-4">
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
          {reading.ichingReading && <section className="rounded-3xl border border-rose-200/20 bg-rose-400/[0.07] p-5">
            <p className="text-xs font-black tracking-[0.18em] text-rose-200">易經卜卦・{reading.ichingReading.patternName}</p>
            {reading.ichingReading.ritualOpening.split('\n').filter(Boolean).map((line) => (
              <p key={line.slice(0, 14)} className="mt-3 text-sm leading-7 text-white/78">{line}</p>
            ))}
            <div className="mt-4 space-y-2">
              {(reading.ichingReading.onion ?? []).map((step) => (
                <article key={step.layer} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black tracking-[0.14em] text-rose-100">第 {step.step} 層・{step.layer}</p>
                  <p className="mt-2 text-sm leading-7 text-white/85">{step.point}</p>
                  {step.term && <p className="mt-1 text-[11px] leading-5 text-white/40">{step.term}</p>}
                </article>
              ))}
            </div>
            <p className="mt-4 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.06] p-4 text-sm leading-7 text-emerald-50">{reading.ichingReading.closing}</p>
            <p className="mt-3 text-[11px] leading-5 text-white/45">卦義出自六十四卦知識庫，起卦依生辰（梅花易數）決定；同一生辰永遠同一卦，可回查驗算。這是文化探索與自我反思，不是心理診斷。</p>
          </section>}
          <section className="rounded-3xl border border-cyan-200/20 bg-cyan-300/[0.06] p-5"><p className="text-xs font-black tracking-[0.18em] text-cyan-200">第五層・易經引導</p><div className="mt-2 flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-white">{reading.result.culturalReading.status === 'READY' ? '易經文化表達層' : '文化引導目前鎖定'}</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${reading.result.culturalReading.gate.status === 'PASSED' ? 'border-emerald-200/20 text-emerald-100' : 'border-rose-200/20 text-rose-100'}`}>門控：{statusLabel(reading.result.culturalReading.gate.status)}</span></div><p className="mt-2 text-xs leading-5 text-white/50">易經表達層只把已通過的證據寫成文化反思，不是超自然權威，也不參與排盤或預言。</p>
            {reading.result.culturalReading.status === 'READY' ? <><p className="mt-3 text-sm leading-7 text-white/75">{reading.result.culturalReading.summary}</p><div className="mt-4 space-y-3">{reading.result.culturalReading.yearlyGuidance?.map((item) => <article key={`${item.year}-${item.theme}`} className="rounded-2xl border border-white/10 bg-black/15 p-4"><h4 className="font-black text-cyan-50">{item.year}・{item.theme}</h4><p className="mt-2 text-sm leading-6 text-white/70">{item.reflection}</p><p className="mt-2 text-sm leading-6 text-cyan-100">行動參考：{item.action}</p></article>)}</div></> : <p className="mt-3 rounded-2xl border border-rose-200/15 bg-rose-300/[0.06] p-4 text-sm leading-7 text-white/70">{reading.result.culturalReading.status === 'UNAVAILABLE_AI_NOT_CONFIGURED' ? '後端證據已完成，但文化表達服務未設定，因此不以假文字代替。' : reading.result.culturalReading.status === 'BLOCKED_BY_VALIDATION' ? `資料尚未通過完整品質門控，易經表達層不會收到未驗證結果。${reading.result.culturalReading.gate.reasons.join('；')}。` : '文化表達服務暫時無法使用；後端規則證據仍維持原樣。'}</p>}
            <p className="mt-3 text-[11px] leading-5 text-white/45">門控檢查到 {reading.result.culturalReading.gate.evidenceCount} 筆具規則編號的主引擎年度證據；品質門控通過前不會傳給表達層。固定排除：{reading.result.culturalReading.gate.withheldFields.join('、')}。</p>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-black tracking-[0.18em] text-white/55">易經補卦狀態</p><p className="mt-2 text-sm leading-7 text-white/70">{reading.result.iching.limitation}</p></section>
        </section>}
        </div>
        </Fold>
        {/*
          結尾原本只有免責＋返回首頁：客戶剛拿到「幾月會碰到誰」，卻沒有任何下一步。
          三個動作全在本機完成——行事曆不需要通知權限，分享優先用系統面板。
        */}
        {reading.nextEncounters?.soulResonance && (
          <section className="rounded-3xl border border-amber-200/25 bg-amber-300/[0.07] p-5">
            <p className="text-sm font-black text-amber-100">接下來</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setFollowUp(downloadRedLuanReminder(reminderOf(reading)) ? 'reminded' : 'failed')}
                className="rounded-2xl border border-amber-200/45 bg-amber-300/15 px-4 py-4 text-left transition hover:bg-amber-300/25"
              >
                <span className="block text-base font-black text-amber-50">提醒我 {Number(reading.nextEncounters.soulResonance.startsOn.slice(5, 7))} 月</span>
                <span className="mt-1 block text-[11px] leading-4 text-amber-100/75">加進你自己的行事曆</span>
              </button>
              <button
                type="button"
                onClick={() => { void shareRedLuanReading(reminderOf(reading)).then((outcome) => setFollowUp(outcome === 'failed' ? 'failed' : outcome)); }}
                className="rounded-2xl border border-rose-200/45 bg-rose-300/15 px-4 py-4 text-left transition hover:bg-rose-300/25"
              >
                <span className="block text-base font-black text-rose-50">分享這張卡</span>
                <span className="mt-1 block text-[11px] leading-4 text-rose-100/75">傳給想跟你一起看的人</span>
              </button>
              <button
                type="button"
                onClick={startGuestReading}
                className="rounded-2xl border border-cyan-200/45 bg-cyan-300/15 px-4 py-4 text-left transition hover:bg-cyan-300/25"
              >
                <span className="block text-base font-black text-cyan-50">幫朋友算一次</span>
                <span className="mt-1 block text-[11px] leading-4 text-cyan-100/75">不會存進你的成長檔</span>
              </button>
            </div>
            {followUp !== 'idle' && (
              <p className="mt-3 text-xs leading-6 text-emerald-100" role="status" aria-live="polite">
                {followUp === 'reminded' && '行事曆檔已下載，打開它就會加進你的行事曆，前一天會提醒你。'}
                {followUp === 'shared' && '已開啟分享。'}
                {followUp === 'copied' && '已複製到剪貼簿，可以直接貼給朋友。'}
                {followUp === 'failed' && '這個裝置不支援，可以直接截圖分享。'}
              </p>
            )}
          </section>
        )}
        <p className="text-[11px] leading-5 text-white/40">本服務是文化探索與自我反思，不是心理診斷，也不是確定預測。</p>
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
