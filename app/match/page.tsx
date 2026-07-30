'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import NextStepGuide from '@/components/NextStepGuide';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import { saveUserData, loadUserData } from '@/lib/storage';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import type { GrowthElement } from '@/lib/growth-center-engine';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';

interface PersonInput {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
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
}


type MatchFiveElementKey = 'earth' | 'water' | 'fire' | 'air' | 'space';

interface MatchFiveElementPersonResult {
  name: string;
  primaryElement: MatchFiveElementKey;
  secondaryElement: MatchFiveElementKey;
  elementScores: Record<MatchFiveElementKey, number>;
  needScores: Record<MatchFiveElementKey, number>;
  reason: string;
  changeTarget: string;
}

interface MatchFiveElementResult {
  engineVersion: 'match_five_element_v1';
  summary: string;
  relationMode: 'generating' | 'conflicting' | 'balancing';
  sharedElement: MatchFiveElementKey;
  sharedAction: string;
  relationReason: string;
  personA: MatchFiveElementPersonResult;
  personB: MatchFiveElementPersonResult;
  integratedAdvice: string;
  inlineHighlights: string[];
}
interface MatchResponse {
  result: MatchResult;
  displayA: PersonDisplay;
  displayB: PersonDisplay;
  fiveElementMatch?: MatchFiveElementResult;
}

type StepKey = 'personA' | 'personB' | 'review';
type SelectionConfirm = { bloodType: boolean; gender: boolean };

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const EMPTY: PersonInput = { name: '', birthDate: '', bloodType: 'A', gender: 'female' };
const EMPTY_SELECTION_CONFIRM: SelectionConfirm = { bloodType: false, gender: false };

const BLOOD_DESC: Record<PersonInput['bloodType'], string> = {
  A: '細膩穩定，重視秩序與安全感。',
  B: '自主鮮明，節奏感強，較有個人風格。',
  AB: '理性感性並存，觀察力與距離感並行。',
  O: '主動直接，行動力高，帶動感明顯。',
};

const STEP_ORDER: StepKey[] = ['personA', 'personB', 'review'];

function getPersonError(label: string, person: PersonInput, selectionConfirm?: SelectionConfirm) {
  if (person.name.trim().length < 2) return `請先輸入${label}姓名，至少 2 個字。`;
  if (!person.birthDate) return `請先完成${label}的萬年曆生日推算。`;
  if (selectionConfirm && !selectionConfirm.bloodType) return `請點選${label}血型。`;
  if (selectionConfirm && !selectionConfirm.gender) return `請點選${label}性別。`;
  return '';
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickStable<T>(items: T[], seed: number, salt = 0) {
  return items[(seed + salt) % items.length];
}

function buildMatchGuidance(data: MatchResponse) {
  const aName = data.displayA.name || '第一位';
  const bName = data.displayB.name || '第二位';
  const result = data.result;
  const seed = stableHash([
    aName,
    bName,
    data.displayA.zodiacZh,
    data.displayB.zodiacZh,
    data.displayA.bloodType,
    data.displayB.bloodType,
    result.match_score,
    result.resonance,
    result.communication,
    result.stability,
    result.conflict_risk,
  ].join('|'));
  const strongestMetric = [
    ['共鳴感', result.resonance],
    ['溝通感', result.communication],
    ['穩定度', result.stability],
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const weakestMetric = [
    ['共鳴感', result.resonance],
    ['溝通感', result.communication],
    ['穩定度', result.stability],
    ['衝突風險', 100 - result.conflict_risk],
  ].sort((a, b) => Number(a[1]) - Number(b[1]))[0];
  const strongestZone = result.zones.resonance[seed % Math.max(1, result.zones.resonance.length)] ?? '彼此有值得珍惜的吸引力';
  const frictionZone = result.zones.conflict[seed % Math.max(1, result.zones.conflict.length)] ?? result.zones.grinding[0] ?? '先把溝通節奏放慢';
  const scoreLevel = result.match_score >= 80 ? '高共鳴' : result.match_score >= 65 ? '可經營' : '需要耐心磨合';

  const encouragementOptions = [
    `${aName}與${bName}的關係不是只看分數，而是看你們願不願意把「${strongestMetric[0]}」變成日常裡可被感受到的善意。`,
    `${aName}與${bName}目前屬於「${scoreLevel}」型配對；真正能讓關係往前的，是把優勢用在理解，而不是用在拉扯。`,
    `這段關係最值得珍惜的是「${strongestZone}」。只要願意把這份相應力落到行動，關係就會比現在更穩。`,
  ];
  const warningOptions = result.conflict_risk >= 60
    ? [
        `目前需要留意「${frictionZone}」。衝突不是不能化解，但一定要先停止互相猜測。`,
        `這段關係的壓力點不小，越在意彼此，越要避免用情緒逼對方立刻理解。`,
        `當衝突升高時，先暫停、再表達需求；不要把一時的語氣當成整段關係的答案。`,
      ]
    : [
        `目前最大提醒是別把好感當成理所當然，穩定關係仍需要持續回應。`,
        `即使衝突風險不高，也要避免冷處理；小事說清楚，大事才不會累積。`,
        `這段關係適合慢慢加深，但仍要定期確認彼此的安全感與期待。`,
      ];
  const actionOptions = [
    result.communication < 65
      ? '每次談重要事情前，先說清楚「我需要被聽見」還是「我需要建議」，讓對方知道怎麼愛你。'
      : '保留固定的深聊時間，把感謝、壓力與期待說成具體事件，不用讓對方猜。',
    result.stability < 65
      ? '先建立一個固定相處節奏，例如每週一次不被打擾的對話，讓安全感慢慢回來。'
      : '把已經穩定的地方延續下去，再慢慢處理需要磨合的小裂縫。',
    result.conflict_risk >= 60
      ? '約定暫停信號：任何一方情緒上來時先停五分鐘，再回來講真正需求。'
      : '主動放大對方做對的事，讓關係靠鼓勵前進，而不是靠糾錯維持。',
  ];

  return {
    level: scoreLevel,
    coreEncouragement: pickStable(encouragementOptions, seed),
    mainStrength: `目前優勢在「${strongestMetric[0]}」，代表${aName}與${bName}之間有一個可以被經營放大的正向入口。`,
    mainWarning: pickStable(warningOptions, seed, 5),
    actionAdvice: pickStable(actionOptions, seed, 9),
    growthReminder: `成長提醒：${weakestMetric[0]}不是判決，而是你們今年最適合一起練習的功課；願意改過、願意靠近，才是真正的順天。`,
  };
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
      ? 'border-violet-400 bg-violet-500/15 text-violet-100'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
    amber: active
      ? 'border-amber-400 bg-amber-500/15 text-amber-100'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
    pink: active
      ? 'border-pink-400 bg-pink-500/15 text-pink-100'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
    cyan: active
      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100'
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
        className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)] hover:bg-cyan-500/25 transition-all focus:outline-none"
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
              className="block mt-2 text-[10px] font-bold text-cyan-400 text-right w-full hover:underline"
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
  onChange: (value: PersonInput) => void;
  selectionConfirm: SelectionConfirm;
  onSelectionConfirm: (value: SelectionConfirm) => void;
  showValidation?: boolean;
}) {
  const showMissingName = showValidation && value.name.trim().length < 2;
  const showMissingBirthDate = showValidation && !value.birthDate;
  const showMissingBloodType = showValidation && !selectionConfirm.bloodType;
  const showMissingGender = showValidation && !selectionConfirm.gender;
  return (
    <div className="fortune-card p-6 sm:p-8">
      <p className={`inline-flex rounded-full border px-4 py-1 text-xs tracking-[0.3em] ${accent === 'violet' ? 'border-violet-400/25 bg-violet-950/20 text-violet-300' : 'border-amber-400/25 bg-amber-950/20 text-amber-300'}`}>
        {title}
      </p>

      <h2 className="mt-4 font-serif text-3xl text-[color:var(--text-main)]">照順序填，不會漏</h2>
      <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{description}</p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
            1. 姓名
            <OracleHint text="🔮 姓名乃人和磁場之五格載體，大數據將通過姓名聲波諧振進行血緣與宿命課題共振。" />
          </label>
          <input
            type="text"
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            placeholder="請輸入姓名，至少 2 個字"
            className={`form-input w-full text-base neon-input-focus neon-card-hover glass-input ${accent === 'violet' ? 'glass-input-cyan' : ''} ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
          />
          {showMissingName && (
            <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002"}</p>
          )}
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
            2. 出生日期（萬年曆）
            <OracleHint text="🪐 生辰乃星曜入宮的天命坐標，系統將自動換算為紫微干支天盤以進行宿命軌道分析。" />
          </label>
          <LunarBirthdayInput
            value={value.birthDate}
            onChange={(solarDate) => onChange({ ...value, birthDate: solarDate })}
            accent={accent}
            label="請選擇國曆或農曆"
          />
          {showMissingBirthDate && (
            <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\u3002"}</p>
          )}
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
            3. 血型
            <OracleHint text="🧬 血型蘊含地脈遺傳之性格吸引力密碼，決定了雙人磁場的基礎吸引力與相處共鳴率。" />
          </label>
          {showMissingBloodType && (
            <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u8840\u578b\uff0c\u9019\u6b04\u9084\u6c92\u6709\u9078\u3002"}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {BLOOD_TYPES.map((bloodType, index) => (
              <ElderChoiceCard
                key={bloodType}
                active={selectionConfirm.bloodType && value.bloodType === bloodType}
                title={`${bloodType} 型`}
                description={BLOOD_DESC[bloodType]}
                onClick={() => {
                  onChange({ ...value, bloodType });
                  onSelectionConfirm({ ...selectionConfirm, bloodType: true });
                }}
                tone={index % 2 === 0 ? accent : accent === 'violet' ? 'cyan' : 'pink'}
                attention={showMissingBloodType}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
            4. 性別
            <OracleHint text="✦ 性別主要作為外在表徵與修辭調整的輔助變數，不影響底層天盤骨架的因果計算。" />
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
                onChange({ ...value, gender: 'female' });
                onSelectionConfirm({ ...selectionConfirm, gender: true });
              }}
              tone="pink"
              attention={showMissingGender}
            />
            <ElderChoiceCard
              active={selectionConfirm.gender && value.gender === 'male'}
              title="男性"
              description="只做外在呈現修飾。"
              onClick={() => {
                onChange({ ...value, gender: 'male' });
                onSelectionConfirm({ ...selectionConfirm, gender: true });
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
  earth: '\u5730\u5143\u7d20',
  water: '\u6c34\u5143\u7d20',
  fire: '\u706b\u5143\u7d20',
  air: '\u98a8\u5143\u7d20',
  space: '\u7a7a\u5143\u7d20',
};

const MATCH_ELEMENT_ICON: Record<MatchFiveElementKey, string> = {
  earth: '\u25cf',
  water: '\u25c6',
  fire: '\u25b2',
  air: '\u25ce',
  space: '\u2605',
};

const MATCH_RELATION_LABEL: Record<MatchFiveElementResult['relationMode'], string> = {
  generating: '\u76f8\u751f\u512a\u52e2',
  conflicting: '\u76f8\u514b\u9700\u8981\u8abf\u548c',
  balancing: '\u5e73\u8861\u88dc\u5f37',
};

function MatchNeedBars({ person }: { person: MatchFiveElementPersonResult }) {
  const sortedNeeds = (Object.entries(person.needScores) as Array<[MatchFiveElementKey, number]>).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-2">
      {sortedNeeds.map(([element, score]) => (
        <div key={element} className="grid grid-cols-[3.75rem_1fr_2.5rem] items-center gap-2 text-xs font-bold text-[color:var(--text-sub)]">
          <span className="inline-flex items-center gap-1 text-amber-50">
            <span aria-hidden="true">{MATCH_ELEMENT_ICON[element]}</span>
            <span>{MATCH_ELEMENT_LABEL[element]}</span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-300"
              style={{ width: `${Math.max(8, Math.min(100, score))}%` }}
            />
          </span>
          <span className="text-right text-amber-100">{score}</span>
        </div>
      ))}
    </div>
  );
}

function MatchFiveElementPriorityCard({ result }: { result: MatchFiveElementResult }) {
  return (
    <section className="fortune-card relative overflow-hidden border-rose-300/35 bg-[linear-gradient(135deg,rgba(127,29,29,0.36),rgba(15,23,42,0.9)_42%,rgba(120,53,15,0.3))] p-5 shadow-[0_0_40px_rgba(251,113,133,0.16)] sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-300" />
      <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-200">ELEMENT PRIORITY</p>
      <h2 className="mt-3 font-serif text-3xl font-black leading-tight text-amber-100 sm:text-5xl">
        {'\u9748\u9b42\u914d\u5c0d 5 \u5143\u7d20\u88dc\u5f37\uff1a'}
        <span className="text-rose-200">{'\u5171\u540c\u5148\u88dc '}{MATCH_ELEMENT_LABEL[result.sharedElement]}</span>
      </h2>
      <p className="mt-4 text-base font-black leading-8 text-amber-50">{result.summary}</p>

      <div className="mt-4 rounded-2xl border border-rose-200/25 bg-rose-500/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-100">{MATCH_RELATION_LABEL[result.relationMode]}</p>
        <p className="mt-2 text-sm font-black leading-7 text-rose-50">{result.relationReason}</p>
        <p className="mt-2 text-sm font-bold leading-7 text-amber-100">{result.sharedAction}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {[result.personA, result.personB].map((person) => (
          <article key={person.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-cyan-100">{person.name}</p>
                <p className="mt-1 text-2xl font-black text-amber-100">{'\u5148\u88dc '}{MATCH_ELEMENT_LABEL[person.primaryElement]}</p>
              </div>
              <span className="shrink-0 rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
                {'\u7b2c\u4e8c '}{MATCH_ELEMENT_LABEL[person.secondaryElement]}
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{person.reason}</p>
            <p className="mt-2 text-xs font-bold leading-6 text-amber-100">{person.changeTarget}</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <MatchNeedBars person={person} />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200/25 bg-amber-300/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">{'\u624b\u934a\u88dc\u5f37\u65b9\u5411'}</p>
        <p className="mt-2 text-sm font-black leading-7 text-amber-100">{result.integratedAdvice}</p>
        <div className="mt-3 space-y-2">
          {result.inlineHighlights.slice(0, 4).map((item) => (
            <p key={item} className="rounded-xl border border-amber-200/15 bg-black/15 px-3 py-2 text-xs font-bold leading-6 text-amber-100">{item}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
export default function MatchPage() {
  const [step, setStep] = useState<StepKey>('personA');
  const [personA, setPersonA] = useState<PersonInput>({ ...EMPTY, gender: 'female' });
  const [personB, setPersonB] = useState<PersonInput>({ ...EMPTY, gender: 'male' });
  const [personASelectionConfirm, setPersonASelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [personBSelectionConfirm, setPersonBSelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<MatchResponse | null>(null);

  // 載入 localStorage 預填到 personA
  useEffect(() => {
    const saved = loadUserData();
    if (saved) {
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
    if (personA.name || personA.birthDate) {
      saveUserData({
        name: personA.name,
        birthday: personA.birthDate,
        bloodType: personA.bloodType,
        gender: personA.gender,
      });
    }
  }, [personA.name, personA.birthDate, personA.bloodType, personA.gender]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const personAError = getPersonError('第一位', personA, personASelectionConfirm);
  const personBError = getPersonError('第二位', personB, personBSelectionConfirm);

  const reviewReady = !personAError && !personBError;

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

      setData(json);
      markGrowthModuleCompleted('soul_match', json.fiveElementMatch ? (json.fiveElementMatch.sharedElement.toUpperCase() as GrowthElement) : undefined);
    } catch (error) {
      setError(error instanceof DOMException && error.name === 'AbortError'
        ? '配對分析等候時間過長，請稍後再試。'
        : '目前無法連線到配對服務，請稍後再試。');
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  function resetAll() {
    setData(null);
    setError('');
    setStep('personA');
    setPersonASelectionConfirm(EMPTY_SELECTION_CONFIRM);
    setPersonBSelectionConfirm(EMPTY_SELECTION_CONFIRM);
  }

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-4 flex justify-end sm:mb-5">
          <Link
            href="/"
            className="feature-home-link feature-home-link--rose shrink-0"
            aria-label={"\u8fd4\u56de\u9996\u9801"}
          >
            {"\u8fd4\u56de\u9996\u9801"}
          </Link>
        </div>

        {!data && (
          <div className="space-y-6">
            <IdentitySplitSelector />
            <div className="fortune-card p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs tracking-[0.3em] text-[color:var(--text-muted)]">目前進度</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">
                    {step === 'personA' ? '先填第一位' : step === 'personB' ? '再填第二位' : '確認後開始配對'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:min-w-[280px]">
                  {STEP_ORDER.map((item, index) => {
                    const active = item === step;
                    const done = index < stepIndex;
                    return (
                      <div
                        key={item}
                        className={`rounded-2xl border px-3 py-3 text-center ${
                          active
                            ? 'border-rose-400/40 bg-rose-500/12'
                            : done
                              ? 'border-violet-400/30 bg-violet-500/10'
                              : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <p className="text-lg font-bold text-[color:var(--text-main)]">{done ? '✓' : index + 1}</p>
                        <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                          {item === 'personA' ? '第一位' : item === 'personB' ? '第二位' : '確認'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {step === 'personA' && (
              <PersonStep
                title="第一位資料"
                description="先輸入第一位的姓名、生日、血型和性別。填好後再進下一位。"
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
                description="接著輸入第二位。欄位一樣，跟著順序填就好。"
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
                          <span className="text-[color:var(--text-muted)]">姓名：</span>
                          <span className="text-[color:var(--text-main)]">{person.name || '未填'}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-muted)]">西元生日：</span>
                          <span className="text-[color:var(--text-main)]">{person.birthDate || '未換算完成'}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-muted)]">血型：</span>
                          <span className="text-[color:var(--text-main)]">{person.bloodType} 型</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-muted)]">性別：</span>
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
                  {loading ? '正在整理配對結果…' : '查看配對結果'}
                </button>
              )}
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {(() => {
              const guidance = buildMatchGuidance(data);
              return (
                <div className="fortune-card border border-amber-300/25 bg-amber-950/10 p-6 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-amber-300">專屬配對鼓勵與建議</p>
                      <h2 className="mt-3 font-serif text-2xl text-amber-100 sm:text-3xl">
                        {data.displayA.name} × {data.displayB.name} · {guidance.level}
                      </h2>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--text-sub)]">
                      依輸入資料生成
                    </span>
                  </div>

                  <p className="mt-5 text-sm leading-8 text-amber-50">{guidance.coreEncouragement}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-950/15 p-4">
                      <p className="text-xs font-semibold text-cyan-200">目前優勢</p>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{guidance.mainStrength}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-300/20 bg-rose-950/15 p-4">
                      <p className="text-xs font-semibold text-rose-200">需要留意</p>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{guidance.mainWarning}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-950/15 p-4">
                      <p className="text-xs font-semibold text-emerald-200">可執行建議</p>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{guidance.actionAdvice}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-300/20 bg-black/15 p-4">
                      <p className="text-xs font-semibold text-amber-200">成長提醒</p>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{guidance.growthReminder}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="fortune-card p-6 sm:p-8 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-rose-300">配對結果</p>
              <h2 className="mt-3 font-serif text-5xl text-[color:var(--text-main)]">{data.result.match_score}</h2>
              <p className="mt-2 text-sm text-[color:var(--text-sub)]">相處共鳴指數</p>
              <p className="mx-auto mt-6 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">{data.result.summary}</p>
              {data.fiveElementMatch && (
                <>
                  <p className="mx-auto mt-5 max-w-3xl text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">5 元素後端判定</p>
                  <p className="mx-auto mt-2 max-w-3xl text-sm font-black leading-7 text-emerald-50">{data.fiveElementMatch.summary}</p>
                  <p className="mx-auto mt-2 max-w-3xl text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.fiveElementMatch.relationReason}</p>
                </>
              )}
            </div>

            {data.fiveElementMatch && <MatchFiveElementPriorityCard result={data.fiveElementMatch} />}

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="fortune-card p-6 sm:p-8">
                <p className="mb-6 text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">四項核心指標</p>
                <div className="space-y-5">
                  <ScoreRow label="共鳴感" score={data.result.resonance} tone="violet" />
                  <ScoreRow label="溝通感" score={data.result.communication} tone="cyan" />
                  <ScoreRow label="穩定度" score={data.result.stability} tone="amber" />
                  <ScoreRow label="衝突風險" score={data.result.conflict_risk} tone="pink" />
                </div>
              </div>

              <div className="fortune-card p-6 sm:p-8">
                <p className="mb-6 text-xs uppercase tracking-[0.35em] text-rose-300">雙方宿命星盤軌道</p>
                <div className="space-y-5 text-sm">
                  <div>
                    <p className="font-semibold text-violet-300">{data.displayA.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayA.zodiacZh} · {data.displayA.chineseZodiac} · {data.displayA.bloodType} 型
                    </p>
                    {data.fiveElementMatch && (
                      <p className="mt-2 text-xs font-semibold leading-6 text-emerald-100/90">{data.fiveElementMatch.personA.reason} {data.fiveElementMatch.personA.changeTarget}</p>
                    )}
                  </div>
                  <div className="h-px bg-white/10" />
                  <div>
                    <p className="font-semibold text-amber-300">{data.displayB.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayB.zodiacZh} · {data.displayB.chineseZodiac} · {data.displayB.bloodType} 型
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => window.print()} className="vip-gold-btn flex-1 py-4 text-sm">
                匯出配對報告
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
              >
                重新輸入
              </button>
            </div>

            <NextStepGuide current="match" />
          </div>
        )}
      </main>
    </div>
  );
}
