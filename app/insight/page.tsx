'use client';

import { useState, useEffect, useMemo, useRef, type Ref } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import NextStepGuide from '@/components/NextStepGuide';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import { saveUserData, loadUserData } from '@/lib/storage';
import { readCanonicalBirthProfile, saveCanonicalBirthProfile } from '@/lib/canonical-birth-profile-client';
import { fromInsightData, toInsightData } from '@/lib/canonical-birth-profile';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { recoverFromChunkError } from '@/lib/chunk-recovery';
import { searchCities, findCityById, type CityEntry } from '@/lib/city-directory';
import { getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';
import type { FiveElementIntegrationResult, FiveElementKey } from '@/lib/five-element-engine';
import type { InsightRitualStep } from '@/lib/insight-engine';
import type { ZiweiDestinyCard as ZiweiDestinyCardModel } from '@/lib/ziwei-destiny-card';
import type { ZiweiPresentationBundle } from '@/lib/ziwei-presentation-service';
import type { LifeTeacherResult, NarrativeTeacherResult, PalaceId as ZiweiTeacherPalaceId, StructureTeacherResult, TeacherId as ZiweiTeacherId } from '@/lib/ziwei-teacher/types';
import type { EntertainmentTeacherId, EntertainmentTeacherResult } from '@/lib/ziwei-teacher/entertainment-types';
import { TAROT_CARDS } from '@/features/tarot/data/cards';
import type { TarotAiElement, TarotCard } from '@/features/tarot/types';
import FiveElementPriorityCard from '@/components/FiveElementPriorityCard';
import MegaInputGuide from '@/components/MegaInputGuide';
import { calculateBoneWeight, formatQian } from '@/lib/bone-weight';

// 時辰：null=未選、'unknown'=自動良辰、'known'=準備選時辰、0–11=已選時辰
type ShichenChoice = number | 'unknown' | 'known' | null;
type SelectionConfirm = { gender: boolean };

interface InsightData {
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  shichen: ShichenChoice;
  birthCityId: string | null;
}

interface InsightResult {
  analysisId?: string;
  presentation?: ZiweiPresentationBundle;
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
  plainSummary?: string;
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
      majorStarDetails?: { name: string; brightness?: string }[];
      minorStars: string[];
      auspiciousStars?: string[];
      maleficStars?: string[];
      neutralStars?: string[];
      transformations: string[];
    }[];
    allPalaces?: {
      key: string;
      name: string;
      focus: string;
      branch: string;
      palaceStem: string;
      majorStars: string[];
      majorStarDetails?: { name: string; brightness?: string }[];
      minorStars: string[];
      auspiciousStars?: string[];
      maleficStars?: string[];
      neutralStars?: string[];
      transformations: string[];
    }[];
    bodyPalace?: {
      key: string;
      name: string;
      focus: string;
      branch: string;
      palaceStem: string;
      majorStars: string[];
      minorStars: string[];
      auspiciousStars?: string[];
      maleficStars?: string[];
      neutralStars?: string[];
      transformations: string[];
    } | null;
    bodyPalaceStatus?: 'provided' | 'not_available_from_core';
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
  destinyCard?: ZiweiDestinyCardModel | null;
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
    subjectName?: string;
    gender?: 'male' | 'female';
    dayPillar: string;
    hourPillar: string;
    wuxing: string;
    shichenLabel: string;
    birthDate?: string;
    shichen?: number | 'unknown' | null;
    timeCorrectionMode?: 'STANDARD_TIME' | 'TRUE_SOLAR_TIME';
  };
  ritualSteps?: InsightRitualStep[];
}

const EMPTY_SELECTION_CONFIRM: SelectionConfirm = { gender: false };

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

function SanFangSummaryCard({ analysis, plainSummary, meta }: { analysis?: InsightResult['ziweiSanFang']; plainSummary?: string; meta?: InsightResult['meta'] }) {
  if (!analysis) return null;

  const boneWeight = calculateBoneWeight(meta?.birthDate, meta?.shichen);
  const plainLines = String(plainSummary ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/AI\s*(判定|分析|建議|確認)[：:]?\s*/g, '').trim())
    .filter(Boolean);
  const palaceStars = (key: NonNullable<InsightResult['ziweiSanFang']>['palaces'][number]['key']) => analysis.palaces.find((item) => item.key === key)?.majorStars.join('、') || '無十四主星';
  const displayLines = plainLines.length === 4
    ? plainLines.slice(0, 4)
    : [
      `【現在重點】命宮是${palaceStars('MING')}；先把自己的方向和優先順序定下來。`,
      `【工作與錢】官祿宮是${palaceStars('GUAN_LU')}、財帛宮是${palaceStars('CAI_BO')}；先把責任、預算和進度講清楚。`,
      `【人際與機會】遷移宮是${palaceStars('QIAN_YI')}；需要合作時主動開口，別等對方猜你的需求。`,
      '【下一步】本週先完成一件能推進工作或收入的具體事情。',
    ];

  if (analysis.timeConfidence !== 'exact') {
    return (
      <section className="fortune-card relative overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-black tracking-[0.28em] text-amber-300">八字 × 稱骨幾兩重</p>
        <h2 className="mt-3 font-serif text-2xl font-black text-amber-100">等待出生時辰定盤</h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">命宮、遷移宮、官祿宮與財帛宮會隨時辰改變；時辰確認後才產生四宮交叉的 AI 組合解讀。</p>
        {boneWeight && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/20 bg-amber-300/[0.07] px-4 py-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.16em] text-amber-100/75">稱骨幾兩重（暫估）</p>
            <p className="mt-1 font-serif text-3xl font-black text-amber-200">{boneWeight.display}</p>
          </div>
          <p className="max-w-xs text-xs leading-5 text-[color:var(--text-muted)]">{boneWeight.lunarDateLabel}；時辰尚未確認，暫以午時權重換算，選定時辰後會立即重算。</p>
        </div>}
      </section>
    );
  }

  const palaceLabels = {
    MING: { name: '命宮', role: '本命核心', glyph: '命', index: '01' },
    QIAN_YI: { name: '遷移宮', role: '外界回響', glyph: '遷', index: '02' },
    GUAN_LU: { name: '官祿宮', role: '職涯舞台', glyph: '官', index: '03' },
    CAI_BO: { name: '財帛宮', role: '財富輸出', glyph: '財', index: '04' },
  } as const;
  const palaceTone = {
    MING: { card: 'border-cyan-300/35 bg-[linear-gradient(145deg,rgba(8,145,178,0.18),rgba(8,15,35,0.82)_60%)]', text: 'text-cyan-100', chip: 'border-cyan-200/30 bg-cyan-300/10 text-cyan-50', brightness: 'bg-cyan-200/15 text-cyan-100' },
    QIAN_YI: { card: 'border-violet-300/35 bg-[linear-gradient(145deg,rgba(109,40,217,0.18),rgba(8,15,35,0.82)_60%)]', text: 'text-violet-100', chip: 'border-violet-200/30 bg-violet-300/10 text-violet-50', brightness: 'bg-violet-200/15 text-violet-100' },
    GUAN_LU: { card: 'border-amber-300/35 bg-[linear-gradient(145deg,rgba(217,119,6,0.18),rgba(8,15,35,0.82)_60%)]', text: 'text-amber-100', chip: 'border-amber-200/30 bg-amber-300/10 text-amber-50', brightness: 'bg-amber-200/15 text-amber-100' },
    CAI_BO: { card: 'border-emerald-300/35 bg-[linear-gradient(145deg,rgba(5,150,105,0.18),rgba(8,15,35,0.82)_60%)]', text: 'text-emerald-100', chip: 'border-emerald-200/30 bg-emerald-300/10 text-emerald-50', brightness: 'bg-emerald-200/15 text-emerald-100' },
  } as const;
  const majorStars = (palace?: NonNullable<InsightResult['ziweiSanFang']>['palaces'][number]) => {
    if (!palace?.majorStars.length) return [];
    const brightnessByStar = new Map((palace.majorStarDetails ?? []).map((star) => [star.name, star.brightness]));
    return palace.majorStars.map((name) => ({ name, brightness: brightnessByStar.get(name) }));
  };

  return (
    <section className="fortune-card relative overflow-hidden rounded-[32px] border border-cyan-200/20 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_94%_8%,rgba(251,191,36,0.16),transparent_26%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94))] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.5)] sm:p-7">
      <div className="pointer-events-none absolute inset-3 rounded-[25px] border border-white/10" />
      <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-amber-200/15" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black tracking-[0.2em] text-cyan-100" aria-hidden="true">AI FUSION CARD</span>
          <span className="inline-flex rounded-full border border-amber-200/20 bg-amber-300/[0.08] px-3 py-1.5 text-[10px] font-black tracking-[0.18em] text-amber-100/90">命・遷・官・財｜四宮合參</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <p className="hidden text-xs font-bold tracking-[0.18em] text-cyan-100/70" aria-hidden="true">你的四宮決策藍圖</p>
            <h2 className="font-serif text-[2.25rem] font-black leading-none tracking-wide text-amber-100 sm:text-5xl">{analysis.pattern.name}</h2>
            <p className="hidden mt-2 max-w-2xl text-sm font-semibold leading-6 text-[color:var(--text-sub)]" aria-hidden="true">將本命、外界、職涯與財富串成一條可執行的人生主線。</p>
          </div>
          <div className="min-w-[210px]">
            <div className="rounded-2xl border border-amber-200/30 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(120,53,15,0.12))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <p className="text-[10px] font-black tracking-[0.14em] text-amber-100/75">稱骨幾兩重</p>
              <p className="mt-1 font-serif text-2xl font-black leading-none text-amber-200">{boneWeight?.display ?? '待換算'}</p>
              <p className="mt-1 text-[10px] text-amber-100/65">農曆年・月・日・時加總</p>
            </div>
          </div>
        </div>

        {boneWeight && <div className="mt-4 rounded-2xl border border-amber-200/15 bg-black/20 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black tracking-[0.16em] text-amber-100/80">標準計算明細</p>
            <p className="text-[10px] text-[color:var(--text-muted)]">{boneWeight.lunarDateLabel}{boneWeight.isHourEstimated ? '・時辰暫以午時估算' : ''}</p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {boneWeight.components.map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2 text-center">
                <p className="text-[10px] text-[color:var(--text-muted)]">{item.label}｜{item.value}</p>
                <p className="mt-1 font-serif text-base font-black text-amber-100">{formatQian(item.qian)}</p>
              </div>
            ))}
          </div>
        </div>}

        <div className="hidden mt-5 rounded-2xl border border-amber-200/15 bg-black/20 px-4 py-3" aria-hidden="true">
          <p className="text-[10px] font-black tracking-[0.18em] text-amber-100/70">定格依據</p>
          <p className="mt-1 text-sm font-black leading-6 text-amber-100">{analysis.pattern.basis}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(['MING', 'QIAN_YI', 'GUAN_LU', 'CAI_BO'] as const).map((key) => {
            const palace = analysis.palaces.find((item) => item.key === key);
            const label = palaceLabels[key];
            const tone = palaceTone[key];
            const stars = majorStars(palace);
            return (
              <article key={key} className={`relative min-h-[154px] overflow-hidden rounded-[22px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${tone.card}`}>
                <span className={`pointer-events-none absolute -right-1 -top-6 font-serif text-[112px] font-black leading-none opacity-[0.08] ${tone.text}`}>{label.glyph}</span>
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[10px] font-black tracking-[0.18em] ${tone.text}`}>{label.role}</p>
                    <h3 className="mt-1 font-serif text-2xl font-black text-white">{label.name}</h3>
                  </div>
                  <span className={`rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-black ${tone.text}`}>{label.index}</span>
                </div>
                <div className="relative mt-5 flex flex-wrap gap-2">
                  {stars.length ? stars.map((star) => (
                    <span key={star.name} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm font-black ${tone.chip}`}>
                      {star.name}
                      {star.brightness && <em className={`rounded px-1.5 py-0.5 text-[10px] not-italic ${tone.brightness}`}>{star.brightness}</em>}
                    </span>
                  )) : <span className="text-sm font-semibold text-white/55">無十四主星坐守</span>}
                </div>
                <p className="relative mt-4 text-xs font-semibold leading-5 text-white/60">{palace?.focus ?? '本宮訊號待確認'}</p>
              </article>
            );
          })}
        </div>

        <div className="hidden mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
          {[
            ['關鍵星覆蓋', `${analysis.patternMetrics.patternCoverage}%`],
            ['三方分布', `${analysis.patternMetrics.trinePalaceCoverage}%`],
            ['遷移對宮訊號', analysis.patternMetrics.oppositePalaceStarCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-black/20 px-2 py-3 text-center">
              <p className="text-[10px] font-bold leading-4 text-[color:var(--text-muted)]">{label}</p>
              <p className="mt-1 text-xl font-black text-cyan-100">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[22px] border border-amber-200/25 bg-[linear-gradient(135deg,rgba(120,53,15,0.24),rgba(15,23,42,0.6))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/10 text-sm font-black text-amber-100">重</span>
            <div>
              <p className="text-[11px] font-black tracking-[0.2em] text-amber-200">白話重點</p>
              <p className="text-[10px] font-semibold text-amber-100/60">把命・財・官・遷翻成你現在能做的事</p>
            </div>
          </div>
          <div className="mt-4 space-y-3 border-l-2 border-amber-300 pl-4">
            {displayLines.map((line) => <p key={line} className="text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{line}</p>)}
          </div>
        </div>
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

const ZIWEI_ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const;

const ZIWEI_PROFESSIONAL_MAJOR_STARS = [
  { name: '紫微', element: '土', role: '帝座主星，主統御、格局、責任與資源整合。', keywords: ['主導', '格局', '承擔'] },
  { name: '天機', element: '木', role: '智謀變動之星，主思考、策劃、調整與機巧。', keywords: ['策略', '變通', '學習'] },
  { name: '太陽', element: '火', role: '光明外放之星，主名聲、行動、照顧與公眾能量。', keywords: ['外放', '名望', '行動'] },
  { name: '武曲', element: '金', role: '財帛執行之星，主紀律、財務、決斷與實務能力。', keywords: ['財務', '紀律', '執行'] },
  { name: '天同', element: '水', role: '福氣調和之星，主柔和、享受、情緒修復與人情。', keywords: ['福氣', '緩和', '修復'] },
  { name: '廉貞', element: '火', role: '規範與慾望之星，主界線、魅力、制度與轉折。', keywords: ['界線', '魅力', '轉折'] },
  { name: '天府', element: '土', role: '府庫守成之星，主穩定、資源、管理與承接。', keywords: ['庫藏', '管理', '穩定'] },
  { name: '太陰', element: '水', role: '月象收斂之星，主內在、財庫、感受與照護。', keywords: ['內在', '財庫', '細膩'] },
  { name: '貪狼', element: '木', role: '欲望開創之星，主社交、才藝、機會與探索。', keywords: ['欲望', '才藝', '社交'] },
  { name: '巨門', element: '水', role: '口舌洞察之星，主辨析、溝通、疑問與真相。', keywords: ['辨析', '溝通', '真相'] },
  { name: '天相', element: '水', role: '輔佐印綬之星，主協調、制度、服務與形象。', keywords: ['協調', '制度', '服務'] },
  { name: '天梁', element: '土', role: '蔭護原則之星，主長輩、保護、規矩與化解。', keywords: ['保護', '原則', '化解'] },
  { name: '七殺', element: '金', role: '將星突破之星，主決戰、承壓、改革與獨立。', keywords: ['突破', '承壓', '改革'] },
  { name: '破軍', element: '水', role: '破舊立新之星，主變革、重組、冒險與翻盤。', keywords: ['重組', '冒險', '翻盤'] },
] as const;

const ZIWEI_PROFESSIONAL_SUPPORT_STARS = [
  { name: '左輔', group: '輔曜', role: '外來助力、團隊支援、貴人扶持。' },
  { name: '右弼', group: '輔曜', role: '內在協調、旁人補位、人脈支援。' },
  { name: '文昌', group: '文曜', role: '文書、考試、表達、制度化能力。' },
  { name: '文曲', group: '文曜', role: '才華、審美、溝通、感性表達。' },
  { name: '天魁', group: '貴人', role: '上位貴人、提拔、關鍵機會。' },
  { name: '天鉞', group: '貴人', role: '暗中助力、轉介、危中得助。' },
  { name: '祿存', group: '財祿', role: '固定資源、累積財庫、可守之祿。' },
  { name: '擎羊', group: '煞曜', role: '直接衝擊、競爭、傷口與突破壓力。' },
  { name: '陀羅', group: '煞曜', role: '拖延纏繞、阻力、慢性壓力。' },
  { name: '火星', group: '火煞', role: '急發事件、爆發力、短促壓力。' },
  { name: '鈴星', group: '火煞', role: '暗伏焦躁、突發聲響、內部張力。' },
  { name: '地空', group: '空劫', role: '空轉、抽離、想像與落差。' },
  { name: '地劫', group: '空劫', role: '耗損、失落、資源被切分。' },
  { name: '天馬', group: '動星', role: '移動、奔波、跨域、遠行變動。' },
] as const;

const ZIWEI_PROFESSIONAL_TRANSFORMATIONS = [
  { name: '化祿', role: '資源流入、緣分增加、可用條件變多。' },
  { name: '化權', role: '責任放大、主導權提升、需要承擔決策。' },
  { name: '化科', role: '名聲、證照、保護力與可被看見的成果。' },
  { name: '化忌', role: '卡點、執著、壓力源與必須修正的漏洞。' },
] as const;
const ZIWEI_PROFESSIONAL_PALACE_LABELS: Record<string, string> = {
  MING: '命宮',
  XIONG_DI: '兄弟宮',
  FU_QI: '夫妻宮',
  ZI_NV: '子女宮',
  CAI_BO: '財帛宮',
  JI_E: '疾厄宮',
  QIAN_YI: '遷移宮',
  JIAO_YOU: '奴僕宮',
  GUAN_LU: '官祿宮',
  TIAN_ZHAI: '田宅宮',
  FU_DE: '福德宮',
  FU_MU: '父母宮',
};
const ZIWEI_SAN_FANG_LABELS: Record<string, { label: string; role: string }> = {
  MING: { label: '命宮', role: '本命核心' },
  QIAN_YI: { label: '遷移宮', role: '外界舞台' },
  CAI_BO: { label: '財帛宮', role: '資源流動' },
  GUAN_LU: { label: '官祿宮', role: '事業成就' },
};

const ZIWEI_FOURTEEN_MAJOR_STAR_MATERIAL = [
  { name: '紫微', element: '土', role: '帝座主星，主統御、承擔、整合全局。', keywords: ['領導', '核心', '責任'] },
  { name: '天機', element: '木', role: '智星，主思考、變化、策略與機動。', keywords: ['策略', '變通', '學習'] },
  { name: '太陽', element: '火', role: '陽曜，主外放、照亮、名聲與行動。', keywords: ['表達', '推進', '公眾'] },
  { name: '武曲', element: '金', role: '財星與執行星，主紀律、資源、決斷。', keywords: ['財務', '執行', '標準'] },
  { name: '天同', element: '水', role: '福星，主柔和、修復、享受與人情。', keywords: ['福氣', '療癒', '親和'] },
  { name: '廉貞', element: '火', role: '次桃花與規範星，主界線、慾望、制度與轉化。', keywords: ['界線', '轉化', '規範'] },
  { name: '天府', element: '土', role: '庫星，主承載、管理、資源保存與穩定。', keywords: ['資源', '穩定', '管理'] },
  { name: '太陰', element: '水', role: '陰曜，主內在、情感、累積、財庫與照顧。', keywords: ['感受', '累積', '照顧'] },
  { name: '貪狼', element: '木', role: '慾望與才藝星，主社交、吸引、創造與開拓。', keywords: ['魅力', '創造', '開拓'] },
  { name: '巨門', element: '水', role: '暗曜與口舌星，主辨析、表達、質疑與真相。', keywords: ['辨析', '溝通', '真相'] },
  { name: '天相', element: '水', role: '印星，主協調、制度、輔佐與公共形象。', keywords: ['協調', '制度', '輔佐'] },
  { name: '天梁', element: '土', role: '蔭星，主庇護、原則、長輩與危機解厄。', keywords: ['庇護', '原則', '解厄'] },
  { name: '七殺', element: '金', role: '將星，主突破、決斷、壓力與戰場能力。', keywords: ['突破', '決斷', '開局'] },
  { name: '破軍', element: '水', role: '耗星，主破舊立新、重組、冒險與改革。', keywords: ['重組', '改革', '破局'] },
] as const;

const ZIWEI_ELEMENT_LABELS: Record<string, string> = {
  metal: '空',
  wood: '風',
  water: '水',
  fire: '火',
  earth: '地',
};

const ZIWEI_PALACE_PRO_BLUEPRINT: Record<string, { axis: string; layerOne: string; layerTwo: string; layerThree: string }> = {
  MING: { axis: '命宮是整張盤的核心主位，先定人格骨架、判斷方式與人生主軸。', layerOne: '先看命宮主星坐守，再看輔佐星是否扶正、放大或牽制本宮氣質。', layerTwo: '第二層把命宮轉成使用者能理解的性格故事、決策習慣與當前生命主題。', layerThree: '第三層依命宮訊號接 Integration Layer，明確排列五元素補強順序。' },
  XIONG_DI: { axis: '兄弟宮判斷同輩、手足、合作節奏與橫向支援。', layerOne: '先看本宮主星，再看輔佐星是否形成互助、競爭或距離。', layerTwo: '第二層轉成同輩關係、團隊默契與合作邊界。', layerThree: '第三層判定人際互動中最需要補強的元素。' },
  FU_QI: { axis: '夫妻宮判斷親密關係、伴侶模式與長期承諾。', layerOne: '先看主星的情感表達方式，再看輔佐星是否增加穩定、吸引或摩擦。', layerTwo: '第二層轉成關係故事、互動節奏與修復方式。', layerThree: '第三層判定關係中最需要補強的元素。' },
  ZI_NV: { axis: '子女宮判斷創造力、傳承、教養、作品與延伸成果。', layerOne: '先看主星帶出的創造模式，再看輔佐星是否提升承接與表達。', layerTwo: '第二層轉成創造、學習、陪伴與成果孵化故事。', layerThree: '第三層判定創造與延伸領域的補強元素。' },
  CAI_BO: { axis: '財帛宮判斷收入模式、金錢流向與資源控管。', layerOne: '先看主星如何取得財源，再看輔佐星是否利於守財、開源或風險控管。', layerTwo: '第二層轉成財務習慣、資源配置與現金流故事。', layerThree: '第三層判定財務領域最需要補強的元素。' },
  JI_E: { axis: '疾厄宮判斷壓力出口、身心節奏與修復能力。', layerOne: '先看主星形成的壓力型態，再看輔佐星是否提供修復或加重耗損。', layerTwo: '第二層轉成身心警訊、休息節奏與壓力來源。', layerThree: '第三層判定身心修復最需要補強的元素。' },
  QIAN_YI: { axis: '遷移宮判斷外部環境、移動、曝光與對宮回饋。', layerOne: '先看外部場域的主星，再看輔佐星是否推動移動、曝光或外緣機會。', layerTwo: '第二層轉成外界舞台、人際入口與環境適應故事。', layerThree: '第三層判定外部發展最需要補強的元素。' },
  JIAO_YOU: { axis: '交友宮判斷朋友圈、社群、客戶與合作網絡。', layerOne: '先看主星的社交模式，再看輔佐星是否帶來貴人、雜訊或界線課題。', layerTwo: '第二層轉成朋友圈品質、合作選擇與互利模式。', layerThree: '第三層判定社群合作最需要補強的元素。' },
  GUAN_LU: { axis: '官祿宮判斷職涯定位、事業格局與工作責任。', layerOne: '先看主星的職能傾向，再看輔佐星是否強化管理、專業或突破。', layerTwo: '第二層轉成職涯故事、工作方法與責任承接。', layerThree: '第三層判定事業領域最需要補強的元素。' },
  TIAN_ZHAI: { axis: '田宅宮判斷家庭根基、不動產、空間與安全感。', layerOne: '先看主星的安定模式，再看輔佐星是否利於累積、搬遷或整理。', layerTwo: '第二層轉成家庭、空間、資產與內在安全感故事。', layerThree: '第三層判定根基穩定最需要補強的元素。' },
  FU_DE: { axis: '福德宮判斷精神能量、享受能力、內在富足與福報。', layerOne: '先看主星的精神底色，再看輔佐星是否提升休養、信念或消耗。', layerTwo: '第二層轉成內在狀態、精神補給與長期幸福感。', layerThree: '第三層判定精神能量最需要補強的元素。' },
  FU_MU: { axis: '父母宮判斷長輩、制度、背景支援與權威關係。', layerOne: '先看主星與權威互動方式，再看輔佐星是否帶來保護、規範或壓力。', layerTwo: '第二層轉成原生支援、制度資源與上層關係故事。', layerThree: '第三層判定背景支援最需要補強的元素。' },
};

function getZiweiMajorStarMaterials(stars: string[]) {
  if (stars.length === 0) {
    return [{ name: '無十四主星坐守', element: '借三方', role: '本宮不硬斷，第一層改以對宮、三方四正、輔佐星與年度訊號加權判定。', keywords: ['借星', '對宮', '三方四正'] }];
  }
  return stars.map((star) => ZIWEI_FOURTEEN_MAJOR_STAR_MATERIAL.find((item) => item.name === star) ?? {
    name: star,
    element: '待校正',
    role: `${star} 已歸位本宮，第一層保留為命盤證據，第二層再轉成白話解讀。`,
    keywords: ['命盤證據', '本宮訊號'],
  });
}

function getZiweiSupportStarText(stars: string[]) {
  if (stars.length === 0) return '輔佐星未集中顯示，本宮以十四主星、對宮與三方四正作為主要判斷。';
  return `輔佐星歸位：${stars.slice(0, 8).join('、')}。第一層只作命盤證據，判定其扶助、放大、牽制或修正十四主星的表現。`;
}

function getZiweiAiElementPriorities(fiveElement?: FiveElementIntegrationResult) {
  const fallbackOrder = [fiveElement?.primaryElement, fiveElement?.secondaryElement, fiveElement?.strongElement]
    .filter((key): key is FiveElementKey => Boolean(key));
  const rawOrder: FiveElementKey[] = fiveElement?.decision?.priorityOrder?.length
    ? fiveElement.decision.priorityOrder
    : fallbackOrder;
  const order = [...new Set(rawOrder)].slice(0, 3);
  if (order.length === 0) return [
    { label: '第一補強', element: '待 Integration Layer 判定', detail: '第三層保留五元素交接位置，等待平台五元素引擎輸出。' },
    { label: '第二補強', element: '待 Integration Layer 判定', detail: '不得在紫微卡片內自行重算五元素。' },
    { label: '第三補強', element: '待 Integration Layer 判定', detail: '必須由平台統一五元素結果排序。' },
  ];
  return order.map((key, index) => {
    const element = ZIWEI_ELEMENT_LABELS[key] ?? key;
    const need = fiveElement?.elementScores?.[key]?.need;
    return {
      label: ['第一補強', '第二補強', '第三補強'][index] ?? '後續補強',
      element: `${element}元素`,
      detail: `AI 判定：目前${index === 0 ? '最需要' : '依序需要'}補強 ${element}元素${typeof need === 'number' ? `，補強需求 ${need} 分` : ''}。`,
    };
  });
}

function getZiweiPalaceBlueprint(key: string, palaceName: string) {
  return ZIWEI_PALACE_PRO_BLUEPRINT[key] ?? {
    axis: `${palaceName}判斷此人生領域的主題、資源、壓力與可執行方向。`,
    layerOne: '第一層先建立本宮主星、輔佐星、宮干地支與三方四正命盤證據。',
    layerTwo: '第二層只讀第一層，把專業命盤轉成一般使用者能理解的故事。',
    layerThree: '第三層只讀第二層與 Integration Layer，輸出五元素補強排序。',
  };
}
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


// 八卦爻象：陣列由下往上，true 為陽爻
const ZIWEI_TRIGRAM_LINES: Record<string, [boolean, boolean, boolean]> = {
  乾: [true, true, true],
  兌: [true, true, false],
  離: [true, false, true],
  震: [true, false, false],
  巽: [false, true, true],
  坎: [false, true, false],
  艮: [false, false, true],
  坤: [false, false, false],
};

type ZiweiStarHexagram = {
  name: string;
  glyph: string;
  upper: keyof typeof ZIWEI_TRIGRAM_LINES;
  lower: keyof typeof ZIWEI_TRIGRAM_LINES;
  gua: string;
  image: string;
  plain: string;
  ming: string;
  action: string;
};

// 命宮主星對應本卦：卦辭與大象辭取自《易經》原文，白話與命宮對應為本系統解讀
const ZIWEI_STAR_HEXAGRAM: Record<string, ZiweiStarHexagram> = {
  紫微: {
    name: '乾為天', glyph: '䷀', upper: '乾', lower: '乾',
    gua: '乾，元亨利貞。',
    image: '天行健，君子以自強不息。',
    plain: '六爻全陽，是純粹的主動。位置在高處，靠的不是命令別人，是自己先不停下來。',
    ming: '命宮坐紫微，你天生被放在需要決定的位置上。別人等你定調，你就不能只跟著風向走。',
    action: '這週先定一個只有你能拍板的決定，然後親自做完第一步。',
  },
  天機: {
    name: '巽為風', glyph: '䷸', upper: '巽', lower: '巽',
    gua: '巽，小亨，利有攸往，利見大人。',
    image: '隨風，巽；君子以申命行事。',
    plain: '風不硬撞，它是滲進去的。好的安排要一層一層說，不是一次喊完就期待別人懂。',
    ming: '命宮坐天機，你的優勢在想得快、轉得快，弱點是想法散在半空中沒有落地。',
    action: '把腦中最好的那個念頭，今天寫成三個步驟，交給一個人一起執行。',
  },
  太陽: {
    name: '火天大有', glyph: '䷍', upper: '離', lower: '乾',
    gua: '大有，元亨。',
    image: '火在天上，大有；君子以遏惡揚善，順天休命。',
    plain: '火在天上，光照得很遠，但也照得很累。大有的重點不是擁有多少，是把光照在對的地方。',
    ming: '命宮坐太陽，你習慣照顧別人、扛在前面，往往忘了自己也需要被照。',
    action: '列出這個月你在照顧的人事，刪掉一項不該由你扛的。',
  },
  武曲: {
    name: '澤天夬', glyph: '䷪', upper: '兌', lower: '乾',
    gua: '夬，揚于王庭，孚號有厲。',
    image: '澤上于天，夬；君子以施祿及下，居德則忌。',
    plain: '夬就是「決」。水積到天上，遲早要下來——與其等它潰堤，不如自己選時間放。',
    ming: '命宮坐武曲，你有把資源變成結果的執行力，卡住的地方通常不是能力，是遲遲沒有斷。',
    action: '挑出拖最久的那一件，今天給它一個結論：做、或不做。',
  },
  天同: {
    name: '地澤臨', glyph: '䷒', upper: '坤', lower: '兌',
    gua: '臨，元亨利貞，至于八月有凶。',
    image: '澤上有地，臨；君子以教思无窮，容保民无疆。',
    plain: '臨是往下靠近。好日子是用來養人的，不是用來鬆懈的——福氣有期限，卦裡寫得很直白。',
    ming: '命宮坐天同，你能讓人放鬆、把氣氛變好，但太舒服時容易停在原地。',
    action: '趁狀態好的時候，先把一件之後會麻煩的事處理掉。',
  },
  廉貞: {
    name: '火雷噬嗑', glyph: '䷔', upper: '離', lower: '震',
    gua: '噬嗑，亨，利用獄。',
    image: '雷電，噬嗑；先王以明罰勑法。',
    plain: '嘴裡有東西卡著，要咬開才通。噬嗑講的是排除障礙，前提是規矩先立清楚。',
    ming: '命宮坐廉貞，你有魅力也有稜角，界線清楚時是助力，模糊時就變成糾纏。',
    action: '把一段讓你消耗的關係或合作，把規則講明白一次。',
  },
  天府: {
    name: '山天大畜', glyph: '䷙', upper: '艮', lower: '乾',
    gua: '大畜，利貞，不家食吉，利涉大川。',
    image: '天在山中，大畜；君子以多識前言往行，以畜其德。',
    plain: '把天收進山裡，是先蓄積再出手。大畜不是保守，是準備好了才過大河。',
    ming: '命宮坐天府，你擅長守成與管理，風險是存得太久、遲遲不動用。',
    action: '盤點手上已經足夠的資源，動用其中一項去換一次成長。',
  },
  太陰: {
    name: '坤為地', glyph: '䷁', upper: '坤', lower: '坤',
    gua: '坤，元亨，利牝馬之貞。',
    image: '地勢坤，君子以厚德載物。',
    plain: '六爻全陰，是純粹的承接。地不跟天爭高，它的力量在能載得住。',
    ming: '命宮坐太陰，你的細膩與收斂是真本事，但長期只接不放，會把自己耗空。',
    action: '這週替自己安排一次真正的休息，並開口請人幫一件事。',
  },
  貪狼: {
    name: '澤雷隨', glyph: '䷐', upper: '兌', lower: '震',
    gua: '隨，元亨利貞，无咎。',
    image: '澤中有雷，隨；君子以嚮晦入宴息。',
    plain: '隨是跟隨。跟對方向叫順勢，跟錯方向叫被拖著走，差別只在你有沒有先挑。',
    ming: '命宮坐貪狼，你機會多、才藝廣，難處是每個都想要，最後每個都淺。',
    action: '從手上的機會挑一個主線，其餘先標記為「明年再說」。',
  },
  巨門: {
    name: '天水訟', glyph: '䷅', upper: '乾', lower: '坎',
    gua: '訟，有孚窒惕，中吉終凶。',
    image: '天與水違行，訟；君子以作事謀始。',
    plain: '天往上、水往下，方向相反就會爭。訟卦的解法不在事後辯贏，在開頭就談清楚。',
    ming: '命宮坐巨門，你看得出別人沒看見的問題，但話出口的時機決定它是洞察還是衝突。',
    action: '新的合作，先把權責與期限寫成文字再開始。',
  },
  天相: {
    name: '風澤中孚', glyph: '䷼', upper: '巽', lower: '兌',
    gua: '中孚，豚魚吉，利涉大川，利貞。',
    image: '澤上有風，中孚；君子以議獄緩死。',
    plain: '中孚是心裡有信。誠意連豚魚都能感應，靠的不是手腕，是別人真的相信你。',
    ming: '命宮坐天相，你是居中協調的角色，做得好是橋樑，做得差是兩邊都不討好。',
    action: '在你居中的那件事上，先對一方說出你真正的判斷。',
  },
  天梁: {
    name: '地水師', glyph: '䷆', upper: '坤', lower: '坎',
    gua: '師，貞，丈人吉，无咎。',
    image: '地中有水，師；君子以容民畜眾。',
    plain: '水藏在地底成軍。師卦講帶人，關鍵是「丈人吉」——扛責任的人要能服眾。',
    ming: '命宮坐天梁，你是那個被找去解決事情的人，但別把所有人的事都變成自己的事。',
    action: '把一件你正在代勞的事，教會另一個人做。',
  },
  七殺: {
    name: '雷天大壯', glyph: '䷡', upper: '震', lower: '乾',
    gua: '大壯，利貞。',
    image: '雷在天上，大壯；君子以非禮弗履。',
    plain: '雷響在天上，力量正盛。大壯唯一的提醒是「非禮弗履」——越有力，界線越要守。',
    ming: '命宮坐七殺，你敢衝、能開局，代價是容易一路推到底、傷到自己人。',
    action: '在最想加速的那件事上，先設一條你不會越過的線。',
  },
  破軍: {
    name: '澤火革', glyph: '䷰', upper: '兌', lower: '離',
    gua: '革，己日乃孚，元亨利貞，悔亡。',
    image: '澤中有火，革；君子以治歷明時。',
    plain: '水火相剋才叫革。舊的確實要換，但卦辭寫「己日乃孚」——時間點對了，改變才被信任。',
    ming: '命宮坐破軍，你不怕拆掉重來，難的是拆完之後把新的秩序建起來。',
    action: '為正在進行的改變排一張時間表，寫清楚何時完成。',
  },
};

const ZIWEI_MING_HEXAGRAM_FALLBACK: ZiweiStarHexagram = {
  name: '山水蒙', glyph: '䷃', upper: '艮', lower: '坎',
  gua: '蒙，亨。匪我求童蒙，童蒙求我。',
  image: '山下出泉，蒙；君子以果行育德。',
  plain: '山下剛冒出的泉水還很混，蒙不是笨，是還沒被引導。卦辭說得清楚：要問的人自己來問。',
  ming: '命宮無十四主星坐守，本宮不硬斷，改看對宮與三方四正——現在方向未定，屬正常階段。',
  action: '先找一位真的走過這條路的人請教，把問題問完整。',
};

function getZiweiMingHexagram(starName: string): ZiweiStarHexagram {
  return ZIWEI_STAR_HEXAGRAM[starName] ?? ZIWEI_MING_HEXAGRAM_FALLBACK;
}

// 由下往上六爻：下卦三爻在前，上卦三爻在後
function getZiweiHexagramLines(hexagram: ZiweiStarHexagram) {
  return [...ZIWEI_TRIGRAM_LINES[hexagram.lower], ...ZIWEI_TRIGRAM_LINES[hexagram.upper]];
}

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

function getZiweiProfessionalPalaceName(palace: ZiweiFullPalace) {
  return ZIWEI_PROFESSIONAL_PALACE_LABELS[palace.key] ?? palace.name;
}

function getZiweiProfessionalMajorStar(name: string) {
  return ZIWEI_PROFESSIONAL_MAJOR_STARS.find((star) => star.name === name) ?? null;
}

function getZiweiProfessionalSupportStar(name: string) {
  return ZIWEI_PROFESSIONAL_SUPPORT_STARS.find((star) => star.name === name) ?? {
    name,
    group: '輔星',
    role: `${name} 已列入本宮輔佐星證據，老師模式保留原始排盤訊號。`,
  };
}

function getZiweiProfessionalTransformationLabel(value: string) {
  const map: Record<string, string> = { 祿: '化祿', 權: '化權', 科: '化科', 忌: '化忌' };
  return value.startsWith('化') ? value : map[value] ?? value;
}

function getZiweiProfessionalTransformationRole(value: string) {
  const label = getZiweiProfessionalTransformationLabel(value);
  return ZIWEI_PROFESSIONAL_TRANSFORMATIONS.find((item) => item.name === label)?.role ?? '四化訊號已落入本宮，依正式排盤保留為後續解讀證據。';
}

function ZiweiProfessionalTeacherMode({
  palaces,
  analysis,
  annual,
}: {
  palaces: ZiweiFullPalace[];
  analysis: NonNullable<InsightResult['ziweiSanFang']>;
  annual?: ZiweiAnnualFortune;
}) {
  const majorStarNames = new Set<string>(ZIWEI_PROFESSIONAL_MAJOR_STARS.map((star) => star.name));
  const placedMajorStars = [...new Set(palaces.flatMap((palace) => palace.majorStars).filter((star) => majorStarNames.has(star)))];
  const missingMajorStars = ZIWEI_PROFESSIONAL_MAJOR_STARS.map((star) => star.name).filter((star) => !placedMajorStars.includes(star));
  const supportStars = [...new Set(palaces.flatMap((palace) => palace.minorStars))];
  const transformations = palaces.flatMap((palace) =>
    palace.transformations.map((item) => ({
      palace: getZiweiProfessionalPalaceName(palace),
      label: getZiweiProfessionalTransformationLabel(item),
      role: getZiweiProfessionalTransformationRole(item),
    })),
  );
  const supportPreviewNames = [
    ...ZIWEI_PROFESSIONAL_SUPPORT_STARS.map((star) => star.name),
    ...supportStars.filter((star) => !ZIWEI_PROFESSIONAL_SUPPORT_STARS.some((item) => item.name === star)),
  ];
  const supportPreview = supportPreviewNames.map(getZiweiProfessionalSupportStar);
  const completedPalaces = palaces.filter((palace) => palace.key && ZIWEI_PROFESSIONAL_PALACE_LABELS[palace.key]).length;

  return (
    <div className="mt-5 rounded-[26px] border border-amber-200/25 bg-[radial-gradient(circle_at_8%_0%,rgba(251,191,36,0.16),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.78),rgba(2,6,23,0.9))] p-4 shadow-[0_0_40px_rgba(251,191,36,0.12)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">TEACHER MODE V2</p>
          <h4 className="mt-2 font-serif text-2xl font-black text-amber-50 sm:text-3xl">老師模式｜完整命盤檢核</h4>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-amber-50/76">
            第一層先呈現專業命盤：十二宮、十四主星、輔星、生年四化與宮干地支。AI 只讀取此命盤，不自行亂排、不跳過排盤。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4 lg:min-w-[420px]">
          {[
            { label: '十二宮', value: `${completedPalaces}/12` },
            { label: '十四主星', value: `${placedMajorStars.length}/14` },
            { label: '輔星訊號', value: supportStars.length || ZIWEI_PROFESSIONAL_SUPPORT_STARS.length },
            { label: '四化落點', value: transformations.length },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <p className="font-mono text-2xl font-black text-cyan-100">{item.value}</p>
              <p className="mt-1 font-black tracking-[0.16em] text-amber-100/72">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h5 className="font-serif text-xl font-black text-cyan-50">十四主星歸位表</h5>
            {missingMajorStars.length > 0 && (
              <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-[11px] font-black text-amber-100">
                未坐守主星：{missingMajorStars.join('、')}
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ZIWEI_PROFESSIONAL_MAJOR_STARS.map((star) => {
              const locatedPalaces = palaces.filter((palace) => palace.majorStars.includes(star.name)).map(getZiweiProfessionalPalaceName);
              return (
                <div key={star.name} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-serif text-lg font-black text-amber-50">{star.name}</p>
                    <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">{star.element}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">{star.role}</p>
                  <p className="mt-2 text-[11px] font-black text-amber-100/80">{locatedPalaces.length ? locatedPalaces.join('、') : '未坐守，需借對宮與三方四正參照'}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
          <h5 className="font-serif text-xl font-black text-cyan-50">輔星與四化專業素材</h5>
          <div className="mt-3 grid gap-2">
            {supportPreview.map((star) => (
              <div key={star.name} className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-cyan-50">{star.name}</p>
                  <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-black text-amber-100">{star.group}</span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">{star.role}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {ZIWEI_PROFESSIONAL_TRANSFORMATIONS.map((item) => (
              <div key={item.name} className="rounded-2xl border border-amber-200/15 bg-amber-300/8 px-3 py-2 text-xs leading-5 text-amber-50/82">
                <span className="font-black text-amber-100">{item.name}</span>：{item.role}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-cyan-200/18 bg-cyan-300/8 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">FULL PALACE TABLE</p>
            <h5 className="mt-1 font-serif text-xl font-black text-cyan-50">十二宮完整排盤</h5>
          </div>
          <p className="text-xs font-bold leading-6 text-cyan-100/72">排盤版本：{analysis.methodVersion}｜流年：{annual?.year ?? new Date().getFullYear()}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {palaces.map((palace) => {
            const palaceName = getZiweiProfessionalPalaceName(palace);
            const majorStars = palace.majorStars.length ? palace.majorStars.join('、') : '無十四主星坐守';
            const minorStars = palace.minorStars.length ? palace.minorStars.slice(0, 10).join('、') : '本宮輔星未集中';
            const palaceTransformations = palace.transformations.length
              ? palace.transformations.map(getZiweiProfessionalTransformationLabel).join('、')
              : '本宮無生年四化落點';
            return (
              <article key={palace.key} className="rounded-[20px] border border-white/10 bg-slate-950/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex items-center justify-between gap-2">
                  <h6 className="font-serif text-xl font-black text-cyan-50">{palaceName}</h6>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-cyan-100">
                    {palace.palaceStem || '宮干'}{palace.branch || '地支'}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">
                  <p><span className="font-black text-amber-100">主星：</span>{majorStars}</p>
                  <p><span className="font-black text-amber-100">輔星：</span>{minorStars}</p>
                  <p><span className="font-black text-amber-100">四化：</span>{palaceTransformations}</p>
                  <p><span className="font-black text-amber-100">老師註記：</span>{palace.majorStars.length ? '本宮可直讀主星，再看三方四正交互作用。' : '本宮無主星坐守，必須借對宮與三方四正，不可單宮硬斷。'}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-bold leading-6 text-[color:var(--text-sub)]">
        飛星交接欄位已建立：目前以前端收到的正式排盤四化訊號為準；資料不足時不由 AI 補星、不自行亂推飛化。紫微只提供權重與證據，最後五元素仍交由 Integration Layer 統一判定。
      </div>
    </div>
  );
}
const ZIWEI_DESTINY_ELEMENT_LABELS: Record<string, string> = {
  SPACE: '空',
  AIR: '風',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

const ZIWEI_DESTINY_ARCHETYPE_LABELS: Record<string, string> = {
  SOVEREIGN_CENTER: '中心光源',
  BREAKER_COMMANDER: '破局刀鋒',
  STRATEGIST: '星軌棋盤',
  INNER_MOON: '月輪水面',
  RESOURCE_EXECUTOR: '金屬財庫',
  PROTECTOR: '守護屋梁',
  CREATOR: '創造舞台',
  CONNECTOR: '橋樑圓桌',
  TRANSFORMER: '重組浪潮',
  OBSERVER: '洞察之門',
  BUILDER: '城池根基',
  GUIDE: '引路光線',
  UNKNOWN: '待明星象',
};

type ZiweiCrossCheckItem = NonNullable<InsightResult['ziweiSanFang']>['crossChecks'][number];

type ZiweiThreeHarmonyStructure = {
  origin: ZiweiFullPalace;
  harmonyA: ZiweiFullPalace;
  harmonyB: ZiweiFullPalace;
  opposite: ZiweiFullPalace;
};

const ZIWEI_HARMONY_ZONE_LABEL = { origin: '本宮', harmonyA: '三合宮位', harmonyB: '三合宮位', opposite: '對宮' } as const;

/**
 * 三方四正幾何：以 ZIWEI_TWELVE_PALACE_ORDER 的環狀位置推算，
 * 三合＝本宮 ±4 位，對宮＝本宮 +6 位（例：命宮 0 → 財帛 4／官祿 8／遷移 6，與既有命財官遷排列一致）。
 */
function getZiweiThreeHarmonyStructure(originKey: string, palaceMap: Map<string, ZiweiFullPalace>): ZiweiThreeHarmonyStructure {
  const originIndex = Math.max(0, ZIWEI_TWELVE_PALACE_ORDER.indexOf(originKey as ZiweiPalaceKey));
  const resolve = (offset: number) => {
    const key = ZIWEI_TWELVE_PALACE_ORDER[(originIndex + offset) % 12];
    return palaceMap.get(key) ?? createZiweiFallbackPalace(key);
  };
  return {
    origin: palaceMap.get(originKey) ?? createZiweiFallbackPalace(originKey as ZiweiPalaceKey),
    harmonyA: resolve(4),
    harmonyB: resolve(8),
    opposite: resolve(6),
  };
}

function buildZiweiStarCombinationText(palace: ZiweiFullPalace): string {
  const palaceName = normalizeZiweiPalaceName(palace.name);
  if (!palace.majorStars.length) {
    return `${palaceName}未見十四主星坐守，本宮不硬斷單星，改以三方四正與四化訊號合看。`;
  }
  const materials = palace.majorStars.map((star) => ({ star, material: ZIWEI_FOURTEEN_MAJOR_STAR_MATERIAL.find((item) => item.name === star) }));
  if (materials.length === 1) {
    const { star, material } = materials[0];
    return material ? `${palaceName}由${star}單星坐守：${material.role}` : `${palaceName}由${star}坐守，星曜字典待補角色說明。`;
  }
  const parts = materials.map(({ star, material }) => (material ? `${star}（${material.role}）` : `${star}（字典待補）`));
  return `${palaceName}由${palace.majorStars.join('、')}同宮，需合看非單論：${parts.join('；')}。同宮不是相加，而是互相牽動，判讀要看兩星如何互相強化、制衡或轉化對方力量。`;
}

function buildZiweiHarmonyTexts(structure: ZiweiThreeHarmonyStructure) {
  return (['origin', 'harmonyA', 'harmonyB', 'opposite'] as const).map((zoneKey) => {
    const palace = structure[zoneKey];
    const palaceName = normalizeZiweiPalaceName(palace.name);
    return {
      zoneKey,
      zoneLabel: ZIWEI_HARMONY_ZONE_LABEL[zoneKey],
      palaceName,
      stars: palace.majorStars.length ? palace.majorStars.join('、') : '無主星，借對宮判讀',
      text: buildZiweiStarCombinationText(palace),
    };
  });
}

function normalizeZiweiTransformationMeta(raw: string) {
  const bare = raw.replace('化', '');
  return ZIWEI_PROFESSIONAL_TRANSFORMATIONS.find((item) => item.name === `化${bare}`) ?? null;
}

function buildZiweiTransformationEffects(structure: ZiweiThreeHarmonyStructure) {
  const zones = (['origin', 'harmonyA', 'harmonyB', 'opposite'] as const).map((zoneKey) => ({ zoneKey, palace: structure[zoneKey] }));
  return zones.flatMap(({ zoneKey, palace }) =>
    palace.transformations.map((raw) => {
      const meta = normalizeZiweiTransformationMeta(raw);
      const palaceName = normalizeZiweiPalaceName(palace.name);
      const zoneLabel = ZIWEI_HARMONY_ZONE_LABEL[zoneKey];
      return {
        raw,
        palaceName,
        zoneLabel,
        text: meta ? `${zoneLabel}．${palaceName}見${meta.name}：${meta.role}` : `${zoneLabel}．${palaceName}見化${raw}，字典待補說明。`,
      };
    }),
  );
}

type ZiweiTeacherTarotSlot = {
  slotKey: 'MING' | 'QIAN_YI' | 'GUAN_LU' | 'CAI_BO';
  slotTitle: string;
  palaceName: string;
  role: string;
  starBasis: string;
  cardId: string;
  cardName: string;
  cardNameEn: string;
  imageUrl: string;
  reason: string;
  chainText: string;
};

const ZIWEI_TAROT_CARD_ZH: Record<string, string> = {
  'major-fool': '\u611a\u8005',
  'major-magician': '\u9b54\u8853\u5e2b',
  'major-high-priestess': '\u5973\u796d\u53f8',
  'major-empress': '\u5973\u7687',
  'major-emperor': '\u7687\u5e1d',
  'major-hierophant': '\u6559\u7687',
  'major-lovers': '\u6200\u4eba',
  'major-chariot': '\u6230\u8eca',
  'major-strength': '\u529b\u91cf',
  'major-hermit': '\u96b1\u8005',
  'major-wheel': '\u547d\u904b\u4e4b\u8f2a',
  'major-justice': '\u6b63\u7fa9',
  'major-hanged-man': '\u5012\u540a\u4eba',
  'major-death': '\u6b7b\u795e',
  'major-temperance': '\u7bc0\u5236',
  'major-devil': '\u60e1\u9b54',
  'major-tower': '\u9ad8\u5854',
  'major-star': '\u661f\u661f',
  'major-moon': '\u6708\u4eae',
  'major-sun': '\u592a\u967d',
  'major-judgement': '\u5be9\u5224',
  'major-world': '\u4e16\u754c',
  'minor-pentacles-ace': '\u9322\u5e63\u4e00',
  'minor-pentacles-three': '\u9322\u5e63\u4e09',
  'minor-pentacles-four': '\u9322\u5e63\u56db',
  'minor-pentacles-six': '\u9322\u5e63\u516d',
  'minor-pentacles-eight': '\u9322\u5e63\u516b',
  'minor-pentacles-ten': '\u9322\u5e63\u5341',
  'minor-pentacles-king': '\u9322\u5e63\u570b\u738b',
  'minor-swords-ace': '\u5bf6\u528d\u4e00',
  'minor-swords-queen': '\u5bf6\u528d\u7687\u540e',
  'minor-wands-six': '\u6b0a\u6756\u516d',
  'minor-wands-king': '\u6b0a\u6756\u570b\u738b',
  'minor-cups-queen': '\u8056\u676f\u7687\u540e',
};

const ZIWEI_STAR_TAROT_CANDIDATES: Record<string, string[]> = {
  '\u7d2b\u5fae': ['major-emperor', 'major-world', 'major-justice'],
  '\u5929\u6a5f': ['major-magician', 'major-wheel', 'minor-swords-ace'],
  '\u592a\u967d': ['major-sun', 'major-chariot', 'minor-wands-six'],
  '\u6b66\u66f2': ['major-justice', 'minor-pentacles-king', 'minor-pentacles-four'],
  '\u5929\u540c': ['major-temperance', 'minor-cups-queen', 'major-star'],
  '\u5ec9\u8c9e': ['major-devil', 'major-justice', 'major-lovers'],
  '\u5929\u5e9c': ['major-empress', 'major-emperor', 'minor-pentacles-ten'],
  '\u592a\u9670': ['major-high-priestess', 'major-moon', 'minor-cups-queen'],
  '\u8caa\u72fc': ['major-devil', 'major-magician', 'major-fool'],
  '\u5de8\u9580': ['major-hermit', 'minor-swords-queen', 'major-moon'],
  '\u5929\u76f8': ['major-justice', 'major-hierophant', 'major-temperance'],
  '\u5929\u6881': ['major-hierophant', 'major-hermit', 'major-star'],
  '\u4e03\u6bba': ['major-chariot', 'major-tower', 'minor-wands-king'],
  '\u7834\u8ecd': ['major-tower', 'major-death', 'major-fool'],
};

const ZIWEI_PALACE_TAROT_CANDIDATES: Record<ZiweiTeacherTarotSlot['slotKey'], string[]> = {
  MING: ['major-emperor', 'major-magician', 'major-strength', 'major-wheel'],
  QIAN_YI: ['major-chariot', 'major-world', 'major-fool', 'major-wheel'],
  GUAN_LU: ['major-emperor', 'major-hierophant', 'minor-pentacles-three', 'minor-pentacles-eight'],
  CAI_BO: ['minor-pentacles-king', 'minor-pentacles-ace', 'minor-pentacles-ten', 'minor-pentacles-six'],
};

function findTarotCard(cardId: string): TarotCard | null {
  return TAROT_CARDS.find((card) => card.id === cardId) ?? null;
}

function getZiweiStarTarotCandidates(stars: string[]) {
  return stars.flatMap((star) => {
    const normalized = Object.keys(ZIWEI_STAR_TAROT_CANDIDATES).find((key) => star.includes(key) || key.includes(star));
    return normalized ? ZIWEI_STAR_TAROT_CANDIDATES[normalized] : [];
  });
}

function pickZiweiTarotCard(candidateIds: string[], used: Set<string>) {
  const candidates = [...candidateIds, 'major-wheel', 'major-world'];
  const id = candidates.find((candidate) => findTarotCard(candidate) && !used.has(candidate))
    ?? candidates.find((candidate) => findTarotCard(candidate))
    ?? 'major-wheel';
  used.add(id);
  return findTarotCard(id) ?? TAROT_CARDS[0];
}

// 命工卡專用：依命宮主星候選 + 命盤五行比例，從 78 張塔羅挑出最符合的一張（結果固定、可回溯）
type DestinyTarotMatch = {
  card: TarotCard;
  cardNameZh: string;
  reason: string;
};

function pickDestinyTarotCard(
  heroStarNames: string[],
  elementSignals: string[],
): DestinyTarotMatch {
  const starCandidateIds = getZiweiStarTarotCandidates(heroStarNames);
  const candidateIds = (starCandidateIds.length ? starCandidateIds : ['major-wheel', 'major-world'])
    .filter((id, index, arr) => arr.indexOf(id) === index);

  const signals = elementSignals.filter((signal): signal is TarotAiElement =>
    signal === 'AIR' || signal === 'SPACE' || signal === 'WATER' || signal === 'FIRE' || signal === 'EARTH');

  // 星座比例原則：候選牌中，取五行權重與命盤訊號最貼合的那張
  let best: TarotCard | null = null;
  let bestScore = -1;
  candidateIds.forEach((id) => {
    const candidate = findTarotCard(id);
    if (!candidate) return;
    const score = signals.length
      ? signals.reduce((sum, signal) => sum + (candidate.elementWeights[signal] ?? 0), 0)
      : 0;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });

  const card = best ?? findTarotCard(candidateIds[0]) ?? TAROT_CARDS[0];
  const cardNameZh = ZIWEI_TAROT_CARD_ZH[card.id] ?? card.nameZh;
  const starText = heroStarNames.filter(Boolean).join('、') || '命宮主星';
  const elementText = signals.map((signal) => ZIWEI_DESTINY_ELEMENT_LABELS[signal] ?? signal).join('、');
  const reason = elementText
    ? `命宮主星「${starText}」對應星象，以五行比例（${elementText}）在候選塔羅中比對最貼近的一張。`
    : `命宮主星「${starText}」對應星象，依十四主星原則對到這張塔羅。`;

  return { card, cardNameZh, reason };
}

function buildZiweiTeacherTarotBridge(structure: ZiweiThreeHarmonyStructure): ZiweiTeacherTarotSlot[] {
  const used = new Set<string>();
  const slots = [
    {
      slotKey: 'MING' as const,
      slotTitle: '\u7b2c\u4e00\u5f35\uff1a\u547d\u5bae\u5854\u7f85\u724c',
      role: '\u5148\u5b9a\u547d\u4e3b\u6838\u5fc3\uff1a\u9019\u500b\u4eba\u7528\u4ec0\u9ebc\u65b9\u5f0f\u9762\u5c0d\u4eba\u751f\u3002',
      chainText: '\u547d\u5bae\u662f\u4e3b\u8ef8\uff0c\u5f8c\u9762\u4e09\u5f35\u724c\u90fd\u8981\u56de\u4f86\u652f\u6490\u9019\u500b\u4e3b\u661f\u6027\u683c\u3002',
      palace: structure.origin,
    },
    {
      slotKey: 'QIAN_YI' as const,
      slotTitle: '\u7b2c\u4e8c\u5f35\uff1a\u9077\u79fb\u5bae\u5854\u7f85\u724c',
      role: '\u518d\u770b\u5916\u754c\u821e\u53f0\uff1a\u5916\u754c\u5982\u4f55\u56de\u61c9\u547d\u4e3b\u3002',
      chainText: '\u9077\u79fb\u5bae\u662f\u5c0d\u5bae\uff0c\u5b83\u4e0d\u6539\u8b8a\u547d\u5bae\uff0c\u800c\u662f\u544a\u8a34\u8001\u5e2b\u5ba2\u6236\u51fa\u53bb\u5f8c\u6703\u9047\u5230\u4ec0\u9ebc\u5834\u57df\u3002',
      palace: structure.opposite,
    },
    {
      slotKey: 'GUAN_LU' as const,
      slotTitle: '\u7b2c\u4e09\u5f35\uff1a\u5b98\u797f\u5bae\u5854\u7f85\u724c',
      role: '\u7b2c\u4e09\u770b\u4e8b\u696d\u8def\u7dda\uff1a\u80fd\u529b\u5982\u4f55\u843d\u6210\u8cac\u4efb\u8207\u6210\u5c31\u3002',
      chainText: '\u5b98\u797f\u5bae\u628a\u547d\u5bae\u7684\u6027\u683c\u8f49\u6210\u5de5\u4f5c\u65b9\u6cd5\uff0c\u662f\u300c\u6211\u80fd\u505a\u4ec0\u9ebc\u300d\u7684\u7b54\u6848\u3002',
      palace: structure.harmonyB,
    },
    {
      slotKey: 'CAI_BO' as const,
      slotTitle: '\u7b2c\u56db\u5f35\uff1a\u8ca1\u5e1b\u5bae\u5854\u7f85\u724c',
      role: '\u6700\u5f8c\u770b\u8cc7\u6e90\u8f49\u5316\uff1a\u80fd\u529b\u80fd\u4e0d\u80fd\u8b8a\u6210\u6536\u5165\u8207\u7a69\u5b9a\u7d2f\u7a4d\u3002',
      chainText: '\u8ca1\u5e1b\u5bae\u662f\u843d\u5730\u9ede\uff0c\u5b83\u628a\u547d\u5bae\u3001\u9077\u79fb\u3001\u5b98\u797f\u4e32\u6210\u53ef\u7528\u8cc7\u6e90\u3002',
      palace: structure.harmonyA,
    },
  ];

  return slots.map((slot) => {
    const starCandidates = getZiweiStarTarotCandidates(slot.palace.majorStars);
    const card = pickZiweiTarotCard([...starCandidates, ...ZIWEI_PALACE_TAROT_CANDIDATES[slot.slotKey]], used);
    const starBasis = slot.palace.majorStars.join('\u3001') || '\u7121\u4e3b\u661f\uff0c\u501f\u4e09\u65b9\u56db\u6b63';
    const palaceName = normalizeZiweiPalaceName(slot.palace.name);
    const cardName = ZIWEI_TAROT_CARD_ZH[card.id] ?? card.nameZh;
    return {
      slotKey: slot.slotKey,
      slotTitle: slot.slotTitle,
      palaceName,
      role: slot.role,
      starBasis,
      cardId: card.id,
      cardName,
      cardNameEn: card.nameEn,
      imageUrl: card.imageUrl,
      reason: `${palaceName}\u4ee5\u300c${starBasis}\u300d\u70ba\u4e3b\u8ef8\uff0c\u5f9e 78 \u5f35\u724c\u4e2d\u9078\u300c${cardName}\u300d\u4f5c\u70ba\u5716\u50cf\u8f14\u52a9\u3002`,
      chainText: slot.chainText,
    };
  });
}

function buildZiweiSupportStarLines(structure: ZiweiThreeHarmonyStructure): string[] {
  const zones = (['origin', 'harmonyA', 'harmonyB', 'opposite'] as const).map((zoneKey) => ({ zoneKey, palace: structure[zoneKey] }));
  const lines = zones.flatMap(({ zoneKey, palace }) =>
    palace.minorStars.map((star) => {
      const meta = ZIWEI_PROFESSIONAL_SUPPORT_STARS.find((item) => item.name === star);
      const palaceName = normalizeZiweiPalaceName(palace.name);
      const zoneLabel = ZIWEI_HARMONY_ZONE_LABEL[zoneKey];
      return meta ? `${zoneLabel}${palaceName}：${star}（${meta.group}．${meta.role}）` : `${zoneLabel}${palaceName}：${star}`;
    }),
  );
  return lines.length ? lines.slice(0, 8) : ['本宮與三方四正輔星未集中顯示，判讀以主星與四化為主，不補星。'];
}

/**
 * 老師專業解析合成器：本宮→主星組合→三方四正→四化→輔煞→老師合盤總結。
 * 只讀後端已回傳的命盤資料（allPalaces / crossChecks / annualPalace），不生成命盤沒有的星曜或宮位。
 */
function buildZiweiTeacherSynthesis(
  originKey: string,
  palaceMap: Map<string, ZiweiFullPalace>,
  annualPalace: ZiweiAnnualPalace | undefined,
  crossCheck: ZiweiCrossCheckItem | null,
  annual: ZiweiAnnualFortune | undefined,
) {
  const structure = getZiweiThreeHarmonyStructure(originKey, palaceMap);
  const originName = normalizeZiweiPalaceName(structure.origin.name);
  const harmonyTexts = buildZiweiHarmonyTexts(structure);
  const transformationEffects = buildZiweiTransformationEffects(structure);
  const supportStarLines = buildZiweiSupportStarLines(structure);
  const annualSignal = getZiweiAnnualSignal(originKey, annualPalace, annual);
  const tarotBridge = buildZiweiTeacherTarotBridge(structure);

  const taboo = transformationEffects.find((item) => item.raw.includes('忌'));
  const positive = transformationEffects.filter((item) => item.raw.includes('祿') || item.raw.includes('權') || item.raw.includes('科'));

  const strength = positive.length
    ? `三方四正內見 ${positive.length} 處祿權科：${positive.map((item) => `${item.zoneLabel}${item.palaceName}`).join('、')}，屬於可用資源與擴張力道。`
    : '三方四正未見祿權科進駐，力量以主星本質與輔星為主，擴張力道較保守。';

  const structuralRisk = taboo
    ? `${taboo.zoneLabel}${taboo.palaceName}見化忌，是這一圈最需要留意的卡點：${taboo.text}`
    : '三方四正未見化忌，暫無明顯卡點訊號，仍以主星特質與輔星組合為觀察重點。';

  const currentTheme = annualPalace
    ? `年度訊號落在${originName}：${annualPalace.focus ?? '流年主題與本宮呼應'}${typeof annualPalace.score === 'number' ? `（年度分數 ${annualPalace.score}）` : ''}。`
    : `本次未提供${originName}的流年比對資料，先以命盤結構為主，不另行推測流年。`;

  const teacherAdvice = [buildZiweiStarCombinationText(structure.origin), strength, structuralRisk].join(' ');

  return {
    originName,
    structure,
    harmonyTexts,
    transformationEffects,
    supportStarLines,
    tarotBridge,
    crossCheck,
    annualSignal,
    corePattern: `${originName}三方四正：${harmonyTexts.map((item) => item.palaceName).join('、')}`,
    strength,
    structuralRisk,
    currentTheme,
    teacherAdvice,
  };
}

type ZiweiTeacherSynthesis = ReturnType<typeof buildZiweiTeacherSynthesis>;

/** Google 正統解盤＋恐怖鬼魅合體解盤，共用同一張正式命盤。 */
const ZIWEI_TEACHERS: { id: ZiweiTeacherId; name: string; note: string }[] = [
  { id: 'STRUCTURE_MASTER', name: 'Google 老師解盤', note: '本宮、主星、三方四正與四化' },
  { id: 'LIFE_MASTER', name: '恐怖鬼魅解盤', note: '恐怖壓迫 × 鬼魅電影場景，同一張正式命盤' },
];

const ZIWEI_TEACHER_PALACE_ID_MAP: Record<string, ZiweiTeacherPalaceId> = {
  MING: 'LIFE', XIONG_DI: 'SIBLINGS', FU_QI: 'SPOUSE', ZI_NV: 'CHILDREN',
  CAI_BO: 'WEALTH', JI_E: 'HEALTH', QIAN_YI: 'TRAVEL', JIAO_YOU: 'FRIENDS',
  GUAN_LU: 'CAREER', TIAN_ZHAI: 'PROPERTY', FU_DE: 'FORTUNE', FU_MU: 'PARENTS',
};

type ZiweiTeacherApiResult = StructureTeacherResult | LifeTeacherResult | NarrativeTeacherResult | 'INSUFFICIENT_DATA';

/**
 * 娛樂模組（恐怖／鬼魅，2026-08-22）：跟上面三位專業老師是完全分開的第二套模組，
 * 各自獨立的 API（/entertainment-analysis）、獨立的狀態與快取，切換模式時彼此不混在一起。
 * 允許在真實命盤星曜之外加入虛構靈異劇情，因此固定顯示 disclaimer，不得拿掉。
 */
const ZIWEI_ENTERTAINMENT_TEACHERS: { id: EntertainmentTeacherId; name: string; note: string }[] = [
  { id: 'HORROR', name: '恐怖老師', note: '懸疑驚悚口吻，借命盤星曜當靈感說鬼故事' },
  { id: 'GHOST', name: '鬼魅老師', note: '飄渺詭譎的低語敘事，同樣借星曜當素材' },
];

function ZiweiEntertainmentResultView({ result }: { result: EntertainmentTeacherResult }) {
  return (
    <div className="mt-4 rounded-2xl border border-red-500/30 bg-black/40 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-300">{result.disclaimer}</p>
      <h4 className="mt-3 font-serif text-xl font-black leading-tight text-red-50">{result.title}</h4>
      <p className="mt-3 text-base font-semibold leading-7 text-red-100/85">{result.openingScene}</p>
      <p className="mt-3 text-base font-semibold leading-7 text-red-100/85">{result.narrative}</p>
      <p className="mt-3 rounded-xl border border-red-500/25 bg-red-950/30 px-3 py-2 text-base font-black leading-7 text-red-100">{result.chillingTwist}</p>
      <p className="mt-3 text-sm font-semibold italic leading-6 text-red-200/70">{result.closingWhisper}</p>
      {result.inspiredBy.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {result.inspiredBy.map((ref, index) => (
            <span key={index} className="rounded-full border border-red-500/20 bg-red-950/25 px-2.5 py-1 text-[11px] font-bold text-red-200/70">{ref}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ZiweiTeacherEvidenceRefs({ refs }: { refs: string[] }) {
  if (!refs.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {refs.map((ref, index) => (
        <span key={index} className="rounded-full border border-white/10 bg-black/18 px-2.5 py-1 text-[11px] font-bold text-white/55">{ref}</span>
      ))}
    </div>
  );
}

function ZiweiTeacherResultView({ result }: { result: StructureTeacherResult | LifeTeacherResult | NarrativeTeacherResult }) {
  if (result.teacherId === 'STRUCTURE_MASTER') {
    return (
      <div className="mt-4">
        <p className="text-[11px] font-black tracking-[0.16em] text-amber-100/80">Google 命盤解析老師｜結構解盤</p>
        <h4 className="mt-2 font-serif text-xl font-black leading-tight text-purple-50">{result.corePattern}</h4>
        <div className="mt-3 grid gap-2.5 text-base font-semibold leading-7 text-[color:var(--text-main)]">
          <p><span className="font-black text-purple-200">主星組合：</span>{result.primaryStarSynthesis}</p>
          <p><span className="font-black text-purple-200">三方四正：</span>{result.threeHarmonySynthesis}</p>
          <p><span className="font-black text-purple-200">四化效應：</span>{result.transformationEffect}</p>
          {result.importantSupportingStars.length > 0 && (
            <p><span className="font-black text-purple-200">重要輔星：</span>{result.importantSupportingStars.join('、')}</p>
          )}
          <p><span className="font-black text-emerald-200">結構優勢：</span>{result.structuralStrength}</p>
          <p><span className="font-black text-rose-200">結構壓力：</span>{result.structuralPressure}</p>
          <p><span className="font-black text-purple-200">過去慣性：</span>{result.pastStructure}</p>
          <p><span className="font-black text-cyan-200">未來趨勢：</span>{result.futureTendency}</p>
          <p><span className="font-black text-cyan-200">結論：</span>{result.conclusion}</p>
        </div>
        <ZiweiTeacherEvidenceRefs refs={result.evidenceRefs} />
      </div>
    );
  }
  if (result.teacherId === 'LIFE_MASTER') {
    return (
      <div className="mt-4">
        <p className="text-[11px] font-black tracking-[0.16em] text-amber-100/80">恐怖解命盤｜危機解盤</p>
        <div className="mt-3 rounded-2xl border border-rose-300/25 bg-gradient-to-br from-rose-950/50 via-purple-950/35 to-slate-950/55 px-4 py-3 shadow-[inset_0_0_32px_rgba(244,63,94,0.12)]">
          <p className="text-[10px] font-black tracking-[0.18em] text-rose-200/90">本宮驚悚開場・戲劇化風險情境</p>
          <p className="mt-1 font-serif text-base font-bold leading-7 text-rose-50">{result.fearScene}</p>
        </div>
        <h4 className="mt-2 font-serif text-xl font-black leading-tight text-purple-50">{result.lifeMeaning}</h4>
        <div className="mt-3 grid gap-2.5 text-base font-semibold leading-7 text-[color:var(--text-main)]">
          <p><span className="font-black text-purple-200">過去慣性：</span>{result.pastPattern}</p>
          <p><span className="font-black text-cyan-200">未來風險窗口：</span>{result.futureRiskWindow}</p>
          <p><span className="font-black text-emerald-200">現實中的優勢：</span>{result.strengthInReality}</p>
          <p><span className="font-black text-purple-200">重複模式：</span>{result.repeatedPattern}</p>
          <p><span className="font-black text-rose-200">盲點：</span>{result.blindSpot}</p>
          <p><span className="font-black text-cyan-200">決策風格：</span>{result.decisionStyle}</p>
          <p><span className="font-black text-purple-200">與環境的關係：</span>{result.relationshipWithEnvironment}</p>
          <p><span className="font-black text-amber-200">道德收束：</span>{result.practicalDirection}</p>
        </div>
        <ZiweiTeacherEvidenceRefs refs={result.evidenceRefs} />
      </div>
    );
  }
  return (
    <div className="mt-4">
      <p className="text-[11px] font-black tracking-[0.16em] text-amber-100/80">鬼魅解命盤｜鬼魅解盤</p>
      <h4 className="mt-2 font-serif text-xl font-black leading-tight text-purple-50">{result.visualTitle}</h4>
      <p className="mt-3 text-base font-semibold leading-7 text-[color:var(--text-main)]">{result.scene}</p>
      <p className="mt-2 text-base font-semibold leading-7 text-[color:var(--text-main)]"><span className="font-black text-purple-200">主角：</span>{result.mainCharacter}</p>
      {result.symbols.length > 0 && (
        <div className="mt-3 grid gap-2">
          {result.symbols.map((item, index) => (
            <p key={index} className="text-sm font-semibold leading-6 text-[color:var(--text-sub)]">
              <span className="font-black text-cyan-200">{item.symbol}：</span>{item.meaning}
              <span className="ml-1 text-white/40">（{item.sourceRef}）</span>
            </p>
          ))}
        </div>
      )}
      <p className="mt-3 text-base font-semibold leading-7 text-[color:var(--text-main)]">{result.story}</p>
      <p className="mt-3 text-base font-semibold leading-7 text-[color:var(--text-main)]"><span className="font-black text-purple-200">過去迴聲：</span>{result.pastEcho}</p>
      <p className="mt-2 text-base font-semibold leading-7 text-[color:var(--text-main)]"><span className="font-black text-cyan-200">未來暗影：</span>{result.futureShadow}</p>
      <p className="mt-3 rounded-xl border border-amber-200/20 bg-amber-300/[0.06] px-3 py-2 text-base font-black leading-7 text-amber-50"><span className="text-amber-200">道德結尾：</span>{result.finalMetaphor}</p>
      <ZiweiTeacherEvidenceRefs refs={result.evidenceRefs} />
    </div>
  );
}

function ZiweiTeacherTarotBridgePanel({ cards }: { cards: ZiweiTeacherTarotSlot[] }) {
  if (!cards.length) return null;

  return (
    <section className="mt-4 rounded-2xl border border-amber-300/25 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.13),rgba(15,23,42,0.86)_58%,rgba(2,6,23,0.96)_100%)] p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">TEACHER TAROT BRIDGE</p>
          <h4 className="mt-2 font-serif text-xl font-black leading-tight text-amber-50">
            {'\u8001\u5e2b\u5c08\u7528\uff5c\u4e09\u65b9\u56db\u6b63 4 \u5f35\u5854\u7f85\u5716\u50cf\u6a4b\u63a5'}
          </h4>
        </div>
        <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-[11px] font-black text-amber-100">
          {'78 \u5f35\u73fe\u6210\u724c\u5eab'}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
        {'\u5854\u7f85\u53ea\u662f\u5716\u50cf\u8a9e\u8a00\uff0c\u4e0d\u53d6\u4ee3\u7d2b\u5fae\u6392\u76e4\u3002\u9078\u724c\u9806\u5e8f\u56fa\u5b9a\u70ba\uff1a\u547d\u5bae \u2192 \u9077\u79fb\u5bae \u2192 \u5b98\u797f\u5bae \u2192 \u8ca1\u5e1b\u5bae\uff0c\u7b2c\u4e00\u512a\u5148\u770b\u5404\u5bae\u4e3b\u661f\u3002'}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item, index) => (
          <article key={item.slotKey} className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_18px_42px_rgba(2,6,23,0.26)]">
            <div className="relative bg-black/25">
              <img
                src={item.imageUrl}
                alt={`${item.slotTitle} ${item.cardName}`}
                loading="lazy"
                className="mx-auto aspect-[275/480] w-full max-w-[180px] object-cover object-top sm:max-w-none"
              />
              <span className="absolute left-3 top-3 rounded-full border border-amber-200/30 bg-black/55 px-2.5 py-1 text-[10px] font-black text-amber-100">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="p-4">
              <p className="text-[11px] font-black leading-5 text-amber-200">{item.slotTitle}</p>
              <h5 className="mt-2 break-words font-serif text-xl font-black leading-tight text-amber-50">{item.cardName}</h5>
              <p className="mt-1 text-xs font-bold text-cyan-100/75">{item.cardNameEn}</p>
              <p className="mt-3 rounded-xl border border-white/10 bg-black/18 px-3 py-2 text-xs font-black leading-5 text-[color:var(--text-main)]">
                {item.palaceName} · {item.starBasis}
              </p>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{item.role}</p>
              <p className="mt-2 text-xs font-semibold leading-6 text-amber-100/85">{item.chainText}</p>
              <details className="mt-3 rounded-xl border border-white/10 bg-black/18 p-3">
                <summary className="cursor-pointer text-xs font-black text-cyan-100">{'\u9078\u724c\u4f9d\u64da'}</summary>
                <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{item.reason}</p>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ZiweiTeacherSynthesisPanel({
  synthesis,
  showTarotBridge = true,
  analysisId,
  originKey,
}: {
  synthesis: ZiweiTeacherSynthesis;
  showTarotBridge?: boolean;
  analysisId: string;
  originKey: string;
}) {
  const [mode, setMode] = useState<'PROFESSIONAL' | 'ENTERTAINMENT'>('PROFESSIONAL');
  const [activeTeacher, setActiveTeacher] = useState<ZiweiTeacherId>('STRUCTURE_MASTER');
  const [teacherCache, setTeacherCache] = useState<Record<string, ZiweiTeacherApiResult>>({});
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [timeRefresh, setTimeRefresh] = useState(0);
  const fetchedKeysRef = useRef<Set<string>>(new Set());

  const [activeEntertainer, setActiveEntertainer] = useState<EntertainmentTeacherId>('HORROR');
  const [entertainmentCache, setEntertainmentCache] = useState<Record<string, EntertainmentTeacherResult>>({});
  const [entertainmentLoading, setEntertainmentLoading] = useState(false);
  const [entertainmentError, setEntertainmentError] = useState<string | null>(null);
  const fetchedEntertainmentKeysRef = useRef<Set<string>>(new Set());

  const palaceId = ZIWEI_TEACHER_PALACE_ID_MAP[originKey] ?? 'LIFE';
  const cacheKey = `${analysisId}|${palaceId}|${activeTeacher}|time-${timeRefresh}`;
  const activeResult = teacherCache[cacheKey];
  const combinedNarrativeCacheKey = `${analysisId}|${palaceId}|NARRATIVE_MASTER|time-${timeRefresh}`;
  const combinedNarrativeResult = teacherCache[combinedNarrativeCacheKey];
  const entertainmentCacheKey = `${analysisId}|${palaceId}|${activeEntertainer}`;
  const activeEntertainmentResult = entertainmentCache[entertainmentCacheKey];

  useEffect(() => {
    if (mode !== 'PROFESSIONAL') return;
    if (!analysisId) return;
    if (fetchedKeysRef.current.has(cacheKey)) return;
    fetchedKeysRef.current.add(cacheKey);
    setTeacherLoading(true);
    setTeacherError(null);
    fetch(`/api/ziwei/${analysisId}/teacher-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ palaceId, teacherId: activeTeacher }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.message || '老師解讀失敗，請稍後再試。');
        return json.data as ZiweiTeacherApiResult;
      })
      .then((data) => {
        setTeacherCache((prev) => ({ ...prev, [cacheKey]: data }));
      })
      .catch((err) => {
        fetchedKeysRef.current.delete(cacheKey);
        setTeacherError(err instanceof Error ? err.message : '老師解讀失敗，請稍後再試。');
      })
      .finally(() => {
        setTeacherLoading(false);
      });
  }, [mode, analysisId, palaceId, activeTeacher, cacheKey]);

  useEffect(() => {
    if (mode !== 'PROFESSIONAL' || activeTeacher !== 'LIFE_MASTER' || !analysisId) return;
    if (fetchedKeysRef.current.has(combinedNarrativeCacheKey)) return;
    fetchedKeysRef.current.add(combinedNarrativeCacheKey);
    fetch(`/api/ziwei/${analysisId}/teacher-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ palaceId, teacherId: 'NARRATIVE_MASTER' }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.message || '鬼魅段落生成失敗，請稍後再試。');
        return json.data as ZiweiTeacherApiResult;
      })
      .then((data) => setTeacherCache((prev) => ({ ...prev, [combinedNarrativeCacheKey]: data })))
      .catch(() => fetchedKeysRef.current.delete(combinedNarrativeCacheKey));
  }, [mode, analysisId, palaceId, activeTeacher, combinedNarrativeCacheKey]);

  useEffect(() => {
    if (mode !== 'ENTERTAINMENT') return;
    if (!analysisId) return;
    if (fetchedEntertainmentKeysRef.current.has(entertainmentCacheKey)) return;
    fetchedEntertainmentKeysRef.current.add(entertainmentCacheKey);
    setEntertainmentLoading(true);
    setEntertainmentError(null);
    fetch(`/api/ziwei/${analysisId}/entertainment-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ palaceId, teacherId: activeEntertainer }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.message || '老師故事生成失敗，請稍後再試。');
        return json.data as EntertainmentTeacherResult;
      })
      .then((data) => {
        setEntertainmentCache((prev) => ({ ...prev, [entertainmentCacheKey]: data }));
      })
      .catch((err) => {
        fetchedEntertainmentKeysRef.current.delete(entertainmentCacheKey);
        setEntertainmentError(err instanceof Error ? err.message : '老師故事生成失敗，請稍後再試。');
      })
      .finally(() => {
        setEntertainmentLoading(false);
      });
  }, [mode, analysisId, palaceId, activeEntertainer, entertainmentCacheKey]);

  return (
    <div className="mt-4 rounded-2xl border border-purple-300/25 bg-[linear-gradient(160deg,rgba(88,28,135,0.28),rgba(15,23,42,0.9)_60%,rgba(2,6,23,0.96))] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-200">
          {mode === 'PROFESSIONAL' ? '老師切換 · 同一命盤，兩種解盤方式' : '娛樂模式 · 同一命盤，虛構故事創作'}
        </p>
        <button
          type="button"
          onClick={() => document.getElementById('ziwei-twelve-palaces')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/18"
        >
          返回十二宮
        </button>
        {mode === 'PROFESSIONAL' && (
          <button
            type="button"
            onClick={() => setTimeRefresh((value) => value + 1)}
            className="rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-300/18"
          >
            更新當下時間解盤
          </button>
        )}
      </div>

      {mode === 'PROFESSIONAL' ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ZIWEI_TEACHERS.map((teacher) => {
              const active = activeTeacher === teacher.id;
              return <button key={teacher.id} type="button" onClick={() => setActiveTeacher(teacher.id)} aria-pressed={active} className={`min-h-[72px] rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-amber-200/55 bg-amber-300/14 text-amber-50' : 'border-white/10 bg-black/15 text-purple-100 hover:border-purple-200/40 hover:bg-purple-300/10'}`}><span className="block text-sm font-black">{teacher.name}</span><span className="mt-1 block text-[11px] font-semibold leading-4 text-white/60">{teacher.note}</span></button>;
            })}
          </div>

          {teacherLoading && !activeResult && (
            <p className="mt-4 text-sm font-semibold text-purple-100/70">老師正在讀盤中…</p>
          )}
          {teacherError && !activeResult && (
            <p className="mt-4 text-sm font-semibold text-rose-200">{teacherError}</p>
          )}
          {activeResult === 'INSUFFICIENT_DATA' && (
            <p className="mt-4 text-sm font-semibold text-amber-200">本宮資料不足，老師暫不勉強生成判讀，不補故事假裝完整。</p>
          )}
          {activeResult && activeResult !== 'INSUFFICIENT_DATA' && <ZiweiTeacherResultView result={activeResult} />}
          {activeTeacher === 'LIFE_MASTER' && combinedNarrativeResult && combinedNarrativeResult !== 'INSUFFICIENT_DATA' && (
            <div className="mt-5 border-t border-rose-300/20 pt-4">
              <p className="text-[11px] font-black tracking-[0.18em] text-rose-200/85">鬼魅段・同一命盤的陰影收尾</p>
              <ZiweiTeacherResultView result={combinedNarrativeResult} />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ZIWEI_ENTERTAINMENT_TEACHERS.map((teacher) => {
              const active = activeEntertainer === teacher.id;
              return <button key={teacher.id} type="button" onClick={() => setActiveEntertainer(teacher.id)} aria-pressed={active} className={`min-h-[72px] rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-red-400/55 bg-red-500/14 text-red-50' : 'border-white/10 bg-black/15 text-red-200/80 hover:border-red-400/40 hover:bg-red-500/10'}`}><span className="block text-sm font-black">{teacher.name}</span><span className="mt-1 block text-[11px] font-semibold leading-4 text-white/60">{teacher.note}</span></button>;
            })}
          </div>

          {entertainmentLoading && !activeEntertainmentResult && (
            <p className="mt-4 text-sm font-semibold text-red-200/70">故事生成中…</p>
          )}
          {entertainmentError && !activeEntertainmentResult && (
            <p className="mt-4 text-sm font-semibold text-rose-200">{entertainmentError}</p>
          )}
          {activeEntertainmentResult && <ZiweiEntertainmentResultView result={activeEntertainmentResult} />}
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {synthesis.harmonyTexts.map((item) => (
          <span key={item.zoneKey} className="rounded-full border border-purple-200/25 bg-purple-300/10 px-3 py-1.5 text-xs font-bold text-purple-100">
            {item.zoneLabel}．{item.palaceName}：{item.stars}
          </span>
        ))}
      </div>

      {showTarotBridge && <ZiweiTeacherTarotBridgePanel cards={synthesis.tarotBridge} />}

      <details className="mt-4 rounded-xl border border-white/10 bg-black/18 p-3">
        <summary className="flex min-h-[48px] cursor-pointer items-center text-sm font-black text-purple-100">本宮與主星</summary>
        <p className="mt-2 text-base font-semibold leading-7 text-[color:var(--text-main)]">{buildZiweiStarCombinationText(synthesis.structure.origin)}</p>
        <details className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <summary className="cursor-pointer text-xs font-bold text-purple-200/80">為什麼？</summary>
          <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
            後端命盤資料：{synthesis.originName}主星＝{synthesis.structure.origin.majorStars.join('、') || '無'}；宮干 {synthesis.structure.origin.palaceStem || '未提供'}／地支 {synthesis.structure.origin.branch || '未提供'}。
          </p>
        </details>
      </details>

      <details className="mt-3 rounded-xl border border-white/10 bg-black/18 p-3">
        <summary className="flex min-h-[48px] cursor-pointer items-center text-sm font-black text-purple-100">三方四正</summary>
        <div className="mt-2 grid gap-2">
          {synthesis.harmonyTexts.map((item) => (
            <p key={item.zoneKey} className="text-base font-semibold leading-7 text-[color:var(--text-main)]">
              <span className="text-purple-200/80">{item.zoneLabel}．{item.palaceName}：</span>{item.text}
            </p>
          ))}
        </div>
        {synthesis.crossCheck && (
          <details className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
            <summary className="cursor-pointer text-xs font-bold text-purple-200/80">為什麼？</summary>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
              後端交叉驗證（{synthesis.crossCheck.ruleId}）：{synthesis.crossCheck.title}．{synthesis.crossCheck.detail}
            </p>
          </details>
        )}
      </details>

      <details className="mt-3 rounded-xl border border-white/10 bg-black/18 p-3">
        <summary className="flex min-h-[48px] cursor-pointer items-center text-sm font-black text-purple-100">四化與輔星</summary>
        <div className="mt-2 grid gap-1.5">
          {synthesis.transformationEffects.length ? (
            synthesis.transformationEffects.map((item, index) => (
              <p key={`${item.palaceName}-${item.raw}-${index}`} className="text-base font-semibold leading-7 text-[color:var(--text-main)]">{item.text}</p>
            ))
          ) : (
            <p className="text-base font-semibold leading-7 text-[color:var(--text-sub)]">三方四正本次未見四化訊號，不由 AI 補作四化判斷。</p>
          )}
        </div>
        <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-purple-200/70">輔星煞星</p>
        <div className="mt-1.5 grid gap-1">
          {synthesis.supportStarLines.map((line, index) => (
            <p key={index} className="text-sm font-semibold leading-6 text-[color:var(--text-sub)]">{line}</p>
          ))}
        </div>
      </details>

      <details className="mt-3 rounded-xl border border-white/10 bg-black/18 p-3">
        <summary className="flex min-h-[48px] cursor-pointer items-center text-sm font-black text-purple-100">大限／流年</summary>
        <div className="mt-2 grid gap-2.5">
          <p className="text-base font-semibold leading-7 text-[color:var(--text-main)]">
            <span className="font-black text-purple-200">大限：</span>後端目前尚未提供大限（十年運）排盤資料，不由前端推測，先以流年為準。
          </p>
          <p className="text-base font-semibold leading-7 text-[color:var(--text-main)]">
            <span className="font-black text-cyan-200">今年流年重點：</span>{synthesis.annualSignal.focus}
            {typeof synthesis.annualSignal.score === 'number' ? `（${synthesis.annualSignal.scoreSource} ${synthesis.annualSignal.score}）` : ''}
          </p>
          <p className="text-base font-semibold leading-7 text-[color:var(--text-main)]">
            <span className="font-black text-rose-200">目前最需要注意：</span>{synthesis.annualSignal.tensions[0] ?? synthesis.annualSignal.advice ?? '本次未提供特別警示訊號。'}
          </p>
        </div>
      </details>

      <details className="mt-3 rounded-xl border border-purple-200/20 bg-purple-300/[0.06] p-3">
        <summary className="flex min-h-[48px] cursor-pointer items-center text-sm font-black text-purple-100">老師完整判讀</summary>
        <div className="mt-2 grid gap-2.5">
          <p className="text-base font-semibold leading-7 text-[color:var(--text-main)]"><span className="font-black text-purple-200">格局：</span>{synthesis.corePattern}</p>
          <p className="text-base font-semibold leading-7 text-[color:var(--text-main)]"><span className="font-black text-emerald-200">優勢：</span>{synthesis.strength}</p>
          <p className="text-base font-semibold leading-7 text-[color:var(--text-main)]"><span className="font-black text-rose-200">結構風險：</span>{synthesis.structuralRisk}</p>
          <p className="text-base font-semibold leading-7 text-[color:var(--text-main)]"><span className="font-black text-cyan-200">當前主題：</span>{synthesis.currentTheme}</p>
        </div>
      </details>

      <p className="mt-4 text-[11px] font-semibold leading-5 text-white/40">老師判讀建立在後端正式命盤資料上；沒有命盤證據，不生成老師結論。</p>
      <p className="mt-1 text-[11px] font-semibold leading-5 text-white/35">恐怖型與鬼魅型只改解盤方式；不恐嚇、不診斷、不保證未來，且每一句都可回查正式命盤。</p>
    </div>
  );
}

function ZiweiDestinyCardView({
  card,
  subjectName,
  analysis,
  annual,
  analysisId,
}: {
  card?: ZiweiDestinyCardModel | null;
  subjectName?: string;
  analysis?: InsightResult['ziweiSanFang'];
  annual?: InsightResult['annualFortune'];
  analysisId?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  if (!card) return null;

  const isReady = card.verification.readyForFrontend;
  const title = card.cardType === 'DESTINY_CARD' ? '神秘命宮卡' : '生日主題卡';
  const archetypeLabel = ZIWEI_DESTINY_ARCHETYPE_LABELS[card.visualTheme.archetype] ?? '命盤象徵';
  const elementLabels = card.visualTheme.elementSignals.map((item) => ZIWEI_DESTINY_ELEMENT_LABELS[item] ?? item);
  const destinyTarot = pickDestinyTarotCard(card.heroStars.map((star) => star.name), card.visualTheme.elementSignals);

  const isTimeExact = analysis?.timeConfidence === 'exact';
  const teacherPalaceSource: ZiweiFullPalace[] = analysis?.allPalaces?.length ? analysis.allPalaces : analysis?.palaces ?? [];
  const teacherPalaceMap = new Map<string, ZiweiFullPalace>(teacherPalaceSource.map((palace) => [palace.key, palace]));
  const teacherAnnualPalace = annual?.sanFangFourZheng?.find((item) => item.palaceKey === 'MING');
  const teacherCrossCheck = analysis?.crossChecks?.find((item) => item.palaceKey === 'MING') ?? null;
  const teacherSynthesis = isTimeExact && teacherPalaceMap.size ? buildZiweiTeacherSynthesis('MING', teacherPalaceMap, teacherAnnualPalace, teacherCrossCheck, annual) : null;

  return (
    <section className="fortune-card overflow-hidden p-4 sm:p-7" aria-label="紫微神秘命宮卡">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">ZIWEI DESTINY CARD</p>
          <h2 className="mt-2 font-serif text-2xl font-black leading-tight text-amber-50 sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
            紫微負責算，神秘命宮卡負責讓客戶看懂；星曜、宮位、四化與三方四正皆可回溯到正式命盤。
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.14em] ${isReady ? 'border-emerald-200/30 bg-emerald-300/10 text-emerald-100' : 'border-amber-200/35 bg-amber-300/10 text-amber-100'}`}>
          {isReady ? 'VERIFIED' : 'REFERENCE'}
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start">
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          aria-pressed={flipped}
          className="group mx-auto block w-full max-w-[360px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
        >
          <div className="[perspective:1400px]">
            <div
              className="relative aspect-[2/3] w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] group-active:scale-[0.99]"
              style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
              {/* 正面：命工卡 */}
              <div className="absolute inset-0 overflow-hidden rounded-[28px] border border-amber-200/35 bg-[radial-gradient(circle_at_50%_18%,rgba(251,191,36,0.24),transparent_28%),linear-gradient(160deg,rgba(15,23,42,0.82),rgba(2,6,23,0.98))] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.42)] [backface-visibility:hidden]">
                <div className="pointer-events-none absolute inset-4 rounded-[22px] border border-white/10" />
                <div className="pointer-events-none absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black tracking-[0.22em] text-amber-100/70">{card.palace.name}</p>
                      <p className="mt-1 text-xs font-bold text-cyan-100/70">{subjectName || '你的紫微命盤'}</p>
                    </div>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-200/35 bg-amber-200/10 font-serif text-xl font-black text-amber-100">{card.palace.symbol}</span>
                  </div>

                  <div className="my-auto text-center">
                    <div className="relative mx-auto grid h-36 w-36 place-items-center rounded-full border border-cyan-200/20 bg-cyan-300/[0.06] shadow-[0_0_42px_rgba(34,211,238,0.14)]">
                      <div className="absolute inset-5 rounded-full border border-amber-200/25" />
                      <div className="absolute inset-9 rounded-full border border-white/10" />
                      <span className="font-serif text-4xl font-black text-amber-100">{card.heroStars[0]?.name?.slice(0, 1) ?? '命'}</span>
                    </div>
                    <h3 className="mt-6 break-words font-serif text-3xl font-black leading-tight text-amber-50">{card.title}</h3>
                    <p className="mt-3 text-base font-black leading-7 text-cyan-50">{card.subtitle}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      {[archetypeLabel, ...elementLabels].slice(0, 4).map((item) => (
                        <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/70">{item}</span>
                      ))}
                    </div>
                    <p className="text-center text-[11px] font-bold leading-5 text-amber-100/70">點一下，翻出你的命宮塔羅牌</p>
                  </div>
                </div>
              </div>

              {/* 背面：命宮塔羅牌 */}
              <div
                className="absolute inset-0 overflow-hidden rounded-[28px] border border-amber-200/45 bg-[radial-gradient(circle_at_50%_12%,rgba(251,191,36,0.18),transparent_30%),linear-gradient(160deg,rgba(15,23,42,0.92),rgba(2,6,23,0.99))] p-4 shadow-[0_26px_70px_rgba(0,0,0,0.5)] [backface-visibility:hidden]"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black tracking-[0.22em] text-amber-100/80">命宮塔羅 · {card.palace.name}</p>
                    <span className="rounded-full border border-amber-200/30 bg-amber-300/10 px-2 py-0.5 text-[9px] font-black text-amber-100">78 張現成牌庫</span>
                  </div>
                  <div className="mt-3 flex-1 overflow-hidden rounded-2xl border border-white/12 bg-black/30">
                    <img
                      src={destinyTarot.card.imageUrl}
                      alt={`命宮塔羅 ${destinyTarot.cardNameZh}`}
                      loading="lazy"
                      className="mx-auto h-full w-full object-contain object-center"
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <h3 className="break-words font-serif text-2xl font-black leading-tight text-amber-50">{destinyTarot.cardNameZh}</h3>
                    <p className="mt-0.5 text-[11px] font-bold text-cyan-100/75">{destinyTarot.card.nameEn}</p>
                  </div>
                  <p className="mt-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-semibold leading-5 text-[color:var(--text-sub)]">{destinyTarot.reason}</p>
                  <p className="mt-2 text-center text-[11px] font-bold leading-5 text-cyan-100/70">再次點擊，回到神秘命宮卡正面</p>
                </div>
              </div>
            </div>
          </div>
        </button>

        <div className="space-y-4">
          <article className="hidden rounded-[24px] border border-cyan-300/18 bg-cyan-950/18 p-4 sm:p-5" aria-hidden="true">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">看圖說義</p>
            <p className="mt-3 text-sm font-bold leading-7 text-[color:var(--text-main)]">{card.customerCopy.direction}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] font-black text-white/45">主角</p>
                <p className="mt-1 text-sm font-black text-amber-50">{card.heroStars.map((star) => star.name).join(' × ') || '主星待確認'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] font-black text-white/45">支援符號</p>
                <p className="mt-1 text-sm font-black text-cyan-50">{card.supportingSymbols.slice(0, 4).join('、') || '回看命盤依據'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] font-black text-white/45">視覺氣質</p>
                <p className="mt-1 text-sm font-black text-emerald-50">{card.visualTheme.keywords.slice(0, 3).join('、')}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] font-black tracking-[0.18em] text-emerald-100/70">核心力量</p>
                <p className="mt-1 text-sm font-bold leading-6 text-[color:var(--text-main)]">{card.customerCopy.power}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] font-black tracking-[0.18em] text-rose-100/70">目前課題</p>
                <p className="mt-1 text-sm font-bold leading-6 text-[color:var(--text-main)]">{card.customerCopy.challenge}</p>
              </div>
              <div className="rounded-2xl border border-amber-200/20 bg-amber-300/10 p-3">
                <p className="text-[10px] font-black tracking-[0.18em] text-amber-100/75">立即行動</p>
                <p className="mt-1 text-sm font-black leading-6 text-amber-50">{card.customerCopy.action}</p>
              </div>
            </div>
          </article>

          <details className="rounded-[24px] border border-white/10 bg-black/18 p-4">
            <summary className="cursor-pointer text-sm font-black text-cyan-100">查看命盤依據</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-semibold leading-6 text-[color:var(--text-main)]">主宮位：{card.evidence.palace}</p>
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-semibold leading-6 text-[color:var(--text-main)]">星曜：{card.evidence.stars.join('、') || '無星曜資料'}</p>
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-semibold leading-6 text-[color:var(--text-main)]">四化：{card.evidence.transformations.join('、') || '無四化'}</p>
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-semibold leading-6 text-[color:var(--text-main)]">三方四正：{card.evidence.threeHarmony.slice(0, 4).join('；')}</p>
            </div>
          </details>

          {teacherSynthesis && (
            <button
              type="button"
              onClick={() => setTeacherOpen((value) => !value)}
              aria-expanded={teacherOpen}
              className="flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-purple-200/25 bg-purple-300/10 px-4 py-3 text-left transition hover:border-purple-200/45 hover:bg-purple-300/15"
            >
              <span className="text-sm font-black text-purple-100">老師怎麼看？</span>
              <span className="text-xs font-bold text-purple-200/80">{teacherOpen ? '收起' : '展開第二層解析'}</span>
            </button>
          )}
        </div>
      </div>

      {teacherOpen && teacherSynthesis && analysisId && (
        <ZiweiTeacherSynthesisPanel synthesis={teacherSynthesis} analysisId={analysisId} originKey="MING" />
      )}
    </section>
  );
}
function ZiweiTwelvePalaceCards({
  analysis,
  annual,
  fiveElement,
  analysisId,
  presentation,
}: {
  analysis?: InsightResult['ziweiSanFang'];
  annual?: InsightResult['annualFortune'];
  fiveElement?: InsightResult['fiveElement'];
  meta?: InsightResult['meta'];
  analysisId?: string;
  presentation?: InsightResult['presentation'];
}) {
  const [teacherPalaceKey, setTeacherPalaceKey] = useState<string | null>(null);
  useEffect(() => {
    if (!teacherPalaceKey) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('ziwei-selected-palace-teachers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [teacherPalaceKey]);
  if (!analysis) return null;

  if (analysis.timeConfidence !== 'exact') {
    return (
      <section className="fortune-card p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">ZI WEI TIME CHECK</p>
        <h2 className="mt-3 font-serif text-2xl font-black leading-tight text-amber-100 sm:text-3xl">時辰尚未確認，先不硬排命宮。</h2>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
          紫微斗數的命宮、三方四正與主星位置都依賴出生時辰。資料未確認前，系統只保留趨勢提示，不輸出單一命盤故事，避免誤導客戶。
        </p>
      </section>
    );
  }

  const palaceSource: ZiweiFullPalace[] = analysis.allPalaces?.length ? analysis.allPalaces : analysis.palaces;
  const palaceMap = new Map<string, ZiweiFullPalace>();
  palaceSource.forEach((palace) => palaceMap.set(palace.key, palace));
  const sortedPalaces = ZIWEI_TWELVE_PALACE_ORDER.map((key) => palaceMap.get(key) ?? createZiweiFallbackPalace(key));
  const teacherPalace = teacherPalaceKey ? palaceMap.get(teacherPalaceKey) : null;
  const teacherAnnualPalace = teacherPalaceKey ? annual?.sanFangFourZheng?.find((item) => item.palaceKey === teacherPalaceKey) : undefined;
  const teacherCrossCheck = teacherPalaceKey ? analysis.crossChecks?.find((item) => item.palaceKey === teacherPalaceKey) ?? null : null;
  const teacherSynthesis = teacherPalace
    ? buildZiweiTeacherSynthesis(teacherPalace.key, palaceMap, teacherAnnualPalace, teacherCrossCheck, annual)
    : null;
  const realAnalysisId = presentation?.analysisId ?? analysisId;
  const displayAnalysisId = realAnalysisId ?? 'ZIWEI-CORE';
  const bodyPalace = (analysis as InsightResult['ziweiSanFang'] & { bodyPalace?: ZiweiFullPalace | null }).bodyPalace ?? null;
  const mingPalace = palaceMap.get('MING') ?? sortedPalaces[0];
  const mingStars = mingPalace.majorStars.length ? mingPalace.majorStars : analysis.pattern.stars;
  const primaryStarName = mingStars[0] ?? '紫微';
  const coreTitle = presentation?.memberSummary?.title ?? analysis.pattern.name;
  const coreReason = presentation?.memberSummary?.coreReason ?? analysis.pattern.description;
  const coreAction = presentation?.memberSummary?.immediateAction ?? annual?.recommendations?.[0] ?? fiveElement?.decision?.changeTarget ?? '先選一件最重要的事，今天完成第一步。';

  const formatStars = (stars: string[], fallback = '未見星曜') => stars.length ? stars.join('、') : fallback;
  const formatBrightness = (brightness?: string) => {
    const labels: Record<string, string> = {
      廟: '廟', 旺: '旺', 得: '得地', 利: '利益', 平: '平和', 不: '不得地', 陷: '落陷',
      得地: '得地', 利益: '利益', 平和: '平和', 不得地: '不得地', 落陷: '落陷',
    };
    return brightness ? (labels[brightness] ?? brightness) : '';
  };
  const formatMajorStars = (palace: ZiweiFullPalace, fallback = '無主星') => {
    if (!palace.majorStars.length) return fallback;
    const brightnessByStar = new Map((palace.majorStarDetails ?? []).map((star) => [star.name, formatBrightness(star.brightness)]));
    return palace.majorStars.map((star) => {
      const brightness = brightnessByStar.get(star);
      return brightness ? `${star}（${brightness}）` : star;
    }).join('、');
  };
  const allMajorStars = [...new Set(sortedPalaces.flatMap((palace) => palace.majorStars))];
  const allMinorStars = [...new Set(sortedPalaces.flatMap((palace) => palace.minorStars))];
  const allAuspiciousStars = [...new Set(sortedPalaces.flatMap((palace) => palace.auspiciousStars ?? []))];
  const allMaleficStars = [...new Set(sortedPalaces.flatMap((palace) => palace.maleficStars ?? []))];
  const allNeutralStars = [...new Set(sortedPalaces.flatMap((palace) => palace.neutralStars ?? []))];
  const allTransformations = sortedPalaces.flatMap((palace) => palace.transformations.map((item) => `${normalizeZiweiPalaceName(palace.name)} ${item}`));
  const completedPalaceCount = sortedPalaces.filter((palace) => palace.majorStars.length || palace.minorStars.length || palace.transformations.length).length;
  const dataStatus = bodyPalace ? '命宮、身宮、十二宮已接上' : '命宮、十二宮已接上；身宮欄位待後端核心提供';

  const starStories = [
    { name: '紫微', image: '帝星坐中宮，像一座主控台。', word: '紫為尊、微為精，重點是統整全局。', intent: '學會承擔，但不要把所有責任都扛在自己身上。' },
    { name: '天機', image: '像轉動的羅盤，先看變化再出手。', word: '機是關鍵與轉折，代表策略、思考、調整。', intent: '把複雜問題拆小，用順序取代焦慮。' },
    { name: '太陽', image: '像光照到人群，越分享越有力量。', word: '陽是外放與照明，代表號召、熱度、公開。', intent: '把想法說清楚，讓別人知道你在推動什麼。' },
    { name: '武曲', image: '像金屬與帳本，重視成果、資源與效率。', word: '武是執行，曲是精準，代表財務與落地能力。', intent: '用數字管理行動，不只靠感覺前進。' },
    { name: '天同', image: '像一盞暖燈，讓人願意靠近與休息。', word: '同是和合，代表親和、享受、緩衝。', intent: '保留溫度，但不要讓舒適拖慢決定。' },
    { name: '廉貞', image: '像一條界線，清楚說明什麼可以、什麼不行。', word: '廉是原則，貞是守正，代表規範與界線。', intent: '先定規則，再談感情與合作。' },
    { name: '天府', image: '像倉庫與城池，懂得收藏、分配與守成。', word: '府是資源之府，代表穩定、管理、承載。', intent: '把資源放到對的位置，安全感才會長出來。' },
    { name: '太陰', image: '像月光照水，感受細膩、觀察深層。', word: '陰是內在與滋養，代表感受、財庫、照顧。', intent: '先安定內在，再做外在判斷。' },
    { name: '貪狼', image: '像舞台與慾望之火，想探索、想突破、想被看見。', word: '貪是渴望，狼是野性，代表魅力與開創。', intent: '把慾望導向作品，不要只停在衝動。' },
    { name: '巨門', image: '像一扇大門，也像一張會質疑的嘴。', word: '巨是大，門是出口，代表口才、辯證、疑問。', intent: '把質疑變成提問，把提問變成答案。' },
    { name: '天相', image: '像印章與制度，協調眾人、維持秩序。', word: '相是輔佐與相位，代表合作、平衡、規格。', intent: '用制度保護善意，不用討好維持關係。' },
    { name: '天梁', image: '像屋梁撐住屋頂，承擔保護與修復。', word: '梁是支撐，代表長輩、保護、道義。', intent: '幫人之前先守住自己的力氣。' },
    { name: '七殺', image: '像刀鋒出鞘，快、準、狠，適合破局。', word: '殺不是傷害，而是斷開舊局的決斷力。', intent: '先定目標，再用勇氣清掉阻礙。' },
    { name: '破軍', image: '像浪打碎舊船，重建新的航線。', word: '破是打破，軍是行動，代表改革與重組。', intent: '允許自己換方法，但不要把全部歸零。' },
  ];
  const primaryStory = starStories.find((star) => primaryStarName.includes(star.name) || star.name.includes(primaryStarName)) ?? starStories[0];

  const trustCards = [
    { label: '命宮', value: `${normalizeZiweiPalaceName(mingPalace.name)} · ${formatMajorStars(mingPalace, '主星待確認')}`, detail: `宮干 ${mingPalace.palaceStem}／地支 ${mingPalace.branch}` },
    { label: '身宮', value: bodyPalace ? `${normalizeZiweiPalaceName(bodyPalace.name)} · ${formatMajorStars(bodyPalace)}` : '後端尚未提供', detail: bodyPalace ? `宮干 ${bodyPalace.palaceStem}／地支 ${bodyPalace.branch}` : '已預留欄位，前端不自行推測。' },
    { label: '十二宮', value: `${sortedPalaces.length} 宮完整回傳`, detail: `${completedPalaceCount} 宮已有星曜或四化訊號。` },
    { label: '星曜', value: `${allMajorStars.length} 種主星／${allMinorStars.length} 種輔星小星`, detail: '主星、輔星、小星保留在完整命盤資料，不只顯示單一主星。' },
    { label: '吉星', value: allAuspiciousStars.length ? formatStars(allAuspiciousStars) : '本次未見吉星', detail: '依後端固定星曜字典分類，前端只讀結果。' },
    { label: '煞星', value: allMaleficStars.length ? formatStars(allMaleficStars) : '本次未見煞星', detail: allNeutralStars.length ? `未分類星曜：${formatStars(allNeutralStars)}` : '核心排盤未提供煞星時，不由 AI 補星。' },
    { label: '四化', value: allTransformations.length ? `${allTransformations.length} 筆四化訊號` : '目前未見四化訊號', detail: allTransformations.slice(0, 3).join('、') || '依後端排盤結果如實顯示。' },
    { label: '三方四正', value: '命、遷、財、官', detail: '用 4 張宮位卡呈現，所有訊號回到正式紫微命盤。' },
  ];
  const palaceVisual: Record<string, { glyph: string; tone: string; chip: string; accent: string }> = {
    MING: { glyph: '命', tone: 'border-cyan-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.2),transparent_42%),linear-gradient(145deg,rgba(8,47,73,0.7),rgba(2,6,23,0.95))]', chip: 'border-cyan-200/30 bg-cyan-300/10 text-cyan-50', accent: 'text-cyan-100' },
    XIONG_DI: { glyph: '兄', tone: 'border-indigo-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(129,140,248,0.2),transparent_42%),linear-gradient(145deg,rgba(49,46,129,0.62),rgba(2,6,23,0.95))]', chip: 'border-indigo-200/30 bg-indigo-300/10 text-indigo-50', accent: 'text-indigo-100' },
    FU_QI: { glyph: '夫', tone: 'border-rose-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(251,113,133,0.18),transparent_42%),linear-gradient(145deg,rgba(136,19,55,0.56),rgba(2,6,23,0.95))]', chip: 'border-rose-200/30 bg-rose-300/10 text-rose-50', accent: 'text-rose-100' },
    ZI_NV: { glyph: '子', tone: 'border-orange-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(251,146,60,0.19),transparent_42%),linear-gradient(145deg,rgba(124,45,18,0.58),rgba(2,6,23,0.95))]', chip: 'border-orange-200/30 bg-orange-300/10 text-orange-50', accent: 'text-orange-100' },
    CAI_BO: { glyph: '財', tone: 'border-emerald-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(52,211,153,0.16),transparent_42%),linear-gradient(145deg,rgba(6,78,59,0.64),rgba(2,6,23,0.95))]', chip: 'border-emerald-200/30 bg-emerald-300/10 text-emerald-50', accent: 'text-emerald-100' },
    JI_E: { glyph: '疾', tone: 'border-sky-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.17),transparent_42%),linear-gradient(145deg,rgba(12,74,110,0.6),rgba(2,6,23,0.95))]', chip: 'border-sky-200/30 bg-sky-300/10 text-sky-50', accent: 'text-sky-100' },
    GUAN_LU: { glyph: '官', tone: 'border-amber-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.18),transparent_42%),linear-gradient(145deg,rgba(120,53,15,0.56),rgba(2,6,23,0.95))]', chip: 'border-amber-200/30 bg-amber-300/10 text-amber-50', accent: 'text-amber-100' },
    QIAN_YI: { glyph: '遷', tone: 'border-violet-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(167,139,250,0.18),transparent_42%),linear-gradient(145deg,rgba(76,29,149,0.54),rgba(2,6,23,0.95))]', chip: 'border-violet-200/30 bg-violet-300/10 text-violet-50', accent: 'text-violet-100' },
    JIAO_YOU: { glyph: '交', tone: 'border-blue-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(96,165,250,0.17),transparent_42%),linear-gradient(145deg,rgba(30,58,138,0.58),rgba(2,6,23,0.95))]', chip: 'border-blue-200/30 bg-blue-300/10 text-blue-50', accent: 'text-blue-100' },
    TIAN_ZHAI: { glyph: '田', tone: 'border-teal-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(45,212,191,0.17),transparent_42%),linear-gradient(145deg,rgba(19,78,74,0.6),rgba(2,6,23,0.95))]', chip: 'border-teal-200/30 bg-teal-300/10 text-teal-50', accent: 'text-teal-100' },
    FU_DE: { glyph: '福', tone: 'border-fuchsia-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(232,121,249,0.16),transparent_42%),linear-gradient(145deg,rgba(112,26,117,0.56),rgba(2,6,23,0.95))]', chip: 'border-fuchsia-200/30 bg-fuchsia-300/10 text-fuchsia-50', accent: 'text-fuchsia-100' },
    FU_MU: { glyph: '父', tone: 'border-red-200/35 bg-[radial-gradient(circle_at_0%_0%,rgba(248,113,113,0.16),transparent_42%),linear-gradient(145deg,rgba(127,29,29,0.54),rgba(2,6,23,0.95))]', chip: 'border-red-200/30 bg-red-300/10 text-red-50', accent: 'text-red-100' },
  };

  return (
    <section id="ziwei-twelve-palaces" className="fortune-card scroll-mt-5 p-4 sm:p-6">
      <div className="hidden rounded-[24px] border border-cyan-300/25 bg-[linear-gradient(135deg,rgba(8,47,73,0.64),rgba(15,23,42,0.86)_55%,rgba(2,6,23,0.96))] p-4 shadow-[0_18px_46px_rgba(8,13,30,0.28)] sm:p-6" aria-hidden="true">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">ZIWEI CHART TRUST</p>
            <h2 className="mt-2 break-words font-serif text-2xl font-black leading-tight text-cyan-50 sm:text-4xl">完整命盤先確認</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-cyan-100/82">
              閱讀順序：先看命工卡，再看命宮與完整十二宮，接著看 AI 解讀；視覺只負責說明，不取代命盤。
            </p>
            <p className="mt-2 text-xs font-black tracking-wide text-amber-100/85">主星亮度：廟、旺、得地、利益、平和、不得地、落陷</p>
          </div>
          <span className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black tracking-[0.14em] text-cyan-100">{displayAnalysisId}</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trustCards.map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] font-black tracking-[0.18em] text-white/45">{item.label}</p>
              <p className="mt-1 break-words text-sm font-black leading-6 text-cyan-50">{item.value}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">{item.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-4">
          <article className="hidden rounded-2xl border border-amber-200/18 bg-amber-300/[0.07] p-4" aria-hidden="true">
            <p className="text-[10px] font-black tracking-[0.18em] text-amber-100/70">星曜排列</p>
            <h3 className="mt-1 font-serif text-xl font-black leading-tight text-amber-50">{formatStars(allMajorStars, '主星待確認')}</h3>
            <p className="mt-2 text-xs font-semibold leading-6 text-amber-100/82">{dataStatus}</p>
          </article>
          <article className="rounded-2xl border border-emerald-200/18 bg-emerald-300/[0.06] p-4">
            <p className="text-[10px] font-black tracking-[0.18em] text-emerald-100/75">AI 最終方向</p>
            <h3 className="mt-1 text-sm font-black leading-6 text-emerald-50">{coreAction}</h3>
            <p className="mt-2 text-xs font-semibold leading-6 text-emerald-100/75">{coreTitle}：{coreReason}</p>
          </article>
        </div>
      </div>

      <article className="hidden mt-5 rounded-[24px] border border-cyan-300/20 bg-cyan-950/20 p-4 shadow-[0_0_30px_rgba(34,211,238,0.08)] sm:p-5" aria-hidden="true">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">看字說意境</p>
        <h3 className="mt-3 font-serif text-2xl font-black text-cyan-50">{primaryStory.name} 的字義核心</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold leading-7 text-[color:var(--text-main)]">{primaryStory.word}</p>
          <p className="rounded-2xl border border-emerald-200/18 bg-emerald-300/[0.07] px-4 py-3 text-sm font-black leading-7 text-emerald-50">{primaryStory.intent}</p>
          <p className="rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">小星、煞星、吉星與四化是證據層，完整資料放在老師模式展開；第一屏由命工卡負責建立信任。</p>
        </div>
      </article>

      <details open className="relative isolate mt-5 overflow-hidden rounded-[28px] border border-amber-200/20 bg-[linear-gradient(145deg,rgba(15,23,42,0.72),rgba(2,6,23,0.92))] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.34)] sm:p-5">
        <span className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] [background-size:26px_26px]" />
        <span className="pointer-events-none absolute -right-10 -top-10 -z-10 h-44 w-44 rounded-full border border-amber-200/20 bg-amber-300/[0.04] shadow-[0_0_80px_rgba(251,191,36,0.12)]" />
        <summary className="relative flex cursor-pointer touch-manipulation select-none items-center justify-between gap-3">
          <span>
            <span className="block text-[11px] font-black tracking-[0.22em] text-amber-200">紫微命盤</span>
            <span className="mt-1 block font-serif text-4xl font-black tracking-[0.08em] text-amber-50 sm:text-5xl">十二宮</span>
          </span>
          <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100">共十二宮</span>
        </summary>
        <div className="mt-4 rounded-2xl border border-cyan-200/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(15,23,42,0.2))] px-4 py-3">
          <p className="text-sm font-black text-cyan-50">請點選任一宮位，查看本宮完整星曜資料</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-cyan-100/70">想調整出生資料，請使用報告下方的「重新分析」。</p>
        </div>
        <div className="hidden mt-4 flex flex-wrap gap-2" aria-hidden="true">
          {[
            ['入廟', 'border-amber-200/35 bg-amber-300/15 text-amber-100'],
            ['旺', 'border-emerald-200/35 bg-emerald-300/15 text-emerald-100'],
            ['得地', 'border-cyan-200/35 bg-cyan-300/15 text-cyan-100'],
            ['利益', 'border-violet-200/35 bg-violet-300/15 text-violet-100'],
            ['平和', 'border-slate-200/30 bg-slate-300/10 text-slate-100'],
            ['不得地', 'border-orange-200/35 bg-orange-300/10 text-orange-100'],
            ['弱陷', 'border-rose-200/35 bg-rose-300/10 text-rose-100'],
          ].map(([label, tone]) => <span key={label} className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${tone}`}>{label}</span>)}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedPalaces.map((palace) => {
            const visual = palaceVisual[palace.key] ?? { glyph: normalizeZiweiPalaceName(palace.name).slice(0, 1), tone: 'border-white/12 bg-[linear-gradient(145deg,rgba(30,41,59,0.7),rgba(2,6,23,0.95))]', chip: 'border-white/15 bg-white/[0.06] text-white/85', accent: 'text-amber-50' };
            const palaceName = normalizeZiweiPalaceName(palace.name);
            const brightnessByStar = new Map((palace.majorStarDetails ?? []).map((item) => [item.name, item.brightness]));
            const normalizeBrightness = (value?: string) => {
              if (value === '廟') return '入廟';
              if (value === '平') return '平和';
              if (value === '陷' || value === '落陷') return '弱陷';
              return value || '未提供';
            };
            const brightnessTone = (value?: string) => {
              const label = normalizeBrightness(value);
              if (label === '入廟') return 'border-amber-200/35 bg-amber-300/15 text-amber-100';
              if (label === '旺') return 'border-emerald-200/35 bg-emerald-300/15 text-emerald-100';
              if (label === '得地') return 'border-cyan-200/35 bg-cyan-300/15 text-cyan-100';
              if (label === '利益') return 'border-violet-200/35 bg-violet-300/15 text-violet-100';
              if (label === '不得地') return 'border-orange-200/35 bg-orange-300/10 text-orange-100';
              if (label === '弱陷') return 'border-rose-200/35 bg-rose-300/10 text-rose-100';
              return 'border-slate-200/25 bg-slate-300/10 text-slate-100';
            };
            return (
              <details key={palace.key} className={`group relative overflow-hidden rounded-[24px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_16px_34px_rgba(2,6,23,0.22)] transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_22px_42px_rgba(2,6,23,0.4)] ${visual.tone}`}>
                <span className={`pointer-events-none absolute -right-2 -top-8 font-serif text-[118px] font-black leading-none opacity-[0.08] ${visual.accent}`}>{visual.glyph}</span>
                <span className="pointer-events-none absolute bottom-5 right-5 h-2 w-2 rounded-full bg-white/60 shadow-[0_0_18px_rgba(255,255,255,0.95)]" />
                <summary className="relative flex min-h-[132px] cursor-pointer touch-manipulation select-none list-none items-center justify-between gap-4 rounded-2xl px-3 py-4 [-webkit-tap-highlight-color:transparent] [&::-webkit-details-marker]:hidden">
                  <div>
                    <h4 className="font-serif text-[2.6rem] font-black leading-none tracking-[0.08em] text-white drop-shadow-[0_4px_18px_rgba(255,255,255,0.16)] sm:text-5xl">{palaceName}</h4>
                    <p className={`mt-3 text-xs font-black tracking-[0.12em] ${visual.accent}`}>點選查看本宮資料</p>
                  </div>
                  <span className={`rounded-full border px-4 py-2 text-sm font-black shadow-[0_8px_20px_rgba(2,6,23,0.2)] ${visual.chip}`}><span className="group-open:hidden">點選查看</span><span className="hidden group-open:inline">收起資料</span></span>
                </summary>
                <div className="relative border-t border-white/10 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold leading-5 text-white/65">{palace.focus}</p>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${visual.chip}`}>{palace.palaceStem}{palace.branch}</span>
                </div>
                <div className="relative mt-4">
                  <p className="text-[10px] font-black tracking-[0.16em] text-white/50">主星核心</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(palace.majorStars.length ? palace.majorStars : ['無十四主星']).map((star) => {
                      const brightness = brightnessByStar.get(star);
                      return <span key={star} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-black ${visual.chip}`}>{star}{brightness && <em className={`rounded-full border px-1.5 py-0.5 text-[10px] not-italic ${brightnessTone(brightness)}`}>{normalizeBrightness(brightness)}</em>}</span>;
                    })}
                  </div>
                </div>
                <div className="relative mt-4 flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-2 py-1 text-emerald-100">吉 {formatStars(palace.auspiciousStars ?? [], '—')}</span>
                  <span className="rounded-full border border-rose-200/20 bg-rose-300/10 px-2 py-1 text-rose-100">煞 {formatStars(palace.maleficStars ?? [], '—')}</span>
                  <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">四化 {formatStars(palace.transformations, '—')}</span>
                </div>
                <div className="relative mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-black tracking-[0.15em] text-white/55">完整星曜明細</p>
                  <p className="mt-2 text-xs font-semibold leading-6 text-white/70">輔星小星：{formatStars(palace.minorStars, '未集中顯示')}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-white/45">宮干 {palace.palaceStem || '—'} · 地支 {palace.branch || '—'} · {palace.focus}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTeacherPalaceKey((current) => current === palace.key ? null : palace.key)}
                  aria-expanded={teacherPalaceKey === palace.key}
                  aria-label={`${teacherPalaceKey === palace.key ? '收起' : '開啟'}${palaceName}三位老師解盤`}
                  className="relative mt-4 flex min-h-[64px] w-full items-center justify-between gap-3 rounded-xl border border-purple-200/45 bg-[linear-gradient(135deg,rgba(168,85,247,0.22),rgba(30,41,59,0.68))] px-4 text-left text-purple-50 shadow-[0_10px_24px_rgba(88,28,135,0.22)] transition hover:border-amber-200/55 hover:bg-purple-300/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                >
                  <span>
                    <span className="block text-sm font-black">{teacherPalaceKey === palace.key ? '收起這一宮的老師解盤' : '開啟三位老師解盤'}</span>
                    <span className="mt-1 block text-[11px] font-bold leading-4 text-purple-100/75">老師解命盤 · 恐怖解命盤 · 鬼魅解命盤</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-amber-200/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-100">本宮＋三方四正</span>
                </button>
                </div>
              </details>
            );
          })}
        </div>
      </details>

      {teacherSynthesis && (
        <div id="ziwei-selected-palace-teachers" className="mt-4 scroll-mt-5">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-sm font-black text-purple-100">正在深讀：{teacherSynthesis.originName}</p>
            <button type="button" onClick={() => setTeacherPalaceKey(null)} className="text-xs font-bold text-purple-200/75 hover:text-purple-100">關閉</button>
          </div>
          {realAnalysisId ? (
            <ZiweiTeacherSynthesisPanel synthesis={teacherSynthesis} showTarotBridge={false} analysisId={realAnalysisId} originKey={teacherPalaceKey as string} />
          ) : (
            <p className="mt-3 text-xs font-semibold leading-6 text-amber-200/80">找不到分析編號，暫時無法呼叫老師 AI，僅顯示命盤證據。</p>
          )}
        </div>
      )}

      <details className="hidden mt-4 rounded-2xl border border-white/10 bg-black/18 p-4" aria-hidden="true">
        <summary className="cursor-pointer text-sm font-black text-cyan-100">老師模式：十四主星看字說意境</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {starStories.map((star) => (
            <article key={star.name} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <h4 className="font-serif text-lg font-black text-amber-50">{star.name}</h4>
              <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-main)]">{star.word}</p>
              <p className="mt-2 text-xs font-bold leading-6 text-cyan-100/78">{star.intent}</p>
            </article>
          ))}
        </div>
      </details>
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
  fiveElement,
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
  fiveElement?: InsightResult['fiveElement'];
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
  const majorStarMaterials = getZiweiMajorStarMaterials(palace.majorStars);
  const supportStarProfessionalText = getZiweiSupportStarText(palace.minorStars);
  const elementPriorities = getZiweiAiElementPriorities(fiveElement);
  const palaceBlueprint = getZiweiPalaceBlueprint(palace.key, palaceName);

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

      <div className="mt-5 rounded-2xl border border-amber-200/25 bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.68),rgba(2,6,23,0.84))] p-4 shadow-[0_0_28px_rgba(251,191,36,0.10)] sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">PALACE THREE LAYER MATERIAL</p>
            <h4 className="mt-1 font-serif text-2xl font-black text-amber-50">{palaceName}三層專業素材</h4>
          </div>
          <p className="max-w-2xl text-xs font-bold leading-6 text-amber-50/70">{palaceBlueprint.axis}</p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <article className="rounded-2xl border border-cyan-200/18 bg-cyan-950/18 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Layer 1</p>
            <h5 className="mt-2 text-base font-black text-cyan-50">專業命盤底盤</h5>
            <p className="mt-2 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{palaceBlueprint.layerOne}</p>
            <div className="mt-3 grid gap-2">
              {majorStarMaterials.map((star) => (
                <div key={star.name} className="rounded-xl border border-white/10 bg-black/18 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-cyan-50">{star.name}</p>
                    <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-black text-amber-100">{star.element}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">{star.role}</p>
                  <p className="mt-1 text-[10px] font-bold text-cyan-100/72">{star.keywords.join(' / ')}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold leading-6 text-cyan-50/82">{supportStarProfessionalText}</p>
          </article>

          <article className="rounded-2xl border border-violet-200/18 bg-violet-950/18 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">Layer 2</p>
            <h5 className="mt-2 text-base font-black text-violet-50">AI 白話故事解讀</h5>
            <p className="mt-2 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{palaceBlueprint.layerTwo}</p>
            <p className="mt-3 rounded-xl border border-white/10 bg-black/18 px-3 py-2 text-xs font-bold leading-6 text-violet-50/84">
              第二層只讀第一層：{palaceName}主星「{mainStars}」、輔佐星「{supportStars || '未集中顯示'}」、三方四正與年度訊號，轉成使用者看得懂的故事，不重新排盤。
            </p>
          </article>

          <article className="rounded-2xl border border-amber-200/20 bg-amber-950/18 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Layer 3</p>
            <h5 className="mt-2 text-base font-black text-amber-50">AI 五元素補強排序</h5>
            <p className="mt-2 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{palaceBlueprint.layerThree}</p>
            <div className="mt-3 grid gap-2">
              {elementPriorities.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-black/18 px-3 py-2">
                  <p className="text-[10px] font-black tracking-[0.16em] text-amber-100/72">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-amber-50">{item.element}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-[color:var(--text-sub)]">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
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
    `【資料確認】正在整理本次輸入資料：${name || '未填寫姓名'}`,
    `【紫微排盤】正在建立命盤、三方四正與年度資料…`,
    `【規則運算】依出生日期與時辰執行排盤與交叉整理…`,
    `【白話整理】正在把命盤資訊轉成可閱讀的重點說明…`,
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
            <span>☯ 紫微命盤資料整理中</span>
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

const ZIWEI_RITUAL_MARK: Record<InsightRitualStep['status'], string> = {
  LOCKED: '',
  WAITING: '',
  PROCESSING: '',
  PASSED: 'PASS',
  FAILED: '!',
};

const ZIWEI_RITUAL_COPY: Record<InsightRitualStep['id'], { label: string; ritualText: string; passedText: string }> = {
  TIME_RESOLVED: {
    label: '出生時間定位',
    ritualText: '正在校準出生時辰與八字四柱...',
    passedText: '出生時辰與八字四柱定位完成',
  },
  CHART_BUILT: {
    label: '十二宮排盤',
    ritualText: '正在建立紫微十二宮與主星結構...',
    passedText: '紫微命盤十二宮與主星排定完成',
  },
  TRANSFORMATION_MAPPED: {
    label: '四化飛星',
    ritualText: '正在判讀四化飛星訊號...',
    passedText: '四化飛星判定完成',
  },
  PATTERN_IDENTIFIED: {
    label: '格局辨識',
    ritualText: '正在辨識命盤核心格局...',
    passedText: '命盤核心格局辨識完成',
  },
  CROSS_CHECKED: {
    label: '三方四正',
    ritualText: '正在進行命財官遷交叉驗證...',
    passedText: '命財官遷三方四正交叉驗證通過',
  },
  TWELVE_PALACE_ANALYZED: {
    label: '十二宮解析',
    ritualText: '正在整理十二宮位精密解析...',
    passedText: '十二宮位精密解析完成',
  },
  STATISTICAL_MATCHED: {
    label: '統計訊號',
    ritualText: '正在比對規則模型與統計訊號...',
    passedText: '規則模型統計訊號比對完成',
  },
  ACCURACY_SCORED: {
    label: '準確度評估',
    ritualText: '正在計算本次判定準確度...',
    passedText: '本次判定準確度評估完成',
  },
  ANNUAL_FORTUNE_CALCULATED: {
    label: '流年運勢',
    ritualText: '正在整合今年流年運勢...',
    passedText: '今年流年運勢運算完成',
  },
  FIVE_ELEMENT_INTEGRATED: {
    label: '五元素整合',
    ritualText: '正在將紫微、八字與五元素整合...',
    passedText: '五元素整合判定完成',
  },
  AI_INSIGHT_GENERATED: {
    label: 'AI 深度洞察',
    ritualText: '正在產生 AI 深度洞察...',
    passedText: 'AI 深度洞察生成完成',
  },
  FINAL_RESULT_VERIFIED: {
    label: '最終結果',
    ritualText: '正在完成最終結果驗證...',
    passedText: '紫微斗數分析正式完成',
  },
};

function getZiweiRitualCopy(step: InsightRitualStep) {
  return ZIWEI_RITUAL_COPY[step.id] ?? {
    label: step.label,
    ritualText: step.ritualText,
    passedText: step.passedText,
  };
}

function ZiweiRitualStepsPanel({
  steps,
  revealCount,
  collapsing,
}: {
  steps: InsightRitualStep[];
  revealCount: number;
  collapsing: boolean;
}) {
  const total = steps.length;
  const activeIndex = Math.min(revealCount - 1, total - 1);

  return (
    <section
      role="status"
      aria-live="polite"
      className={`fortune-card relative overflow-hidden border-cyan-300/25 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),rgba(15,23,42,0.92)_60%,rgba(2,6,23,0.98)_100%)] p-5 sm:p-7 transition-all duration-500 ease-out ${collapsing ? 'pointer-events-none -translate-y-3 opacity-0' : 'translate-y-0 opacity-100'}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.06) 50%, transparent 100%)' }} />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">ZIWEI RITUAL · 命盤逐宮驗證</p>
        <p className="text-[11px] font-bold text-cyan-100/70">{Math.min(revealCount, total)}/{total}</p>
      </div>
      <div className="relative mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-cyan-200 to-amber-200 shadow-[0_0_12px_rgba(34,211,238,0.55)] transition-all duration-500 ease-out"
          style={{ width: `${(Math.min(revealCount, total) / total) * 100}%` }}
        />
      </div>

      <div className="relative mt-5 space-y-1.5">
        {steps.map((step, index) => {
          const revealed = index < revealCount;
          const isActive = revealed && index === activeIndex && step.status === 'PASSED' && revealCount < total;
          const display: InsightRitualStep['status'] = !revealed ? 'LOCKED' : isActive ? 'PROCESSING' : step.status;
          const toneClass =
            display === 'PASSED'
              ? 'border-cyan-300/35 bg-cyan-300/[0.06] text-cyan-50'
              : display === 'FAILED'
                ? 'border-rose-300/50 bg-rose-500/10 text-rose-100'
                : display === 'PROCESSING'
                  ? 'border-amber-300/40 bg-amber-300/[0.08] text-amber-50'
                  : 'border-white/5 bg-white/[0.015] text-white/30';
          const ritualCopy = getZiweiRitualCopy(step);
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-2 transition-all duration-500 ease-out ${toneClass}`}
              style={{
                transitionProperty: 'opacity, transform, background-color, border-color',
                opacity: revealed ? 1 : 0.45,
                transform: revealed ? 'translateX(0)' : 'translateX(-6px)',
              }}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-black ${
                  display === 'PASSED'
                    ? 'border-cyan-300/60 bg-cyan-300/20 text-cyan-100'
                    : display === 'FAILED'
                      ? 'border-rose-300/60 bg-rose-500/20 text-rose-100'
                      : display === 'PROCESSING'
                        ? 'border-amber-300/60 bg-amber-300/20 text-amber-100'
                        : 'border-white/10 bg-white/[0.03] text-white/20'
                }`}
              >
                {display === 'PROCESSING' ? <span className="block h-1.5 w-1.5 animate-ping rounded-full bg-amber-300" /> : ZIWEI_RITUAL_MARK[display] || '○'}
              </span>
              <p className="min-w-0 flex-1 truncate text-xs font-bold leading-5">
                {revealed ? (display === 'PASSED' ? ritualCopy.passedText : display === 'FAILED' ? `${ritualCopy.label}驗證失敗` : ritualCopy.ritualText) : ritualCopy.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function InsightPage() {
  const mainRef = useRef<HTMLElement>(null);

  function jumpToTodayResult() {
    const existing = readDailyAnalysis<InsightResult>('ziwei');
    if (existing) {
      setDailyRecord(existing);
      setResult(existing.result);
      showRitualCompleteImmediately(existing.result.ritualSteps);
    }
    window.setTimeout(() => mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

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
    gender: 'female',
    shichen: null,
    birthCityId: null,
  });
  const [citySearch, setCitySearch] = useState('');
  const cityResults = useMemo(() => searchCities(citySearch), [citySearch]);
  const selectedCity: CityEntry | null = input.birthCityId ? findCityById(input.birthCityId) : null;
  const [selectionConfirm, setSelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<InsightResult | null>(null);
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<InsightResult> | null>(null);
  const [ritualRevealCount, setRitualRevealCount] = useState(0);
  const [ritualCollapsed, setRitualCollapsed] = useState(false);
  const ritualTimerRef = useRef<number | null>(null);
  const submitLockRef = useRef(false);

  const isCurrentInputResult = (record: DailyAnalysisRecord<InsightResult> | null) => {
    const saved = record?.result.meta;
    const requestedShichen = typeof input.shichen === 'number' ? input.shichen : 'unknown';
    return Boolean(
      saved
      && saved.subjectName === input.name.trim()
      && saved.birthDate === input.birthDate.trim()
      && saved.gender === input.gender
      && saved.shichen === requestedShichen,
    );
  };

  function clearRitualTimer() {
    if (ritualTimerRef.current) {
      window.clearTimeout(ritualTimerRef.current);
      ritualTimerRef.current = null;
    }
  }

  function showRitualCompleteImmediately(steps?: InsightRitualStep[]) {
    clearRitualTimer();
    setRitualRevealCount(steps?.length ?? 0);
    setRitualCollapsed(true);
  }

  function playRitualReveal(steps: InsightRitualStep[]) {
    clearRitualTimer();
    setRitualCollapsed(false);
    setRitualRevealCount(0);
    const revealOne = (index: number) => {
      setRitualRevealCount(index + 1);
      const current = steps[index];
      const isLast = index >= steps.length - 1;
      if (current.status !== 'PASSED') return;
      if (isLast) {
        ritualTimerRef.current = window.setTimeout(() => {
          setRitualCollapsed(true);
          window.setTimeout(() => mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 520);
        }, 900);
        return;
      }
      ritualTimerRef.current = window.setTimeout(() => revealOne(index + 1), 340);
    };
    ritualTimerRef.current = window.setTimeout(() => revealOne(0), 220);
  }

  useEffect(() => () => clearRitualTimer(), []);

  useEffect(() => {
    const record = readDailyAnalysis<InsightResult>('ziwei');
    if (!record) return;
    setDailyRecord(record);
    setResult(record.result);
    showRitualCompleteImmediately(record.result.ritualSteps);
  }, []);

  // 載入 localStorage 預填
  useEffect(() => {
    const saved = loadUserData();
    let genderConfirmed = false;
    if (saved) {
      setInput((prev) => ({
        ...prev,
        name: saved.name || prev.name,
        birthDate: saved.birthday || prev.birthDate,
        gender: saved.gender || prev.gender,
      }));
      genderConfirmed = !!saved.gender;
    }
    // 舊的本地資料（fortune_telling_user_data_v2）沒有時辰欄位；
    // 唯一出生資料若是別的頁面（例如八字）填過的，順便把時辰也帶進來。
    // 注意：input.gender 的初始值本來就是個非空預設值（'female'），不能用
    // `prev.gender || fromCanonical.gender` 判斷「有沒有填過」——那樣預設值
    // 永遠贏，canonical 的真實性別永遠帶不進來，所以改用 genderConfirmed 顯式追蹤。
    const canonical = readCanonicalBirthProfile();
    if (canonical && canonical.birthDate) {
      const fromCanonical = toInsightData(canonical);
      const canonicalGenderKnown = canonical.gender !== 'UNSPECIFIED';
      setInput((prev) => ({
        ...prev,
        name: prev.name || fromCanonical.name,
        birthDate: prev.birthDate || fromCanonical.birthDate,
        gender: genderConfirmed || !canonicalGenderKnown ? prev.gender : fromCanonical.gender,
        shichen: prev.shichen ?? fromCanonical.shichen,
      }));
      if (!genderConfirmed && canonicalGenderKnown) genderConfirmed = true;
    }
    setSelectionConfirm((prev) => ({ gender: prev.gender || genderConfirmed }));
  }, []);

  // 同步 input 的變更到 localStorage
  useEffect(() => {
    if (getAnalysisIdentityTarget() !== 'self') return;
    if (input.name || input.birthDate) {
      saveUserData({
        name: input.name,
        birthday: input.birthDate,
        gender: input.gender,
      });
      // 唯一出生資料：讓八字那頁也能帶出來。只在使用者「真的確認過性別」
      // （selectionConfirm.gender）才寫入——input.gender 本身有預設值，
      // 不能當作「已確認」的依據，否則會把預設值誤當成真實資料寫進共用檔案。
      if (input.birthDate && selectionConfirm.gender) {
        saveCanonicalBirthProfile(fromInsightData(input));
      }
    }
  }, [input.name, input.birthDate, input.gender, input.shichen, selectionConfirm.gender]);

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


    if (!input.gender || !['male', 'female'].includes(input.gender)) {
      return '請選擇性別。';
    }

    if (!selectionConfirm.gender) {
      return '請點選性別。';
    }

    return null;
  };

  const showMissingFields = Boolean(error) && !result;
  const showMissingName = showMissingFields && input.name.trim().length < 2;
  const showMissingBirthDate = showMissingFields && !input.birthDate;
  const showMissingGender = showMissingFields && !selectionConfirm.gender;

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
      await handleSubmitInner();
    } finally {
      submitLockRef.current = false;
    }
  };

  const handleSubmitInner = async () => {
    const existing = readDailyAnalysis<InsightResult>('ziwei');
    if (existing && isCurrentInputResult(existing)) {
      setDailyRecord(existing);
      setResult(existing.result);
      showRitualCompleteImmediately(existing.result.ritualSteps);
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
    clearRitualTimer();
    setRitualRevealCount(0);
    setRitualCollapsed(false);

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
            // 2026-08-22 修正：先前不論使用者是否選了明確時辰，一律送中午 12:00，
            // 導致「八字四柱」面板的時柱是拿寫死的中午算出來的，不是使用者實際選的時辰。
            // 已知時辰時要送出對應的真實時刻；未知時辰則整欄不送，讓後端自己的
            // 「缺 birthTime 預設 12:00」邏輯處理，不由前端假裝已知。
            birthTime:
              typeof input.shichen === 'number'
                ? `${String(SHICHEN_LIST[input.shichen].startHour).padStart(2, '0')}:00`
                : undefined,
            gender: input.gender,
            shichen: typeof input.shichen === 'number' ? input.shichen : 'unknown',
            longitude: selectedCity?.longitude ?? null,
            timezone: selectedCity?.timezone ?? null,
            timeCorrectionMode: selectedCity ? 'TRUE_SOLAR_TIME' : 'STANDARD_TIME',
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
        if (json.ritualSteps?.length) {
          playRitualReveal(json.ritualSteps);
        } else {
          showRitualCompleteImmediately(json.ritualSteps);
        }
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

            <DailyAnalysisNotice record={dailyRecord} className="mb-5" moduleName="AI 紫微斗數" onViewResult={dailyRecord ? jumpToTodayResult : undefined} />
            <div id="input-form" className="fortune-card p-6 sm:p-8 scroll-mt-20">
              {loading && <InsightAnalyticalConsole name={input.name} />}
              <div className={loading ? 'hidden' : 'space-y-8'}>
                <IdentitySplitSelector />
                <MegaInputGuide
                  title="請填紫微排盤資料"
                  steps={['姓名至少 2 個字', '生日要用萬年曆完成', '性別、時辰依序點選']}
                  example="1979-09-02，寅時，女。"
                  tone="cyan"
                />

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
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">3. 性別</label>
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
                  4. 出生時辰
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

              {/* 出生地卡片：隱藏（2026-08-12 依指示，客戶不需看到）。恢復時把 hidden 移除即可；未選擇時系統以標準時排盤。 */}
              <div className={`hidden ${typeof input.shichen !== 'number' ? 'opacity-50' : ''}`}>
                <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">6. 出生地（選填，可提升真太陽時校正精準度）</label>
                {typeof input.shichen !== 'number' ? (
                  <p className="text-xs font-semibold leading-6 text-[color:var(--text-sub)]">請先選擇真實出生時辰，才能進一步選擇出生地（提升真太陽時校正精準度）。</p>
                ) : selectedCity ? (
                  <div className="flex items-center justify-between rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3">
                    <span className="text-sm font-black text-[color:var(--text-main)]">已選擇：{selectedCity.name}（{selectedCity.country}）</span>
                    <button type="button" onClick={() => setInput({ ...input, birthCityId: null })} disabled={loading} className="text-xs font-black text-cyan-200 underline">重新選擇</button>
                  </div>
                ) : (
                  <>
                    <input
                      value={citySearch}
                      onChange={(event) => setCitySearch(event.target.value)}
                      disabled={loading}
                      placeholder="輸入城市名稱，例如：台北、香港、東京、洛杉磯、倫敦"
                      className="form-input glass-input glass-input-cyan w-full text-base"
                    />
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {cityResults.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => setInput({ ...input, birthCityId: city.id })}
                          disabled={loading}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-cyan-200/35 hover:bg-cyan-300/8 hover:text-[color:var(--text-main)]"
                        >
                          {city.name}<span className="ml-1 text-xs text-[color:var(--text-muted)]">（{city.country}）</span>
                        </button>
                      ))}
                      {cityResults.length === 0 && (
                        <p className="text-xs font-semibold text-[color:var(--text-muted)]">查無符合的城市，可略過此欄位，系統會以標準時排盤（不做真太陽時校正）。</p>
                      )}
                    </div>
                  </>
                )}
                <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">未選擇出生地時，系統以標準時（STANDARD_TIME）排盤，不做真太陽時校正；結果會明確標示採用哪一種校正方式。</p>
              </div>

              {error && (
                <div className="rounded-2xl border-l-4 border-l-rose-400 border border-rose-400/20 bg-rose-950/30 p-4 text-sm text-rose-300 animate-pulse">
                  <p className="font-semibold">⚠ {error}</p>
                </div>
              )}

              {/* 資料進度：移至第六張卡片之後（第七張，2026-08-11 依指示） */}
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
                    input.shichen !== null && input.shichen !== 'known'
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                      : 'bg-white/10 text-[color:var(--text-muted)] border border-white/10'
                  }`}>
                  ✓ 時辰 {typeof input.shichen === 'number' ? SHICHEN_LIST[input.shichen].label : input.shichen === 'known' ? '等待選擇' : '自動良辰'}
                  </div>
                </div>
              </div>

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
                      setInput({ name: '', birthDate: '', gender: 'female', shichen: null, birthCityId: null });
                      setCitySearch('');
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
            {result?.ritualSteps?.length ? (
              <div
                className="grid overflow-hidden transition-[grid-template-rows] duration-500 ease-out"
                style={{ gridTemplateRows: ritualCollapsed ? '0fr' : '1fr' }}
              >
                <div className="min-h-0 pb-5">
                  <ZiweiRitualStepsPanel steps={result.ritualSteps} revealCount={ritualRevealCount} collapsing={ritualCollapsed} />
                </div>
              </div>
            ) : null}
            <div className={`space-y-6 transition-opacity duration-500 ${!result?.ritualSteps?.length || ritualCollapsed ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <DailyAnalysisNotice record={dailyRecord} className="mb-5" moduleName="AI 紫微斗數" onViewResult={jumpToTodayResult} />
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

            <ZiweiDestinyCardView card={result?.destinyCard} subjectName={input.name} analysis={result?.ziweiSanFang} annual={result?.annualFortune} analysisId={result?.presentation?.analysisId ?? result?.analysisId} />

            <SanFangSummaryCard analysis={result?.ziweiSanFang} plainSummary={result?.plainSummary} meta={result?.meta} />

            <ZiweiTwelvePalaceCards
              analysis={result?.ziweiSanFang}
              annual={result?.annualFortune}
              fiveElement={result?.fiveElement}
              meta={result?.meta}
              analysisId={result?.analysisId}
              presentation={result?.presentation}
            />

            <FiveElementPriorityCard result={result?.fiveElement} />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  const existing = readDailyAnalysis<InsightResult>('ziwei');
                  if (existing) {
                    jumpToTodayResult();
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
