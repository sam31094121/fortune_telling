'use client';

import { useCallback, useMemo, useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { APPROVED_PHRASES, FRONTEND_COPY } from '@/lib/credibility-phrases';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import NextStepGuide from '@/components/NextStepGuide';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import MegaInputGuide from '@/components/MegaInputGuide';
import { saveUserData, loadUserData } from '@/lib/storage';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import type { GrowthElement } from '@/lib/growth-center-engine';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage, setAnalysisIdentityTarget, IDENTITY_TARGET_UPDATED_EVENT } from '@/lib/identity-split-client';
import { clearDailyAnalysis, getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';
import { WaterTreasureOrb, type ProductElement } from '@/components/bazi/customer/WaterTreasureOrb';
import { ElementUnsealSoundToggle } from '@/components/ElementUnsealSound';
import { useElementTreasureRitual } from '@/components/five-elements/useElementTreasureRitual';
import { getProductOrbFromBrand } from '@/lib/five-element-orb-map';
import StarBeastLineageReveal from '@/components/StarBeastLineageReveal';
import type { MatchFiveElementKey, MatchFiveElementResult } from '@/lib/match-five-element-engine';
import type { MatchStory, MatchStoryTone } from '@/lib/match-story-engine';
import type { MatchThreeCoreView } from '@/lib/match-three-core-view';

interface PersonInput {
  name: string;
  birthDate: string;
  birthHourBranch: string;
  bloodType: 'A' | 'B' | 'AB' | 'O' | 'unknown';
  gender: 'male' | 'female';
}

interface MatchZones {
  resonance: string[];
  complement: string[];
  grinding: string[];
  conflict: string[];
}

interface MatchResult {
  match_score: number;
  resonance: number;
  communication: number;
  stability: number;
  conflict_risk: number;
  summary: string;
  zones: MatchZones;
}

interface PersonDisplay {
  name: string;
  zodiacZh: string;
  chineseZodiac: string;
  wuxing: string;
  bloodType: string;
  bloodTypeLabel?: string;
}


// 五元素結果與劇情的型別直接用後端定義，前端不另抄一份。

interface BaziMatchFoundation {
  source: '八字四柱合盤' | '八字三柱基礎合盤' | '八字混合合盤';
  timeNote: string;
  sceneKey: string;
  sharedElement: MatchFiveElementKey;
  personA: { dayMaster: string; primaryReinforcement: string; beastCard?: BaziBeastCard };
  personB: { dayMaster: string; primaryReinforcement: string; beastCard?: BaziBeastCard };
}

interface BaziBeastCard {
  name: string;
  image: string;
  youngDivineImage: string;
  coreMeaning: string;
  direction: string;
  productElement: '空' | '風' | '水' | '火' | '地';
  evidence: string;
  dayPillar: string;
}

interface MatchAiInterpretationLayer {
  userReadableSummary: string;
  relationshipPositioning: string;
  emotionalPattern: string;
  communicationPattern: string;
  riskTranslation: string;
}

interface MatchTeacherReadings {
  google: {
    reading: string;
    source: 'google' | 'local';
  };
  ghost?: {
    displayName: '鬼魅老師';
    internalStyle: '恐怖・驚悚';
    reading: string;
  };
}

type RelationshipEvidence = { label: '紅鸞' | '天喜' | '桃花'; targetBranch: string; evidence: string };
type BaziLoveSignal = {
  status: 'READY'; ruleVersion: string; annualYear: number; annualBranch: string;
  inputCompleteness: string; natalEvidence: RelationshipEvidence[]; annualTriggers: RelationshipEvidence[];
  sources: Array<{ title: string; reference: string }>; limitations: string[];
};
type ZiweiLoveSignal = {
  status: 'READY' | 'UNAVAILABLE_BIRTH_TIME_REQUIRED'; ruleVersion: string;
  annualStatus: 'UNAVAILABLE_RULE_SOURCE_REQUIRED'; inputCompleteness: string;
  palaces?: Array<{ palace: string; earthlyBranch: string; majorStars: string[]; minorStars: string[] }>;
  limitations: string[];
};
interface RedLuanHeartbeatResult {
  annualYear: number;
  bazi: { personA: BaziLoveSignal; personB: BaziLoveSignal };
  ziwei: { personA: ZiweiLoveSignal; personB: ZiweiLoveSignal };
  crossCheck: { status: 'READY' | 'PARTIAL'; summary: string; limitation: string };
  iching: { status: 'UNAVAILABLE_RULE_SOURCE_REQUIRED'; limitation: string };
}

interface MatchResponse {
  result: MatchResult;
  displayA: PersonDisplay;
  displayB: PersonDisplay;
  fiveElementMatch?: MatchFiveElementResult;
  baziFoundation?: BaziMatchFoundation;
  redLuanHeartbeat?: RedLuanHeartbeatResult;
  aiInterpretationLayer?: MatchAiInterpretationLayer;
  teacherReadings?: MatchTeacherReadings;
  story?: MatchStory;
  scoreBasis?: string;
  threeCore?: MatchThreeCoreView;
}

type MatchDailyResult = {
  data: MatchResponse;
  personA: PersonInput;
  personB: PersonInput;
};

type StepKey = 'personA' | 'personB' | 'review';
type SelectionConfirm = { bloodType: boolean; gender: boolean };

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const EMPTY: PersonInput = { name: '', birthDate: '', birthHourBranch: 'unknown', bloodType: 'unknown', gender: 'female' };
const EMPTY_SELECTION_CONFIRM: SelectionConfirm = { bloodType: false, gender: false };
// v6：劇情、格局、生剋圈改由後端送出（2026-09-17）；舊的當日紀錄沒有這些欄位，要清掉重算。
const MATCH_DAILY_SCHEMA_VERSION = 'soul-match-three-core-v7';
// sharedElement 已改為真實八字五行需求驅動（見 match-generate/route.ts），視覺開放顯示。
const SHOW_SHARED_ELEMENT_PEARL = true;
const MATCH_DEMO_NAMES = new Set(['\u738b\u5c0f\u660e', '\u9673\u5c0f\u7f8e']);

function isDemoMatchName(name?: string | null) {
  return MATCH_DEMO_NAMES.has(name?.trim() ?? '');
}

function isDemoMatchDailyResult(value?: MatchDailyResult | null) {
  const names = [value?.personA?.name, value?.personB?.name].map((name) => name?.trim() ?? '');
  return names.length === 2 && names.every((name) => MATCH_DEMO_NAMES.has(name));
}

function isCurrentMatchDailyRecord(record?: DailyAnalysisRecord<MatchDailyResult> | null) {
  return Boolean(record?.meta?.schemaVersion === MATCH_DAILY_SCHEMA_VERSION && record.result?.data?.result?.summary);
}

const BLOOD_DESC: Record<Exclude<PersonInput['bloodType'], 'unknown'>, string> = {
  A: '民間說法：細膩穩定，重視秩序與安全感。',
  B: '民間說法：自由直覺，重視感受與關係中的空間。',
  AB: '民間說法：理性與感性交織，關係節奏需要彈性。',
  O: '民間說法：直接熱情，在關係裡會主動承擔與推進。',
};

const STEP_ORDER: StepKey[] = ['personA', 'personB', 'review'];

function getPersonError(label: string, person: PersonInput, selectionConfirm?: SelectionConfirm) {
  if (person.name.trim().length < 2) return `請先輸入${label}姓名，至少 2 個字。`;
  if (!person.birthDate) return `請先完成${label}的萬年曆生日推算。`;
  if (selectionConfirm && !selectionConfirm.gender) return `請點選${label}性別。`;
  return '';
}

function getAgeFromBirthDate(birthDate?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate?.trim() ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const now = new Date();
  return now.getFullYear() - year - (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day) ? 1 : 0);
}


/** 鬼魅模式四張封條的標題（純裝飾標籤，不帶結論）。 */
const GHOST_SEAL_TITLES = ['情感壓力', '鬼魅回應', '神祕封印', '詭異磁場'];

function MatchTeacherReadings({ data }: { data: MatchResponse }) {
  const [mode, setMode] = useState<'teacher' | 'ghost'>('teacher');
  const interpretation = data.aiInterpretationLayer;
  const googleReading = data.teacherReadings?.google;
  const fromGoogle = googleReading?.source === 'google';
  const teacherName = fromGoogle ? 'Google 解盤老師' : '解盤老師';
  const formalReading = googleReading?.reading || interpretation?.userReadableSummary || data.result.summary;
  const formalDetail = interpretation?.relationshipPositioning || data.result.zones.resonance[0] || '';
  const ghostReading = data.teacherReadings?.ghost?.reading;
  const story = data.story;
  const showingGhost = mode === 'ghost' && Boolean(ghostReading);

  return (
    <section className={`fortune-card relative overflow-hidden border p-4 shadow-[0_18px_52px_rgba(0,0,0,0.26)] sm:p-6 ${
      showingGhost
        ? 'border-rose-300/30 bg-[radial-gradient(circle_at_top,rgba(127,29,29,0.32),transparent_48%),linear-gradient(145deg,rgba(30,5,15,0.98),rgba(10,8,22,0.98))]'
        : 'border-cyan-200/25 bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.22),transparent_48%),linear-gradient(145deg,rgba(8,47,73,0.72),rgba(15,23,42,0.98))]'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-black tracking-[0.2em] ${showingGhost ? 'text-rose-100/85' : 'text-cyan-100/85'}`}>{showingGhost ? '雙人封印檔案・鬼魅低語' : '兩人合盤・關係解讀'}</p>
          <h2 className={`mt-1 font-serif text-2xl font-black sm:text-3xl ${showingGhost ? 'text-rose-50' : 'text-cyan-50'}`}>
            {showingGhost ? '鬼魅老師' : teacherName}
          </h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${showingGhost ? 'border-rose-200/25 bg-rose-300/10 text-rose-100' : 'border-cyan-200/25 bg-cyan-300/10 text-cyan-100'}`}>
          同一份配對資料
        </span>
      </div>

      {ghostReading && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('teacher')}
            aria-pressed={!showingGhost}
            className={`rounded-2xl border px-3 py-3 text-left transition ${!showingGhost ? 'border-cyan-200/45 bg-cyan-300/14 text-cyan-50' : 'border-white/10 bg-black/16 text-white/75'}`}
          >
            <p className="text-sm font-black">{teacherName}</p>
            <p className="mt-1 text-xs font-semibold leading-5">清楚說明兩人的關係主軸</p>
          </button>
          <button
            type="button"
            onClick={() => setMode('ghost')}
            aria-pressed={showingGhost}
            className={`rounded-2xl border px-3 py-3 text-left transition ${showingGhost ? 'border-rose-200/45 bg-rose-300/14 text-rose-50' : 'border-white/10 bg-black/16 text-white/75'}`}
          >
            <p className="text-sm font-black">鬼魅老師</p>
            <p className="mt-1 text-xs font-semibold leading-5">用遊戲劇情說同一個答案</p>
          </button>
        </div>
      )}

      {story && (
        <div className={`mt-3 rounded-2xl border px-3 py-3 ${showingGhost ? 'border-rose-200/20 bg-rose-950/20' : 'border-cyan-200/20 bg-cyan-950/20'}`}>
          <p className={`text-xs font-black tracking-[0.16em] ${showingGhost ? 'text-rose-100/85' : 'text-cyan-100/85'}`}>{showingGhost ? '封印檔案・關係結界' : '兩人關係格局'}</p>
          <p className={`mt-1 text-base font-black ${showingGhost ? 'text-rose-50' : 'text-cyan-50'}`}>{story.pairStructure.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-white/80">{showingGhost ? story.pairStructure.ghostCopy : story.pairStructure.copy}</p>
        </div>
      )}

      {showingGhost && (
        <div className="mt-3 grid grid-cols-2 gap-2" aria-hidden="true">
          {GHOST_SEAL_TITLES.map((title, index) => (
            <div key={title} className="rounded-xl border border-rose-200/18 bg-[linear-gradient(135deg,rgba(127,29,29,0.28),rgba(0,0,0,0.48))] px-2.5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.24)]">
              <p className="text-xs font-black text-rose-100">{title}</p>
              <div className="relative mx-auto mt-2 h-8 w-12 drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]" style={{ transform: `rotate(${index % 2 === 0 ? -3 : 3}deg)` }}>
                <span className="absolute inset-0 rounded-[2px] border border-amber-950/60 bg-[linear-gradient(135deg,#f5e8be_0%,#c6a86c_46%,#f0d69a_100%)] shadow-[inset_1px_1px_0_rgba(255,255,255,0.62),inset_-2px_-2px_4px_rgba(78,35,12,0.42)]" />
                <span className="absolute inset-x-[11%] top-[18%] h-px bg-amber-950/40" />
                <span className="absolute inset-x-[18%] bottom-[17%] h-px bg-amber-950/35" />
                <span className="absolute left-1/2 top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-sm border border-rose-950/70 bg-[radial-gradient(circle_at_35%_28%,#ef6e64,#7f1d1d_58%,#3f0714)] text-xs font-black text-amber-50 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.7)]">封</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <article className={`mt-3 rounded-[22px] border p-4 ${showingGhost ? 'border-rose-200/28 bg-[linear-gradient(145deg,rgba(64,7,23,0.58),rgba(0,0,0,0.52))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'border-cyan-200/20 bg-black/20'}`}>
        {!showingGhost && (
          <p className="mb-2 text-xs font-semibold leading-5 text-amber-100/90">
            {fromGoogle ? '這段由 Google AI 依同一份配對資料改寫。' : '這段是依固定規則寫成的基礎解讀。'}
          </p>
        )}
        {showingGhost && <p className="mb-2 text-xs font-black tracking-[0.2em] text-rose-100/80">鬼魅回應・封印低語</p>}
        <p className={`text-sm font-black leading-7 ${showingGhost ? 'font-serif text-rose-50' : 'text-cyan-50'}`}>{showingGhost ? ghostReading : formalReading}</p>
        {(showingGhost ? story?.ghostDetail : formalDetail) && (
          <p className={`mt-3 border-t pt-3 text-sm font-semibold leading-6 ${showingGhost ? 'border-rose-200/15 font-serif text-rose-100/85' : 'border-cyan-200/15 text-cyan-100/85'}`}>{showingGhost ? story?.ghostDetail : formalDetail}</p>
        )}
      </article>
      <p className={`mt-3 text-center text-xs font-black leading-6 ${showingGhost ? 'text-rose-100/85' : 'text-cyan-100/85'}`}>
        {SHOW_SHARED_ELEMENT_PEARL
          ? showingGhost
            ? '鬼魅留下唯一出口：兩人一起拿到下方的五元素封印寶珠，解除結界。'
            : '下一步：兩人一起拿到下方的五元素封印寶珠，解除結界，完成這一局的共同任務。'
          : '共同寶珠儀式暫時保持封印，等待視覺定稿後再開放。'}
      </p>
    </section>
  );
}


function ElderChoiceCard({
  active,
  title,
  description,
  onClick,
  tone,
  attention = false,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  tone: 'violet' | 'amber' | 'pink' | 'cyan';
  attention?: boolean;
}) {
  const tones = {
    violet: active
      ? 'border-2 border-violet-200 bg-violet-500/20 text-violet-50 shadow-[0_0_30px_rgba(167,139,250,0.42)] ring-2 ring-violet-300/50 ring-offset-2 ring-offset-[#10101a]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
    amber: active
      ? 'border-2 border-amber-100 bg-amber-500/20 text-amber-50 shadow-[0_0_30px_rgba(251,191,36,0.42)] ring-2 ring-amber-200/50 ring-offset-2 ring-offset-[#10101a]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
    pink: active
      ? 'border-2 border-pink-200 bg-pink-500/20 text-pink-50 shadow-[0_0_30px_rgba(244,114,182,0.42)] ring-2 ring-pink-300/50 ring-offset-2 ring-offset-[#10101a]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
    cyan: active
      ? 'border-2 border-cyan-100 bg-cyan-500/20 text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,0.42)] ring-2 ring-cyan-200/50 ring-offset-2 ring-offset-[#10101a]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
  };

  const attentionClass = attention && !active ? 'border-rose-400/85 bg-rose-500/12 text-rose-50 shadow-[0_0_24px_rgba(244,63,94,0.24)]' : '';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all hover:border-white/20 ${attentionClass || tones[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold">{title}</p>
        <span className={`choice-signal ${active ? 'choice-signal--done' : 'choice-signal--idle'}`}>
          {active ? '已選' : '點選'}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">{description}</p>
    </button>
  );
}

function ScoreRow({ label, score, tone }: { label: string; score: number; tone: 'violet' | 'amber' | 'cyan' | 'pink' }) {
  const gradients = {
    violet: 'linear-gradient(90deg, #6D4AFF, #A78BFA)',
    amber: 'linear-gradient(90deg, #C9A24A, #F4C95D)',
    cyan: 'linear-gradient(90deg, #22D3EE, #6EE7F9)',
    pink: 'linear-gradient(90deg, #EC4899, #F9A8D4)',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-[color:var(--text-sub)]">{label}</span>
        <span className="text-sm font-semibold text-[color:var(--text-main)]">{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: gradients[tone] }} />
      </div>
    </div>
  );
}

function OracleHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-2 align-middle z-20 font-sans">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-xs font-bold text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)] hover:bg-cyan-500/25 transition-all focus:outline-none"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span className="absolute bottom-7 left-1/2 -translate-x-1/2 z-50 w-56 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-3.5 text-xs leading-5 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.25)] animate-fade-in font-sans">
            {text}
            <button 
              type="button" 
              className="block mt-2 text-xs font-bold text-cyan-400 text-right w-full hover:underline"
              onClick={() => setOpen(false)}
            >
              我知道了 ✗
            </button>
          </span>
        </>
      )}
    </span>
  );
}

function PersonStep({
  title,
  description,
  accent,
  value,
  onChange,
  selectionConfirm,
  onSelectionConfirm,
  showValidation = false,
}: {
  title: string;
  description: string;
  accent: 'violet' | 'amber';
  value: PersonInput;
  onChange: Dispatch<SetStateAction<PersonInput>>;
  selectionConfirm: SelectionConfirm;
  onSelectionConfirm: Dispatch<SetStateAction<SelectionConfirm>>;
  showValidation?: boolean;
}) {
  const updatePerson = useCallback((patch: Partial<PersonInput>) => {
    onChange((current) => ({ ...current, ...patch }));
  }, [onChange]);
  const updateName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    updatePerson({ name: event.target.value });
  }, [updatePerson]);
  const updateBirthDate = useCallback((birthDate: string) => {
    updatePerson({ birthDate });
  }, [updatePerson]);
  const confirmSelection = useCallback((field: keyof SelectionConfirm) => {
    onSelectionConfirm((current) => ({ ...current, [field]: true }));
  }, [onSelectionConfirm]);
  const showMissingName = showValidation && value.name.trim().length < 2;
  const showMissingBirthDate = showValidation && !value.birthDate;
  const [showBloodOptions, setShowBloodOptions] = useState(value.bloodType !== 'unknown');
  const showMissingGender = showValidation && !selectionConfirm.gender;
  const [showShichenOptions, setShowShichenOptions] = useState(Boolean(value.birthHourBranch && value.birthHourBranch !== 'unknown'));
  return (
    <div className="fortune-card p-5 sm:p-7">
      <div className="max-w-2xl">
        <p className={`inline-flex rounded-full border px-3.5 py-1 text-xs font-black uppercase tracking-[0.24em] ${accent === 'violet' ? 'border-violet-400/25 bg-violet-950/20 text-violet-300' : 'border-amber-400/25 bg-amber-950/20 text-amber-300'}`}>
          配對資料
        </p>
        <h2 className="mt-3 font-serif text-2xl font-black leading-tight text-[color:var(--text-main)] sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{description}</p>
      </div>

      <div className="mt-6 space-y-7">
        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            1. 姓名
            <OracleHint text={FRONTEND_COPY.nameHint} />
          </label>
          <input
            type="text"
            value={value.name}
            onChange={updateName}
            placeholder="請輸入姓名，至少 2 個字"
            className={`form-input w-full text-base neon-input-focus neon-card-hover glass-input ${accent === 'violet' ? 'glass-input-cyan' : ''} ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
          />
          {showMissingName && (
            <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002"}</p>
          )}
        </div>

        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            2. 出生日期（萬年曆）
            <OracleHint text={`🪐 ${APPROVED_PHRASES.crossCheck}`} />
          </label>
          <LunarBirthdayInput
            value={value.birthDate}
            onChange={updateBirthDate}
            accent={accent}
            label="請選擇國曆或農曆"
          />
          {showMissingBirthDate && (
            <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\u3002"}</p>
          )}
        </div>

        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            3. 出生時辰（可略過）
            <OracleHint text="知道時辰可生成完整四柱八字；不知道也可以直接選不知道，系統只用年、月、日三柱，不會假裝補出時柱。" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ElderChoiceCard
              active={showShichenOptions}
              title="我知道出生時辰"
              description="展開十二時辰，點選正確時辰後以完整四柱配對。"
              onClick={() => setShowShichenOptions(true)}
              tone={accent}
            />
            <ElderChoiceCard
              active={!showShichenOptions && (!value.birthHourBranch || value.birthHourBranch === 'unknown')}
              title="不知道出生時辰"
              description="直接用八字三柱基礎配對；時柱不推定。"
              onClick={() => {
                setShowShichenOptions(false);
                updatePerson({ birthHourBranch: 'unknown' });
              }}
              tone={accent === 'violet' ? 'cyan' : 'pink'}
            />
          </div>
          {showShichenOptions && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {SHICHEN_LIST.map((shichen) => (
                <button
                  key={shichen.branch}
                  type="button"
                  onClick={() => updatePerson({ birthHourBranch: shichen.branch })}
                  className={`rounded-xl border px-2 py-2.5 text-center transition ${value.birthHourBranch === shichen.branch ? 'border-2 border-amber-100 bg-amber-300/20 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.26)]' : 'border-white/10 bg-white/[0.035] text-white/80 hover:border-cyan-100/40 hover:text-cyan-50'}`}
                >
                  <span className="block text-sm font-black">{shichen.label}</span>
                  <span className="mt-0.5 block text-xs font-bold opacity-70">{shichen.range}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            4. 血型
            <OracleHint text="🧬 血型只用在「相處共鳴指數」的固定規則裡；不知道就用預設值，不會影響八字與五元素。" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ElderChoiceCard
              active={showBloodOptions}
              title="我知道血型"
              description="展開 A、B、O、AB，將血型納入配對。"
              onClick={() => setShowBloodOptions(true)}
              tone={accent}
            />
            <ElderChoiceCard
              active={!showBloodOptions && value.bloodType === 'unknown'}
              title="不知道血型"
              description="仍可繼續配對；血型維度改為中性，不假裝已知。"
              onClick={() => {
                setShowBloodOptions(false);
                updatePerson({ bloodType: 'unknown' });
              }}
              tone={accent === 'violet' ? 'cyan' : 'pink'}
            />
          </div>
          {showBloodOptions && <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {BLOOD_TYPES.map((bloodType, index) => (
              <ElderChoiceCard
                key={bloodType}
                active={selectionConfirm.bloodType && value.bloodType === bloodType}
                title={`${bloodType} 型`}
                description={BLOOD_DESC[bloodType]}
                onClick={() => {
                  updatePerson({ bloodType });
                  confirmSelection('bloodType');
                }}
                tone={index % 2 === 0 ? accent : accent === 'violet' ? 'cyan' : 'pink'}
                attention={false}
              />
            ))}
          </div>}
        </div>

        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            5. 性別
            <OracleHint text="✦ 性別不會改變八字四柱；紫微命盤與相處共鳴指數會參考它。" />
          </label>
          {showMissingGender && (
            <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u6027\u5225\uff0c\u9019\u6b04\u9084\u6c92\u6709\u78ba\u8a8d\u3002"}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <ElderChoiceCard
              active={selectionConfirm.gender && value.gender === 'female'}
              title="女性"
              description="用來修飾外在表現。"
              onClick={() => {
                updatePerson({ gender: 'female' });
                confirmSelection('gender');
              }}
              tone="pink"
              attention={showMissingGender}
            />
            <ElderChoiceCard
              active={selectionConfirm.gender && value.gender === 'male'}
              title="男性"
              description="只做外在呈現修飾。"
              onClick={() => {
                updatePerson({ gender: 'male' });
                confirmSelection('gender');
              }}
              tone="cyan"
              attention={showMissingGender}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


const MATCH_ELEMENT_LABEL: Record<MatchFiveElementKey, string> = {
  space: '空元素',
  air: '風元素',
  water: '水元素',
  fire: '火元素',
  earth: '地元素',
};

const MATCH_ELEMENT_SHORT_LABEL: Record<MatchFiveElementKey, ProductElement> = Object.freeze({
  space: getProductOrbFromBrand('space'), air: getProductOrbFromBrand('air'), water: getProductOrbFromBrand('water'), fire: getProductOrbFromBrand('fire'), earth: getProductOrbFromBrand('earth'),
});


function BaziBeastPairCards({
  foundation,
  personAName,
  personBName,
  personABirthDate,
  personBBirthDate,
}: {
  foundation?: BaziMatchFoundation;
  personAName: string;
  personBName: string;
  personABirthDate?: string;
  personBBirthDate?: string;
}) {
  const beastA = foundation?.personA.beastCard;
  const beastB = foundation?.personB.beastCard;
  if (!beastA || !beastB) return null;

  const cards = [
    { label: '第一位・我的八字神獸', name: personAName, age: getAgeFromBirthDate(personABirthDate), beast: beastA, tone: 'violet' },
    { label: '第二位・對方的八字神獸', name: personBName, age: getAgeFromBirthDate(personBBirthDate), beast: beastB, tone: 'amber' },
  ] as const;

  return (
    <section className="fortune-card relative overflow-hidden border border-cyan-100/20 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_37%),radial-gradient(circle_at_82%_0%,rgba(251,191,36,0.12),transparent_37%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(17,24,39,0.95))] p-3 shadow-[0_20px_56px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
      <div className="px-1 pb-3 pt-1 text-center sm:pb-4">
        <p className="text-xs font-black tracking-[0.25em] text-cyan-100/80">兩人八字・二十八宿神獸</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">
          同一份出生資料，會和八字頁的日柱神獸完全一致。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {cards.map(({ label, name, age, beast, tone }) => {
          const isViolet = tone === 'violet';
          return (
            <article
              key={label}
              className={`relative min-w-0 overflow-hidden rounded-[22px] border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-4 ${
                isViolet
                  ? 'border-violet-200/35 bg-[linear-gradient(145deg,rgba(76,29,149,0.36),rgba(15,23,42,0.94)_72%)]'
                  : 'border-amber-200/35 bg-[linear-gradient(145deg,rgba(146,64,14,0.28),rgba(15,23,42,0.94)_72%)]'
              }`}
            >
              <p className={`truncate text-xs font-black tracking-[0.12em] ${isViolet ? 'text-violet-100/85' : 'text-amber-100/85'}`}>{label}</p>
              <p className="mt-1 truncate text-sm font-black text-[color:var(--text-main)]">{name}{age === null ? '' : `・${age}歲`}</p>

              <div className="relative mt-2 aspect-[1.04] overflow-hidden rounded-[17px] border border-white/14 bg-black/25">
                <StarBeastLineageReveal
                  beast={beast}
                  context="八字配對神獸卡"
                  className="h-full"
                  imageClassName="h-full w-full object-cover"
                  overlayClassName="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent px-2 pb-2 pt-9"
                  buttonClassName="mt-1 rounded-full border border-white/20 bg-slate-950/75 px-2 py-1 text-xs font-black text-cyan-50 transition hover:border-cyan-100/60"
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`rounded-full border px-2 py-1 text-xs font-black ${isViolet ? 'border-violet-200/25 bg-violet-200/10 text-violet-100' : 'border-amber-200/25 bg-amber-200/10 text-amber-100'}`}>
                  {beast.productElement}元素
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs font-bold text-white/75">日柱 {beast.dayPillar}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-white/75 ">{beast.coreMeaning}</p>
              <p className="mt-2 text-xs leading-4 text-white/80">先看本命神獸；神獸幼子需主動深入查看。</p>
              <p className="mt-2 border-t border-white/8 pt-2 text-xs leading-4 text-white/80">{beast.direction}</p>
            </article>
          );
        })}
      </div>

      <p className="px-1 pt-3 text-center text-xs font-semibold leading-5 text-white/80">
        配對順序：先各自定位神獸，再交叉解讀兩人的互動。
      </p>
    </section>
  );
}

function RedLuanHeartbeatPanel({ result, personAName, personBName }: { result?: RedLuanHeartbeatResult; personAName: string; personBName: string }) {
  if (!result) return null;
  const people = [
    { name: personAName, bazi: result.bazi.personA, ziwei: result.ziwei.personA },
    { name: personBName, bazi: result.bazi.personB, ziwei: result.ziwei.personB },
  ];
  return (
    <section className="fortune-card overflow-hidden border border-rose-200/25 bg-[radial-gradient(circle_at_12%_0%,rgba(244,63,94,0.18),transparent_33%),linear-gradient(145deg,rgba(44,10,27,0.92),rgba(17,12,35,0.96))] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black tracking-[0.24em] text-rose-200">紅鸞心動・第二階段</p><h2 className="mt-2 font-serif text-3xl font-black text-amber-100">關係訊號核對</h2></div>
        <span className="rounded-full border border-rose-100/25 bg-rose-200/10 px-3 py-1.5 text-xs font-black text-rose-100">{result.annualYear} 年文化參考</span>
      </div>
      <p className="mt-4 text-sm font-semibold leading-7 text-rose-50/80">先看可核對的八字年度訊號；出生時辰完整後，再展開紫微本命夫妻宮資料。不判定感情好壞，也不保證事件。</p>
      <article className="mt-4 rounded-2xl border border-amber-100/20 bg-amber-200/[0.06] p-4">
        <p className="text-xs font-black tracking-[0.18em] text-amber-100">交叉核對摘要・{result.crossCheck.status === 'READY' ? '資料可並列閱讀' : '待補出生時辰'}</p>
        <p className="mt-2 text-sm font-semibold leading-7 text-amber-50/88">{result.crossCheck.summary}</p>
        <p className="mt-2 text-xs leading-6 text-white/80">{result.crossCheck.limitation}</p>
      </article>
      <details className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4" open>
        <summary className="cursor-pointer list-none text-base font-black text-amber-100">查看八字年度關係訊號 <span className="ml-2 text-xs text-rose-100/80">點選可收起</span></summary>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{people.map(({ name, bazi }) => <article key={name} className="rounded-2xl border border-rose-100/12 bg-white/[0.04] p-4"><p className="font-black text-rose-100">{name}</p><p className="mt-1 text-xs font-semibold text-white/80">{bazi.inputCompleteness}・流年支 {bazi.annualBranch}</p><p className="mt-3 text-sm font-black text-amber-100">年度關係主題觸發</p>{bazi.annualTriggers.length ? <ul className="mt-2 space-y-1.5 text-sm leading-6 text-rose-50/85">{bazi.annualTriggers.map((item) => <li key={`${item.label}-${item.evidence}`}>• {item.label}：{item.evidence}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-white/80">今年未命中這組固定關係訊號；不代表感情沒有可能或沒有價值。</p>}{bazi.natalEvidence.length > 0 && <p className="mt-3 text-xs leading-6 text-white/80">命盤現位：{bazi.natalEvidence.map((item) => `${item.label}（${item.evidence}）`).join('；')}</p>}</article>)}</div>
        <p className="mt-4 text-xs leading-6 text-white/80">依據：{result.bazi.personA.sources.map((item) => `${item.title}（${item.reference}）`).join('；')}</p>
      </details>
      <details className="mt-3 rounded-2xl border border-violet-100/12 bg-violet-950/20 p-4">
        <summary className="cursor-pointer list-none text-base font-black text-violet-100">查看紫微本命夫妻宮資料 <span className="ml-2 text-xs text-violet-100/80">{result.crossCheck.status === 'READY' ? '兩人都已排出' : '需完整出生時辰'}</span></summary>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{people.map(({ name, ziwei }) => <article key={name} className="rounded-2xl border border-violet-100/10 bg-black/15 p-4"><p className="font-black text-violet-100">{name}</p>{ziwei.status === 'UNAVAILABLE_BIRTH_TIME_REQUIRED' ? <p className="mt-2 text-sm leading-7 text-white/80">時辰尚未提供，因此不以預設時辰排紫微。補上時辰後，才能解鎖本命夫妻宮與三方四正資料。</p> : <div className="mt-3 space-y-2">{ziwei.palaces?.map((palace) => <div key={palace.palace} className="rounded-xl bg-white/[0.04] p-3 text-xs leading-6 text-white/80"><b className="text-violet-100">{palace.palace}・{palace.earthlyBranch}</b><br />主星：{palace.majorStars.join('、') || '無十四主星'}<br />輔星：{palace.minorStars.join('、') || '—'}</div>)}</div>}<p className="mt-3 text-xs leading-6 text-white/80">年度紫微：規則來源待確認，現階段不推算。</p></article>)}</div>
      </details>
      <details className="mt-3 rounded-2xl border border-cyan-100/12 bg-cyan-950/15 p-4"><summary className="cursor-pointer list-none text-base font-black text-cyan-100">易經補卦 <span className="ml-2 text-xs text-cyan-100/80">尚未開放</span></summary><p className="mt-3 text-sm leading-7 text-white/80">{result.iching.limitation}</p></details>
    </section>
  );
}

const MATCH_PEARL_META: Record<MatchFiveElementKey, { name: string; title: string; surface: string; core: string; glow: string }> = {
  space: { name: '星淵虛空珠', title: '界線與視野', surface: 'radial-gradient(circle at 29% 22%, rgba(255,255,255,.96) 0 4%, rgba(196,181,253,.82) 13%, rgba(79,70,229,.82) 42%, rgba(15,23,42,.98) 75%)', core: 'radial-gradient(ellipse at 68% 70%, rgba(15,23,42,.88), transparent 59%), radial-gradient(ellipse at 35% 30%, rgba(221,214,254,.64), transparent 48%)', glow: 'rgba(167,139,250,0.55)' },
  air: { name: '蒼嵐御風珠', title: '溝通與理解', surface: 'radial-gradient(circle at 29% 22%, rgba(255,255,255,.96) 0 4%, rgba(165,243,252,.84) 13%, rgba(6,182,212,.8) 44%, rgba(8,47,73,.98) 76%)', core: 'radial-gradient(ellipse at 67% 70%, rgba(8,47,73,.88), transparent 59%), radial-gradient(ellipse at 31% 36%, rgba(207,250,254,.65), transparent 50%)', glow: 'rgba(34,211,238,0.5)' },
  water: { name: '潮汐回音珠', title: '情緒與修復', surface: 'radial-gradient(circle at 29% 21%, rgba(255,255,255,.98) 0 4%, rgba(186,230,253,.9) 12%, rgba(14,165,233,.78) 42%, rgba(8,47,73,.99) 77%)', core: 'radial-gradient(ellipse at 70% 72%, rgba(3,105,161,.92), transparent 56%), radial-gradient(ellipse at 33% 33%, rgba(224,242,254,.72), transparent 47%)', glow: 'rgba(56,189,248,0.56)' },
  fire: { name: '燼星業火珠', title: '熱度與推進', surface: 'radial-gradient(circle at 29% 22%, rgba(255,251,235,.96) 0 4%, rgba(253,186,116,.9) 13%, rgba(244,63,94,.8) 44%, rgba(76,5,25,.99) 77%)', core: 'radial-gradient(ellipse at 70% 70%, rgba(127,29,29,.9), transparent 57%), radial-gradient(ellipse at 33% 33%, rgba(254,215,170,.7), transparent 48%)', glow: 'rgba(251,113,133,0.52)' },
  earth: { name: '地脈琥珀珠', title: '穩定與承諾', surface: 'radial-gradient(circle at 29% 22%, rgba(255,251,235,.98) 0 4%, rgba(253,230,138,.85) 13%, rgba(217,119,6,.78) 44%, rgba(69,26,3,.99) 77%)', core: 'radial-gradient(ellipse at 70% 70%, rgba(120,53,15,.92), transparent 58%), radial-gradient(ellipse at 34% 32%, rgba(254,243,199,.65), transparent 48%)', glow: 'rgba(251,191,36,0.5)' },
};
const MATCH_PRODUCT_ELEMENTS: ProductElement[] = ['空', '風', '水', '火', '地'];

function MatchSharedElementPearl({ result }: { result?: MatchFiveElementResult }) {
  const [initiator, setInitiator] = useState<'personA' | 'personB' | null>(null);
  const primaryElement = result ? MATCH_ELEMENT_SHORT_LABEL[result.sharedElement] : '空';
  const { released, opening, stage, start, reseal } = useElementTreasureRitual(primaryElement);
  if (!result) return null;
  const meta = MATCH_PEARL_META[result.sharedElement];
  const elementLabel = MATCH_ELEMENT_LABEL[result.sharedElement];
  const productElement = primaryElement;
  const personalPriorities = [
    { label: '第一位先補', person: result.personA },
    { label: '第二位先補', person: result.personB },
  ] as const;
  const startUnseal = (nextInitiator: 'personA' | 'personB') => {
    if (opening) return;
    setInitiator(nextInitiator);
    start();
  };
  const initiatorName = initiator === 'personA' ? result.personA.name : initiator === 'personB' ? result.personB.name : '';
  const ritualCopy = opening ? `解封儀式進行中・${(stage ?? 0) + 1}/4` : released ? '儀式完成・五元素封印寶珠已收下' : '五元素封印寶珠・靜止等待先行者';

  return (
    <section className="fortune-card relative overflow-hidden border border-white/14 bg-[linear-gradient(135deg,rgba(8,15,31,0.98),rgba(17,24,39,0.94)_56%,rgba(8,47,73,0.78))] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.25)] sm:p-5">
      <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-5">
        <div className="relative mx-auto grid h-24 w-24 place-items-center sm:h-32 sm:w-32">
          <div className="absolute inset-[5%] rounded-full blur-2xl transition-all duration-[2800ms]" style={{ backgroundColor: meta.glow, opacity: opening ? 0.9 : released ? 0.58 : 0.36 }} />
          <div
            className={`treasure-reveal-stage treasure-reveal-stage--hero transition-all ${released || opening ? 'treasure-reveal-stage--collected' : 'treasure-reveal-stage--sealed'} ${opening ? 'treasure-reveal-stage--opening' : ''}`}
            aria-hidden="true"
          >
            <WaterTreasureOrb element={productElement} released={released || opening} burnSealOnRelease animating={opening} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[0.22em] text-cyan-100/80">
            {released ? '五元素封印寶珠・本局已解除' : opening ? '五元素封印寶珠・結界解除中' : '五顆封印寶珠・從這一顆開始解除'}
          </p>
          <h2 className="mt-1 font-serif text-2xl font-black tracking-wide text-amber-50 sm:text-3xl">{meta.name}</h2>
          <p className="mt-1 text-sm font-black text-cyan-100">{elementLabel}・{meta.title}</p>
          <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
            這一顆是兩人目前共同要補的元素。兩位老師會先解讀原因，最後由你們一起拿到這顆五元素封印寶珠、解除結界並收下它。
          </p>
          <p className="mt-2 text-xs font-black leading-5 text-amber-100/90">
            五元素共有五顆封印寶珠：空、風、水、火、地。本局只解除兩人共同先補的這一顆；其餘四顆保留封印作為對照。
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
        {personalPriorities.map(({ label, person }) => {
          const personalMeta = MATCH_PEARL_META[person.primaryElement];
          return (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
              <p className="text-xs font-black tracking-wide text-white/80">{label}</p>
              <p className="mt-1 text-sm font-black text-amber-50">{MATCH_ELEMENT_LABEL[person.primaryElement]}</p>
              <p className="mt-0.5 text-xs font-semibold text-cyan-100/80">{personalMeta.name}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs font-semibold leading-5 text-white/80">
        {ritualCopy}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" aria-label="其餘四顆封印元素對照">
        {MATCH_PRODUCT_ELEMENTS.filter((element) => element !== productElement).map((element) => (
          <div key={element} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
            <span className="treasure-reveal-stage treasure-reveal-stage--sealed scale-[0.7] shrink-0" aria-hidden="true"><WaterTreasureOrb element={element} released={false} preview /></span>
            <span className="text-xs font-black text-white/75">{element}元素・封印中</span>
          </div>
        ))}
      </div>
      {!opening && !released ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { key: 'personA' as const, label: `${result.personA.name}拿起封印寶珠` },
            { key: 'personB' as const, label: `${result.personB.name}拿起封印寶珠` },
          ].map(({ key, label }) => (
            <button
              type="button"
              key={key}
              onClick={() => startUnseal(key)}
              className="rounded-2xl border border-amber-200/45 bg-amber-300/14 px-2 py-3 text-center text-xs font-black leading-5 text-amber-50 transition active:scale-[0.99]"
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3" aria-live="polite">
          <div className={`rounded-2xl border px-4 py-3 text-center text-sm font-black ${released ? 'border-emerald-200/35 bg-emerald-300/14 text-emerald-50' : 'border-cyan-200/35 bg-cyan-300/14 text-cyan-50 animate-pulse'}`}>
            {released ? `${initiatorName}已先解除五元素封印寶珠・收下${meta.name}` : `${initiatorName}正在解除結界・請等待十二秒`}
          </div>
          {released && <button type="button" onClick={() => { setInitiator(null); reseal(); }} className="mt-2 w-full rounded-2xl border border-amber-200/55 bg-amber-300/10 px-3 py-2 text-sm font-black text-amber-50 transition active:scale-[0.99]">還原封印・再次進行完整儀式</button>}
        </div>
      )}
      <div className="mt-2 flex justify-end"><ElementUnsealSoundToggle /></div>
    </section>
  );
}


// 星軌只負責畫：元素位置照後端 orbit.generatingCycle 的順序排上五角（相生走外圈，相剋自然成為內部星形），
// 生剋圈、共同元素上下游、排序與每顆星的說明全部來自 /api/match-generate（2026-09-17 米其林審查）。
const ORBIT_SLOTS: Array<{ x: number; y: number; left: string; top: string }> = [
  { x: 50, y: 7, left: '50%', top: '7%' },
  { x: 88, y: 35, left: '88%', top: '35%' },
  { x: 73, y: 83, left: '73%', top: '83%' },
  { x: 27, y: 83, left: '27%', top: '83%' },
  { x: 12, y: 35, left: '12%', top: '35%' },
];

const ORBIT_ELEMENT_STYLE: Record<MatchFiveElementKey, { className: string; halo: string }> = {
  space: { className: 'border-violet-300/55 bg-violet-400/14 text-violet-50', halo: 'rgba(167,139,250,0.5)' },
  air: { className: 'border-cyan-300/55 bg-cyan-400/14 text-cyan-50', halo: 'rgba(34,211,238,0.46)' },
  water: { className: 'border-blue-300/55 bg-blue-400/14 text-blue-50', halo: 'rgba(96,165,250,0.46)' },
  fire: { className: 'border-rose-300/55 bg-rose-400/14 text-rose-50', halo: 'rgba(251,113,133,0.5)' },
  earth: { className: 'border-amber-300/60 bg-amber-400/16 text-amber-50', halo: 'rgba(251,191,36,0.55)' },
};

function MatchFiveElementOrbitSystem({ result }: { result: MatchFiveElementResult }) {
  const [selectedElement, setSelectedElement] = useState<MatchFiveElementKey>(result.sharedElement);
  const { orbit, elementGuide } = result;
  const slotOf = (element: MatchFiveElementKey) => ORBIT_SLOTS[Math.max(0, orbit.generatingCycle.indexOf(element))];
  const pointList = (chain: MatchFiveElementKey[]) => chain.map((element) => `${slotOf(element).x},${slotOf(element).y}`).join(' ');
  const averageOf = (element: MatchFiveElementKey) => orbit.ranking.find((item) => item.element === element)?.averageNeed ?? 0;
  const orbitElements = orbit.generatingCycle.slice(0, -1);
  const shared = elementGuide[result.sharedElement];
  const selected = elementGuide[selectedElement];
  const neighbours = [
    { label: `生${shared.short}的是`, element: orbit.shared.generatedBy, tone: 'border-amber-300/40 bg-amber-400/10 text-amber-50' },
    { label: `${shared.short}再生`, element: orbit.shared.generates, tone: 'border-amber-300/40 bg-amber-400/10 text-amber-50' },
    { label: `剋${shared.short}的是`, element: orbit.shared.controlledBy, tone: 'border-rose-300/40 bg-rose-400/10 text-rose-50' },
    { label: `${shared.short}剋`, element: orbit.shared.controls, tone: 'border-cyan-300/40 bg-cyan-400/10 text-cyan-50' },
  ];

  useEffect(() => {
    setSelectedElement(result.sharedElement);
  }, [result.sharedElement]);

  return (
    <section className="fortune-card relative overflow-hidden border-cyan-200/25 bg-[linear-gradient(145deg,rgba(8,47,73,0.32),rgba(15,23,42,0.94)_42%,rgba(76,29,149,0.24))] p-4 shadow-[0_0_34px_rgba(34,211,238,0.12)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-300 via-cyan-300 via-rose-300 to-amber-300" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[0.2em] text-cyan-100">五元素補強星軌</p>
          <h2 className="mt-2 font-serif text-3xl font-black leading-tight text-cyan-50 sm:text-5xl">
            五元素星軌配對
          </h2>
          <p className="mt-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">
            把兩人八字五行的補強需求換成五顆星：數字是兩人的平均補強值，越高越需要補。亮起的那顆是兩人共同先補的元素；點星可看它代表什麼、可以先做什麼。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-3 py-3 text-center">
            <p className="text-xs font-black text-cyan-100">兩人最缺</p>
            <p className="mt-1 whitespace-nowrap font-serif text-lg font-black leading-tight text-cyan-50 sm:text-2xl">{result.relationPair}</p>
          </div>
          <div className="rounded-2xl border border-amber-200/30 bg-amber-300/12 px-3 py-3 text-center">
            <p className="text-xs font-black text-amber-100">共同先補</p>
            <p className="mt-1 font-serif text-2xl font-black leading-none text-amber-50">{shared.short}</p>
          </div>
          <div className="rounded-2xl border border-rose-200/25 bg-rose-300/10 px-3 py-3 text-center">
            <p className="text-xs font-black text-rose-100">平均補強值</p>
            <p className="mt-1 font-serif text-2xl font-black leading-none text-rose-50">{averageOf(result.sharedElement)}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(330px,420px)_minmax(0,1fr)] lg:items-stretch">
        <div className="rounded-[28px] border border-white/10 bg-black/24 p-3 sm:p-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-black tracking-[0.16em] text-white/75">五星生剋圖</p>
            <div className="flex flex-wrap gap-1.5 text-xs font-black">
              <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2 py-1 text-amber-100">金線＝相生</span>
              <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 text-cyan-100">青線＝相剋</span>
              <span className="rounded-full border border-rose-200/30 bg-rose-400/12 px-2 py-1 text-rose-100">紅線＝剋{shared.short}的那一環</span>
              <span className="rounded-full border border-amber-100/40 bg-amber-200/12 px-2 py-1 text-amber-50">亮金線＝{shared.short}生出去的那一環</span>
            </div>
          </div>

          <div className="relative mx-auto mt-10 aspect-square w-full max-w-[390px] min-w-0">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.014)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.9" />
              <circle cx="50" cy="50" r="31" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />
              <polyline points={pointList(orbit.generatingCycle)} fill="none" stroke="rgba(251,191,36,0.22)" strokeWidth="1.35" strokeLinejoin="round" />
              <polyline points={pointList(orbit.controllingCycle)} fill="none" stroke="rgba(34,211,238,0.18)" strokeWidth="1.15" strokeLinejoin="round" />
              {/* 活體光線：金光沿相生線順跑、青光沿相剋線跑 */}
              <polyline points={pointList(orbit.generatingCycle)} fill="none" stroke="rgba(251,191,36,0.85)" strokeWidth="1.6" strokeLinejoin="round" className="orbit-line-run-gold" />
              <polyline points={pointList(orbit.controllingCycle)} fill="none" stroke="rgba(34,211,238,0.7)" strokeWidth="1.2" strokeLinejoin="round" className="orbit-line-run-cyan" />
              {/* 紅線：剋住共同先補元素的那一環 */}
              <line
                x1={slotOf(orbit.shared.controlledBy).x}
                y1={slotOf(orbit.shared.controlledBy).y}
                x2={slotOf(result.sharedElement).x}
                y2={slotOf(result.sharedElement).y}
                stroke="rgba(251,113,133,0.95)"
                strokeWidth="2.4"
                strokeLinecap="round"
                className="orbit-line-conflict-active"
              />
              {/* 亮金線：共同先補元素生出去的那一環 */}
              <line
                x1={slotOf(result.sharedElement).x}
                y1={slotOf(result.sharedElement).y}
                x2={slotOf(orbit.shared.generates).x}
                y2={slotOf(orbit.shared.generates).y}
                stroke="rgba(252,211,77,0.95)"
                strokeLinecap="round"
                className="orbit-line-repair-active"
              />
            </svg>

            <div className="absolute inset-[35%] grid place-items-center rounded-full border border-white/12 bg-slate-950/72 text-center shadow-[inset_0_0_24px_rgba(255,255,255,0.06)]">
              <div>
                <p className="text-xs font-black tracking-[0.12em] text-white/75">共同先補</p>
                <p className="mt-1 font-serif text-3xl font-black leading-none text-amber-100">{shared.short}</p>
                <p className="mt-1 text-xs font-bold text-cyan-100">點星看解讀</p>
              </div>
            </div>

            {orbitElements.map((element) => {
              const guide = elementGuide[element];
              const style = ORBIT_ELEMENT_STYLE[element];
              const score = averageOf(element);
              const isShared = element === result.sharedElement;
              const isSelected = element === selectedElement;
              const size = Math.max(66, Math.min(98, 58 + score * 0.45));

              return (
                <button
                  type="button"
                  key={element}
                  aria-pressed={isSelected}
                  aria-label={`查看${guide.label}解讀`}
                  onClick={() => setSelectedElement(element)}
                  className={`absolute grid place-items-center rounded-full border px-2 text-center ${style.className} ${
                    isSelected
                      ? 'ring-4 ring-amber-100/80'
                      : isShared
                        ? 'ring-2 ring-amber-200/55'
                        : 'ring-1 ring-white/10'
                  } transition-transform active:scale-[0.98]`}
                  style={{
                    left: slotOf(element).left,
                    top: slotOf(element).top,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: isSelected || isShared ? `0 0 ${isSelected ? 38 : 24}px ${style.halo}` : undefined,
                  }}
                >
                  <span className="sr-only">{guide.label}</span>
                  <span className="font-serif text-2xl font-black leading-none">{guide.short}</span>
                  <span className="mt-1 text-xs font-black leading-none">{score}</span>
                  <span className={`mt-1 text-xs font-black leading-tight ${isShared ? 'text-amber-50' : 'text-white/80'}`}>{isShared ? '共同先補' : isSelected ? '解讀中' : '點選'}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-3" aria-label="共同先補元素的生剋對照">
            <div className="grid grid-cols-2 gap-2 text-center">
              {neighbours.map((item) => (
                <div key={item.label} className={`rounded-xl border px-2 py-2 ${item.tone}`}>
                  <p className="text-xs font-black">{item.label}</p>
                  <p className="mt-0.5 text-base font-black">{elementGuide[item.element].short}<span className="ml-1 text-xs font-bold text-white/80">（{elementGuide[item.element].traditional}）</span></p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-xs font-bold leading-5 text-white/80">{orbit.cycleNote}</p>
            <p className="mt-1 text-center text-xs font-semibold leading-5 text-white/75">{orbit.mappingNote}</p>
          </div>
        </div>

        <div className={`rounded-[28px] border p-4 ${ORBIT_ELEMENT_STYLE[selectedElement].className}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-white/80">點星解讀</p>
              <h3 className="mt-1 text-3xl font-black leading-tight text-[color:var(--text-main)]">
                {selected.label}・{selected.title}
              </h3>
            </div>
            <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-black text-amber-50">
              平均補強值 {averageOf(selectedElement)}
            </span>
          </div>

          <p className="mt-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{selected.story}</p>

          <div className="mt-4 grid gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
              <p className="text-xs font-black text-amber-100">補起來的好處</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[color:var(--text-sub)]">{selected.benefit}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
              <p className="text-xs font-black text-rose-100">不足時容易出現</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[color:var(--text-sub)]">{selected.friction}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
              <p className="text-xs font-black text-cyan-100">可以先做的一件事</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[color:var(--text-sub)]">{selected.action}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[24px] border border-cyan-200/20 bg-cyan-300/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black tracking-[0.12em] text-cyan-100">兩人的補強方向</p>
            <span className="rounded-full border border-cyan-200/25 bg-black/20 px-3 py-1 text-xs font-black text-cyan-50">{result.relationTitle}</span>
          </div>
          <p className="mt-2 text-sm font-bold leading-6 text-[color:var(--text-sub)]">{result.relationStory}</p>
          <p className="mt-2 text-sm font-black leading-6 text-amber-100">{result.relationFocus}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-white/75">{result.sharedReason}</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/18 p-4">
          <p className="text-sm font-black tracking-[0.12em] text-white/80">兩人平均補強排序</p>
          <div className="mt-3 space-y-2">
            {orbit.ranking.map(({ element, averageNeed }, index) => (
              <button
                type="button"
                key={element}
                data-print-keep
                onClick={() => setSelectedElement(element)}
                className={`grid w-full grid-cols-[1.5rem_1fr_2.25rem] items-center gap-2 rounded-xl border px-3 py-2 text-left ${
                  selectedElement === element ? 'border-amber-200/45 bg-amber-300/12' : 'border-white/10 bg-white/[0.035]'
                }`}
              >
                <span className="text-xs font-black text-white/75">{index + 1}.</span>{' '}
                <span className="text-sm font-black text-[color:var(--text-main)]">{elementGuide[element].label}{element === result.sharedElement ? '・共同先補' : ''}</span>{' '}
                <span className="text-right text-sm font-black text-amber-100">{averageNeed}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[result.personA, result.personB].map((person) => (
          <article key={person.name} className="rounded-[24px] border border-white/10 bg-black/18 p-4">
            <p className="text-sm font-black text-cyan-100">{person.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-amber-200/20 bg-amber-300/10 p-3">
                <p className="text-xs font-black text-amber-100">最需要補</p>
                <p className="mt-1 text-lg font-black text-amber-50">{elementGuide[person.primaryElement].label}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3">
                <p className="text-xs font-black text-cyan-100">其次</p>
                <p className="mt-1 text-lg font-black text-cyan-50">{elementGuide[person.secondaryElement].label}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-[color:var(--text-sub)]">{person.reason}</p>
          </article>
        ))}
      </div>

      <p className="mt-4 text-center text-xs font-semibold leading-5 text-white/75">{result.basisNote}</p>
    </section>
  );
}

const STEP_MARK = ['①', '②', '③'];

/** 兩人各自的三核心：① 八字 → ② 紫微 → ③ 易經。只照印 /api/match-generate 的 threeCore。 */
function MatchThreeCorePanel({ view }: { view?: MatchThreeCoreView }) {
  if (!view) return null;
  return (
    <section className="fortune-card border border-violet-200/25 bg-[linear-gradient(145deg,rgba(46,16,101,0.32),rgba(15,23,42,0.95))] p-5 sm:p-6">
      <p className="text-xs font-black tracking-[0.2em] text-violet-200">① 八字 → ② 紫微 → ③ 易經</p>
      <h2 className="mt-2 font-serif text-2xl font-black text-violet-50 sm:text-3xl">兩人各自的三核心命盤</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-[color:var(--text-main)]">{view.people.map((person) => person.teaser).join('；')}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">{view.orderNote}</p>
      <details className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
        <summary className="cursor-pointer list-none text-sm font-black text-violet-100">點開看兩人的完整命盤與卦 ▾</summary>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {view.people.map((person) => (
            <article key={person.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-base font-black text-violet-100">{person.name}</p>
              <ol className="mt-3 space-y-2">
                {person.steps.map((step) => (
                  <li key={step.order} className={`rounded-xl border p-3 ${step.available ? 'border-white/10 bg-white/[0.04]' : 'border-dashed border-white/20'}`}>
                    <p className="text-xs font-black text-violet-200">{STEP_MARK[step.order - 1]} {step.title}</p>
                    <p className="mt-1 text-base font-black text-[color:var(--text-main)]">{step.value}</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--text-sub)]">{step.detail}</p>
                  </li>
                ))}
              </ol>
              {person.hexagram && (
                <div className="mt-3 rounded-2xl border border-amber-200/25 bg-amber-300/[0.06] p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl leading-none text-amber-100" aria-hidden="true">{person.hexagram.glyph}</span>
                    <div>
                      <p className="text-lg font-black text-amber-50">{person.hexagram.patternName}</p>
                      <p className="mt-1 text-xs font-bold text-amber-100/85">{person.hexagram.line}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--text-main)]">卦義：{person.hexagram.essence}</p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{person.hexagram.advice}</p>
                  <p className="mt-2 text-xs leading-5 text-white/80">{person.hexagram.basis}</p>
                </div>
              )}
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm leading-7 text-[color:var(--text-sub)]">{view.pairNote}</p>
        <ul className="mt-3 space-y-1 text-xs leading-5 text-white/80">
          {view.sourceChecks.map((line) => <li key={line}>・{line}</li>)}
        </ul>
      </details>
    </section>
  );
}

const STORY_TONE_CLASS: Record<MatchStoryTone, string> = {
  violet: 'border-violet-300/30 bg-[linear-gradient(135deg,rgba(46,16,101,0.58),rgba(10,8,22,0.88))] text-violet-100',
  rose: 'border-rose-300/35 bg-[linear-gradient(135deg,rgba(127,29,29,0.52),rgba(24,5,15,0.92))] text-rose-100',
  fuchsia: 'border-fuchsia-300/30 bg-[linear-gradient(135deg,rgba(76,29,149,0.46),rgba(28,8,38,0.92))] text-fuchsia-100',
  amber: 'border-amber-300/35 bg-[linear-gradient(135deg,rgba(120,53,15,0.48),rgba(20,12,20,0.94))] text-amber-100',
  cyan: 'border-cyan-200/30 bg-cyan-950/35 text-cyan-100',
  slate: 'border-slate-200/25 bg-slate-950/40 text-slate-100',
};

export default function MatchPage() {
  const [step, setStep] = useState<StepKey>('personA');
  const [personA, setPersonA] = useState<PersonInput>({ ...EMPTY, gender: 'female' });
  const [personB, setPersonB] = useState<PersonInput>({ ...EMPTY, gender: 'male' });
  const [personASelectionConfirm, setPersonASelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [personBSelectionConfirm, setPersonBSelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<MatchResponse | null>(null);
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<MatchDailyResult> | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!getAnalysisIdentityTarget()) {
      setAnalysisIdentityTarget('self');
    }
  }, []);

  useEffect(() => {
    const clearIdentityError = () => {
      setError((prev) => (prev === getIdentityRequiredMessage() ? '' : prev));
    };
    window.addEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
    return () => window.removeEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
  }, []);

  // 載入 localStorage 預填到 personA
  useEffect(() => {
    const saved = loadUserData();
    if (saved && !isDemoMatchName(saved.name)) {
      setPersonA((prev) => ({
        ...prev,
        name: saved.name || prev.name,
        birthDate: saved.birthday || prev.birthDate,
        bloodType: saved.bloodType || prev.bloodType,
        gender: saved.gender || prev.gender,
      }));
    }
  }, []);

  // 同步 personA 的變更到 localStorage
  useEffect(() => {
    if (getAnalysisIdentityTarget() !== 'self') return;
    if (isDemoMatchName(personA.name)) return;
    if (personA.name || personA.birthDate) {
      saveUserData({
        name: personA.name,
        birthday: personA.birthDate,
        bloodType: personA.bloodType === 'unknown' ? '' : personA.bloodType,
        gender: personA.gender,
      });
    }
  }, [personA.name, personA.birthDate, personA.bloodType, personA.gender]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const personAError = getPersonError('第一位', personA, personASelectionConfirm);
  const personBError = getPersonError('第二位', personB, personBSelectionConfirm);

  const reviewReady = !personAError && !personBError;

  function restoreDailyRecord(record: DailyAnalysisRecord<MatchDailyResult>) {
    setDailyRecord(record);
    setPersonA(record.result.personA);
    setPersonB(record.result.personB);
    setData(record.result.data);
    setStep('review');
    setError('');
    setLoading(false);
    window.setTimeout(() => {
      document.getElementById('match-result-anchor')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
  }

  useEffect(() => {
    const record = readDailyAnalysis<MatchDailyResult>('match');
    if (!record) return;
    if (isDemoMatchDailyResult(record.result) || !isCurrentMatchDailyRecord(record)) {
      clearDailyAnalysis('match');
      setDailyRecord(null);
      return;
    }
    restoreDailyRecord(record);
  }, []);

  const reviewCards = useMemo(
    () => [
      { label: '第一位', person: personA, accent: 'violet' as const },
      { label: '第二位', person: personB, accent: 'amber' as const },
    ],
    [personA, personB],
  );

  function goNext() {
    setError('');

    if (step === 'personA') {
      if (personAError) {
        setError(personAError);
        return;
      }
      setStep('personB');
      return;
    }

    if (step === 'personB') {
      if (personBError) {
        setError(personBError);
        return;
      }
      setStep('review');
    }
  }

  function goBack() {
    setError('');

    if (step === 'personB') {
      setStep('personA');
      return;
    }

    if (step === 'review') {
      setStep('personB');
    }
  }

  async function handleSubmit() {
    // 手機上點擊到 setLoading(true) 生效前有極短暫的視窗，快速重複點擊會同時
    // 建立兩個請求。用同步的 ref 鎖擋住同一次點擊的重複觸發（跟八字/西洋星座同一類修復）。
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
      const existingDaily = readDailyAnalysis<MatchDailyResult>('match');
      if (existingDaily) {
        if (!isDemoMatchDailyResult(existingDaily.result) && isCurrentMatchDailyRecord(existingDaily)) {
          restoreDailyRecord(existingDaily);
          return;
        }
        clearDailyAnalysis('match');
        setDailyRecord(null);
      }

      if (!getAnalysisIdentityTarget()) {
        setError(getIdentityRequiredMessage());
        return;
      }

      if (!reviewReady) {
        setError(personAError || personBError || '請先把兩位資料填完整。');
        return;
      }

      setError('');
      setData(null);
      setLoading(true);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20_000);

      // 帶重試機制的 fetch
      async function fetchWithRetry(maxRetries = 2) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch('/api/match-generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({ personA, personB }),
            });
            return response;
          } catch (error) {
            if (attempt === maxRetries) throw error;
            // 等待後重試，時間遞增
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }

      try {
        const response = await fetchWithRetry();
        if (!response) {
          throw new Error('未收到伺服器回應');
        }

        const json = (await response.json()) as MatchResponse & { error?: string };

        if (!response.ok) {
          setError(json.error ?? '配對分析失敗，請稍後再試。');
          return;
        }

        const nextDailyResult: MatchDailyResult = { data: json, personA, personB };
        setData(json);
        // 結果換掉表單後，把客戶帶到結果第一屏，不讓他停在頁面中段。
        window.setTimeout(() => {
          document.getElementById('match-result-anchor')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }, 80);
        if (isDemoMatchDailyResult(nextDailyResult)) {
          clearDailyAnalysis('match');
          setDailyRecord(null);
        } else {
          setDailyRecord(saveDailyAnalysis<MatchDailyResult>('match', nextDailyResult, { schemaVersion: MATCH_DAILY_SCHEMA_VERSION }));
        }
        markGrowthModuleCompleted('soul_match', json.fiveElementMatch ? (json.fiveElementMatch.sharedElement.toUpperCase() as GrowthElement) : undefined);
      } catch (error) {
        setError(error instanceof DOMException && error.name === 'AbortError'
          ? '配對分析等候時間過長，請稍後再試。'
          : '目前無法連線到配對服務，請稍後再試。');
      } finally {
        window.clearTimeout(timeout);
        setLoading(false);
      }
    } finally {
      submitLockRef.current = false;
    }
  }

  function resetAll() {
    const existingDaily = readDailyAnalysis<MatchDailyResult>('match');
    if (existingDaily) {
      if (!isDemoMatchDailyResult(existingDaily.result) && isCurrentMatchDailyRecord(existingDaily)) {
        restoreDailyRecord(existingDaily);
        return;
      }
      clearDailyAnalysis('match');
      setDailyRecord(null);
    }

    setData(null);
    setError('');
    setLoading(false);
    setStep('personA');
    setPersonA({ ...EMPTY, gender: 'female' });
    setPersonB({ ...EMPTY, gender: 'male' });
    setPersonASelectionConfirm(EMPTY_SELECTION_CONFIRM);
    setPersonBSelectionConfirm(EMPTY_SELECTION_CONFIRM);
  }

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        {!data && (
          <div className="space-y-6">
            <DailyAnalysisNotice record={dailyRecord} className="mt-4" moduleName="易經靈魂配對" onViewResult={dailyRecord ? () => restoreDailyRecord(dailyRecord) : undefined} />
            <MegaInputGuide
              title="先填第一個人，再填第二個人"
              steps={['第一位：姓名、生日、血型、性別', '第二位：同樣填一次', '最後確認兩人的資料再送出']}
              example="不知道時辰也可以先選不知道。"
              tone="rose"
            />
            {step === 'personA' && (
              <PersonStep
                title="第一位資料"
                description="先輸入第一位的姓名、生日、時辰、血型和性別。時辰不知道可直接略過。"
                accent="violet"
                value={personA}
                onChange={setPersonA}
                selectionConfirm={personASelectionConfirm}
                onSelectionConfirm={setPersonASelectionConfirm}
                showValidation={Boolean(error) && step === 'personA'}
              />
            )}

            {step === 'personB' && (
              <PersonStep
                title="第二位資料"
                description="接著輸入第二位。時辰知道就選十二時辰，不知道可直接略過。"
                accent="amber"
                value={personB}
                onChange={setPersonB}
                selectionConfirm={personBSelectionConfirm}
                onSelectionConfirm={setPersonBSelectionConfirm}
                showValidation={Boolean(error) && step === 'personB'}
              />
            )}

            {step === 'review' && (
              <div className="space-y-6">
                <div className="fortune-card p-6 sm:p-8">
                  <p className="text-xs tracking-[0.3em] text-rose-300">最後確認</p>
                  <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)]">確認資料後開始配對</h2>
                  <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
                    名字、生日、血型都沒問題，就可以開始。這一步讓你安心確認，不怕按太快。
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {reviewCards.map(({ label, person, accent }) => (
                    <div key={label} className="fortune-card p-5 sm:p-6">
                      <p className={`inline-flex rounded-full border px-4 py-1 text-xs tracking-[0.3em] ${accent === 'violet' ? 'border-violet-400/25 bg-violet-950/20 text-violet-300' : 'border-amber-400/25 bg-amber-950/20 text-amber-300'}`}>
                        {label}
                      </p>
                      <div className="mt-5 space-y-3 text-sm text-[color:var(--text-sub)]">
                        <div>
                          <span className="text-[color:var(--text-sub)]">姓名：</span>
                          <span className="text-[color:var(--text-main)]">{person.name || '未填'}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-sub)]">西元生日：</span>
                          <span className="text-[color:var(--text-main)]">{person.birthDate || '未換算完成'}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-sub)]">出生時辰：</span>
                          <span className="text-[color:var(--text-main)]">{person.birthHourBranch && person.birthHourBranch !== 'unknown' ? `${person.birthHourBranch}時` : '不知道（以三柱計算）'}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-sub)]">血型：</span>
                          <span className="text-[color:var(--text-main)]">{person.bloodType === 'unknown' ? '不知道' : `${person.bloodType} 型`}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-sub)]">性別：</span>
                          <span className="text-[color:var(--text-main)]">{person.gender === 'female' ? '女性' : '男性'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {step !== 'personA' && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  上一步
                </button>
              )}

              {step !== 'review' ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={loading}
                  className="vip-gold-btn flex-1 py-5 text-base disabled:cursor-not-allowed disabled:opacity-50 shimmer-btn"
                >
                  {step === 'personA' ? '下一步：填第二位' : '下一步：確認資料'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!reviewReady || loading}
                  className="vip-gold-btn flex-1 py-5 text-base disabled:cursor-not-allowed disabled:opacity-40 shimmer-btn"
                >
                  {loading ? '正在整理配對結果…' : getDailyAnalysisButtonLabel(dailyRecord)}
                </button>
              )}
            </div>

            <div className="grid gap-3 rounded-3xl border border-rose-300/22 bg-gradient-to-br from-rose-950/22 via-rose-950/10 to-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_30px_rgba(76,5,25,0.18)] sm:grid-cols-[minmax(0,1fr)_minmax(220px,300px)_auto] sm:items-center sm:p-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-200/80">目前進度</p>
                <p className="mt-1 bg-gradient-to-r from-rose-50 via-white to-rose-200/90 bg-clip-text font-serif text-xl font-black leading-tight tracking-[0.03em] text-transparent drop-shadow-[0_0_14px_rgba(251,113,133,0.16)]">
                  {step === 'personA' ? '先填第一位' : step === 'personB' ? '再填第二位' : '確認後開始配對'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 justify-self-center sm:w-full">
                {STEP_ORDER.map((item, index) => {
                  const active = item === step;
                  const done = index < stepIndex;
                  return (
                    <div
                      key={item}
                      className={`rounded-xl border px-2.5 py-2.5 text-center transition-all ${
                        active
                          ? 'border-rose-300/60 bg-rose-500/16 shadow-[0_0_14px_rgba(251,113,133,0.16)]'
                          : done
                            ? 'border-violet-400/30 bg-violet-500/10'
                            : 'border-white/10 bg-white/5 opacity-75'
                      }`}
                    >
                      <p className={`text-base font-black leading-none ${active ? 'text-rose-100' : done ? 'text-violet-200' : 'text-[color:var(--text-main)]'}`}>{done ? '✓' : index + 1}</p>
                      <p className={`mt-1 text-xs font-bold tracking-wide ${active ? 'text-rose-100/90' : 'text-[color:var(--text-sub)]'}`}>
                        {item === 'personA' ? '第一位' : item === 'personB' ? '第二位' : '確認'}
                      </p>
                    </div>
                  );
                })}
              </div>

              <Link
                href="/"
                className="feature-home-link feature-home-link--rose shrink-0 justify-self-end"
                aria-label={"\u8fd4\u56de\u9996\u9801"}
              >
                {"\u8fd4\u56de\u9996\u9801"}
              </Link>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div id="match-result-anchor" className="scroll-mt-4" />
            <DailyAnalysisNotice record={dailyRecord} className="mb-5" moduleName="易經靈魂配對" onViewResult={dailyRecord ? () => restoreDailyRecord(dailyRecord) : undefined} />
            {data.story && data.fiveElementMatch && (
              <section className="fortune-card border border-amber-200/30 p-5 sm:p-6" aria-label="一眼看懂">
                <p className="text-xs font-black tracking-[0.24em] text-amber-200">一眼看懂</p>
                <h2 className="mt-2 font-serif text-2xl font-black text-amber-50">{data.displayA.name} × {data.displayB.name}</h2>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-rose-200/25 bg-rose-300/10 px-2 py-3">
                    <p className="text-xs font-black text-rose-100">相處共鳴指數</p>
                    <p className="mt-1 font-serif text-3xl font-black leading-none text-rose-50">{data.result.match_score}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200/30 bg-amber-300/12 px-2 py-3">
                    <p className="text-xs font-black text-amber-100">共同先補</p>
                    <p className="mt-1 font-serif text-3xl font-black leading-none text-amber-50">{data.fiveElementMatch.elementGuide[data.fiveElementMatch.sharedElement].short}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-2 py-3">
                    <p className="text-xs font-black text-cyan-100">兩人最缺</p>
                    <p className="mt-1 whitespace-nowrap font-serif text-lg font-black leading-tight text-cyan-50 sm:text-2xl">{data.fiveElementMatch.relationPair}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-black tracking-[0.12em] text-amber-100">{data.story.closingAction.title}</p>
                <p className="mt-1 text-base font-black leading-7 text-[color:var(--text-main)]">{data.story.closingAction.copy}</p>
                <p className="mt-3 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">分數依據、兩人的三核心命盤與卦、兩位老師的解讀，都在下面。</p>
              </section>
            )}
            <MatchTeacherReadings data={data} />
            <MatchThreeCorePanel view={data.threeCore} />
            <BaziBeastPairCards
              foundation={data.baziFoundation}
              personAName={data.displayA.name}
              personBName={data.displayB.name}
              personABirthDate={personA.birthDate}
              personBBirthDate={personB.birthDate}
            />
            <RedLuanHeartbeatPanel
              result={data.redLuanHeartbeat}
              personAName={data.displayA.name}
              personBName={data.displayB.name}
            />
            {SHOW_SHARED_ELEMENT_PEARL && <MatchSharedElementPearl result={data.fiveElementMatch} />}
            {data.story && (
              <div className="fortune-card overflow-hidden border border-rose-300/35 bg-[radial-gradient(circle_at_18%_0%,rgba(127,29,29,0.38),transparent_36%),radial-gradient(circle_at_86%_14%,rgba(76,29,149,0.32),transparent_38%),linear-gradient(145deg,rgba(22,5,16,0.99),rgba(18,9,30,0.98)_55%,rgba(4,8,18,0.99))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.52)] sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black tracking-[0.3em] text-rose-100">鬼魅・神祕・靈異磁場遊戲</p>
                    <p className="mt-1 text-xs font-black tracking-[0.16em] text-rose-100/80">鬼魅儀式・虛構遊戲劇情</p>
                    <h2 className="mt-3 font-serif text-3xl font-black text-amber-100 sm:text-4xl">
                      {data.story.mystery.aIdentity} × {data.story.mystery.bIdentity}
                    </h2>
                    <p className="mt-2 text-sm font-black tracking-[0.12em] text-fuchsia-100/85">本局關卡・{data.story.mystery.realmTitle}</p>
                  </div>
                  <span className="rounded-full border border-rose-200/30 bg-rose-300/10 px-3 py-1 text-xs font-semibold text-rose-100/85">
                    {data.story.mystery.basisBadge}
                  </span>
                </div>

                <p className="mt-5 text-sm font-bold leading-8 text-amber-50/90">{data.story.mystery.opening}</p>

                <article className={`mt-4 rounded-2xl border p-4 ${STORY_TONE_CLASS[data.story.mystery.soulEcho.tone]}`}>
                  <p className="text-xs font-black tracking-[0.2em]">靈魂回音・{data.story.mystery.soulEcho.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-white/85">{data.story.mystery.soulEcho.copy}</p>
                </article>

                <div className="mt-5 grid gap-3">
                  {data.story.mystery.acts.map((act) => (
                    <article key={act.title} className={`rounded-2xl border p-4 ${STORY_TONE_CLASS[act.tone]}`}>
                      <h3 className="text-base font-black tracking-wide">{act.title}</h3>
                      <p className="mt-2 text-sm font-semibold leading-7 text-white/85">{act.copy}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="fortune-card p-6 sm:p-8 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-rose-300">配對結果</p>
              <h2 className="mt-3 font-serif text-5xl text-[color:var(--text-main)]">{data.result.match_score}</h2>
              <p className="mt-2 text-sm text-[color:var(--text-sub)]">相處共鳴指數</p>
              {data.scoreBasis && <p className="mx-auto mt-3 max-w-2xl rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.scoreBasis}</p>}
              <p className="mx-auto mt-6 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">{data.result.summary}</p>
              {data.fiveElementMatch && (
                <>
                  <p className="mx-auto mt-5 max-w-3xl text-xs font-black tracking-[0.2em] text-emerald-200">五元素補強方向</p>
                  <p className="mx-auto mt-2 max-w-3xl text-sm font-black leading-7 text-emerald-50">{data.fiveElementMatch.summary}</p>
                  <p className="mx-auto mt-2 max-w-3xl text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.fiveElementMatch.relationReason}</p>
                  <p className="mx-auto mt-2 max-w-3xl text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.fiveElementMatch.basisNote}</p>
                  {data.baziFoundation?.timeNote && <p className="mx-auto mt-1 max-w-3xl text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.baziFoundation.timeNote}</p>}
                </>
              )}
            </div>

            {data.fiveElementMatch && <MatchFiveElementOrbitSystem result={data.fiveElementMatch} />}

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="fortune-card p-6 sm:p-8">
                <p className="mb-6 text-xs tracking-[0.35em] text-[color:var(--text-sub)]">四項核心指標</p>
                <div className="space-y-5">
                  <ScoreRow label="共鳴感" score={data.result.resonance} tone="violet" />
                  <ScoreRow label="溝通感" score={data.result.communication} tone="cyan" />
                  <ScoreRow label="穩定度" score={data.result.stability} tone="amber" />
                  <ScoreRow label="衝突風險" score={data.result.conflict_risk} tone="pink" />
                </div>
              </div>

              <div className="fortune-card p-6 sm:p-8">
                <p className="mb-6 text-xs uppercase tracking-[0.35em] text-rose-300">雙方基本資料</p>
                <div className="space-y-5 text-sm">
                  <div>
                    <p className="font-semibold text-violet-300">{data.displayA.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayA.zodiacZh} · {data.displayA.chineseZodiac} · {data.displayA.bloodTypeLabel}
                    </p>
                    {data.fiveElementMatch && (
                      <p className="mt-2 text-xs font-semibold leading-6 text-emerald-100/90">{data.fiveElementMatch.personA.reason} {data.fiveElementMatch.personA.changeTarget}</p>
                    )}
                  </div>
                  <div className="h-px bg-white/10" />
                  <div>
                    <p className="font-semibold text-amber-300">{data.displayB.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayB.zodiacZh} · {data.displayB.chineseZodiac} · {data.displayB.bloodTypeLabel}
                    </p>
                    {data.fiveElementMatch && (
                      <p className="mt-2 text-xs font-semibold leading-6 text-amber-100/90">{data.fiveElementMatch.personB.reason} {data.fiveElementMatch.personB.changeTarget}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: '最有共鳴', items: data.result.zones.resonance, tone: 'violet' },
                { title: '互補優勢', items: data.result.zones.complement, tone: 'amber' },
                { title: '需要磨合', items: data.result.zones.grinding, tone: 'cyan' },
                { title: '注意衝突', items: data.result.zones.conflict, tone: 'pink' },
              ].map((section) => (
                <div key={section.title} className="fortune-card p-5 sm:p-6">
                  <p className={`text-sm font-semibold ${section.tone === 'violet' ? 'text-violet-300' : section.tone === 'amber' ? 'text-amber-300' : section.tone === 'cyan' ? 'text-cyan-300' : 'text-pink-300'}`}>
                    {section.title}
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--text-sub)]">
                    {section.items.slice(0, 3).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {data.story && (
              <div className="fortune-card border border-amber-200/30 p-6 sm:p-8">
                <p className="text-xs font-black tracking-[0.24em] text-amber-200">下一步</p>
                <h2 className="mt-2 font-serif text-2xl font-black text-amber-50">{data.story.closingAction.title}</h2>
                <p className="mt-3 text-base font-black leading-8 text-[color:var(--text-main)]">{data.story.closingAction.copy}</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{data.story.closingAction.why}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => window.print()} className="vip-gold-btn flex-1 py-4 text-sm">
                匯出配對報告
              </button>
              <Link
                href="/"
                className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-6 py-4 text-center text-sm font-black text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
              >
                回到主頁
              </Link>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
              >
                重新輸入
              </button>
            </div>

            <NextStepGuide current="match" hideDestinations={['music', 'insight']} />
          </div>
        )}
      </main>
    </div>
  );
}
