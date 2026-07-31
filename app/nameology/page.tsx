'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import FriendlyChoiceCard from '@/components/FriendlyChoiceCard';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import type { BloodType, Gender } from '@/lib/types';
import type { NameologyAnalysis } from '@/lib/nameology-engine';
import type { FiveElementIntegrationResult } from '@/lib/five-element-engine';
import FiveElementPriorityCard from '@/components/FiveElementPriorityCard';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import { clearDailyAnalysis, getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';

type NameologyResponse = {
  ok: boolean;
  mode: 'nameology';
  analysis: NameologyAnalysis;
  fiveElement: FiveElementIntegrationResult;
};

type FormState = {
  name: string;
  birthDate: string;
  bloodType: Exclude<BloodType, ''>;
  gender: Gender;
};

type SelectionConfirm = { bloodType: boolean; gender: boolean };
type NameologyDailyResult = { analysis: NameologyAnalysis; fiveElement: FiveElementIntegrationResult };


const BLOOD_TYPES: Array<Exclude<BloodType, ''>> = ['A', 'B', 'AB', 'O'];

const initialForm: FormState = {
  name: '',
  birthDate: '',
  bloodType: 'O',
  gender: 'male',
};

const initialSelectionConfirm: SelectionConfirm = { bloodType: false, gender: false };
const NAMEOLOGY_DAILY_SCHEMA_VERSION = 'nameology-three-layer-v3';

function isCurrentNameologyResult(value?: NameologyDailyResult | null) {
  return Boolean(value?.analysis?.professionalLayer?.characterDecomposition?.length && value.analysis.aiInterpretationLayer?.interpretationPoints?.length && value.analysis.reinforcementLayer?.priorities?.length && value.fiveElement);
}

function isCurrentNameologyRecord(record?: DailyAnalysisRecord<NameologyDailyResult> | null) {
  return Boolean(record?.meta?.schemaVersion === NAMEOLOGY_DAILY_SCHEMA_VERSION && isCurrentNameologyResult(record.result));
}

function ProfessionalNameologyLayer({ analysis }: { analysis: NameologyAnalysis }) {
  const layer = analysis.professionalLayer;
  if (!layer?.characterDecomposition?.length) return null;

  const infoItems = [
    { label: '\u59d3\u6c0f', value: layer.nameStructure.surname || '-' },
    { label: '\u540d\u5b57', value: layer.nameStructure.givenName || '-' },
    { label: '\u7e3d\u5b57\u6578', value: String(layer.nameStructure.totalCharacters) + '\u5b57' },
  ];

  return (
    <section className="fortune-card overflow-hidden border-cyan-300/20 bg-slate-950/60 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">PROFESSIONAL LAYER</p>
          <h2 className="mt-3 break-words font-serif text-3xl font-black text-cyan-100 sm:text-4xl">
            {'\u7b2c\u4e00\u5c64\uff5c\u5c08\u696d\u59d3\u540d\u62c6\u89e3'}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
            {'\u6b64\u5c64\u53ea\u5efa\u7acb\u59d3\u540d\u62c6\u89e3\u3001\u90e8\u9996\u610f\u5883\u3001\u5b57\u7fa9\u89e3\u8aaa\u8207\u540d\u5b57\u6545\u4e8b\uff0c\u4e0d\u505a\u4e94\u5143\u7d20\u88dc\u5f37\u5efa\u8b70\u3002'}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 lg:w-[280px]">
          {infoItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
              <p className="text-[11px] text-[color:var(--text-muted)]">{item.label}</p>
              <p className="mt-1 break-words text-sm font-black text-cyan-100">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {layer.characterDecomposition.map((item) => (
          <article key={String(item.position) + '-' + item.char} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(8,13,30,0.26)]">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-950/25 font-serif text-4xl font-black text-amber-100">
                {item.char}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-100">{item.role}</span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-950/20 px-3 py-1 text-xs text-amber-100">{item.strokeCount}{'\u756b'} {'\u00b7'} {item.element}{item.yinYang}</span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-[color:var(--text-sub)]">{'\u90e8\u9996'} {item.radical}</span>
                </div>
                <p className="mt-3 break-words text-sm leading-7 text-[color:var(--text-main)]">{item.storyLine}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/15 p-3">
                <p className="text-[11px] font-bold text-cyan-200">{'\u90e8\u9996\u610f\u5883'}</p>
                <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{item.radicalImagery}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-3">
                <p className="text-[11px] font-bold text-violet-200">{'\u62c6\u5b57\u8207\u7d50\u69cb'}</p>
                <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{item.parts.join('\u3001')} {'\u00b7'} {item.structure}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-3 sm:col-span-2">
                <p className="text-[11px] font-bold text-amber-200">{'\u5b57\u7fa9\u89e3\u8aaa'}</p>
                <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{item.glyphMeaning}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-3 sm:col-span-2">
                <p className="text-[11px] font-bold text-emerald-200">{'\u547d\u540d\u610f\u5716'}</p>
                <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{item.namingIntent}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-3 sm:col-span-2">
                <p className="text-[11px] font-bold text-rose-200">{'\u5f8c\u7e8c\u6f14\u5316\u7d20\u6750'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.evolutionMaterial.slice(0, 4).map((material) => (
                    <span key={material} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-[color:var(--text-sub)]">{material}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-950/15 p-4">
          <p className="text-xs font-bold text-cyan-200">{'\u90e8\u9996\u4e3b\u8ef8'}</p>
          <p className="mt-2 break-words text-sm leading-7 text-[color:var(--text-sub)]">{layer.radicalNarrative}</p>
        </div>
        <div className="rounded-2xl border border-amber-300/15 bg-amber-950/15 p-4">
          <p className="text-xs font-bold text-amber-200">{'\u540d\u5b57\u6545\u4e8b'}</p>
          <p className="mt-2 break-words text-sm leading-7 text-[color:var(--text-sub)]">{layer.nameStory}</p>
        </div>
        <div className="rounded-2xl border border-violet-300/15 bg-violet-950/15 p-4">
          <p className="text-xs font-bold text-violet-200">{'\u5c08\u696d\u6458\u8981'}</p>
          <p className="mt-2 break-words text-sm leading-7 text-[color:var(--text-sub)]">{layer.professionalSummary}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-bold text-[color:var(--text-main)]">{'\u5c64\u7d1a\u908a\u754c'}</p>
        <ul className="mt-2 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
          {layer.readingBoundaries.map((item) => <li key={item}>{'\u00b7'} {item}</li>)}
        </ul>
      </div>
    </section>
  );
}

const BLOOD_DESC: Record<Exclude<BloodType, ''>, string> = {
  A: '細膩穩定，重視秩序、承諾與安全感。',
  B: '自主鮮明，重視自由、節奏與個人風格。',
  AB: '理性感性並存，觀察力與整合力較明顯。',
  O: '主動直接，行動力、號召力與外放感較強。',
};


function NameologyAiFlowLayers({ analysis }: { analysis: NameologyAnalysis }) {
  const layer2 = analysis.aiInterpretationLayer;
  const layer3 = analysis.reinforcementLayer;
  if (!layer2?.interpretationPoints?.length || !layer3?.priorities?.length) return null;

  return (
    <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="fortune-card border-violet-300/20 bg-slate-950/55 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-violet-300">AI INTERPRETATION</p>
        <h2 className="mt-3 break-words font-serif text-3xl font-black text-violet-100 sm:text-4xl">
          {'\u7b2c\u4e8c\u5c64\uff5cAI \u6df1\u5ea6\u89e3\u8b80'}
        </h2>
        <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{layer2.userReadableSummary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {layer2.focusElements.map((element, index) => (
            <span key={String(index) + element} className="rounded-full border border-violet-300/20 bg-violet-950/25 px-3 py-1 text-xs font-bold text-violet-100">
              {'\u89e3\u8b80\u8ef8'} {index + 1} {'\u00b7'} {element}
            </span>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {layer2.interpretationPoints.map((point) => (
            <article key={point.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold text-violet-200">{point.title}</p>
              <p className="mt-2 break-words text-sm leading-7 text-[color:var(--text-main)]">{point.reading}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {point.sourceEvidence.slice(0, 3).map((evidence) => (
                  <span key={evidence} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-[color:var(--text-sub)]">{evidence}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-bold text-cyan-200">{'\u6027\u683c\u6545\u4e8b'}</p>
            <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{layer2.personalityStory}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-bold text-amber-200">{'\u95dc\u4fc2\u98a8\u683c'}</p>
            <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{layer2.relationshipStyle}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-bold text-rose-200">{'\u96b1\u6027\u62c9\u626f'}</p>
            <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{layer2.hiddenTension}</p>
          </div>
        </div>
      </div>

      <div className="fortune-card border-amber-300/25 bg-amber-950/10 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">AI REINFORCEMENT</p>
        <h2 className="mt-3 break-words font-serif text-3xl font-black text-amber-100 sm:text-4xl">
          {'\u7b2c\u4e09\u5c64\uff5cAI \u88dc\u5f37\u65b9\u6848'}
        </h2>
        <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4 text-sm font-bold leading-8 text-amber-100">
          {layer3.clearStatement}
        </p>
        <div className="mt-5 space-y-3">
          {layer3.priorities.map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[color:var(--text-main)]">{item.label}</p>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-950/30 text-lg font-black text-amber-100">{item.element}</span>
              </div>
              <p className="mt-3 text-sm font-bold leading-7 text-amber-100">{item.direction}</p>
              <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{item.reason}</p>
              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-[color:var(--text-main)]">{item.action}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-[color:var(--text-sub)]">
          {layer3.executionPrinciple}
        </p>
      </div>
    </section>
  );
}

function ResultPanel({ analysis, fiveElement }: { analysis: NameologyAnalysis; fiveElement: FiveElementIntegrationResult }) {
  const topTendencies = analysis.temperamentProfile.topTendencies.slice(0, 4);
  const givenName = analysis.composition.givenName || analysis.name.slice(1);

  return (
    <section className="space-y-5">
      <ProfessionalNameologyLayer analysis={analysis} />
      <NameologyAiFlowLayers analysis={analysis} />
      <FiveElementPriorityCard result={fiveElement} />

      <div className="fortune-card overflow-hidden border-amber-400/25 bg-slate-950/55 p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-amber-300">AI 姓名學</p>
        <h1 className="mt-4 break-words font-serif text-5xl font-black text-amber-100 sm:text-7xl">
          {analysis.name}
        </h1>
        <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">
          姓氏為根，名字「{givenName}」為主要意境來源；系統以字義、拆字、筆畫五格、五行相生相剋與 24 性情矩陣交叉解讀。
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4">
            <p className="text-xs text-amber-100/70">姓名學分數</p>
            <p className="mt-1 text-3xl font-black text-amber-100">{analysis.score}</p>
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-950/20 p-4">
            <p className="text-xs text-cyan-100/70">結果定位</p>
            <p className="mt-1 text-lg font-black text-cyan-100">{analysis.level}</p>
          </div>
          <div className="rounded-2xl border border-rose-300/20 bg-rose-950/20 p-4">
            <p className="text-xs text-rose-100/70">交叉校正</p>
            <p className="mt-1 text-lg font-black text-rose-100">{analysis.crossCheck.alignmentLabel}</p>
          </div>
        </div>
      </div>

      <div className="fortune-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">NAME MEANING</p>
        <h2 className="mt-3 font-serif text-3xl text-cyan-100">每個字的意境拆解</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {analysis.characters.map((item) => (
            <article key={`${item.position}-${item.char}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-4xl font-black text-amber-100">{item.char}</p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.role} · {item.strokeCount}畫 · {item.element}{item.yinYang}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-[color:var(--text-sub)]">部首 {item.glyph.radical}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[color:var(--text-main)]">{item.glyph.meaning}</p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">取名意圖：{item.glyph.namingIntent}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tendencies.slice(0, 3).map((tendency) => (
                  <span key={tendency.key} className="rounded-full border border-amber-300/15 bg-amber-950/20 px-2.5 py-1 text-[11px] text-amber-100">
                    {tendency.label}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-violet-300">24 MATRIX</p>
          <h2 className="mt-3 font-serif text-3xl text-violet-100">性情偏向</h2>
          <p className="mt-3 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.temperamentProfile.clearDirection}</p>
          <div className="mt-5 space-y-3">
            {topTendencies.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-[color:var(--text-main)]">{item.label}</p>
                  <p className="text-sm font-black text-violet-100">{item.score}</p>
                </div>
                <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{item.meaning}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">FIVE GRIDS</p>
          <h2 className="mt-3 font-serif text-3xl text-emerald-100">筆畫五格</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {analysis.grids.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-[color:var(--text-muted)]">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-emerald-100">{item.value}畫</p>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">{item.element} · {item.meaning}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="fortune-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">DIRECT READING</p>
        <h2 className="mt-3 font-serif text-3xl text-amber-100">姓名綜合解讀</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-cyan-200">人格主軸</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.corePersonality}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-rose-200">形象偏好</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.imageAndPreference}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-emerald-200">交叉校正</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.crossCheck.summary}</p>
          </div>
        </div>
        <p className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-950/15 p-4 text-sm leading-8 text-[color:var(--text-main)]">
          {analysis.summary}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="fortune-card p-5">
          <p className="text-xs font-bold text-cyan-200">主要優勢</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.strengths.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
        <div className="fortune-card p-5">
          <p className="text-xs font-bold text-rose-200">需要留意</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.cautions.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
        <div className="fortune-card p-5">
          <p className="text-xs font-bold text-amber-200">行動建議</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.recommendations.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
      </section>
    </section>
  );
}

function buildValidationMessage(form: FormState, selectionConfirm: SelectionConfirm) {
  if (form.name.trim().length < 2) return '請先輸入完整姓名，至少 2 個字。';
  if (!form.birthDate) return '請先完成生日萬年曆推算。';
  if (!selectionConfirm.bloodType) return '請點選血型，系統才會套用血型校正。';
  if (!selectionConfirm.gender) return '請點選性別，系統才會套用外在呈現校正。';
  return '';
}

export default function NameologyPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectionConfirm, setSelectionConfirm] = useState<SelectionConfirm>(initialSelectionConfirm);
  const [result, setResult] = useState<NameologyAnalysis | null>(null);
  const [fiveElement, setFiveElement] = useState<FiveElementIntegrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<NameologyDailyResult> | null>(null);

  useEffect(() => {
    const record = readDailyAnalysis<NameologyDailyResult>('nameology');
    if (!record) return;
    if (!isCurrentNameologyRecord(record)) {
      clearDailyAnalysis('nameology');
      setDailyRecord(null);
      return;
    }
    setDailyRecord(record);
    setResult(record.result.analysis);
    setFiveElement(record.result.fiveElement);
  }, []);

  const validationMessage = useMemo(() => buildValidationMessage(form, selectionConfirm), [form, selectionConfirm]);
  const canSubmit = validationMessage === '';
  const showMissingFields = Boolean(error) && !result;
  const showMissingName = showMissingFields && form.name.trim().length < 2;
  const showMissingBirthDate = showMissingFields && !form.birthDate;
  const showMissingBloodType = showMissingFields && !selectionConfirm.bloodType;
  const showMissingGender = showMissingFields && !selectionConfirm.gender;
  const progressItems = [
    { label: '姓名', done: form.name.trim().length >= 2, value: form.name.trim().length > 0 ? `${form.name.trim().length}字` : '未填' },
    { label: '生日', done: Boolean(form.birthDate), value: form.birthDate ? '已推算' : '未填' },
    { label: '血型', done: selectionConfirm.bloodType, value: selectionConfirm.bloodType ? `${form.bloodType}型` : '未選' },
    { label: '性別', done: selectionConfirm.gender, value: selectionConfirm.gender ? (form.gender === 'male' ? '男性' : '女性') : '未選' },
  ];

  async function handleSubmit() {
    const existing = readDailyAnalysis<NameologyDailyResult>('nameology');
    if (existing) {
      if (isCurrentNameologyRecord(existing)) {
        setDailyRecord(existing);
        setResult(existing.result.analysis);
        setFiveElement(existing.result.fiveElement);
        window.setTimeout(() => document.getElementById('nameology-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return;
      }
      clearDailyAnalysis('nameology');
      setDailyRecord(null);
    }

    if (!canSubmit || isLoading) {
      setError(validationMessage);
      return;
    }
    if (!getAnalysisIdentityTarget()) {
      setError(getIdentityRequiredMessage());
      return;
    }
    setIsLoading(true);
    setError('');
    setResult(null);
    setFiveElement(null);

    try {
      const response = await fetch('/api/nameology-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data?.analysis || !data?.fiveElement) throw new Error(data?.message || data?.error || '姓名學分析暫時無法完成。');
      const nextResult = {
        analysis: (data as NameologyResponse).analysis,
        fiveElement: (data as NameologyResponse).fiveElement,
      };
      if (!isCurrentNameologyResult(nextResult)) throw new Error('\u59d3\u540d\u5b78\u4e09\u5c64\u5206\u6790\u8cc7\u6599\u672a\u5b8c\u6574\uff0c\u8acb\u91cd\u65b0\u5206\u6790\u3002');
      setResult((data as NameologyResponse).analysis);
      setFiveElement((data as NameologyResponse).fiveElement);
      setDailyRecord(saveDailyAnalysis<NameologyDailyResult>('nameology', nextResult, { schemaVersion: NAMEOLOGY_DAILY_SCHEMA_VERSION }));
      markGrowthModuleCompleted('nameology', (data as NameologyResponse).fiveElement.brandElement);
      window.setTimeout(() => document.getElementById('nameology-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : '姓名學分析暫時無法完成。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center text-sm">
          <Link href="/" className="feature-home-link feature-home-link--amber">{"\u8fd4\u56de\u9996\u9801"}</Link>
        </div>

        <DailyAnalysisNotice record={dailyRecord} className="mb-5" />
        <section id="nameology-input-form" className="fortune-card p-5 sm:p-8 scroll-mt-20">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-300">NAMEOLOGY</p>
          <h1 className="mt-4 font-serif text-4xl font-black text-amber-100 sm:text-6xl">AI 姓名學</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
            這裡只解讀姓名學：姓氏固定為根，名字兩字為主要意境來源，再交叉生日、血型與性別，整理字義、拆字、筆畫五格與性情偏向。
          </p>

          <IdentitySplitSelector className="mt-6" />

          <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-950/10 p-4">
            <p className="mb-3 text-xs text-[color:var(--text-muted)]">資料進度</p>
            <div className="flex flex-wrap gap-2">
              {progressItems.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.done ? 'border-green-400/30 bg-green-500/20 text-green-300' : 'border-white/10 bg-white/8 text-[color:var(--text-muted)]'}`}
                >
                  ✓ {item.label} {item.value}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-7">
            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                1. 姓名 {form.name.trim().length >= 2 && <span className="text-green-400">✓</span>}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                onBlur={(event) => {
                  const trimmed = event.target.value.trim();
                  if (trimmed !== event.target.value) setForm((prev) => ({ ...prev, name: trimmed }));
                }}
                placeholder="請輸入完整姓名（至少 2 個字）"
                maxLength={20}
                className={`form-input w-full rounded-lg border border-white/10 px-4 py-3 text-base ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
                autoComplete="off"
              />
              {showMissingName && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002"}</p>
              )}
              {form.name.trim().length > 0 && form.name.trim().length < 2 && !showMissingName && (
                <p className="mt-2 text-xs text-yellow-400">姓名至少需要 2 個字。</p>
              )}
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                2. 出生日期（民國年）{form.birthDate && <span className="text-green-400">✓</span>}
              </label>
              <LunarBirthdayInput
                value={form.birthDate}
                onChange={(solarDate) => setForm((prev) => ({ ...prev, birthDate: solarDate.trim() }))}
                accent="amber"
                label="出生日期（萬年曆）"
              />
              {showMissingBirthDate && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\u3002"}</p>
              )}
              {form.birthDate && <p className="mt-2 text-xs text-green-400">✓ 西元 {form.birthDate}</p>}
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                3. 血型 {selectionConfirm.bloodType && <span className="text-green-400">✓</span>}
              </label>
              {showMissingBloodType && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u8840\u578b\uff0c\u9019\u6b04\u9084\u6c92\u6709\u9078\u3002"}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {BLOOD_TYPES.map((bloodType, index) => (
                  <FriendlyChoiceCard
                    key={bloodType}
                    active={selectionConfirm.bloodType && form.bloodType === bloodType}
                    title={`${bloodType} 型`}
                    description={BLOOD_DESC[bloodType]}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, bloodType }));
                      setSelectionConfirm((prev) => ({ ...prev, bloodType: true }));
                    }}
                    tone={index % 2 === 0 ? 'violet' : 'cyan'}
                    attention={showMissingBloodType}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                4. 性別 {selectionConfirm.gender && <span className="text-green-400">✓</span>}
              </label>
              {showMissingGender && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u6027\u5225\uff0c\u9019\u6b04\u9084\u6c92\u6709\u78ba\u8a8d\u3002"}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <FriendlyChoiceCard
                  active={selectionConfirm.gender && form.gender === 'female'}
                  title="女性"
                  description="用來校正姓名外在形象、柔性特質與互動呈現。"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, gender: 'female' }));
                    setSelectionConfirm((prev) => ({ ...prev, gender: true }));
                  }}
                  tone="pink"
                  attention={showMissingGender}
                />
                <FriendlyChoiceCard
                  active={selectionConfirm.gender && form.gender === 'male'}
                  title="男性"
                  description="用來校正姓名外在形象、行動特質與表現方向。"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, gender: 'male' }));
                    setSelectionConfirm((prev) => ({ ...prev, gender: true }));
                  }}
                  tone="cyan"
                  attention={showMissingGender}
                />
              </div>
            </div>

            {(error || validationMessage) && !result && (
              <p className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-400/25 bg-rose-950/20 text-rose-100' : 'border-amber-400/20 bg-amber-950/15 text-amber-100'}`}>
                {error || validationMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="vip-gold-btn w-full py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? '姓名學分析中...' : dailyRecord ? getDailyAnalysisButtonLabel(dailyRecord) : canSubmit ? '開始姓名學分析' : '請先完成上方資料'}
            </button>
          </div>
        </section>

        <div id="nameology-result" className="mt-6 scroll-mt-24">
          {result && fiveElement && <ResultPanel analysis={result} fiveElement={fiveElement} />}
        </div>
      </div>
    </main>
  );
}
