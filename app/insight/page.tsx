'use client';

import { useState, useEffect, useMemo, useRef, type Ref } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import NextStepGuide from '@/components/NextStepGuide';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import { saveUserData, loadUserData } from '@/lib/storage';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { recoverFromChunkError } from '@/lib/chunk-recovery';
import { getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';
import type { FiveElementIntegrationResult } from '@/lib/five-element-engine';
import FiveElementPriorityCard from '@/components/FiveElementPriorityCard';

// 時辰：null=未選、'unknown'=自動良辰、'known'=準備選時辰、0–11=已選時辰
type ShichenChoice = number | 'unknown' | 'known' | null;
type SelectionConfirm = { bloodType: boolean; gender: boolean };

interface InsightData {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
  shichen: ShichenChoice;
}

interface InsightResult {
  accuracyScore: number;
  dataSourceCount: number;
  scoreMethodology?: {
    formula: string;
    percentile: string;
    sampleBasis: string;
    duplicatePolicy: string;
  };
  accuracyBreakdown?: {
    label: string;
    value: number;
    description: string;
  }[];
  psychologyInsights: {
    title: string;
    description: string;
    confidence: number;
    confidenceSource?: string;
  }[];
  statisticalAnalysis: {
    dimension: string;
    score: number;
    percentile: number;
    globalComparison: string;
    sampleSize?: number;
    formula?: string;
    sourceSummary?: string;
    uniquenessAdjustment?: number;
    sourceBreakdown?: {
      label: string;
      value: number;
      weight: number;
      contribution: number;
    }[];
  }[];
  bigDataInsights: {
    category: string;
    finding: string;
    sampleSize: number;
    scoreBasis?: string;
  }[];
  personalizedRecommendations: string[];
  summary: string;
  fiveElement?: FiveElementIntegrationResult;
  ziweiPalaces?: {
    palaceName: string;
    starName: string;
    statisticalInference: string;
  }[];
  ziweiSanFang?: {
    methodVersion: string;
    timeConfidence: 'exact' | 'estimated';
    timeNote: string;
    trueSolarTimeApplied: boolean;
    dataCompleteness: number;
    consistencyScore: number;
    summary: string;
    bazi: {
      year: string;
      month: string;
      day: string;
      hour: string;
      dayMaster: string;
      elementBalance: Record<string, number>;
    };
    palaces: {
      key: 'MING' | 'CAI_BO' | 'GUAN_LU' | 'QIAN_YI';
      name: string;
      focus: string;
      branch: string;
      palaceStem: string;
      majorStars: string[];
      minorStars: string[];
      transformations: string[];
    }[];
    allPalaces?: {
      key: string;
      name: string;
      focus: string;
      branch: string;
      palaceStem: string;
      majorStars: string[];
      minorStars: string[];
      transformations: string[];
    }[];
    palaceAnalyses?: {
      palaceKey: string;
      palaceName: string;
      directConclusion: string;
      palaceDefinition: string;
      likelyEvents: {
        title: string;
        eventType: string;
        priority: 'P1' | 'P2' | 'P3' | 'P4';
        likelyScenario: string;
        riskScenario?: string;
        conditions: string[];
        evidence: {
          sourceType: string;
          sourceName: string;
          effect: 'support' | 'pressure' | 'mixed';
          explanation: string;
        }[];
      }[];
      primaryRisk: {
        title: string;
        description: string;
        triggerConditions: string[];
        preventionActions: string[];
      };
      primaryOpportunity: {
        title: string;
        description: string;
        activationConditions: string[];
        recommendedActions: string[];
      };
      actionPlan: {
        doFirst: string[];
        avoid: string[];
        observe: string[];
      };
      evidenceSummary: {
        sourceType: string;
        sourceName: string;
        effect: 'support' | 'pressure' | 'mixed';
        explanation: string;
      }[];
      confidence: {
        birthDataCompleteness: 'high' | 'medium' | 'low';
        ruleCoverage: 'complete' | 'partial' | 'insufficient';
        signalConsistency: 'concentrated' | 'mixed' | 'conflicting';
      };
      limitations: string[];
      ruleVersion: string;
    }[];
    crossChecks: {
      palaceKey: 'MING' | 'CAI_BO' | 'GUAN_LU' | 'QIAN_YI';
      status: 'reinforce' | 'neutral' | 'tension';
      title: string;
      detail: string;
      ruleId: string;
    }[];
    pattern: {
      name: string;
      stars: string[];
      description: string;
      basis: string;
    };
    patternMetrics: {
      coreStarCount: number;
      patternStarCount: number;
      patternCoverage: number;
      trinePalaceCoverage: number;
      oppositePalaceStarCount: number;
      transformationCount: number;
      supportiveRelationCount: number;
      constrainingRelationCount: number;
      methodology: string;
    };
    ruleCount: number;
  };
  annualFortune?: {
    year: number;
    ganzhi: string;
    yearElement: string;
    level: string;
    overallScore: number;
    annualTheme: string;
    timeConfidence: 'exact' | 'estimated';
    baziFocus: {
      dayMaster: string;
      yearRelation: string;
      elementBalanceSummary: string;
      advice: string;
    };
    sanFangFourZheng: {
      palaceKey: 'MING' | 'CAI_BO' | 'GUAN_LU' | 'QIAN_YI';
      palaceName: string;
      focus: string;
      score: number;
      trend: string;
      basis: string;
      strengths: string[];
      tensions: string[];
      behaviorTags: string[];
      scores: {
        initiative: number;
        stability: number;
        flexibility: number;
        social: number;
        execution: number;
        resource: number;
        pressure: number;
        growth: number;
      };
      advice: string;
      encouragement: string;
      action: string;
    }[];
    adviceMatrix: {
      confidence: number;
      initiative: number;
      patience: number;
      communication: number;
      execution: number;
      financialDiscipline: number;
      adaptability: number;
      relationshipAwareness: number;
      stressManagement: number;
      learningGrowth: number;
    };
    motivation: {
      coreEncouragement: string;
      mainStrength: string;
      mainWarning: string;
      actionAdvice: string;
      growthReminder: string;
    };
    recommendations: string[];
    encouragements: string[];
    summary: string;
    ruleVersion: string;
  };
  nameology?: {
    name: string;
    composition?: {
      surname: string;
      givenName: string;
      surnameSummary: string;
      givenNameSummary: string;
      combinedIntent: string;
    };
    crossCheck?: {
      genderLens: string;
      bloodTypeLens: string;
      birthdayLens: string;
      alignmentLabel: string;
      summary: string;
      corrections: string[];
    };
    characters: {
      char: string;
      position: number;
      role: string;
      strokeCount: number;
      strokeSource: 'fixed_table' | 'structural_estimate';
      element: '木' | '火' | '土' | '金' | '水';
      yinYang: '陽' | '陰';
      imagery: string;
      traits: string[];
      caution: string;
      glyph?: {
        radical: string;
        parts: string[];
        structure: string;
        meaning: string;
        namingIntent: string;
      };
      tendencies?: {
        key: string;
        label: string;
        score: number;
        tone: string;
        meaning: string;
      }[];
    }[];
    grids: {
      key: 'sky' | 'person' | 'earth' | 'outer' | 'total';
      label: string;
      value: number;
      element: '木' | '火' | '土' | '金' | '水';
      meaning: string;
      advice: string;
    }[];
    elementFlow: {
      from: string;
      to: string;
      relation: '相生' | '相剋' | '比和';
      note: string;
    }[];
    temperamentProfile?: {
      topTendencies: {
        key: string;
        label: string;
        score: number;
        tone: string;
        meaning: string;
      }[];
      allTendencies: {
        key: string;
        label: string;
        score: number;
        tone: string;
        meaning: string;
      }[];
      summary: string;
      clearDirection: string;
    };
    corePersonality: string;
    imageAndPreference: string;
    strengths: string[];
    cautions: string[];
    recommendations: string[];
    score: number;
    level: string;
    summary: string;
    ruleVersion: string;
  };  meta?: {
    dayPillar: string;
    hourPillar: string;
    wuxing: string;
    shichenLabel: string;
    birthDate?: string;
    shichen?: number | 'unknown' | null;
  };
}

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const EMPTY_SELECTION_CONFIRM: SelectionConfirm = { bloodType: false, gender: false };
const BLOOD_DESC: Record<InsightData['bloodType'], string> = {
  A: '細膩穩定，重視秩序與安全感。',
  B: '自主鮮明，節奏感強，較有個人風格。',
  AB: '理性感性並存，觀察力與距離感並行。',
  O: '主動直接，行動力高，帶動感明顯。',
};

function ChoiceCard({
  active,
  title,
  description,
  onClick,
  tone,
  attention,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  tone: 'violet' | 'amber' | 'pink' | 'cyan';
  attention?: boolean;
}) {
  const attentionClass = attention && !active
    ? 'border-rose-400/85 bg-rose-500/12 text-rose-50 shadow-[0_0_24px_rgba(244,63,94,0.24)]'
    : '';

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

function getScoreColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 70) return '#10b981';
  if (score >= 60) return '#eab308';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}


function NameologyResultPanel({ analysis }: { analysis?: InsightResult['nameology'] }) {
  if (!analysis) return null;

  const characters = analysis.characters ?? [];
  const grids = analysis.grids ?? [];
  const elementFlow = analysis.elementFlow ?? [];
  const topTendencies = analysis.temperamentProfile?.topTendencies ?? [];
  const composition = analysis.composition;
  const crossCheck = analysis.crossCheck;
  const relationTone: Record<string, string> = {
    相生: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
    比和: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
    相剋: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
  };
  const namingIntent = characters.length
    ? characters.map((item) => `${item.char}：${item.imagery}`).join('；')
    : analysis.summary;

  return (
    <section className="fortune-card relative overflow-hidden p-5 sm:p-8">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[-5rem] h-56 w-56 -translate-x-1/2 rounded-full bg-amber-300/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-4rem] right-[-4rem] h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="text-center lg:text-left">
          <p className="text-xs uppercase tracking-[0.34em] text-amber-300">姓名格局</p>
          <h2 className="mt-4 break-words font-serif text-6xl font-black leading-none text-amber-100 sm:text-7xl md:text-8xl">
            {analysis.name}
          </h2>
          <p className="mt-4 text-sm font-semibold tracking-[0.16em] text-cyan-100 sm:text-base">
            AI 姓名學 · 測字意境 × 24性情矩陣 × 相生相剋
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-[color:var(--text-sub)] lg:mx-0">
            {analysis.summary}
          </p>
        </div>

        <div className="mx-auto w-full max-w-[12rem] rounded-3xl border border-amber-300/30 bg-amber-300/12 px-5 py-5 text-center shadow-[0_18px_42px_rgba(2,6,23,0.28)] lg:mx-0">
          <p className="text-xs text-amber-100/75">姓名學分數</p>
          <p className="mt-1 text-6xl font-black text-amber-100">{analysis.score}</p>
          <p className="mt-1 text-sm font-semibold text-amber-200">{analysis.level}</p>
        </div>
      </div>

      {(composition || crossCheck) && (
        <div className="relative mt-6 grid gap-3 lg:grid-cols-2">
          {composition && (
            <article className="rounded-3xl border border-cyan-300/20 bg-cyan-400/8 p-5">
              <p className="text-xs font-semibold tracking-[0.24em] text-cyan-200">姓名結構</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs text-[color:var(--text-muted)]">姓氏根基</p>
                  <p className="mt-2 font-serif text-3xl font-black text-cyan-100">{composition.surname || '姓'}</p>
                  <p className="mt-3 text-xs leading-6 text-[color:var(--text-sub)]">{composition.surnameSummary}</p>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
                  <p className="text-xs text-amber-100/75">名字主意境</p>
                  <p className="mt-2 font-serif text-3xl font-black text-amber-100">{composition.givenName || '名'}</p>
                  <p className="mt-3 text-xs leading-6 text-amber-50/90">{composition.givenNameSummary}</p>
                </div>
              </div>
              <p className="mt-4 border-l-2 border-cyan-200/40 pl-3 text-xs leading-6 text-cyan-50/85">{composition.combinedIntent}</p>
            </article>
          )}

          {crossCheck && (
            <article className="rounded-3xl border border-emerald-300/20 bg-emerald-400/8 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-[0.24em] text-emerald-200">資料交叉校正</p>
                <span className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">{crossCheck.alignmentLabel}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-emerald-50/90">{crossCheck.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-6 text-[color:var(--text-sub)]">
                <p>{crossCheck.genderLens}</p>
                <p>{crossCheck.bloodTypeLens}</p>
                <p>{crossCheck.birthdayLens}</p>
              </div>
            </article>
          )}
        </div>
      )}
      {characters.length > 0 && (
        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((item) => (
            <article key={`hero-${item.position}-${item.char}`} className="rounded-3xl border border-amber-200/20 bg-black/20 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-amber-200/35 bg-amber-200/12 font-serif text-5xl font-black text-amber-100 sm:h-24 sm:w-24 sm:text-6xl">
                {item.char}
              </div>
              <p className="mt-3 text-sm font-bold text-[color:var(--text-main)]">{item.role}</p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.strokeCount}畫 · {item.element}{item.yinYang}</p>
            </article>
          ))}
        </div>
      )}

      {topTendencies.length > 0 && (
        <div className="relative mt-6 rounded-3xl border border-amber-300/20 bg-amber-400/8 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-amber-200">24 性情主軸</p>
              <p className="mt-3 text-sm leading-7 text-amber-50/90">{analysis.temperamentProfile?.summary}</p>
            </div>
            <p className="text-xs leading-6 text-amber-100/75 sm:max-w-xs">{analysis.temperamentProfile?.clearDirection}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {topTendencies.slice(0, 5).map((item) => (
              <article key={item.key} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-amber-100">{item.label}</p>
                  <span className="text-xs font-bold text-cyan-100">{item.score}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-200 to-cyan-200" style={{ width: `${item.score}%` }} />
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[color:var(--text-sub)]">{item.tone}</p>
              </article>
            ))}
          </div>
        </div>
      )}
      <div className="relative mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-400/8 p-5">
        <p className="text-xs font-semibold tracking-[0.24em] text-cyan-200">取名意境</p>
        <p className="mt-3 text-sm leading-7 text-cyan-50/90">{namingIntent}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-200">核心性格</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.corePersonality}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-violet-200">形象與偏好</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.imageAndPreference}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-7">
        <p className="text-xs font-semibold tracking-[0.28em] text-amber-300">逐字意境拆解</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((item) => (
            <article key={`${item.position}-${item.char}`} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10 font-serif text-4xl text-amber-100">
                    {item.char}
                  </span>
                  <div>
                    <p className="font-semibold text-[color:var(--text-main)]">{item.role}</p>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.strokeCount}畫 · {item.element}{item.yinYang}</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-[color:var(--text-muted)]">
                  {item.strokeSource === 'fixed_table' ? '字義表' : '結構表'}
                </span>
              </div>
              <p className="mt-3 text-xs leading-6 text-[color:var(--text-sub)]">{item.imagery}</p>
              {item.glyph && (
                <div className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/8 p-3">
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-amber-100/90">
                    <span className="rounded-full border border-amber-200/20 px-2 py-1">部首：{item.glyph.radical}</span>
                    <span className="rounded-full border border-amber-200/20 px-2 py-1">拆字：{item.glyph.parts.join('＋')}</span>
                    <span className="rounded-full border border-amber-200/20 px-2 py-1">{item.glyph.structure}</span>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-amber-50/85">{item.glyph.meaning}</p>
                  <p className="mt-2 border-l-2 border-cyan-200/40 pl-3 text-[11px] leading-5 text-cyan-50/85">{item.glyph.namingIntent}</p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {(item.tendencies ?? []).slice(0, 3).map((tendency) => (
                  <span key={tendency.key} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                    {tendency.label} {tendency.score}
                  </span>
                ))}
                {item.traits.slice(0, 2).map((trait) => (
                  <span key={trait} className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                    {trait}
                  </span>
                ))}
              </div>
              <p className="mt-3 border-l-2 border-amber-300/50 pl-3 text-xs leading-5 text-amber-100/85">{item.caution}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="relative mt-7 grid gap-3 sm:grid-cols-5">
        {grids.map((grid) => (
          <article key={grid.key} className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:col-span-1">
            <p className="text-xs text-[color:var(--text-muted)]">{grid.label}</p>
            <p className="mt-2 font-serif text-3xl font-black text-amber-100">{grid.value}</p>
            <p className="mt-1 text-xs font-semibold text-cyan-100">{grid.element}行</p>
            <p className="mt-3 text-[11px] leading-5 text-[color:var(--text-sub)]">{grid.meaning}</p>
          </article>
        ))}
      </div>

      {elementFlow.length > 0 && (
        <div className="relative mt-7">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300">相生相剋走向</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {elementFlow.slice(0, 4).map((flow, index) => (
              <div key={`${flow.from}-${flow.to}-${index}`} className={`rounded-2xl border p-4 ${relationTone[flow.relation] ?? relationTone.比和}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black">{flow.from} → {flow.to}</p>
                  <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-bold">{flow.relation}</span>
                </div>
                <p className="mt-2 text-xs leading-6 opacity-85">{flow.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/8 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-emerald-200">主要優勢</p>
          <ul className="mt-3 space-y-2 text-xs leading-6 text-emerald-50/85">
            {analysis.strengths.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/8 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-200">需要留意</p>
          <ul className="mt-3 space-y-2 text-xs leading-6 text-amber-50/85">
            {analysis.cautions.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/8 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-200">補強建議</p>
          <ul className="mt-3 space-y-2 text-xs leading-6 text-cyan-50/85">
            {analysis.recommendations.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ScoreEvidenceCard({ item }: { item: InsightResult['statisticalAnalysis'][number] }) {
  const color = getScoreColor(item.score);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-[color:var(--text-main)]">{item.dimension}</p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.globalComparison}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-[color:var(--text-main)]">{item.score}</p>
          <p className="text-xs text-[color:var(--text-muted)]">分</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${item.score}%`, background: color }} />
      </div>

      <div className="mt-4 grid gap-2 text-xs text-[color:var(--text-sub)] sm:grid-cols-2">
        <p>超越全國：{item.percentile}% 的人</p>
        {item.sampleSize && <p>樣本基準：{item.sampleSize.toLocaleString()}</p>}
      </div>

      {item.sourceBreakdown && (
        <div className="mt-4 grid gap-2">
          {item.sourceBreakdown.map((source) => (
            <div key={source.label} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[color:var(--text-sub)]">{source.label}</span>
                <span className="font-semibold text-cyan-200">{source.value} × {source.weight}%</span>
              </div>
              <p className="mt-1 text-[color:var(--text-muted)]">貢獻值：{source.contribution}</p>
            </div>
          ))}
        </div>
      )}

      {item.sourceSummary && (
        <p className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-950/15 px-3 py-2 text-xs leading-6 text-cyan-100/85">
          {item.sourceSummary}
        </p>
      )}
    </div>
  );
}

function ZiweiSanFangPanel({ analysis }: { analysis?: InsightResult['ziweiSanFang'] }) {
  if (!analysis) return null;

  const statusTone = {
    reinforce: 'border-emerald-400/35 text-emerald-100',
    neutral: 'border-cyan-400/30 text-cyan-100',
    tension: 'border-amber-400/35 text-amber-100',
  };
  const statusLabel = { reinforce: '補強', neutral: '中性', tension: '張力' };
  const palaceTone = {
    MING: { glyph: '命', border: 'border-cyan-400/30', label: 'text-cyan-200', chip: 'border-cyan-400/25 bg-cyan-950/30 text-cyan-100' },
    CAI_BO: { glyph: '財', border: 'border-emerald-400/30', label: 'text-emerald-200', chip: 'border-emerald-400/25 bg-emerald-950/25 text-emerald-100' },
    GUAN_LU: { glyph: '官', border: 'border-amber-400/30', label: 'text-amber-200', chip: 'border-amber-400/25 bg-amber-950/25 text-amber-100' },
    QIAN_YI: { glyph: '遷', border: 'border-rose-400/30', label: 'text-rose-200', chip: 'border-rose-400/25 bg-rose-950/25 text-rose-100' },
  };

  if (analysis.timeConfidence !== 'exact') {
    return (
      <section className="fortune-card p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300">紫微斗數核心三方四正</p>
        <h3 className="mt-3 font-serif text-2xl text-amber-100">等待真實出生時辰定盤</h3>
        <p className="mt-4 max-w-3xl border-l-2 border-amber-400 px-4 text-sm leading-7 text-amber-100/85">
          命宮、財帛宮、官祿宮與遷移宮會隨時辰改變。為了避免把預設時辰誤當成你的命盤，系統已暫停顯示單一宮位、主星、四化與格局。
        </p>
        <div className="mt-6 grid gap-3 border-y border-white/10 py-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-[color:var(--text-muted)]">目前可確定</p>
            <p className="mt-1 text-sm font-semibold text-cyan-100">出生日期與年、月、日三柱</p>
          </div>
          <div>
            <p className="text-xs text-[color:var(--text-muted)]">仍待確認</p>
            <p className="mt-1 text-sm font-semibold text-amber-100">出生時辰與時柱</p>
          </div>
          <div>
            <p className="text-xs text-[color:var(--text-muted)]">可再提高精度</p>
            <p className="mt-1 text-sm font-semibold text-emerald-100">出生地經度的真太陽時校正</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="fortune-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300">紫微斗數核心三方四正</p>
          <h3 className="mt-3 font-serif text-2xl text-amber-100">命財官遷 × 八字四柱</h3>
          <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{analysis.methodVersion}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${analysis.timeConfidence === 'exact' ? 'border-cyan-400/25 bg-cyan-950/20 text-cyan-100' : 'border-amber-400/25 bg-amber-950/20 text-amber-100'}`}>
          {analysis.timeConfidence === 'exact' ? '出生時辰已確認' : '時辰待校正'}
        </span>
      </div>

      <p className={`mt-5 border-l-2 px-4 py-1 text-xs leading-6 ${analysis.timeConfidence === 'exact' ? 'border-cyan-400 text-cyan-100' : 'border-amber-400 text-amber-100'}`}>
        {analysis.timeNote}
      </p>

      <div className="mt-7 grid border-y border-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['年柱', analysis.bazi.year],
          ['月柱', analysis.bazi.month],
          ['日柱', analysis.bazi.day],
          ['時柱', analysis.bazi.hour],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-r border-white/10 px-4 py-4 last:border-r-0 sm:border-b-0">
            <p className="text-xs text-[color:var(--text-muted)]">{label}</p>
            <p className="mt-1 font-serif text-xl text-amber-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[color:var(--text-sub)]">
        <span>日主 <b className="font-semibold text-amber-200">{analysis.bazi.dayMaster}</b></span>
        {Object.entries(analysis.bazi.elementBalance).map(([element, count]) => (
          <span key={element} className="border-l border-white/10 pl-3">{element} {count}</span>
        ))}
      </div>

      {analysis.palaces.length === 0 ? (
        <div className="mt-8 border-l-2 border-amber-400 px-4 py-3 text-sm leading-7 text-amber-100">
          <p className="font-semibold">命宮尚未定盤</p>
          <p className="mt-1 text-xs text-amber-100/75">出生日期可以計算年、月、日，但命宮與三方四正必須先確認出生時辰。請選擇真實時辰後重新分析。</p>
        </div>
      ) : (
      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">三方四正宮位</p>
          <p className="text-xs text-[color:var(--text-muted)]">命 · 財 · 官 · 遷</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
        {analysis.palaces.map((palace) => {
          const tone = palaceTone[palace.key];
          return (
          <article key={palace.key} className={`relative overflow-hidden rounded-lg border bg-white/[0.02] p-5 ${tone.border}`}>
            <span className={`pointer-events-none absolute right-4 top-2 font-serif text-5xl opacity-10 ${tone.label}`}>{tone.glyph}</span>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`font-semibold ${tone.label}`}>{palace.name}</p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">{palace.focus} · {palace.palaceStem}{palace.branch}</p>
              </div>
              <span className="text-xs text-[color:var(--text-muted)]">{palace.key === 'QIAN_YI' ? '對宮' : '三方'}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(palace.majorStars.length > 0 ? palace.majorStars : ['無十四主星坐守']).map((star) => (
                <span key={star} className={`rounded-md border px-2.5 py-1 text-sm font-semibold ${tone.chip}`}>{star}</span>
              ))}
            </div>
            {palace.minorStars.length > 0 && <p className="mt-4 text-xs leading-5 text-[color:var(--text-sub)]">輔星：{palace.minorStars.join('、')}</p>}
            <p className="mt-2 text-xs text-cyan-100/80">生年四化：{palace.transformations.join('、') || '無'}</p>
          </article>
          );
        })}
        </div>
      </div>
      )}

      {analysis.crossChecks.length > 0 && <div className="mt-7 border-t border-white/10 pt-5">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">八字交叉判讀</p>
        <div className="mt-4 grid gap-3">
          {analysis.crossChecks.map((check) => (
            <div key={check.ruleId} className={`border-l-2 px-4 py-3 ${statusTone[check.status]}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{check.title}</p>
                <span className="text-xs">{statusLabel[check.status]}</span>
              </div>
              <p className="mt-2 text-xs leading-6 opacity-85">{check.detail}</p>
            </div>
          ))}
        </div>
      </div>}
    </section>
  );
}

function SanFangSummaryCard({ analysis }: { analysis?: InsightResult['ziweiSanFang'] }) {
  if (!analysis) return null;

  const palaceLabels = {
    MING: '命宮',
    CAI_BO: '財帛宮',
    GUAN_LU: '官祿宮',
    QIAN_YI: '遷移宮',
  } as const;
  const palaceTone = {
    MING: 'border-cyan-400/30 text-cyan-100',
    CAI_BO: 'border-emerald-400/30 text-emerald-100',
    GUAN_LU: 'border-amber-400/30 text-amber-100',
    QIAN_YI: 'border-rose-400/30 text-rose-100',
  } as const;

  return (
    <section className="fortune-card relative overflow-hidden p-6 sm:p-8">
      <div className="absolute inset-4 border border-cyan-400/10 pointer-events-none" />
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">紫微斗數・八字</p>
        <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl text-amber-100 sm:text-4xl">{analysis.pattern.name}</h2>
            <p className="mt-2 text-sm text-[color:var(--text-sub)]">命宮 × 財帛宮 × 官祿宮 × 遷移宮主星交叉定格</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-5xl font-bold text-amber-200">{analysis.consistencyScore}<span className="ml-1 text-xl">%</span></p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">結構匹配度</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-white/10 py-3 text-xs">
          <span className="text-[color:var(--text-muted)]">命盤資料完整度</span>
          <span className="font-semibold text-cyan-100">{analysis.dataCompleteness}%</span>
          <span className="text-[color:var(--text-muted)]">·</span>
          <span className="text-[color:var(--text-muted)]">定格依據</span>
          <span className="font-semibold text-amber-200">{analysis.pattern.basis}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['MING', 'CAI_BO', 'GUAN_LU', 'QIAN_YI'] as const).map((key) => {
            const palace = analysis.palaces.find((item) => item.key === key);
            return (
              <div key={key} className={`min-h-24 border px-3 py-3 ${palaceTone[key]}`}>
                <p className="text-xs opacity-75">{palaceLabels[key]}</p>
                <p className="mt-2 text-sm font-semibold leading-6">
                  {palace?.majorStars.join('、') || '待確認'}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 border-y border-white/10">
          {[
            ['關鍵星覆蓋', `${analysis.patternMetrics.patternCoverage}%`],
            ['三方分布', `${analysis.patternMetrics.trinePalaceCoverage}%`],
            ['遷移對宮訊號', analysis.patternMetrics.oppositePalaceStarCount],
          ].map(([label, value]) => (
            <div key={label} className="border-r border-white/10 px-3 py-3 text-center last:border-r-0">
              <p className="text-[11px] text-[color:var(--text-muted)]">{label}</p>
              <p className="mt-1 text-lg font-semibold text-cyan-100">{value}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 border-l-2 border-amber-400 px-4 text-sm leading-7 text-[color:var(--text-sub)]">
          {analysis.summary}
        </p>
      </div>
    </section>
  );
}

function AnnualFortunePanel({ analysis }: { analysis?: InsightResult['annualFortune'] }) {
  if (!analysis) return null;

  const palaceTone = {
    MING: 'border-cyan-400/30 bg-cyan-950/15 text-cyan-100',
    CAI_BO: 'border-emerald-400/30 bg-emerald-950/15 text-emerald-100',
    GUAN_LU: 'border-amber-400/30 bg-amber-950/15 text-amber-100',
    QIAN_YI: 'border-rose-400/30 bg-rose-950/15 text-rose-100',
  } as const;

  const scoreTone = analysis.overallScore >= 75
    ? 'text-emerald-200'
    : analysis.overallScore >= 60
      ? 'text-amber-200'
      : 'text-rose-200';

  return (
    <section className="fortune-card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">今年流年運勢・命盤三方四正</p>
          <h2 className="mt-3 font-serif text-3xl text-amber-100 sm:text-4xl">
            只看今年：{analysis.year} {analysis.ganzhi}年 · {analysis.level}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.annualTheme}
          </p>
          <p className="mt-3 inline-flex rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
            本區只講今年流年運勢，不是終身本命定論。
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-amber-300/25 bg-amber-950/20 px-5 py-4 text-left sm:text-right">
          <p className={`text-5xl font-bold ${scoreTone}`}>{analysis.overallScore}</p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">年度綜合分數</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
          <p className="text-xs font-semibold text-cyan-200">今年八字流年重點</p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">
            日主 <span className="font-semibold text-amber-200">{analysis.baziFocus.dayMaster}</span>
            ，今年流年五行為 <span className="font-semibold text-cyan-100">{analysis.yearElement}</span>
            ，關係為 <span className="font-semibold text-amber-100">{analysis.baziFocus.yearRelation}</span>。
            {analysis.baziFocus.advice}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-amber-200">今年流年定盤狀態</p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.timeConfidence === 'exact' ? '已使用真實時辰，只判讀今年命盤三方四正年度走勢。' : '目前採良辰暫定盤，只先看今年趨勢；補上真實時辰後可再校正今年走勢。'}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-950/15 p-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-200">年度激勵摘要</p>
        <p className="mt-3 text-sm leading-7 text-amber-50">{analysis.motivation.coreEncouragement}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-[11px] font-semibold text-cyan-200">目前優勢</p>
            <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{analysis.motivation.mainStrength}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-[11px] font-semibold text-rose-200">需要留意</p>
            <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{analysis.motivation.mainWarning}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-[11px] font-semibold text-emerald-200">可執行建議</p>
            <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{analysis.motivation.actionAdvice}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-[11px] font-semibold text-amber-200">成長提醒</p>
            <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{analysis.motivation.growthReminder}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ['主動', analysis.adviceMatrix.initiative],
          ['耐心', analysis.adviceMatrix.patience],
          ['溝通', analysis.adviceMatrix.communication],
          ['執行', analysis.adviceMatrix.execution],
          ['財務', analysis.adviceMatrix.financialDiscipline],
          ['適應', analysis.adviceMatrix.adaptability],
          ['關係', analysis.adviceMatrix.relationshipAwareness],
          ['壓力', analysis.adviceMatrix.stressManagement],
          ['成長', analysis.adviceMatrix.learningGrowth],
          ['完整', analysis.adviceMatrix.confidence],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
            <p className="text-[11px] text-[color:var(--text-muted)]">{label}</p>
            <p className="mt-1 text-lg font-bold text-cyan-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {analysis.sanFangFourZheng.map((item) => (
          <article key={item.palaceKey} className={`rounded-2xl border p-4 ${palaceTone[item.palaceKey]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs opacity-75">今年{item.focus}</p>
                <h3 className="mt-1 text-xl font-bold">今年{item.palaceName}</h3>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{item.score}</p>
                <p className="text-[11px] opacity-75">{item.trend}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[color:var(--text-sub)]">{item.advice}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.strengths.slice(0, 2).map((strength) => (
                <span key={strength} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px]">
                  優勢 {strength}
                </span>
              ))}
              {item.tensions.slice(0, 1).map((tension) => (
                <span key={tension} className="rounded-full border border-amber-300/15 bg-amber-950/20 px-2.5 py-1 text-[11px] text-amber-100">
                  留意 {tension}
                </span>
              ))}
            </div>
            <p className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-6 text-[color:var(--text-main)]">
              鼓勵：{item.encouragement}
            </p>
            <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">行動：{item.action}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-950/15 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-200">今年建議</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--text-sub)]">
            {analysis.recommendations.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-cyan-300">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-950/15 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-200">鼓勵與激勵</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--text-sub)]">
            {analysis.encouragements.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-amber-300">✦</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 border-l-2 border-amber-300 px-4 text-sm leading-7 text-[color:var(--text-sub)]">
        {analysis.summary}
      </p>
      <p className="mt-3 text-[11px] text-[color:var(--text-muted)]">規則版本：{analysis.ruleVersion}</p>
    </section>
  );
}

type ZiweiFullPalace = NonNullable<NonNullable<InsightResult['ziweiSanFang']>['allPalaces']>[number];
type ZiweiAnnualFortune = NonNullable<InsightResult['annualFortune']>;
type ZiweiPrecisionAnalysis = NonNullable<NonNullable<InsightResult['ziweiSanFang']>['palaceAnalyses']>[number];
type ZiweiAnnualPalace = ZiweiAnnualFortune['sanFangFourZheng'][number];
type ZiweiAdviceMatrixKey = keyof ZiweiAnnualFortune['adviceMatrix'];
type ZiweiPalaceKey = typeof ZIWEI_TWELVE_PALACE_ORDER[number];
type ZiweiSanFangKey = NonNullable<InsightResult['ziweiSanFang']>['palaces'][number]['key'];

const ZIWEI_TWELVE_PALACE_ORDER = [
  'MING',
  'XIONG_DI',
  'FU_QI',
  'ZI_NV',
  'CAI_BO',
  'JI_E',
  'QIAN_YI',
  'JIAO_YOU',
  'GUAN_LU',
  'TIAN_ZHAI',
  'FU_DE',
  'FU_MU',
] as const;

const ZIWEI_SAN_FANG_FOUR_ZHENG_ORDER = ['MING', 'QIAN_YI', 'CAI_BO', 'GUAN_LU'] as const;

const ZIWEI_SAN_FANG_LABELS: Record<string, { label: string; role: string }> = {
  MING: { label: '命宮', role: '本命核心' },
  QIAN_YI: { label: '遷移宮', role: '外界舞台' },
  CAI_BO: { label: '財帛宮', role: '資源流動' },
  GUAN_LU: { label: '官祿宮', role: '事業成就' },
};

type ZiweiPalaceStoryMaterial = {
  subtitle: string;
  icon: string;
  story: string;
  opportunity: string;
  pressure: string;
  action: string;
  likely: string;
  repair: string;
  encouragement: string;
  professionalMeaning: string;
  sanFangRole: string;
  storyFocus: string;
  tone: string;
};

type ZiweiPalaceThreeLayerMaterial = {
  layerOneTitle: string;
  layerOneText: string;
  layerTwoTitle: string;
  layerTwoText: string;
  layerThreeTitle: string;
  layerThreeText: string;
  actionPriorities: Array<{ title: string; text: string }>;
};

const ZIWEI_PALACE_FALLBACK: Record<ZiweiPalaceKey, { name: string; focus: string }> = {
  MING: { name: '命', focus: '人格底色、人生主軸、決策方式與自我承擔。' },
  XIONG_DI: { name: '兄弟', focus: '手足同輩、合作支援、資源分配與橫向連結。' },
  FU_QI: { name: '夫妻', focus: '親密關係、伴侶互動、承諾模式與情感磨合。' },
  ZI_NV: { name: '子女', focus: '創造力、作品延伸、教養照顧與後續成果。' },
  CAI_BO: { name: '財帛', focus: '收入方式、金錢觀、資源轉換與財務節奏。' },
  JI_E: { name: '疾厄', focus: '身心壓力、健康警訊、能量消耗與修復能力。' },
  QIAN_YI: { name: '遷移', focus: '外部機會、遠方舞台、出行變動與環境適應。' },
  JIAO_YOU: { name: '交友', focus: '人脈圈層、合作對象、社群影響與貴人品質。' },
  GUAN_LU: { name: '官祿', focus: '職涯方向、專業定位、責任承擔與成就路徑。' },
  TIAN_ZHAI: { name: '田宅', focus: '家庭根基、居住環境、資產安全與內在安定。' },
  FU_DE: { name: '福德', focus: '精神狀態、內在滿足、休養品質與長期福分。' },
  FU_MU: { name: '父母', focus: '長輩關係、上級緣分、傳承支持與制度資源。' },
};

function createZiweiFallbackPalace(key: ZiweiPalaceKey): ZiweiFullPalace {
  const fallback = ZIWEI_PALACE_FALLBACK[key];
  return {
    key,
    name: fallback.name,
    focus: fallback.focus,
    branch: '',
    palaceStem: '',
    majorStars: [],
    minorStars: [],
    transformations: [],
  };
}

const ZIWEI_PALACE_STORY: Record<string, ZiweiPalaceStoryMaterial> = {
  MING: {
    subtitle: '人格主軸、命盤總開關與今生行動方式。',
    icon: '命',
    professionalMeaning: '命宮是十二宮的核心，代表一個人的氣質、判斷習慣、人生主軸與承擔方式。命宮強，容易主動定義人生；命宮受壓，則需要先穩住自我節奏。',
    sanFangRole: '命宮連動財帛、官祿、遷移，構成命財官遷三方四正，是判定人生格局的第一層骨架。',
    storyFocus: '像一座主殿，所有宮位的訊號都會回到這裡定錨。',
    story: '命宮描述你如何站上人生舞台：你用什麼方式做決定、遇到壓力如何反應、又會把資源投入到哪一種人生路線。',
    opportunity: '今年適合先確立主軸，把分散的能量收回到最重要的目標。',
    pressure: '若外界聲音太多，容易失去自己的判斷節奏。',
    action: '先定三個核心目標，再讓工作、關係、財務都回到同一個主軸。',
    likely: '容易出現重新定位、重新選擇方向、重新承擔角色的事件。',
    repair: '補強方式是減少反覆猶豫，把每日行動對齊主目標。',
    encouragement: '命宮不是限制，而是你人生能量的起點。',
    tone: 'border-cyan-400/30 bg-cyan-950/15 text-cyan-100',
  },
  XIONG_DI: {
    subtitle: '同輩支援、合作默契與資源分配。',
    icon: '兄',
    professionalMeaning: '兄弟宮看的是同輩、手足、合作夥伴與橫向支援力，也反映資源在熟人圈中的流動方式。',
    sanFangRole: '此宮輔助判斷命宮能否取得同輩支援，並觀察合作中的互信與邊界。',
    storyFocus: '像左右護法，支援也可能成為牽制。',
    story: '兄弟宮說明你在同輩關係中如何取得協助，也指出哪些合作需要先談清楚責任與分工。',
    opportunity: '適合建立穩定合作名單，讓支援變成可運作的結構。',
    pressure: '界線不清時，容易因人情、比較或責任模糊而消耗。',
    action: '把合作內容、時間、權責寫清楚，再進入共同執行。',
    likely: '同事、朋友、手足之間會出現需要協調資源的情境。',
    repair: '不以情緒談分工，以規則談承諾。',
    encouragement: '好的同盟會讓你走得更穩。',
    tone: 'border-sky-400/30 bg-sky-950/15 text-sky-100',
  },
  FU_QI: {
    subtitle: '親密關係、承諾方式與情感磨合。',
    icon: '侶',
    professionalMeaning: '夫妻宮不只看婚姻，也看親密關係中的信任、對等、投射與承諾模式。',
    sanFangRole: '夫妻宮會呼應命宮的自我需求，也牽動財務、安全感與共同生活節奏。',
    storyFocus: '像一面鏡子，照出你在關係裡真正需要學會的互動方式。',
    story: '夫妻宮描述你如何愛人、如何被理解，也指出感情裡最容易重複出現的功課。',
    opportunity: '適合把關係中的期待說清楚，讓承諾變得可被落實。',
    pressure: '若只靠猜測或忍耐，容易累積誤會。',
    action: '把需求、界線、未來節奏拆成具體對話。',
    likely: '感情、合作伴侶或重要對象會要求你更清楚表態。',
    repair: '不要用沉默測試對方，用清楚表達修復關係。',
    encouragement: '能被說清楚的關係，才有真正穩定的可能。',
    tone: 'border-rose-400/30 bg-rose-950/15 text-rose-100',
  },
  ZI_NV: {
    subtitle: '創造、作品、子女緣與成果延伸。',
    icon: '子',
    professionalMeaning: '子女宮代表下一代、作品、學生、創造力與一件事延伸出去後的成果。',
    sanFangRole: '此宮用來觀察命主的輸出能力，以及成果能否被承接、傳遞與放大。',
    storyFocus: '像種子，顯示你播下什麼，也顯示結果如何長成。',
    story: '子女宮提醒你，真正的成果不是一時完成，而是能不能被照顧、修正、傳承。',
    opportunity: '適合整理作品、培養下一步成果，或建立長期輸出的節奏。',
    pressure: '急著看結果時，容易忽略養成期。',
    action: '把創作、教養或培育計畫拆成固定週期。',
    likely: '作品發表、教學、子女議題或成果驗收會變得明顯。',
    repair: '先照顧節奏，再追求速度。',
    encouragement: '你正在養成的東西，會回頭成為你的力量。',
    tone: 'border-pink-400/30 bg-pink-950/15 text-pink-100',
  },
  CAI_BO: {
    subtitle: '收入能力、金錢觀與資源轉換。',
    icon: '財',
    professionalMeaning: '財帛宮看收入來源、理財習慣、金錢壓力與資源轉換能力，不等同單純的財運好壞。',
    sanFangRole: '財帛宮是命財官遷的資源軸，會檢查命主能否把能力轉為收入。',
    storyFocus: '像一條河，流速、流向與蓄水能力同樣重要。',
    story: '財帛宮說明你如何創造收入，也指出資源容易在哪裡流失。',
    opportunity: '適合重新設計收入結構，把專長轉成可持續的資源。',
    pressure: '花費、投資或人情支出若沒有規則，容易削弱安全感。',
    action: '建立固定預算、現金流表與高低風險資源分層。',
    likely: '收入模式、支出配置或資源分配會成為今年重點。',
    repair: '先穩定現金流，再追求放大。',
    encouragement: '財帛宮的重點是會不會管理能量，而不是只看數字。',
    tone: 'border-emerald-400/30 bg-emerald-950/15 text-emerald-100',
  },
  JI_E: {
    subtitle: '身心壓力、健康警訊與修復力。',
    icon: '疾',
    professionalMeaning: '疾厄宮觀察身體承受度、壓力出口、慢性消耗與修復能力，是命盤裡的能量警示系統。',
    sanFangRole: '疾厄宮會反映命主是否能長期承擔命宮目標，若此宮失衡，其他宮位也會被拖慢。',
    storyFocus: '像儀表板，提醒你哪裡過熱、哪裡需要降載。',
    story: '疾厄宮不是恐嚇，而是提醒你身體與情緒正在用自己的方式說話。',
    opportunity: '適合建立作息、運動、休息與壓力管理規則。',
    pressure: '長期硬撐會讓判斷力與行動力同時下降。',
    action: '先固定睡眠、飲食、運動，再處理高壓任務。',
    likely: '疲勞、壓力、健康檢查或生活節奏調整會成為提醒。',
    repair: '把休息列入計畫，不把休息當成失敗。',
    encouragement: '能量恢復後，命盤其他優勢才會真正啟動。',
    tone: 'border-lime-400/30 bg-lime-950/15 text-lime-100',
  },
  QIAN_YI: {
    subtitle: '外部舞台、遠方機會與環境適應。',
    icon: '遷',
    professionalMeaning: '遷移宮看外地、旅行、移動、外部曝光與環境變動，也看你在陌生場域中的發揮。',
    sanFangRole: '遷移宮是命宮的對宮，代表外界如何回應你，也代表你離開熟悉環境後的真正表現。',
    storyFocus: '像遠方的門，打開後會看見新的舞台。',
    story: '遷移宮說明你在外界能不能被看見，也提醒你環境選擇會影響命運路線。',
    opportunity: '適合拓展市場、學習新場域、接觸外部資源。',
    pressure: '陌生環境帶來機會，也會放大準備不足。',
    action: '出門前先定目標、資源、風險與回收方式。',
    likely: '外出、轉換環境、遠距合作或外部曝光增加。',
    repair: '先建立適應策略，再擴大行動半徑。',
    encouragement: '當你走出去，命盤會得到新的回應。',
    tone: 'border-orange-400/30 bg-orange-950/15 text-orange-100',
  },
  JIAO_YOU: {
    subtitle: '人脈品質、合作圈層與貴人辨識。',
    icon: '友',
    professionalMeaning: '交友宮看朋友、團隊、社群、人脈與合作對象的品質，重點是圈層會如何影響命主。',
    sanFangRole: '此宮用來判斷外部人際是否能支援官祿與財帛，或反而形成消耗。',
    storyFocus: '像一張網，好的網托住你，混亂的網纏住你。',
    story: '交友宮提醒你，人脈不是越多越好，而是要能承接共同目標。',
    opportunity: '適合篩選合作圈，保留真正能互相成就的人。',
    pressure: '錯誤圈層會帶來訊息噪音與責任消耗。',
    action: '把人脈分為學習、合作、支持、消耗四類。',
    likely: '團隊、人脈、社群或合作邀約會需要重新排序。',
    repair: '減少無效社交，增加高品質互助。',
    encouragement: '選對圈層，就是選對運勢的放大器。',
    tone: 'border-teal-400/30 bg-teal-950/15 text-teal-100',
  },
  GUAN_LU: {
    subtitle: '職涯定位、事業責任與成就路徑。',
    icon: '官',
    professionalMeaning: '官祿宮代表事業、專業、名聲、責任與社會角色，是看一個人如何建立成就的核心宮位。',
    sanFangRole: '官祿宮在命財官遷中負責把命宮能力落成職涯成果，並與財帛宮形成能力與收入的對照。',
    storyFocus: '像一座工作台，把天賦打磨成可被看見的作品。',
    story: '官祿宮說明你適合如何工作、如何承擔責任，以及如何建立專業聲望。',
    opportunity: '適合定義專業標籤，讓外界知道你能解決什麼問題。',
    pressure: '責任過重或方向不清，會讓努力分散。',
    action: '把職涯目標拆成職位、能力、作品、收入四條線。',
    likely: '工作任務、職涯定位、升遷轉職或專業曝光會成為重點。',
    repair: '先確立定位，再追求更大的責任。',
    encouragement: '你的成就不是靠硬撐，而是靠清楚的專業結構。',
    tone: 'border-amber-400/30 bg-amber-950/15 text-amber-100',
  },
  TIAN_ZHAI: {
    subtitle: '家庭根基、居住安全與資產承接。',
    icon: '宅',
    professionalMeaning: '田宅宮看家宅、房產、居住品質、內在安全感與長期資產的承接能力。',
    sanFangRole: '田宅宮會支撐財帛與福德，代表一個人能否把資源沉澱成穩定基礎。',
    storyFocus: '像地基，地基穩，外面的變動就不容易動搖你。',
    story: '田宅宮說明你的安定感來源，也指出家庭、空間、資產如何影響長期運勢。',
    opportunity: '適合整理居住環境、規劃資產、建立穩定生活節奏。',
    pressure: '家庭責任或空間混亂會消耗精神。',
    action: '先處理居住秩序與資產清單，再談擴張。',
    likely: '搬遷、修繕、家庭議題或資產配置會浮上檯面。',
    repair: '把空間整理成能恢復能量的地方。',
    encouragement: '安定不是停滯，而是讓你能走更遠的基地。',
    tone: 'border-yellow-400/30 bg-yellow-950/15 text-yellow-100',
  },
  FU_DE: {
    subtitle: '精神福分、休養品質與內在滿足。',
    icon: '福',
    professionalMeaning: '福德宮看精神世界、休息能力、興趣品味、內在滿足與長期福分。',
    sanFangRole: '福德宮影響命主的續航力，若福德不足，外在成就容易變成空轉與消耗。',
    storyFocus: '像內在花園，決定你能不能在忙碌中仍保持生命感。',
    story: '福德宮提醒你，真正的福氣不是只有得到，而是能不能安住、享受與恢復。',
    opportunity: '適合重新安排休息、興趣、精神滋養與自我照顧。',
    pressure: '若長期忽略內在需求，會讓外在成功失去重量。',
    action: '每週固定安排非功利的修復時間。',
    likely: '睡眠、情緒、興趣、心靈狀態會成為今年的隱性主題。',
    repair: '減少過度刺激，增加能讓心沉下來的習慣。',
    encouragement: '福德宮穩，人生不只前進，也能真正感到值得。',
    tone: 'border-violet-400/30 bg-violet-950/15 text-violet-100',
  },
  FU_MU: {
    subtitle: '長輩上級、傳承支持與制度資源。',
    icon: '親',
    professionalMeaning: '父母宮看父母、長輩、上級、制度、文書與被支持或被要求的方式。',
    sanFangRole: '父母宮能補充命主與權威、規則、傳承之間的互動，影響學習與職場資源。',
    storyFocus: '像一條傳承線，裡面有支持，也有需要重新理解的期待。',
    story: '父母宮說明你如何面對權威，也指出哪些資源可以透過長輩、上級或制度取得。',
    opportunity: '適合整理文書、尋求指導、修復與長輩或上級的溝通。',
    pressure: '過度迎合期待，容易讓自己的方向被稀釋。',
    action: '把尊重與自我主張分開處理，建立成熟溝通。',
    likely: '長輩、上級、證照、制度、合約或學習資源會出現關鍵訊號。',
    repair: '用清楚文件與穩定態度取代情緒防衛。',
    encouragement: '你可以承接好的資源，也可以重新定義自己的路。',
    tone: 'border-indigo-400/30 bg-indigo-950/15 text-indigo-100',
  },
};


const ZIWEI_PALACE_THREE_LAYER_MATERIAL: Record<ZiweiPalaceKey, ZiweiPalaceThreeLayerMaterial> = {
  MING: {
    layerOneTitle: '命宮｜人格主軸定盤',
    layerOneText: '命宮是十二宮的總樞紐，先判斷命主的氣質、決策模式、承擔方式與人生主線。此層只建立命盤結構，不直接給補強結論。',
    layerTwoTitle: '命宮｜自我定位翻譯',
    layerTwoText: '白話來看，命宮是在回答：你用什麼方式面對人生？你遇到壓力時先退、先衝、先觀察，還是先承擔？',
    layerThreeTitle: '命宮｜主軸優先排序',
    layerThreeText: '先穩住自我定位，再統整財帛、官祿、遷移三方訊號，把所有行動拉回同一條人生主線。',
    actionPriorities: [
      { title: '第一補強：定主軸', text: '列出今年三個核心目標，其他選擇都先回到這三個目標檢查。' },
      { title: '第二補強：定角色', text: '確認自己目前最需要承擔的角色，不再同時扮演過多身份。' },
      { title: '第三補強：定節奏', text: '建立每週檢查節奏，讓命宮主軸持續落地。' },
    ],
  },
  XIONG_DI: {
    layerOneTitle: '兄弟宮｜同輩支援盤',
    layerOneText: '兄弟宮判斷手足、同輩、合作夥伴與橫向支援力，也看資源是否會在人情與分工之間消耗。',
    layerTwoTitle: '兄弟宮｜合作關係翻譯',
    layerTwoText: '白話來看，這一宮是在問：誰真的能幫你？誰只是消耗你的時間？合作關係能不能把責任說清楚？',
    layerThreeTitle: '兄弟宮｜合作邊界排序',
    layerThreeText: '先把合作規則建立起來，再確認支援名單，最後調整容易模糊的責任分工。',
    actionPriorities: [
      { title: '第一補強：寫清分工', text: '合作前先寫明責任、時間、交付內容與退出方式。' },
      { title: '第二補強：篩選支援', text: '保留能互相補位的人，減少只談情分不談責任的合作。' },
      { title: '第三補強：修正比較', text: '停止用比較消耗同輩關係，改用規則維持長期合作。' },
    ],
  },
  FU_QI: {
    layerOneTitle: '夫妻宮｜親密承諾盤',
    layerOneText: '夫妻宮判斷親密關係、承諾模式、伴侶互動與投射課題，不只看婚姻，也看一對一的重要關係。',
    layerTwoTitle: '夫妻宮｜情感模式翻譯',
    layerTwoText: '白話來看，這一宮是在問：你在關係裡如何表達需要？如何面對不安？如何讓承諾變成可執行的生活節奏？',
    layerThreeTitle: '夫妻宮｜關係修復排序',
    layerThreeText: '先說清需求，再處理界線，最後把情感承諾轉成共同節奏。',
    actionPriorities: [
      { title: '第一補強：說清需求', text: '把期待改成具體句子，不用猜測與沉默測試對方。' },
      { title: '第二補強：確認界線', text: '列出可接受與不可接受的互動方式，讓關係有邊界。' },
      { title: '第三補強：建立共識', text: '固定討論金錢、時間、家庭與未來計畫。' },
    ],
  },
  ZI_NV: {
    layerOneTitle: '子女宮｜創造成果盤',
    layerOneText: '子女宮判斷創造力、作品、學生、子女緣與成果延伸，看一件事是否能被培養、承接與長大。',
    layerTwoTitle: '子女宮｜成果養成翻譯',
    layerTwoText: '白話來看，這一宮是在問：你播下的種子有沒有被照顧？作品、孩子、計畫是否有穩定養成期？',
    layerThreeTitle: '子女宮｜培育節奏排序',
    layerThreeText: '先建立養成節奏，再安排檢查點，最後讓成果有機會被看見。',
    actionPriorities: [
      { title: '第一補強：固定週期', text: '把創作、教養或培育計畫拆成每週可執行的節點。' },
      { title: '第二補強：建立回饋', text: '每個成果都安排一次檢查與修正，不只看完成。' },
      { title: '第三補強：公開呈現', text: '讓作品或成果有穩定發表與被承接的場域。' },
    ],
  },
  CAI_BO: {
    layerOneTitle: '財帛宮｜資源轉換盤',
    layerOneText: '財帛宮判斷收入來源、金錢觀、理財習慣、資源交換與現金流穩定度，不只看財運高低。',
    layerTwoTitle: '財帛宮｜金錢模式翻譯',
    layerTwoText: '白話來看，這一宮是在問：你的能力能不能轉成收入？錢是有規則地流動，還是被情緒與人情帶走？',
    layerThreeTitle: '財帛宮｜現金流排序',
    layerThreeText: '先穩現金流，再分類資源，最後放大能長期產生收入的能力。',
    actionPriorities: [
      { title: '第一補強：做現金流表', text: '先掌握固定收入、固定支出、彈性支出與風險支出。' },
      { title: '第二補強：分層資源', text: '把錢分成生活、安全、成長、投資四層，不混用。' },
      { title: '第三補強：能力變現', text: '找出最能創造收入的能力，設計穩定服務或產品。' },
    ],
  },
  JI_E: {
    layerOneTitle: '疾厄宮｜身心承載盤',
    layerOneText: '疾厄宮判斷身體承受度、壓力出口、慢性消耗、修復能力與生活節奏，是命盤的能量警示系統。',
    layerTwoTitle: '疾厄宮｜壓力訊號翻譯',
    layerTwoText: '白話來看，這一宮是在問：你的身體是否已經替你說話？哪些壓力正在拖慢判斷力與行動力？',
    layerThreeTitle: '疾厄宮｜修復優先排序',
    layerThreeText: '先恢復睡眠與規律，再降低高壓消耗，最後重建長期續航。',
    actionPriorities: [
      { title: '第一補強：固定睡眠', text: '先穩定入睡、起床與用餐時間，讓身體恢復基本秩序。' },
      { title: '第二補強：降低消耗', text: '砍掉最耗能的任務、人際或無效承諾。' },
      { title: '第三補強：建立修復', text: '安排運動、伸展、檢查與休息，不把休息當成失敗。' },
    ],
  },
  QIAN_YI: {
    layerOneTitle: '遷移宮｜外部舞台盤',
    layerOneText: '遷移宮判斷外地、移動、轉場、遠方資源、外部曝光與陌生環境中的發揮。',
    layerTwoTitle: '遷移宮｜環境機會翻譯',
    layerTwoText: '白話來看，這一宮是在問：你走出去之後會遇到什麼機會？環境是在放大你，還是在消耗你？',
    layerThreeTitle: '遷移宮｜拓展路線排序',
    layerThreeText: '先選對場域，再建立出行策略，最後把外部曝光轉成實際成果。',
    actionPriorities: [
      { title: '第一補強：選場域', text: '判斷哪個城市、平台、圈層或市場最能放大你的能力。' },
      { title: '第二補強：定策略', text: '每次外出、合作或曝光前先設定目的、資源與回收方式。' },
      { title: '第三補強：做沉澱', text: '把外部經驗整理成作品、人脈或下一步計畫。' },
    ],
  },
  JIAO_YOU: {
    layerOneTitle: '交友宮｜圈層人脈盤',
    layerOneText: '交友宮判斷朋友、團隊、社群、合作對象與貴人品質，重點是圈層如何影響命主。',
    layerTwoTitle: '交友宮｜人脈品質翻譯',
    layerTwoText: '白話來看，這一宮是在問：誰能與你互相成就？哪一種圈層正在提供機會，哪一種圈層正在製造噪音？',
    layerThreeTitle: '交友宮｜圈層篩選排序',
    layerThreeText: '先刪除消耗圈，再留下高品質互助，最後建立能共同成長的社群節奏。',
    actionPriorities: [
      { title: '第一補強：分類人脈', text: '把人脈分成學習、合作、支持、消耗四類。' },
      { title: '第二補強：減少噪音', text: '降低無效社交與模糊邀約，保留真正有目標的互動。' },
      { title: '第三補強：建立互助', text: '固定與高品質夥伴交換資源、回饋與機會。' },
    ],
  },
  GUAN_LU: {
    layerOneTitle: '官祿宮｜事業成就盤',
    layerOneText: '官祿宮判斷職涯定位、專業能力、名聲、責任承擔與社會角色，是建立成就的核心宮位。',
    layerTwoTitle: '官祿宮｜職涯路線翻譯',
    layerTwoText: '白話來看，這一宮是在問：你靠什麼被看見？你的專業能否形成職位、作品、收入與長期聲望？',
    layerThreeTitle: '官祿宮｜成就路徑排序',
    layerThreeText: '先定專業標籤，再建立作品證據，最後把責任轉成可被看見的成果。',
    actionPriorities: [
      { title: '第一補強：定專業標籤', text: '用一句話說清楚你能解決什麼問題。' },
      { title: '第二補強：補作品證據', text: '整理案例、成果、證照、作品或服務流程。' },
      { title: '第三補強：升級責任', text: '把責任變成職涯資產，不讓責任只變成壓力。' },
    ],
  },
  TIAN_ZHAI: {
    layerOneTitle: '田宅宮｜根基資產盤',
    layerOneText: '田宅宮判斷家庭根基、居住環境、不動產、資產安全與內在安定，是生活底盤。',
    layerTwoTitle: '田宅宮｜安全感翻譯',
    layerTwoText: '白話來看，這一宮是在問：你的家是否支持你？居住、家庭與資產是否讓你安定，還是讓你分心？',
    layerThreeTitle: '田宅宮｜根基整理排序',
    layerThreeText: '先整理空間與家庭責任，再盤點資產，最後建立能支撐人生的生活底盤。',
    actionPriorities: [
      { title: '第一補強：整理空間', text: '先處理居住環境、工作角落與生活動線。' },
      { title: '第二補強：釐清責任', text: '把家庭責任、金錢責任與情緒責任分開。' },
      { title: '第三補強：盤點資產', text: '整理房產、儲蓄、保險與長期安全資源。' },
    ],
  },
  FU_DE: {
    layerOneTitle: '福德宮｜精神續航盤',
    layerOneText: '福德宮判斷精神狀態、內在滿足、休養品質、信念系統與長期福分，是心的續航力。',
    layerTwoTitle: '福德宮｜內在狀態翻譯',
    layerTwoText: '白話來看，這一宮是在問：你快樂嗎？你的心有沒有地方可以休息？你的努力是否仍有意義感？',
    layerThreeTitle: '福德宮｜精神修復排序',
    layerThreeText: '先恢復安靜，再重建意義感，最後建立長期滋養自己的節奏。',
    actionPriorities: [
      { title: '第一補強：留白休息', text: '每天安排不被打擾的安靜時間。' },
      { title: '第二補強：找回意義', text: '重新確認自己為何努力，哪些事值得長期投入。' },
      { title: '第三補強：建立滋養', text: '安排閱讀、音樂、散步、修行或創作，讓精神能量回來。' },
    ],
  },
  FU_MU: {
    layerOneTitle: '父母宮｜傳承制度盤',
    layerOneText: '父母宮判斷長輩、上級、制度、傳承資源、文件規範與權威關係，也看外部支持是否穩定。',
    layerTwoTitle: '父母宮｜權威資源翻譯',
    layerTwoText: '白話來看，這一宮是在問：你如何面對上級與制度？你能不能取得長輩、規範與資源系統的支持？',
    layerThreeTitle: '父母宮｜制度支援排序',
    layerThreeText: '先釐清規則，再修復溝通，最後把傳承資源轉成實際支持。',
    actionPriorities: [
      { title: '第一補強：讀懂規則', text: '把合約、流程、制度、長輩期待與上級要求整理清楚。' },
      { title: '第二補強：修正溝通', text: '用事實與節點溝通，不用情緒對抗權威。' },
      { title: '第三補強：承接資源', text: '把可用的人脈、文件、經驗與制度支援轉成自己的助力。' },
    ],
  },
};

function getZiweiPalaceThreeLayerMaterial(
  key: string,
  palaceName: string,
  story: ZiweiPalaceStoryMaterial,
): ZiweiPalaceThreeLayerMaterial {
  return ZIWEI_PALACE_THREE_LAYER_MATERIAL[key as ZiweiPalaceKey] ?? {
    layerOneTitle: palaceName + '｜專業命盤',
    layerOneText: story.professionalMeaning,
    layerTwoTitle: palaceName + '｜白話解讀',
    layerTwoText: story.storyFocus,
    layerThreeTitle: palaceName + '｜行動排序',
    layerThreeText: story.action,
    actionPriorities: [
      { title: '第一補強：穩定主題', text: story.action },
      { title: '第二補強：處理壓力', text: story.pressure },
      { title: '第三補強：回到三方四正', text: story.sanFangRole },
    ],
  };
}

const ZIWEI_PALACE_ANNUAL_LENS: Record<string, { label: string; matrixKey: ZiweiAdviceMatrixKey; source: string }> = {
  MING: { label: '自我定位', matrixKey: 'confidence', source: '年度主軸回到命宮，需確認人生方向與行動承擔。' },
  XIONG_DI: { label: '同輩協作', matrixKey: 'communication', source: '年度訊號落在人際分工與同輩互助。' },
  FU_QI: { label: '關係磨合', matrixKey: 'relationshipAwareness', source: '年度重點牽動親密關係、承諾與互動模式。' },
  ZI_NV: { label: '成果養成', matrixKey: 'learningGrowth', source: '年度提醒把創造力與成果延伸穩定養成。' },
  CAI_BO: { label: '財務節奏', matrixKey: 'financialDiscipline', source: '年度重點落在收入、支出與資源配置。' },
  JI_E: { label: '身心修復', matrixKey: 'stressManagement', source: '年度提醒先穩住健康、壓力與日常節奏。' },
  QIAN_YI: { label: '外部機會', matrixKey: 'adaptability', source: '年度訊號指向移動、外界舞台與環境適應。' },
  JIAO_YOU: { label: '人脈品質', matrixKey: 'communication', source: '年度重點在圈層、合作對象與社群影響。' },
  GUAN_LU: { label: '事業落點', matrixKey: 'execution', source: '年度訊號要求職涯定位與專業輸出更具體。' },
  TIAN_ZHAI: { label: '安定根基', matrixKey: 'patience', source: '年度重點落在家庭、居住與長期資產安全。' },
  FU_DE: { label: '精神續航', matrixKey: 'stressManagement', source: '年度提醒重建休養、興趣與內在滋養。' },
  FU_MU: { label: '傳承資源', matrixKey: 'learningGrowth', source: '年度重點牽動長輩、制度、學習與文件資源。' },
};

function getZiweiAnnualSignal(
  palaceKey: string,
  annualPalace?: ZiweiAnnualPalace,
  annual?: ZiweiAnnualFortune,
) {
  const lens = ZIWEI_PALACE_ANNUAL_LENS[palaceKey];
  const matrixScore = annual && lens ? annual.adviceMatrix[lens.matrixKey] : undefined;
  return {
    score: annualPalace?.score ?? matrixScore ?? annual?.overallScore ?? null,
    label: annualPalace?.trend ?? lens?.label ?? annual?.level ?? '年度訊號',
    focus: annualPalace?.focus ?? lens?.source ?? annual?.annualTheme ?? '年度主軸與十二宮位交叉觀察。',
    advice: annualPalace?.advice ?? annual?.motivation.actionAdvice,
    encouragement: annualPalace?.encouragement ?? annual?.motivation.coreEncouragement,
    action: annualPalace?.action ?? annual?.motivation.growthReminder,
    basis: annualPalace?.basis ?? annual?.baziFocus.advice,
    strengths: annualPalace?.strengths ?? annual?.recommendations.slice(0, 2) ?? [],
    tensions: annualPalace?.tensions ?? (annual ? [annual.motivation.mainWarning] : []),
    scoreSource: annualPalace ? '宮位年度分數' : lens ? '年度矩陣分數' : '整體年度分數',
  };
}

function normalizeZiweiPalaceName(name: string) {
  const fallback = Object.values(ZIWEI_PALACE_FALLBACK).find((item) => item.name === name || item.name + '宮' === name);
  if (fallback) return fallback.name + '宮';
  const trimmed = (name || '').trim();
  if (!trimmed) return '宮位';
  return trimmed.endsWith('宮') ? trimmed : trimmed + '宮';
}

function buildZiweiFallbackStory(palaceName: string): ZiweiPalaceStoryMaterial {
  return {
    subtitle: palaceName + '主題分析',
    icon: palaceName.slice(0, 1) || '宮',
    professionalMeaning: palaceName + '用來觀察此宮位對人生主題的影響。',
    sanFangRole: '此宮位需與命宮、財帛宮、官祿宮、遷移宮共同交叉判讀。',
    storyFocus: '此宮位是命盤故事中的一個專門場景。',
    story: palaceName + '呈現此人生領域的主要節奏、資源與壓力。',
    opportunity: '先找出此宮位目前最有利的可用資源。',
    pressure: '需要留意此領域是否出現過度消耗或責任不清。',
    action: '把此宮位主題拆成可執行的小步驟。',
    likely: '近期容易在此宮位主題上出現需要處理的變化。',
    repair: '以穩定節奏與清楚邊界修復此領域。',
    encouragement: '此宮位不是限制，而是可被整理與運用的訊號。',
    tone: 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
  };
}

function ZiweiTwelvePalaceCards({
  analysis,
  annual,
}: {
  analysis?: InsightResult['ziweiSanFang'];
  annual?: InsightResult['annualFortune'];
}) {
  const [selectedPalaceKey, setSelectedPalaceKey] = useState<string | null>(null);
  const storyPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedPalaceKey) return;
    const timer = window.setTimeout(() => {
      storyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedPalaceKey]);

  if (!analysis) return null;

  const palaceSource: ZiweiFullPalace[] = analysis.allPalaces?.length ? analysis.allPalaces : analysis.palaces;
  const palaceMap = new Map<string, ZiweiFullPalace>();
  palaceSource.forEach((palace) => palaceMap.set(palace.key, palace));
  const annualMap = new Map((annual?.sanFangFourZheng ?? []).map((item) => [item.palaceKey, item]));
  const precisionMap = new Map((analysis.palaceAnalyses ?? []).map((item) => [item.palaceKey, item]));
  const sortedPalaces = ZIWEI_TWELVE_PALACE_ORDER.map((key) => palaceMap.get(key) ?? createZiweiFallbackPalace(key));
  const sanFangPalaces = ZIWEI_SAN_FANG_FOUR_ZHENG_ORDER.map((key) => palaceMap.get(key) ?? createZiweiFallbackPalace(key));
  const selectedPalace = sortedPalaces.find((palace) => palace.key === selectedPalaceKey) ?? null;

  return (
    <section className="fortune-card p-5 sm:p-8">
      <div className="rounded-[28px] border border-amber-300/35 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),rgba(15,23,42,0.56)_42%,rgba(2,6,23,0.82)_100%)] p-5 text-center shadow-[0_0_46px_rgba(251,191,36,0.14)] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/85">PROFESSIONAL ZI WEI CHART</p>
        <h2 className="mx-auto mt-3 max-w-4xl break-words font-serif text-5xl font-black leading-tight text-amber-100 drop-shadow-[0_0_20px_rgba(251,191,36,0.35)] sm:text-7xl">
          {analysis.pattern.name}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-amber-50/78">第一層只負責建立紫微斗數命盤結構：十二宮位、主星訊號、年度宮位分數與三方四正，不在此層直接輸出補強結論。</p>
        <p className="mt-3 text-xs text-amber-100/60">分析年份：{annual?.year ?? new Date().getFullYear()}</p>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-indigo-300">ZI WEI PALACES</p>
          <h3 className="mt-3 font-serif text-3xl text-indigo-100 sm:text-4xl">紫微十二宮位專業拆解</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-sub)]">十二張宮位卡統一分成三層：第一層專業命盤、第二層 AI 白話解讀、第三層 AI 行動排序。點選任一宮位，查看該宮的完整專業素材與三方四正交叉分析。</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-cyan-300/20 bg-cyan-950/20 px-3 py-1 text-cyan-100">
          {analysis.timeConfidence === 'exact' ? '已依真實時辰排盤' : '暫定時辰排盤，可再校正'}
        </span>

      </div>

      <div className="ziwei-palace-grid mt-6 grid grid-cols-2 gap-3.5 max-[340px]:grid-cols-1 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {sortedPalaces.map((palace, index) => {
          const story = ZIWEI_PALACE_STORY[palace.key] ?? buildZiweiFallbackStory(normalizeZiweiPalaceName(palace.name));
          const annualPalace = annualMap.get(palace.key as 'MING' | 'CAI_BO' | 'GUAN_LU' | 'QIAN_YI');
          const annualSignal = getZiweiAnnualSignal(palace.key, annualPalace, annual);
          const active = selectedPalaceKey === palace.key;
          const palaceName = normalizeZiweiPalaceName(palace.name);
          const layerMaterial = getZiweiPalaceThreeLayerMaterial(palace.key, palaceName, story);
          const layerPreview = [
            { layer: '第一層', title: '專業素材', text: layerMaterial.layerOneText },
            { layer: '第二層', title: '白話轉譯', text: layerMaterial.layerTwoText },
            { layer: '第三層', title: '行動排序', text: layerMaterial.layerThreeText },
          ];

          return (
            <button
              key={palace.key}
              type="button"
              onClick={() => setSelectedPalaceKey(active ? null : palace.key)}
              className={`ziwei-palace-card group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[24px] border p-4 text-left shadow-[0_14px_34px_rgba(2,6,23,0.28)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(2,6,23,0.36)] focus:outline-none focus:ring-2 focus:ring-indigo-200/70 ${story.tone} ${active ? '-translate-y-1 ring-2 ring-amber-100/60 shadow-[0_22px_52px_rgba(251,191,36,0.16),0_16px_40px_rgba(2,6,23,0.38)]' : ''}`}
              aria-expanded={active}
            >
              <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              <span className={`pointer-events-none absolute inset-0 bg-white/[0.035] opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${active ? 'opacity-100' : ''}`} />
              <div className="relative flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-white/15 bg-black/25 text-2xl shadow-[inset_0_0_20px_rgba(255,255,255,0.10),0_10px_22px_rgba(0,0,0,0.18)]">
                  {story.icon}
                </span>
                <span className="text-[11px] font-semibold tracking-[0.18em] opacity-60">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="relative mt-4 font-serif text-[1.35rem] font-black leading-tight sm:text-2xl">{palaceName}</h3>
              <p className="relative mt-2 min-h-[40px] text-xs leading-5 opacity-75">{story.subtitle}</p>
              {annualSignal.score !== null && (
                <p className="relative mt-3 inline-flex rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[11px] font-semibold opacity-90">
                  {annualSignal.label} · {annualSignal.score}
                </p>
              )}
              <div className="relative mt-4 space-y-2">
                {layerPreview.map((item) => (
                  <div key={item.layer} className="rounded-2xl border border-white/10 bg-black/16 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black tracking-[0.16em] opacity-70">{item.layer}</span>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold opacity-80">{item.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 opacity-78">{item.text}</p>
                  </div>
                ))}
              </div>
              <p className="relative mt-4 text-xs font-semibold opacity-90">{active ? '已展開分析 ↑' : '查看分析 →'}</p>
            </button>
          );
        })}
      </div>

      {selectedPalace ? (
        <ZiweiPalaceStoryPanel
          panelRef={storyPanelRef}
          palace={selectedPalace}
          annualPalace={annualMap.get(selectedPalace.key as 'MING' | 'CAI_BO' | 'GUAN_LU' | 'QIAN_YI')}
          annual={annual}
          precisionAnalysis={precisionMap.get(selectedPalace.key)}
          story={ZIWEI_PALACE_STORY[selectedPalace.key]}
          year={annual?.year ?? new Date().getFullYear()}
          patternName={analysis.pattern.name}
          sanFangPalaces={sanFangPalaces}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-[color:var(--text-sub)]">
          先點選一個宮位。每張宮位卡都已建立三層：第一層專業素材、第二層白話轉譯、第三層行動排序；展開後會把該宮放回命財官遷三方四正中交叉理解。
        </div>
      )}
    </section>
  );
}

function ZiweiPalaceStoryPanel({
  panelRef,
  palace,
  annualPalace,
  annual,
  precisionAnalysis,
  story,
  year,
  patternName,
  sanFangPalaces,
}: {
  panelRef: Ref<HTMLDivElement>;
  palace: ZiweiFullPalace;
  annualPalace?: ZiweiAnnualPalace;
  annual?: ZiweiAnnualFortune;
  precisionAnalysis?: ZiweiPrecisionAnalysis;
  story?: ZiweiPalaceStoryMaterial;
  year: number;
  patternName: string;
  sanFangPalaces: ZiweiFullPalace[];
}) {
  const palaceName = normalizeZiweiPalaceName(palace.name);
  const config = story ?? buildZiweiFallbackStory(palaceName);
  const layerMaterial = getZiweiPalaceThreeLayerMaterial(palace.key, palaceName, config);
  const mainStars = palace.majorStars.length > 0 ? palace.majorStars.join('、') : '未定主星';
  const supportStars = palace.minorStars.slice(0, 5).join('、');
  const transformations = palace.transformations.join('、');
  const annualSignal = getZiweiAnnualSignal(palace.key, annualPalace, annual);
  const firstEvent = precisionAnalysis?.likelyEvents[0];
  const primaryOpportunity = precisionAnalysis?.primaryOpportunity.description ?? annualSignal.focus ?? config.opportunity;
  const primaryPressure = precisionAnalysis?.primaryRisk.description ?? annualSignal.tensions[0] ?? config.pressure;
  const primaryAction = precisionAnalysis?.actionPlan.doFirst[0] ?? annualSignal.action ?? config.action;
  const primaryAdvice = precisionAnalysis?.directConclusion ?? annualSignal.advice ?? config.story;
  const primaryEncouragement = annualSignal.encouragement ?? config.encouragement;
  const likelyText = firstEvent?.likelyScenario ?? config.likely;
  const repairText = precisionAnalysis?.actionPlan.doFirst.slice(0, 2).join('；') || config.repair;
  const evidenceItems = precisionAnalysis?.evidenceSummary ?? [];

  const coreInsightCards = [
    { label: '專業定位', text: config.professionalMeaning },
    { label: '機會訊號', text: primaryOpportunity },
    { label: '壓力訊號', text: primaryPressure },
  ];
  const situationalCards = [
    { label: '故事主軸', text: config.storyFocus },
    { label: '可能事件', text: likelyText },
    { label: '修復方式', text: repairText },
  ];
  const secondLayerCards = [
    {
      label: layerMaterial.layerTwoTitle,
      text: layerMaterial.layerTwoText,
    },
    {
      label: '生活場景轉譯',
      text: '這一宮不是單點事件，而是「' + config.storyFocus + '」。使用者需要先理解它代表的生活場景，再看年度訊號如何落下。',
    },
    {
      label: '證據串接',
      text: '解讀依據固定來自第一層：' + layerMaterial.layerOneTitle + '、' + annualSignal.label + '、主星組合 ' + mainStars + '，以及三方四正的命宮、遷移宮、財帛宮、官祿宮。',
    },
  ];
  const thirdLayerPriorities = layerMaterial.actionPriorities.map((item, index) => ({
    order: ['第一補強', '第二補強', '第三補強'][index] ?? '後續補強',
    title: item.title,
    text: item.text,
  }));

  return (
    <div ref={panelRef} className={"mt-6 scroll-mt-24 rounded-[24px] border p-5 sm:p-6 " + config.tone}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] opacity-70">{year} 年度宮位拆解</p>
          <h3 className="mt-2 font-serif text-3xl font-black leading-tight">{palaceName}</h3>
          <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{config.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/15 px-4 py-3 text-left sm:text-right">
          <p className="text-xs opacity-70">命盤格局</p>
          <p className="mt-1 text-sm font-bold">{patternName}</p>
          {annualSignal.score !== null && <p className="mt-2 text-xs opacity-80">{annualSignal.scoreSource} {annualSignal.score}</p>}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-950/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.24em] text-cyan-200/75">三方四正交叉分析</p>
            <h4 className="mt-1 font-serif text-xl font-black leading-tight text-cyan-50 sm:text-2xl">
              命宮 × 遷移宮 × 財帛宮 × 官祿宮
            </h4>
          </div>
          <p className="text-xs leading-5 text-cyan-100/70">{config.sanFangRole}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {sanFangPalaces.map((item) => {
            const key = item.key as ZiweiSanFangKey;
            const label = ZIWEI_SAN_FANG_LABELS[key] ?? { label: normalizeZiweiPalaceName(item.name), role: '參照宮位' };
            const itemAnnual = annual?.sanFangFourZheng.find((annualItem) => annualItem.palaceKey === key);
            const stars = item.majorStars.length > 0 ? item.majorStars.join('、') : '未定主星';

            return (
              <div key={key} className="min-h-[116px] rounded-[18px] border border-white/10 bg-black/18 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-cyan-100/60">{label.role}</p>
                  {itemAnnual && <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-cyan-100/80">{itemAnnual.score} 分</span>}
                </div>
                <p className="mt-2 font-serif text-lg font-black leading-none text-cyan-50">{label.label}</p>
                <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-5 text-[color:var(--text-main)]">{stars}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[color:var(--text-sub)]">{itemAnnual?.focus ?? item.focus}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs leading-6 text-[color:var(--text-sub)]">
          三方四正用來看命主如何把人格主軸、外部舞台、財務資源與職涯成就串成同一條路線。此處只做命盤結構拆解，不在此層直接給補強結論。
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
        <p className="text-xs font-semibold tracking-[0.2em] opacity-70">第一層專業拆解</p>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-xs font-black text-cyan-100/80">{layerMaterial.layerOneTitle}</p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--text-main)]">{layerMaterial.layerOneText}</p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {coreInsightCards.map((item) => (
            <div key={item.label} className="border-l border-cyan-200/20 pl-3">
              <p className="text-xs font-semibold text-cyan-100/70">{item.label}</p>
              <p className="mt-1.5 text-sm leading-6 text-[color:var(--text-main)]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-950/15 p-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-violet-200">第二層 AI 白話解讀</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {secondLayerCards.map((item) => (
            <div key={item.label} className="border-l border-violet-200/20 pl-3">
              <p className="text-xs font-semibold text-violet-100/75">{item.label}</p>
              <p className="mt-1.5 text-sm leading-6 text-[color:var(--text-main)]">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-6 text-[color:var(--text-sub)]">
          第二層只負責把第一層專業命盤翻譯成使用者看得懂的關係與事件語言，不重新排盤、不更改宮位、不直接做補強結論。
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-950/15 p-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-200">第三層 AI 行動排序</p>
        <p className="mt-3 rounded-xl border border-amber-200/20 bg-black/15 px-3 py-2 text-sm font-bold leading-7 text-amber-100">
          AI 判定：{palaceName} 目前優先執行「{layerMaterial.layerThreeTitle}」。第一步處理「{thirdLayerPriorities[0].title}」，完成後再處理「{thirdLayerPriorities[1].title}」，最後回到「{thirdLayerPriorities[2].title}」。
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {thirdLayerPriorities.map((item) => (
            <div key={item.order} className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs font-semibold text-amber-100/75">{item.order}</p>
              <p className="mt-2 text-sm font-black text-amber-100">{item.title}</p>
              <p className="mt-2 text-xs leading-6 text-[color:var(--text-main)]">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-6 text-[color:var(--text-sub)]">
          第三層只讀取第二層解讀結果與第一層命盤證據，輸出清楚的先後順序；它不重新分析命盤，也不保證結果。
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <p className="text-xs font-semibold tracking-[0.2em] opacity-70">故事與事件推演</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {situationalCards.map((item) => (
            <div key={item.label} className="border-l border-white/10 pl-3">
              <p className="text-xs font-semibold opacity-70">{item.label}</p>
              <p className="mt-1.5 text-sm leading-6 text-[color:var(--text-main)]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <p className="text-xs font-semibold tracking-[0.2em] opacity-70">本宮結論</p>
        <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{primaryAdvice}</p>
        <p className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-6 text-[color:var(--text-main)]">
          行動重點：{primaryAction}
        </p>
        <p className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-6 text-[color:var(--text-main)]">
          鼓勵語：{primaryEncouragement}
        </p>
      </div>

      {precisionAnalysis && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold opacity-70">先做</p>
            <ul className="mt-2 space-y-2 text-xs leading-6 text-[color:var(--text-main)]">
              {precisionAnalysis.actionPlan.doFirst.slice(0, 3).map((item) => <li key={item}>・{item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold opacity-70">避免</p>
            <ul className="mt-2 space-y-2 text-xs leading-6 text-[color:var(--text-main)]">
              {precisionAnalysis.actionPlan.avoid.slice(0, 3).map((item) => <li key={item}>・{item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold opacity-70">觀察</p>
            <ul className="mt-2 space-y-2 text-xs leading-6 text-[color:var(--text-main)]">
              {precisionAnalysis.actionPlan.observe.slice(0, 3).map((item) => <li key={item}>・{item}</li>)}
            </ul>
          </div>
        </div>
      )}

      {annual && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] opacity-70">年度訊號納入</p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--text-sub)]">
            {annual.year} {annual.ganzhi}年整體為「{annual.level}」，綜合分數 {annual.overallScore}。此宮位採用「{annualSignal.label}」作為年度切入點，把原本年度運勢統計轉成這一宮的實用提醒。
          </p>
          {annualSignal.strengths.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {annualSignal.strengths.slice(0, 2).map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-[color:var(--text-main)]">
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <details className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-[color:var(--text-main)]">命盤依據</summary>
        <div className="mt-3 grid gap-2 text-xs leading-6 text-[color:var(--text-sub)] sm:grid-cols-2">
          <p>宮位座標：{palace.palaceStem}{palace.branch}</p>
          <p>主星組合：{mainStars}</p>
          {supportStars && <p>輔星訊號：{supportStars}</p>}
          {transformations && <p>四化訊號：{transformations}</p>}
          {evidenceItems.slice(0, 4).map((item) => (
            <p key={item.sourceType + "-" + item.sourceName}>{item.sourceName}：{item.explanation}</p>
          ))}
        </div>
      </details>
    </div>
  );
}

function InsightAnalyticalConsole({
  name,
}: {
  name: string;
}) {
  const [logs, setLogs] = useState<string[]>([]);

  const fullLogs = useMemo(() => [
    `【天宿天盤】抓取個人命格星曜氣場：${name || '未知本體'}`,
    `【地脈羅盤】比對血型地磁與五行相生喜忌... 已就緒`,
    `【紫微排盤】命盤格局、三方四正與今年流年資料... 已就緒`,
    `【天宿智算】正在計算超越樣本數據庫基底...`,
    `【天星解密】生成個人潛能、盲點與改命建議分析報告...`,
  ], [name]);

  useEffect(() => {
    setLogs([]);
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < fullLogs.length) {
        setLogs((prev) => [...prev, fullLogs[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 450);
    return () => clearInterval(interval);
  }, [fullLogs]);

  return (
    <div className="fortune-card p-6 sm:p-8 font-mono border border-cyan-500/20 bg-slate-950/80 shadow-[0_0_30px_rgba(34,211,238,0.08)] w-full relative overflow-hidden">
      <div className="grid gap-4 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300 flex items-center gap-2">
            <span className="animate-ping inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>🧬 大數據個人天宿洞察終端</span>
          </p>
          <div className="mt-6 space-y-3.5 text-xs sm:text-sm text-cyan-100 leading-7 min-h-[150px]">
            {logs.map((log, index) => (
              <p key={index} className="animate-fade-in">
                {log}
              </p>
            ))}
            {logs.length < fullLogs.length && (
              <p className="text-cyan-400">
                【天盤運轉】正在解密命相運算軌道...<span className="console-cursor" />
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InsightPage() {
  const mainRef = useRef<HTMLElement>(null);

  // 檢測 Fast Refresh 或 Chunk 載入錯誤，自動維修重新載入，防禦白屏
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent) => {
      if (e.message && recoverFromChunkError(e.message)) {
        console.warn('檢測到快取 Chunk 異常，正在自動維修重載網頁...', e);
      }
    };
    window.addEventListener('error', handleChunkError);
    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  const [input, setInput] = useState<InsightData>({
    name: '',
    birthDate: '',
    bloodType: 'A',
    gender: 'female',
    shichen: null,
  });
  const [selectionConfirm, setSelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<InsightResult | null>(null);
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<InsightResult> | null>(null);

  useEffect(() => {
    const record = readDailyAnalysis<InsightResult>('ziwei');
    if (!record) return;
    setDailyRecord(record);
    setResult(record.result);
  }, []);

  // 載入 localStorage 預填
  useEffect(() => {
    const saved = loadUserData();
    if (saved) {
      setInput((prev) => ({
        ...prev,
        name: saved.name || prev.name,
        birthDate: saved.birthday || prev.birthDate,
        bloodType: saved.bloodType || prev.bloodType,
        gender: saved.gender || prev.gender,
      }));
    }
  }, []);

  // 同步 input 的變更到 localStorage
  useEffect(() => {
    if (getAnalysisIdentityTarget() !== 'self') return;
    if (input.name || input.birthDate) {
      saveUserData({
        name: input.name,
        birthday: input.birthDate,
        bloodType: input.bloodType,
        gender: input.gender,
      });
    }
  }, [input.name, input.birthDate, input.bloodType, input.gender]);

  useEffect(() => {
    if (loading || result || error) {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, !!result, error]);

  // 驗證函數
  const validateForm = (): string | null => {
    const trimmedName = input.name.trim();

    if (!trimmedName || trimmedName.length === 0) {
      return '請輸入你的名字。';
    }

    if (trimmedName.length < 2) {
      return `姓名需要至少 2 個字（目前 ${trimmedName.length} 字）。`;
    }

    if (!input.birthDate || input.birthDate.trim() === '') {
      return '請輸入完整的生日日期。';
    }

    if (input.shichen === 'known') {
      return '請先選擇出生時辰，或改選「不知道出生時辰」。';
    }


    if (!input.bloodType || !['A', 'B', 'AB', 'O'].includes(input.bloodType)) {
      return '請選擇有效的血型。';
    }

    if (!input.gender || !['male', 'female'].includes(input.gender)) {
      return '請選擇性別。';
    }

    if (!selectionConfirm.bloodType) {
      return '請點選血型。';
    }

    if (!selectionConfirm.gender) {
      return '請點選性別。';
    }

    return null;
  };

  const showMissingFields = Boolean(error) && !result;
  const showMissingName = showMissingFields && input.name.trim().length < 2;
  const showMissingBirthDate = showMissingFields && !input.birthDate;
  const showMissingBloodType = showMissingFields && !selectionConfirm.bloodType;
  const showMissingGender = showMissingFields && !selectionConfirm.gender;

  const handleSubmit = async () => {
    const existing = readDailyAnalysis<InsightResult>('ziwei');
    if (existing) {
      setDailyRecord(existing);
      setResult(existing.result);
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setError('');

    // 執行驗證
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!getAnalysisIdentityTarget()) {
      setError(getIdentityRequiredMessage());
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45000); // 45 秒超時

    let retries = 0;
    const MAX_RETRIES = 2;

    const attemptAnalysis = async (): Promise<void> => {
      try {
        const response = await fetch('/api/insight-analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': `${Date.now()}-${Math.random()}`, // 唯一請求 ID
          },
          signal: controller.signal,
          body: JSON.stringify({
            name: input.name.trim(),
            birthDate: input.birthDate.trim(),
            birthTime: '12:00',
            bloodType: input.bloodType,
            gender: input.gender,
            shichen: typeof input.shichen === 'number' ? input.shichen : 'unknown',
          }),
        });

        if (!response.ok) {
          const json = (await response.json()) as { error?: string };

          // 某些錯誤可以重試
          if (response.status >= 500 && retries < MAX_RETRIES) {
            retries += 1;
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries)); // 指數退避
            return attemptAnalysis();
          }

          setError(json.error || `分析失敗（${response.status}），請稍後再試。`);
          return;
        }

        const json = (await response.json()) as InsightResult;
        setResult(json);
        setDailyRecord(saveDailyAnalysis<InsightResult>('ziwei', json));
        markGrowthModuleCompleted('ziwei', json.fiveElement?.brandElement);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('分析超時（超過 45 秒），請稍後再試或稍候網路恢復後重試。');
        } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          // 網路錯誤，可以重試
          if (retries < MAX_RETRIES) {
            retries += 1;
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
            return attemptAnalysis();
          }
          setError('網路連線中斷，請檢查網路後重試。');
        } else if (err instanceof Error) {
          setError(`分析出錯：${err.message}`);
        } else {
          setError('未知錯誤，請稍後再試。');
        }
      }
    };

    try {
      await attemptAnalysis();
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />

      <main ref={mainRef} className="relative z-10 mx-auto max-w-5xl px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-12">
        <Link
          href="/"
          className="feature-home-link feature-home-link--cyan feature-home-link--floating"
          aria-label="返回首頁"
        >
          {"\u8fd4\u56de\u9996\u9801"}
        </Link>
        {!result ? (
          <>
            <section className="mb-2 flex justify-center sm:mb-4">
              <div className="hidden">
                <div className="mb-4 inline-block rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-1 text-xs tracking-[0.35em] text-cyan-300">
                  AI 紫微斗數
                </div>
                <h1 className="mystic-title mb-3 font-serif text-3xl leading-tight sm:text-5xl">
                  看懂你的命盤<br />掌握今年方向
                </h1>
                <p className="max-w-2xl text-sm leading-8 text-[color:var(--text-sub)]">
                  輸入基本資料，AI 會把紫微命盤、三方四正與今年運勢整理成白話建議。
                  重點放在命盤格局、今年運勢與可行動的調整方向。
                </p>
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      const target = document.getElementById('input-form');
                      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-8 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/25 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] animate-bounce shimmer-btn"
                  >
                    <span>👇 一鍵開啟 · 紫微斗數分析</span>
                  </button>

                  {/* 動態天宿氣場預言面板 */}
                  <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-left max-w-md shadow-[0_0_15px_rgba(34,211,238,0.05)]">
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 font-bold font-mono flex items-center gap-2">
                      <span className="animate-ping inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>🪐 今日天宿星格氣場</span>
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">
                      今日紫微天樞星高懸，出生資料將轉為命盤格局、三方四正與今年運勢方向。
                    </p>
                  </div>
                </div>
              </div>

            </section>

            <DailyAnalysisNotice record={dailyRecord} className="mb-5" />
            <div id="input-form" className="fortune-card p-6 sm:p-8 scroll-mt-20">
              {loading && <InsightAnalyticalConsole name={input.name} />}
              <div className={loading ? 'hidden' : 'space-y-8'}>
                <IdentitySplitSelector />
                {/* 狀態指示器 */}
              <div className="hidden rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 sm:block">
                <p className="text-xs text-[color:var(--text-muted)] mb-3">資料進度</p>
                <div className="flex gap-2 flex-wrap">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    input.name.trim().length >= 2
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                      : 'bg-white/10 text-[color:var(--text-muted)] border border-white/10'
                  }`}>
                    ✓ 姓名 {input.name.trim().length > 0 ? `(${input.name.trim().length}字)` : '(未填)'}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    input.birthDate
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                      : 'bg-white/10 text-[color:var(--text-muted)] border border-white/10'
                  }`}>
                    ✓ 生日 {input.birthDate ? '已填' : '(未填)'}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    input.bloodType
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                      : 'bg-white/10 text-[color:var(--text-muted)] border border-white/10'
                  }`}>
                    ✓ 血型 {input.bloodType ? input.bloodType + '型' : '(未選)'}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    input.shichen !== null && input.shichen !== 'known'
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                      : 'bg-white/10 text-[color:var(--text-muted)] border border-white/10'
                  }`}>
                  ✓ 時辰 {typeof input.shichen === 'number' ? SHICHEN_LIST[input.shichen].label : input.shichen === 'known' ? '等待選擇' : '自動良辰'}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                  1. 姓名 {input.name.trim().length >= 2 && <span className="text-green-400">✓</span>}
                </label>
                <input
                  type="text"
                  value={input.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setInput({ ...input, name: newName });
                  }}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim();
                    if (trimmed.length !== e.target.value.length) {
                      setInput({ ...input, name: trimmed });
                    }
                  }}
                  placeholder="請輸入姓名（至少 2 個字）"
                  maxLength={20}
                  className={`form-input w-full text-base border border-white/10 rounded-lg px-4 py-3 ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
                  autoComplete="off"
                />
                {showMissingName && (
                  <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002"}</p>
                )}
                {input.name.trim().length > 0 && input.name.trim().length < 2 && !showMissingName && (
                  <p className="mt-2 text-xs text-yellow-400">⚠ 姓名至少需要 2 個字</p>
                )}
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                  2. 出生日期（民國年）{input.birthDate && <span className="text-green-400">✓</span>}
                </label>
                <LunarBirthdayInput
                  value={input.birthDate}
                  onChange={(solarDate) => setInput({ ...input, birthDate: solarDate.trim() })}
                  accent="violet"
                  label="出生日期（萬年曆）"
                />
                {showMissingBirthDate && (
                  <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\u3002"}</p>
                )}
                {input.birthDate && (
                  <p className="mt-2 text-xs text-green-400">✓ 西元 {input.birthDate}</p>
                )}
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">3. 血型</label>
                {showMissingBloodType && (
                  <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u8840\u578b\uff0c\u9019\u6b04\u9084\u6c92\u6709\u9078\u3002"}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {BLOOD_TYPES.map((bloodType, index) => (
                    <ChoiceCard
                      key={bloodType}
                      active={selectionConfirm.bloodType && input.bloodType === bloodType}
                      title={`${bloodType} 型`}
                      description={BLOOD_DESC[bloodType]}
                      onClick={() => {
                        setInput({ ...input, bloodType });
                        setSelectionConfirm({ ...selectionConfirm, bloodType: true });
                      }}
                      tone={index % 2 === 0 ? 'violet' : 'cyan'}
                      attention={showMissingBloodType}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">4. 性別</label>
                {showMissingGender && (
                  <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u6027\u5225\uff0c\u9019\u6b04\u9084\u6c92\u6709\u78ba\u8a8d\u3002"}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceCard
                    active={selectionConfirm.gender && input.gender === 'female'}
                    title="女性"
                    description="用來修飾外在表現。"
                    onClick={() => {
                      setInput({ ...input, gender: 'female' });
                      setSelectionConfirm({ ...selectionConfirm, gender: true });
                    }}
                    tone="pink"
                    attention={showMissingGender}
                  />
                  <ChoiceCard
                    active={selectionConfirm.gender && input.gender === 'male'}
                    title="男性"
                    description="只做外在呈現修飾。"
                    onClick={() => {
                      setInput({ ...input, gender: 'male' });
                      setSelectionConfirm({ ...selectionConfirm, gender: true });
                    }}
                    tone="cyan"
                    attention={showMissingGender}
                  />
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                  5. 出生時辰
                  <span className="ml-1 text-xs font-normal text-amber-300">（選填）</span>
                  {input.shichen !== null && input.shichen !== 'known' && <span className="text-green-400"> ✓</span>}
                </label>
                <p className="mb-4 text-xs leading-6 text-[color:var(--text-muted)]">
                  真實時辰可提升紫微命宮精準度；不知道也沒關係，系統會先以生日資料完成趨勢參考。
                </p>



                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setInput({ ...input, shichen: 'unknown' })}
                    className={`group relative overflow-hidden rounded-2xl border px-5 py-5 text-left transition-all duration-500 ${
                      input.shichen === 'unknown'
                        ? 'border-amber-200/80 bg-amber-300/15 text-amber-100 shadow-[0_0_28px_rgba(255,255,255,0.3),0_0_70px_rgba(251,191,36,0.25)]'
                        : 'border-white/20 bg-white/[0.06] text-[color:var(--text-main)] shadow-[0_0_24px_rgba(255,255,255,0.08)] hover:border-amber-200/70 hover:bg-amber-200/10 hover:shadow-[0_0_34px_rgba(255,255,255,0.22),0_0_80px_rgba(251,191,36,0.2)]'
                    }`}
                  >
                    <span className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-white/10 opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                    <span className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10 opacity-70" />
                    <span className="relative flex items-start gap-3">
                      <span className="mt-0.5 text-2xl text-amber-100 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]">✦</span>
                      <span>
                        <span className="block text-base font-bold">不知道出生時辰</span>
                        <span className="mt-1.5 block text-xs leading-5 text-[color:var(--text-sub)]">
                          系統先以生日資料推算趨勢參考，待時辰確認後可提升命盤精準度。
                        </span>
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInput({ ...input, shichen: typeof input.shichen === 'number' ? input.shichen : 'known' })}
                    className={`group relative overflow-hidden rounded-2xl border px-5 py-5 text-left transition-all duration-500 ${
                      input.shichen === 'known' || typeof input.shichen === 'number'
                        ? 'border-cyan-200/80 bg-cyan-300/15 text-cyan-100 shadow-[0_0_28px_rgba(255,255,255,0.3),0_0_70px_rgba(34,211,238,0.25)]'
                        : 'border-white/20 bg-white/[0.06] text-[color:var(--text-main)] shadow-[0_0_24px_rgba(255,255,255,0.08)] hover:border-cyan-200/70 hover:bg-cyan-200/10 hover:shadow-[0_0_34px_rgba(255,255,255,0.22),0_0_80px_rgba(34,211,238,0.2)]'
                    }`}
                  >
                    <span className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-white/10 opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                    <span className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10 opacity-70" />
                    <span className="relative flex items-start gap-3">
                      <span className="mt-0.5 text-2xl text-cyan-100 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]">◌</span>
                      <span>
                        <span className="block text-base font-bold">我知道出生時辰</span>
                        <span className="mt-1.5 block text-xs leading-5 text-[color:var(--text-sub)]">
                          展開時辰選單，使用真實資料完成更精準的紫微排盤。
                        </span>
                      </span>
                    </span>
                  </button>
                </div>

                {(input.shichen === 'known' || typeof input.shichen === 'number') && (
                  <div className="mt-5 rounded-2xl border border-cyan-300/25 bg-cyan-950/20 p-4 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold tracking-wide text-cyan-100">請選擇你的出生時辰</span>
                      <span className="text-[11px] text-cyan-200/70">選定後自動套用</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {SHICHEN_LIST.map((s) => {
                        const selected = input.shichen === s.branchIndex;
                        return (
                          <button
                            key={s.branchIndex}
                            type="button"
                            onClick={() => setInput({ ...input, shichen: s.branchIndex })}
                            className={`rounded-xl border px-3 py-3 text-left transition-all ${
                              selected ? 'border-cyan-200 bg-cyan-400/20 text-cyan-100 shadow-[0_0_18px_rgba(255,255,255,0.18)]' : 'border-white/10 bg-white/5 hover:border-cyan-300/50 hover:bg-cyan-400/10'
                            }`}
                          >
                            <p className={`text-base font-bold ${selected ? 'text-cyan-100' : 'text-[color:var(--text-main)]'}`}>{s.label}</p>
                            <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-sub)]">{s.range}</p>
                            <p className="mt-1 text-[11px] leading-4 text-[color:var(--text-muted)]">{s.imagery}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>



              {error && (
                <div className="rounded-2xl border-l-4 border-l-rose-400 border border-rose-400/20 bg-rose-950/30 p-4 text-sm text-rose-300 animate-pulse">
                  <p className="font-semibold">⚠ {error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`flex-1 py-5 text-base font-semibold rounded-2xl transition-all ${
                    loading
                      ? 'vip-gold-btn opacity-50 cursor-not-allowed'
                      : 'vip-gold-btn hover:shadow-lg hover:shadow-amber-500/50'
                  }`}
                  type="button"
                  aria-busy={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block animate-spin">⟳</span>
                      分析中（請稍候）…
                    </span>
                  ) : (
                    '開始紫微斗數分析'
                  )}
                </button>

                {(input.name || input.birthDate) && (
                  <button
                    onClick={() => {
                      setInput({ name: '', birthDate: '', bloodType: 'A', gender: 'female', shichen: null });
                      setSelectionConfirm(EMPTY_SELECTION_CONFIRM);
                      setError('');
                    }}
                    disabled={loading}
                    className="px-6 py-5 rounded-2xl border border-white/10 bg-white/5 text-[color:var(--text-sub)] hover:border-white/20 hover:bg-white/10 transition-all disabled:opacity-50"
                    type="button"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
        ) : (
          <div className="space-y-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-[0.06] pointer-events-none translate-x-12 -translate-y-12">
              <svg
                className="w-80 h-80 text-cyan-400"
                style={{ animation: 'spin 80s linear infinite' }}
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="taijiGradInsight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="currentColor" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
                  </linearGradient>
                  <filter id="taijiGlowInsight" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,2" opacity="0.3" fill="none" />
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4,4" opacity="0.5" fill="none" />
                <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="0.25" opacity="0.4" fill="none" />
                <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="0.5" strokeDasharray="8,2" opacity="0.3" fill="none" />
                <g fontSize="4.5" fill="currentColor" opacity="0.7" fontFamily="monospace" filter="url(#taijiGlowInsight)">
                  <text x="50" y="10" textAnchor="middle">☰</text>
                  <text x="78" y="22" textAnchor="middle" transform="rotate(45, 78, 22)">☴</text>
                  <text x="90" y="50" textAnchor="middle" transform="rotate(90, 90, 50)">☲</text>
                  <text x="78" y="78" textAnchor="middle" transform="rotate(135, 78, 78)">☳</text>
                  <text x="50" y="90" textAnchor="middle" transform="rotate(180, 50, 90)">☷</text>
                  <text x="22" y="78" textAnchor="middle" transform="rotate(225, 22, 78)">☱</text>
                  <text x="10" y="50" textAnchor="middle" transform="rotate(270, 10, 50)">☵</text>
                  <text x="22" y="22" textAnchor="middle" transform="rotate(315, 22, 22)">☶</text>
                </g>
                <g filter="url(#taijiGlowInsight)">
                  <path
                    d="M 50 16 A 34 34 0 0 1 50 84 A 17 17 0 0 1 50 50 A 17 17 0 0 0 50 16 Z"
                    fill="url(#taijiGradInsight)"
                    stroke="none"
                  />
                  <circle cx="50" cy="33" r="4" fill="#020617" stroke="none" />
                  <circle cx="50" cy="67" r="4" fill="currentColor" stroke="none" opacity="0.9" />
                </g>
              </svg>
            </div>
            <div className="space-y-6">
            <div className="fortune-card relative hidden overflow-hidden border-amber-400/25 bg-slate-950/55 p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-4 border border-cyan-400/10" />
              <div className="relative flex flex-col gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">命盤格局定位</p>
                  <h2 className="mt-3 font-serif text-4xl text-amber-100 sm:text-5xl">
                    {result?.ziweiSanFang?.pattern.name ?? '三方四正排盤中'}
                  </h2>
                  <p className="mt-3 text-sm font-semibold tracking-wide text-cyan-100">
                    核心星曜：{result?.ziweiSanFang?.pattern.stars.join('、') || '等待命盤資料'}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)]">
                    {result?.ziweiSanFang?.pattern.description ?? '紫微命財官遷三方四正，配合八字四柱與五行訊號進行可重算比對。'}
                  </p>
                </div>
                <div className="shrink-0 border-l-0 border-cyan-400/20 px-0 text-center sm:border-l sm:px-6">
                  <p className="text-xs text-[color:var(--text-muted)]">排盤狀態</p>
                  <p className={`mt-2 text-lg font-semibold ${result?.ziweiSanFang?.timeConfidence === 'exact' ? 'text-cyan-200' : 'text-amber-200'}`}>
                    {result?.ziweiSanFang?.timeConfidence === 'exact' ? '時辰已確認' : '時辰待校正'}
                  </p>
                  <p className="mt-1 text-xs text-cyan-100/70">{result?.ziweiSanFang?.timeConfidence === 'exact' ? '命財官遷已完成比對' : '暫以趨勢參考呈現'}</p>
                </div>
              </div>
            </div>

            <ZiweiTwelvePalaceCards analysis={result?.ziweiSanFang} annual={result?.annualFortune} />

            <FiveElementPriorityCard result={result?.fiveElement} />

            {/* 三方四正摘要、今年運勢、補充建議與姓名學資料保留於 API 回傳；手機主畫面只保留主格局與十二宮。 */}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  const existing = readDailyAnalysis<InsightResult>('ziwei');
                  if (existing) {
                    setDailyRecord(existing);
                    setResult(existing.result);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                  }
                  setResult(null);
                }}
                className="vip-gold-btn flex-1 py-4 text-sm"
              >
                {dailyRecord ? getDailyAnalysisButtonLabel(dailyRecord) : '重新分析'}
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
              >
                匯出報告
              </button>
            </div>

            <NextStepGuide current="insight" />
          </div>
        </div>
      )}
    </main>
    </div>
  );
}
