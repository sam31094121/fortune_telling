'use client';

import { useState, useEffect, useMemo, useRef, type Ref } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import NextStepGuide from '@/components/NextStepGuide';
import { saveUserData, loadUserData } from '@/lib/storage';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import FeatureVisitorCounter from '@/components/FeatureVisitorCounter';
import { recoverFromChunkError } from '@/lib/chunk-recovery';
import TaijiStandaloneCard from '@/components/TaijiStandaloneCard';
import { FIVE_ELEMENT_DEFINITIONS, type FiveElementIntegrationResult, type FiveElementKey } from '@/lib/five-element-engine';

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


function FiveElementPriorityCard({ result }: { result?: FiveElementIntegrationResult }) {
  if (!result) return null;
  const primary = FIVE_ELEMENT_DEFINITIONS[result.primaryElement];
  const secondary = FIVE_ELEMENT_DEFINITIONS[result.secondaryElement];
  const strong = FIVE_ELEMENT_DEFINITIONS[result.strongElement];
  const avoid = result.avoidElement ? FIVE_ELEMENT_DEFINITIONS[result.avoidElement] : null;
  const primaryNeed = result.elementScores[result.primaryElement]?.need ?? 0;
  const product = result.productRecommendation;
  const quote = result.positiveQuote;
  const scoreEntries = (Object.entries(result.elementScores) as Array<[FiveElementKey, FiveElementIntegrationResult['elementScores'][FiveElementKey]]>)
    .sort(([, a], [, b]) => b.need - a.need);
  const titlePrefix = '\u672c\u6b21\u5224\u5b9a\u4f60\u7f3a\uff1a';
  const elementSuffix = '\u5143\u7d20';
  const urgentLabel = '\u672c\u6b21\u5fc5\u88dc';
  const needLabel = '\u88dc\u5f37\u9700\u6c42';
  const secondLabel = '\u7b2c\u4e8c\u9806\u4f4d\uff0c\u4e0d\u5148\u88dc';
  const strongLabel = '\u76ee\u524d\u8f03\u5f37';
  const avoidLabel = '\u672c\u6b21\u5148\u4e0d\u88dc';
  const actionLabel = '\u8acb\u5148\u505a\u9019\u4e09\u4ef6\u4e8b';
  const evidenceLabel = '\u70ba\u4ec0\u9ebc\u9019\u6a23\u5224\u65b7';
  const signalLabel = '\u4e94\u5143\u7d20\u7f3a\u53e3\u6392\u540d';
  const noAvoidText = '\u6c92\u6709\u904e\u5f37\u5143\u7d20\uff1b\u672c\u6b21\u53ea\u9700\u5c08\u5fc3\u88dc\u7b2c\u4e00\u5143\u7d20';
  const productLabel = '\u4e94\u5143\u7d20\u80fd\u91cf\u624b\u93c8\u88dc\u5f37\u65b9\u6848';
  const quoteLabel = '\u6700\u5f8c\u7684\u6b63\u5411\u63d0\u9192';

  return (
    <section id="five-element-priority" className="fortune-card relative overflow-hidden border-rose-300/35 bg-[linear-gradient(135deg,rgba(127,29,29,0.38),rgba(15,23,42,0.9)_42%,rgba(120,53,15,0.32))] p-5 shadow-[0_0_40px_rgba(251,113,133,0.18)] sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-300" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-200">ELEMENT PRIORITY</p>
          <h2 className="mt-3 break-words font-serif text-4xl font-black leading-tight text-amber-100 sm:text-6xl">
            {titlePrefix}<span className="text-rose-200 drop-shadow-[0_0_18px_rgba(251,113,133,0.55)]">{primary.zh}</span>{elementSuffix}
          </h2>
          <p className="mt-4 max-w-3xl text-base font-black leading-8 text-amber-50 sm:text-lg">{result.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-amber-200/30 bg-amber-300/12 px-3 py-1 text-xs font-black text-amber-100">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200/25 bg-black/25 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-rose-100">{urgentLabel}</p>
              <p className="mt-1 font-serif text-5xl font-black leading-none text-rose-100">{primary.zh}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[color:var(--text-muted)]">{needLabel}</p>
              <p className="mt-1 text-3xl font-black text-amber-200">{primaryNeed}</p>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300" style={{ width: Math.max(10, primaryNeed) + '%' }} />
          </div>
          <p className="mt-3 text-sm font-bold leading-7 text-rose-50">{primary.direction}</p>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-200/20 bg-white/[0.045] p-4">
          <p className="text-xs font-black text-cyan-100">{secondLabel}</p>
          <p className="mt-1 text-2xl font-black text-cyan-50">{secondary.zh}{elementSuffix}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/20 bg-white/[0.045] p-4">
          <p className="text-xs font-black text-emerald-100">{strongLabel}</p>
          <p className="mt-1 text-2xl font-black text-emerald-50">{strong.zh}{elementSuffix}</p>
        </div>
        <div className="rounded-2xl border border-rose-200/20 bg-white/[0.045] p-4">
          <p className="text-xs font-black text-rose-100">{avoidLabel}</p>
          <p className="mt-1 text-xl font-black text-rose-50">{avoid ? avoid.zh + elementSuffix : noAvoidText}</p>
        </div>
      </div>


      <div className="relative mt-5 rounded-2xl border border-amber-200/25 bg-amber-300/10 p-4 shadow-[inset_0_0_24px_rgba(251,191,36,0.05)] sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">{productLabel}</p>
        <h3 className="mt-2 text-2xl font-black text-amber-50">{product.title}</h3>
        <p className="mt-2 text-sm font-black leading-7 text-amber-100">{product.headline}</p>
        <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-500/10 px-3 py-2 text-sm font-black leading-7 text-rose-100">{product.braceletCore}</p>
        <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{product.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.supportDirections.map((item) => (
            <span key={item} className="rounded-full border border-amber-200/25 bg-black/18 px-3 py-1 text-xs font-black text-amber-100">{item}</span>
          ))}
        </div>
        <button type="button" className="mt-4 w-full rounded-2xl border border-amber-200/35 bg-amber-300/14 px-4 py-3 text-sm font-black text-amber-50 transition hover:border-amber-100/60">
          {product.ctaLabel}
        </button>
        <p className="mt-3 text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">{product.disclaimer}</p>
      </div>

      <div className="relative mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-amber-200/20 bg-black/18 p-4">
          <p className="text-sm font-black text-amber-100">{actionLabel}</p>
          <div className="mt-3 space-y-2">
            {result.recommendedActions.slice(0, 3).map((action, index) => (
              <p key={action} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold leading-7 text-[color:var(--text-sub)]">
                {index + 1}. {action}
              </p>
            ))}
          </div>
        </div>
        <details className="rounded-2xl border border-white/10 bg-black/18 p-4">
          <summary className="cursor-pointer text-sm font-black text-cyan-100">{evidenceLabel}</summary>
          <div className="mt-3 space-y-2">
            {result.reasons.map((reason) => (
              <p key={reason} className="text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{reason}</p>
            ))}
          </div>
          <p className="mt-4 text-xs font-black text-cyan-100">{signalLabel}</p>
          <div className="mt-2 space-y-2">
            {scoreEntries.map(([element, score]) => {
              const definition = FIVE_ELEMENT_DEFINITIONS[element];
              return (
                <div key={element} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-xs font-bold text-[color:var(--text-sub)]">
                  <span>{definition.zh}{elementSuffix}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-cyan-300" style={{ width: Math.max(6, score.need) + '%' }} /></span>
                  <span className="text-right text-cyan-100">{score.need}</span>
                </div>
              );
            })}
          </div>
        </details>
      </div>

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">{quoteLabel}</p>
        <blockquote className="mt-3 text-lg font-black leading-8 text-cyan-50">\"{quote.quote}\"</blockquote>
        <p className="mt-2 text-sm font-bold text-amber-100">{quote.author} ? {quote.role}</p>
        <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{quote.elementFit}</p>
        <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{quote.reminder}</p>
        <a href={quote.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[11px] font-bold text-cyan-200 underline-offset-4 hover:underline">
          {quote.sourceName}
        </a>
      </div>
    </section>
  );
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

const ZIWEI_SAN_FANG_LABELS: Record<ZiweiSanFangKey, { label: string; role: string }> = {
  MING: { label: '命宮', role: '本宮' },
  QIAN_YI: { label: '遷移宮', role: '對宮' },
  CAI_BO: { label: '財帛宮', role: '三方' },
  GUAN_LU: { label: '官祿宮', role: '三方' },
};


const ZIWEI_PALACE_FALLBACK: Record<ZiweiPalaceKey, { name: string; focus: string }> = {
  MING: { name: '命', focus: '自我定位、性格主軸與人生方向。' },
  XIONG_DI: { name: '兄弟', focus: '手足、同輩、密友與合作支援。' },
  FU_QI: { name: '夫妻', focus: '伴侶關係、親密互動與承諾模式。' },
  ZI_NV: { name: '子女', focus: '子女、創造力、教養與傳承。' },
  CAI_BO: { name: '財帛', focus: '財務節奏、收入模式與資源管理。' },
  JI_E: { name: '疾厄', focus: '身心狀態、壓力反應與健康習慣。' },
  QIAN_YI: { name: '遷移', focus: '外出發展、移動機會與環境適應。' },
  JIAO_YOU: { name: '交友', focus: '朋友圈、人脈互動與外部助力。' },
  GUAN_LU: { name: '官祿', focus: '事業定位、工作表現與責任舞台。' },
  TIAN_ZHAI: { name: '田宅', focus: '家庭根基、居住空間與資產配置。' },
  FU_DE: { name: '福德', focus: '內在安定、福分累積與精神能量。' },
  FU_MU: { name: '父母', focus: '長輩緣分、資源傳承與支持系統。' },
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
const ZIWEI_PALACE_STORY: Record<string, {
  subtitle: string;
  icon: string;
  story: string;
  opportunity: string;
  pressure: string;
  action: string;
  likely: string;
  repair: string;
  encouragement: string;
  tone: string;
}> = {
  MING: {
    subtitle: '性格、天賦與人生核心',
    icon: '✦',
    story: '命宮只看你本人：你的性格底色、天賦反應、做決定的方式，以及今年如何把自己站穩。',
    opportunity: '今年適合把自我定位講清楚，讓別人知道你的能力與界線。',
    pressure: '較容易出現想證明自己、急著承擔過多角色的情況。',
    action: '先定一個年度主軸，其他事情都回到這個主軸判斷。',
    likely: '容易在自我定位、方向選擇、個人信心上被提醒。',
    repair: '把目標縮小成每週可完成的行動，先穩住節奏再放大格局。',
    encouragement: '你的格局不是靠一次表現證明，而是靠穩定選擇慢慢成形。',
    tone: 'border-cyan-400/30 bg-cyan-950/15 text-cyan-100',
  },
  XIONG_DI: {
    subtitle: '手足、朋友與同輩互動',
    icon: '◇',
    story: '兄弟宮只看兄弟姊妹、同輩、密友與近距離朋友，重點是支援、比較、合作與界線。',
    opportunity: '今年同輩或密友可能帶來消息、介紹、幫忙或情緒支撐。',
    pressure: '較容易因人情、比較心、界線不清，把別人的壓力扛到自己身上。',
    action: '合作前先講清楚責任，幫忙可以，但不要無條件消耗自己。',
    likely: '容易發生同輩互動變多、朋友求助、兄弟姊妹議題被看見。',
    repair: '把關係分成可深交、可合作、需保持距離三類，避免混在一起。',
    encouragement: '真正的好朋友會讓你變穩，不會讓你一直失衡。',
    tone: 'border-sky-400/30 bg-sky-950/15 text-sky-100',
  },
  FU_QI: {
    subtitle: '感情、伴侶與相處模式',
    icon: '♡',
    story: '夫妻宮只看伴侶、親密關係、長期相處與彼此期待，不把事業或財務混成感情結論。',
    opportunity: '今年適合把關係需求說明白，讓互相理解變成穩定力量。',
    pressure: '較容易因猜測、沉默、期待落差，讓小事變成情緒累積。',
    action: '用具體句子表達需求，不用試探代替溝通。',
    likely: '容易出現感情定位、伴侶相處、承諾感與安全感的課題。',
    repair: '把「你應該懂我」改成「我真正需要的是什麼」，關係會更清楚。',
    encouragement: '好的關係不是沒有摩擦，而是兩個人願意一起修正相處方式。',
    tone: 'border-rose-400/30 bg-rose-950/15 text-rose-100',
  },
  ZI_NV: {
    subtitle: '子女、創造與成果延續',
    icon: '✣',
    story: '子女宮只看子女、晚輩、部屬、創作、作品與成果延續，是你投入心血後長出來的東西。',
    opportunity: '今年適合培養作品、教學、陪伴、內容輸出或長期計畫。',
    pressure: '較容易因急著看到成果，忽略培養期需要時間。',
    action: '把成果拆成小階段，先養成固定輸出，再談爆發。',
    likely: '容易發生子女晚輩互動、作品卡關、創造力需要被安排的情況。',
    repair: '不要一直更換方向，先讓一個作品或計畫完整長出來。',
    encouragement: '你的成果會慢慢替你說話，穩定投入比急著證明更有力量。',
    tone: 'border-pink-400/30 bg-pink-950/15 text-pink-100',
  },
  CAI_BO: {
    subtitle: '收入、金錢與資源運用',
    icon: '◎',
    story: '財帛宮只看錢財：收入方式、支出習慣、金錢態度、資源配置與今年財務壓力。',
    opportunity: '今年適合整理收入來源、降低浪費、把資源放到能累積價值的地方。',
    pressure: '較容易出現臨時支出、人情消費、投資衝動或現金流卡住。',
    action: '先做預算、記帳與保留安全金，再評估擴張或投入。',
    likely: '容易發生收入調整、支出變多、資源重新分配、錢要花在刀口上的情況。',
    repair: '把每筆錢分成必要、投資自己、可延後三類，先止漏再開源。',
    encouragement: '財帛宮要你學會掌握資源，不是害怕花錢，而是讓錢流向更值得的地方。',
    tone: 'border-emerald-400/30 bg-emerald-950/15 text-emerald-100',
  },
  JI_E: {
    subtitle: '身心負荷與生活節奏',
    icon: '✧',
    story: '疾厄宮只看身心負荷、壓力反應、作息節奏與生活管理；此處不做疾病診斷。',
    opportunity: '今年只要節奏穩，體力、專注力與恢復力都能成為助力。',
    pressure: '較容易因睡眠不足、壓力累積、過度操勞而降低效率。',
    action: '先固定睡眠、飲食、休息與運動節奏，再處理高壓任務。',
    likely: '容易發生疲勞感增加、生活節奏被打亂、壓力需要出口的情況。',
    repair: '用規律取代硬撐，把休息排進行程，不要等到耗盡才停。',
    encouragement: '照顧身體不是退後，是讓你走得更長、更穩。',
    tone: 'border-lime-400/30 bg-lime-950/15 text-lime-100',
  },
  QIAN_YI: {
    subtitle: '外出發展與外在形象',
    icon: '↗',
    story: '遷移宮只看外出、外地、外界舞台、社會形象與別人看到的你。',
    opportunity: '今年適合曝光、拓展場域、接觸新環境、讓外界看見你的價值。',
    pressure: '較容易因外部變化、人際場合或新環境節奏，讓自己被拉著走。',
    action: '主動出去，但每次合作與曝光都要有明確目的。',
    likely: '容易發生出差、移動、換環境、新客戶、外部邀約或形象被檢視。',
    repair: '先準備好自我介紹、作品與界線，出門才不會被場面牽著跑。',
    encouragement: '你的舞台不只在熟悉的地方，走出去會看見新的可能。',
    tone: 'border-orange-400/30 bg-orange-950/15 text-orange-100',
  },
  JIAO_YOU: {
    subtitle: '人脈、合作與團隊關係',
    icon: '✺',
    story: '交友宮只看朋友、人脈、合作夥伴、客戶、團隊與部屬，不直接斷言誰是好壞。',
    opportunity: '今年適合篩選合作圈，讓對的人帶來資源、客源或實際支援。',
    pressure: '較容易遇到溝通成本高、責任不清或消耗型合作。',
    action: '合作前確認目標、分工、期限與利益分配。',
    likely: '容易發生客戶關係、團隊協調、朋友介紹、合作邀約增多。',
    repair: '不要只看熱情，要看對方是否守信用、能不能一起完成事。',
    encouragement: '圈子對了，你的努力會被放大；圈子不對，越努力越耗力。',
    tone: 'border-teal-400/30 bg-teal-950/15 text-teal-100',
  },
  GUAN_LU: {
    subtitle: '工作、事業與職涯方向',
    icon: '▣',
    story: '官祿宮只看事業：工作方式、職涯定位、責任角色、專業成果與今年事業改進方向。',
    opportunity: '今年適合把專業變成可被看見的成果，讓職場信任感提升。',
    pressure: '較容易出現任務變多、責任加重、流程不清或角色需要升級。',
    action: '把今年工作目標拆成可驗收節點，先完成最能代表專業的一項成果。',
    likely: '容易發生工作調整、職位責任變化、專案壓力、需要證明能力的情況。',
    repair: '先整理流程與優先順序，不要用忙碌取代成果。',
    encouragement: '你的事業格局要靠作品和信用撐起來，一步一步會越站越穩。',
    tone: 'border-amber-400/30 bg-amber-950/15 text-amber-100',
  },
  TIAN_ZHAI: {
    subtitle: '家庭、居住與資產基礎',
    icon: '⌂',
    story: '田宅宮只看家庭、居住環境、房產、內部資源與安全感，不提供投資保證。',
    opportunity: '今年適合整理住家、家庭秩序、資產基礎與長期安全感。',
    pressure: '較容易因家中雜務、居住安排、資產壓力或家人意見而分心。',
    action: '先處理看得見的空間，再整理家庭共識與資源規劃。',
    likely: '容易發生搬動整理、家庭討論、居住品質、資產配置需要重看。',
    repair: '把家變成補充能量的地方，不要讓環境一直消耗你。',
    encouragement: '根基穩，外面的路才走得遠；整理田宅就是整理你的底氣。',
    tone: 'border-yellow-400/30 bg-yellow-950/15 text-yellow-100',
  },
  FU_DE: {
    subtitle: '內心、興趣與精神狀態',
    icon: '◐',
    story: '福德宮只看內心世界、精神狀態、興趣慾望、休息方式與享受生活的能力。',
    opportunity: '今年適合修復心氣、培養興趣、找回讓自己安定的生活節奏。',
    pressure: '較容易外表正常、內心消耗，或因想太多而睡不穩、心不定。',
    action: '每天安排一段不被打擾的安靜時間，讓心慢慢回來。',
    likely: '容易發生內心疲倦、興趣轉換、想休息卻放不下責任的狀況。',
    repair: '把休息當成能量管理，不要把安靜時間視為浪費。',
    encouragement: '心穩，運就不容易散；你越能安住，越能看清真正想要的路。',
    tone: 'border-violet-400/30 bg-violet-950/15 text-violet-100',
  },
  FU_MU: {
    subtitle: '父母、長輩與支持系統',
    icon: '△',
    story: '父母宮只看父母、長輩、上級、制度、教育資源與支持系統。',
    opportunity: '今年適合請益、學習、修正舊觀念，讓長輩或制度資源成為助力。',
    pressure: '較容易被期待、規範、權威意見影響，或與長輩觀念不同。',
    action: '尊重經驗，但最後仍要把選擇放回自己的人生節奏。',
    likely: '容易發生長輩溝通、上級要求、制度流程、學習證照或資源申請。',
    repair: '把對立變成請益，把壓力轉成規劃，不要用硬碰硬消耗自己。',
    encouragement: '你可以承接好的經驗，也可以走出自己的新路。',
    tone: 'border-indigo-400/30 bg-indigo-950/15 text-indigo-100',
  },
};
const ZIWEI_PALACE_ANNUAL_LENS: Record<string, { label: string; matrixKey: ZiweiAdviceMatrixKey; source: string }> = {
  MING: { label: '自我定位', matrixKey: 'confidence', source: '今年整體信心與自我穩定度' },
  XIONG_DI: { label: '同輩互動', matrixKey: 'communication', source: '今年溝通、人際協調與同輩支援' },
  FU_QI: { label: '關係覺察', matrixKey: 'relationshipAwareness', source: '今年感情互動與關係覺察' },
  ZI_NV: { label: '成果延續', matrixKey: 'learningGrowth', source: '今年成長、創造與成果延續' },
  CAI_BO: { label: '財務紀律', matrixKey: 'financialDiscipline', source: '今年財務紀律與資源配置' },
  JI_E: { label: '壓力管理', matrixKey: 'stressManagement', source: '今年壓力管理與身心節奏' },
  QIAN_YI: { label: '外部適應', matrixKey: 'adaptability', source: '今年外部機會與環境適應' },
  JIAO_YOU: { label: '合作溝通', matrixKey: 'communication', source: '今年合作、人脈與團隊溝通' },
  GUAN_LU: { label: '執行落地', matrixKey: 'execution', source: '今年事業執行與責任落地' },
  TIAN_ZHAI: { label: '根基耐心', matrixKey: 'patience', source: '今年家庭根基、穩定度與耐心' },
  FU_DE: { label: '心氣修復', matrixKey: 'stressManagement', source: '今年內在修復與精神能量' },
  FU_MU: { label: '支持系統', matrixKey: 'learningGrowth', source: '今年長輩支持、學習與經驗吸收' },
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
    focus: annualPalace?.focus ?? lens?.source ?? annual?.annualTheme ?? '今年整體運勢訊號',
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
  const normalized = name === '奴僕宮' || name === '奴僕' ? '交友宮' : name;
  return normalized.endsWith('宮') ? normalized : `${normalized}宮`;
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
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/85">主要格局</p>
        <h2 className="mx-auto mt-3 max-w-4xl break-words font-serif text-5xl font-black leading-tight text-amber-100 drop-shadow-[0_0_20px_rgba(251,191,36,0.35)] sm:text-7xl">
          {analysis.pattern.name}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-amber-50/78">
          你是有格局的人。先看格局定錨，再從十二宮位找到今年最適合發力的位置。
        </p>
        <p className="mt-3 text-xs text-amber-100/60">分析年份：{annual?.year ?? new Date().getFullYear()}</p>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-indigo-300">ZI WEI PALACES</p>
          <h3 className="mt-3 font-serif text-3xl text-indigo-100 sm:text-4xl">選擇想了解的宮位</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-sub)]">
            點選宮位，查看專屬分析。
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-cyan-300/20 bg-cyan-950/20 px-3 py-1 text-cyan-100">
          {analysis.timeConfidence === 'exact' ? '已依真實時辰排盤' : '暫定時辰排盤，可再校正'}
        </span>

      </div>

      <div className="ziwei-palace-grid mt-6 grid grid-cols-2 gap-3.5 max-[340px]:grid-cols-1 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {sortedPalaces.map((palace, index) => {
          const story = ZIWEI_PALACE_STORY[palace.key] ?? {
            subtitle: `${normalizeZiweiPalaceName(palace.name)}主題`,
            icon: '✦',
            story: `${normalizeZiweiPalaceName(palace.name)}只看這一宮代表的生活主題，今年先看它帶來的具體提醒。`,
            opportunity: '適合把重點整理清楚，找到可執行方向。',
            pressure: '訊號不足時，先以保守判讀為主。',
            action: '把重點化成一個可執行的小步驟。',
            likely: '容易在這個宮位主題上出現需要處理的變化。',
            repair: '先把問題分清楚，再用小步驟補強。',
            encouragement: '看清楚這一宮的提醒，就能把壓力轉成可行動的方向。',
            tone: 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
          };
          const annualPalace = annualMap.get(palace.key as 'MING' | 'CAI_BO' | 'GUAN_LU' | 'QIAN_YI');
          const annualSignal = getZiweiAnnualSignal(palace.key, annualPalace, annual);
          const active = selectedPalaceKey === palace.key;

          return (
            <button
              key={palace.key}
              type="button"
              onClick={() => setSelectedPalaceKey(active ? null : palace.key)}
              className={`ziwei-palace-card group relative flex min-h-[158px] flex-col justify-between overflow-hidden rounded-[24px] border p-4 text-left shadow-[0_14px_34px_rgba(2,6,23,0.28)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(2,6,23,0.36)] focus:outline-none focus:ring-2 focus:ring-indigo-200/70 ${story.tone} ${active ? '-translate-y-1 ring-2 ring-amber-100/60 shadow-[0_22px_52px_rgba(251,191,36,0.16),0_16px_40px_rgba(2,6,23,0.38)]' : ''}`}
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
              <h3 className="relative mt-4 font-serif text-[1.35rem] font-black leading-tight sm:text-2xl">{normalizeZiweiPalaceName(palace.name)}</h3>
              <p className="relative mt-2 min-h-[40px] text-xs leading-5 opacity-75">{story.subtitle}</p>
              {annualSignal.score !== null && (
                <p className="relative mt-3 inline-flex rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[11px] font-semibold opacity-90">
                  {annualSignal.label} · {annualSignal.score}
                </p>
              )}
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
          先點一張宮位卡片，系統會只展開該宮位的故事分析，畫面保持乾淨不擁擠。
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
  story?: (typeof ZIWEI_PALACE_STORY)[string];
  year: number;
  patternName: string;
  sanFangPalaces: ZiweiFullPalace[];
}) {
  const config = story ?? {
    subtitle: `${normalizeZiweiPalaceName(palace.name)}主題`,
    icon: '✦',
    story: `${normalizeZiweiPalaceName(palace.name)}只看這一宮代表的生活主題，今年先看它帶來的具體提醒。`,
    opportunity: '適合把重點整理清楚，找到可執行方向。',
    pressure: '訊號不足時，先以保守判讀為主。',
    action: '把重點化成一個可執行的小步驟。',
    likely: '容易在這個宮位主題上出現需要處理的變化。',
    repair: '先把問題分清楚，再用小步驟補強。',
    encouragement: '看清楚這一宮的提醒，就能把壓力轉成可行動的方向。',
    tone: 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
  };
  const mainStars = palace.majorStars.length > 0 ? palace.majorStars.join('、') : '無主星坐守';
  const supportStars = palace.minorStars.slice(0, 5).join('、');
  const transformations = palace.transformations.join('、');
  const annualSignal = getZiweiAnnualSignal(palace.key, annualPalace, annual);
  const firstEvent = precisionAnalysis?.likelyEvents[0];
  const primaryOpportunity = precisionAnalysis?.primaryOpportunity.description ?? annualPalace?.focus;
  const primaryPressure = precisionAnalysis?.primaryRisk.description ?? annualPalace?.tensions[0];
  const primaryAction = precisionAnalysis?.actionPlan.doFirst[0] ?? annualPalace?.action;
  const primaryAdvice = precisionAnalysis?.directConclusion ?? annualPalace?.advice;
  const primaryEncouragement = annualPalace?.encouragement;
  const likelyText = firstEvent?.likelyScenario;
  const repairText = precisionAnalysis?.actionPlan.doFirst.slice(0, 2).join('；');
  const evidenceItems = precisionAnalysis?.evidenceSummary ?? [];
  const coreInsightCards = [
    { label: '機會', text: primaryOpportunity },
    { label: '壓力', text: primaryPressure },
    { label: '建議', text: primaryAction },
  ].filter((item): item is { label: string; text: string } => Boolean(item.text?.trim()));
  const situationalCards = [
    { label: '較容易發生', text: likelyText },
    { label: '補足方式', text: repairText },
    { label: '鼓勵', text: primaryEncouragement },
  ].filter((item): item is { label: string; text: string } => Boolean(item.text?.trim()));
  const hasConclusion = Boolean(primaryAdvice?.trim() || precisionAnalysis?.palaceDefinition?.trim() || primaryEncouragement?.trim());

  return (
    <div ref={panelRef} className={`mt-6 scroll-mt-24 rounded-[24px] border p-5 sm:p-6 ${config.tone}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] opacity-70">{year} 年專屬分析</p>
          <h3 className="mt-2 font-serif text-3xl font-black leading-tight">{normalizeZiweiPalaceName(palace.name)}</h3>
          <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{config.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/15 px-4 py-3 text-left sm:text-right">
          <p className="text-xs opacity-70">格局</p>
          <p className="mt-1 text-sm font-bold">{patternName}</p>
          {annualSignal.score !== null && <p className="mt-2 text-xs opacity-80">{annualSignal.scoreSource} {annualSignal.score}</p>}
        </div>
      </div>

      {palace.key === 'MING' && (
        <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-950/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.24em] text-cyan-200/75">三方四正</p>
              <h4 className="mt-1 font-serif text-xl font-black leading-tight text-cyan-50 sm:text-2xl">
                命宮 × 遷移宮 × 財帛宮 × 官祿宮
              </h4>
            </div>
            <p className="text-xs leading-5 text-cyan-100/70">年度統計已灌入</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {sanFangPalaces.map((item) => {
              const key = item.key as ZiweiSanFangKey;
              const label = ZIWEI_SAN_FANG_LABELS[key];
              const itemAnnual = annual?.sanFangFourZheng.find((annualItem) => annualItem.palaceKey === key);
              const stars = item.majorStars.length > 0 ? item.majorStars.join('、') : '無主星坐守';

              return (
                <div
                  key={key}
                  className="min-h-[116px] rounded-[18px] border border-white/10 bg-black/18 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold tracking-[0.18em] text-cyan-100/60">{label.role}</p>
                    {itemAnnual && <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-cyan-100/80">{itemAnnual.score}分</span>}
                  </div>
                  <p className="mt-2 font-serif text-lg font-black leading-none text-cyan-50">{label.label}</p>
                  <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-5 text-[color:var(--text-main)]">{stars}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[color:var(--text-sub)]">{itemAnnual?.focus ?? item.focus}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs leading-6 text-[color:var(--text-sub)]">
            三方四正以命宮看自我，遷移宮看外界回應，財帛宮看資源流動，官祿宮看事業責任；四宮一起交叉，才形成今年「{patternName}」的判讀核心。
          </p>
        </div>
      )}

      {coreInsightCards.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] opacity-70">年度重點</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {coreInsightCards.map((item) => (
              <div key={item.label} className="border-l border-cyan-200/20 pl-3">
                <p className="text-xs font-semibold text-cyan-100/70">{item.label}</p>
                <p className="mt-1.5 text-sm leading-6 text-[color:var(--text-main)]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {situationalCards.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold tracking-[0.2em] opacity-70">事件推論</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {situationalCards.map((item) => (
              <div key={item.label} className="border-l border-white/10 pl-3">
                <p className="text-xs font-semibold opacity-70">{item.label}</p>
                <p className="mt-1.5 text-sm leading-6 text-[color:var(--text-main)]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasConclusion && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold tracking-[0.2em] opacity-70">一句話結論</p>
          {primaryAdvice && (
            <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
              {primaryAdvice}
            </p>
          )}
          {precisionAnalysis?.palaceDefinition && (
            <p className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-6 text-[color:var(--text-main)]">
              本宮分析：{precisionAnalysis.palaceDefinition}
            </p>
          )}
          {primaryEncouragement && (
            <p className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-6 text-[color:var(--text-main)]">
              鼓勵：{primaryEncouragement}
            </p>
          )}
        </div>
      )}

      {precisionAnalysis && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold opacity-70">優先做</p>
            <ul className="mt-2 space-y-2 text-xs leading-6 text-[color:var(--text-main)]">
              {precisionAnalysis.actionPlan.doFirst.slice(0, 3).map((item) => <li key={item}>→ {item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold opacity-70">先不要做</p>
            <ul className="mt-2 space-y-2 text-xs leading-6 text-[color:var(--text-main)]">
              {precisionAnalysis.actionPlan.avoid.slice(0, 3).map((item) => <li key={item}>→ {item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold opacity-70">持續觀察</p>
            <ul className="mt-2 space-y-2 text-xs leading-6 text-[color:var(--text-main)]">
              {precisionAnalysis.actionPlan.observe.slice(0, 3).map((item) => <li key={item}>→ {item}</li>)}
            </ul>
          </div>
        </div>
      )}

      {annual && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] opacity-70">今年統計灌入</p>
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
        <summary className="cursor-pointer font-semibold text-[color:var(--text-main)]">分析依據</summary>
        <div className="mt-3 grid gap-2 text-xs leading-6 text-[color:var(--text-sub)] sm:grid-cols-2">
          <p>宮位座標：{palace.palaceStem}{palace.branch}</p>
          <p>本宮主星：{mainStars}</p>
          {supportStars && <p>輔助星曜：{supportStars}</p>}
          {transformations && <p>四化訊號：{transformations}</p>}
          {evidenceItems.slice(0, 4).map((item) => (
            <p key={`${item.sourceType}-${item.sourceName}`}>{item.sourceName}：{item.explanation}</p>
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
      <div className="grid gap-6 items-center lg:grid-cols-[1.2fr_0.8fr]">
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

        {/* 🔮 3D 命理太極公轉引力核心 */}
        <div className="flex justify-center items-center py-4 lg:py-0">
          <TaijiStandaloneCard />
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
    // 清除舊的錯誤信息
    setError('');

    // 執行驗證
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
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

      <main ref={mainRef} className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <FeatureVisitorCounter featureKey="personality" className="mb-4" />
        <Link
          href="/"
          className="feature-home-link feature-home-link--cyan feature-home-link--floating"
          aria-label="返回首頁"
        >
          {"\u8fd4\u56de\u9996\u9801"}
        </Link>
        {!result ? (
          <>
            <section className="mb-5 flex justify-center sm:mb-8">
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
              <div className="flex w-full justify-center">
                <TaijiStandaloneCard />
              </div>
            </section>

            <div id="input-form" className="fortune-card p-6 sm:p-8 scroll-mt-20">
              {loading && <InsightAnalyticalConsole name={input.name} />}
              <div className={loading ? 'hidden' : 'space-y-8'}>
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

            <FiveElementPriorityCard result={result?.fiveElement} />

            <ZiweiTwelvePalaceCards analysis={result?.ziweiSanFang} annual={result?.annualFortune} />

            {/* 三方四正摘要、今年運勢、補充建議與姓名學資料保留於 API 回傳；手機主畫面只保留主格局與十二宮。 */}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setResult(null)}
                className="vip-gold-btn flex-1 py-4 text-sm"
              >
                重新分析
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
