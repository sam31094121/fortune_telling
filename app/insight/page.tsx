'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import NextStepGuide from '@/components/NextStepGuide';
import { saveUserData, loadUserData } from '@/lib/storage';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import FeatureVisitorCounter from '@/components/FeatureVisitorCounter';
import { recoverFromChunkError } from '@/lib/chunk-recovery';
import TaijiStandaloneCard from '@/components/TaijiStandaloneCard';

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
  meta?: {
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
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  tone: 'violet' | 'amber' | 'pink' | 'cyan';
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

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all hover:border-white/20 ${tones[tone]}`}
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
type ZiweiAnnualPalace = ZiweiAnnualFortune['sanFangFourZheng'][number];
type ZiweiAdviceMatrixKey = keyof ZiweiAnnualFortune['adviceMatrix'];
type ZiweiPalaceKey = typeof ZIWEI_TWELVE_PALACE_ORDER[number];

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

const ZIWEI_PALACE_STORY: Record<string, {
  subtitle: string;
  icon: string;
  story: string;
  opportunity: string;
  pressure: string;
  action: string;
  tone: string;
}> = {
  MING: {
    subtitle: '性格、天賦與人生核心',
    icon: '✦',
    story: '命宮像整張命盤的主控室，主星代表你今年最自然的反應方式，三方四正會補足你能借力的位置。',
    opportunity: '適合重新確認自我定位，把優勢放在真正重要的方向。',
    pressure: '容易因為想一次處理太多事，讓心力分散。',
    action: '先定一個年度主軸，把力氣集中在最能累積成果的地方。',
    tone: 'border-cyan-400/30 bg-cyan-950/15 text-cyan-100',
  },
  XIONG_DI: {
    subtitle: '手足、朋友與同輩互動',
    icon: '◇',
    story: '兄弟宮像身邊同輩的支援站，能看見手足、朋友與熟人互動對今年選擇的影響。',
    opportunity: '同輩合作容易帶來資訊、資源或情緒上的支持。',
    pressure: '若界線不清，容易把別人的急事變成自己的負擔。',
    action: '需要幫忙時說清楚，也要把責任範圍先講明白。',
    tone: 'border-sky-400/30 bg-sky-950/15 text-sky-100',
  },
  FU_QI: {
    subtitle: '感情、伴侶與相處模式',
    icon: '♡',
    story: '夫妻宮像關係中的會客室，主星看相處需求，三方四正看彼此如何在現實生活中互相配合。',
    opportunity: '適合把關係中的期待說清楚，讓理解替代猜測。',
    pressure: '容易因為情緒沒有被看見，而累積沉默或誤會。',
    action: '今年多用具體溝通取代試探，關係會更安定。',
    tone: 'border-rose-400/30 bg-rose-950/15 text-rose-100',
  },
  ZI_NV: {
    subtitle: '子女、創造與成果延續',
    icon: '✣',
    story: '子女宮也像成果孵化室，看創作、晚輩、部屬與你投入心血後長出來的東西。',
    opportunity: '適合培養作品、教學、陪伴或可延續的計畫。',
    pressure: '若急著看到成果，反而容易打亂原本節奏。',
    action: '保留固定時間讓計畫慢慢成形，先重品質再重速度。',
    tone: 'border-pink-400/30 bg-pink-950/15 text-pink-100',
  },
  CAI_BO: {
    subtitle: '收入、金錢與資源運用',
    icon: '◎',
    story: '財帛宮像管理收入與資源的房間，主星看金錢處理方式，三方四正看工作、定位與外部機會如何共同影響財務。',
    opportunity: '適合整理收入來源與資源配置，把能累積的價值留下來。',
    pressure: '容易因短期支出或情緒性決策，讓資源流動變得不穩。',
    action: '今年先記帳與分配，再談擴張；把錢放到最有回收力的地方。',
    tone: 'border-emerald-400/30 bg-emerald-950/15 text-emerald-100',
  },
  JI_E: {
    subtitle: '身心負荷與生活節奏',
    icon: '✧',
    story: '疾厄宮像身心節奏的儀表板，用來看壓力、作息與恢復力，不做疾病診斷。',
    opportunity: '只要節奏穩，今年反而能把體力與專注力用得更精準。',
    pressure: '長期忽略休息，容易讓情緒與效率一起下滑。',
    action: '固定睡眠、飲食與放鬆，先把身體顧好再衝刺。',
    tone: 'border-lime-400/30 bg-lime-950/15 text-lime-100',
  },
  QIAN_YI: {
    subtitle: '外出發展與外在形象',
    icon: '↗',
    story: '遷移宮像外部舞台，會看你走出去後遇到的機會、人脈與外界回饋。',
    opportunity: '適合曝光、拓展場域、接觸新客群或不同環境。',
    pressure: '外界變化快時，容易被他人的節奏拉著走。',
    action: '今年可以主動出擊，但要守住時間與合作界線。',
    tone: 'border-orange-400/30 bg-orange-950/15 text-orange-100',
  },
  JIAO_YOU: {
    subtitle: '人脈、合作與團隊關係',
    icon: '✺',
    story: '交友宮像合作網絡，看團隊、客戶、夥伴與人脈品質如何影響今年發展。',
    opportunity: '圈子對了，資源與消息會更容易流向你。',
    pressure: '人情壓力或消耗型合作，可能讓判斷變慢。',
    action: '選擇能互相成就的人，合作前先確認目標與分工。',
    tone: 'border-teal-400/30 bg-teal-950/15 text-teal-100',
  },
  GUAN_LU: {
    subtitle: '工作、事業與職涯方向',
    icon: '▣',
    story: '官祿宮像事業部門，主星看工作方式，三方四正看能力、責任與外部位置如何連動。',
    opportunity: '適合把專業整理成可被看見的成果，提升信任感。',
    pressure: '責任增加時，若流程沒整理好，容易忙而不精。',
    action: '把任務拆成清楚步驟，先做最能代表專業的成果。',
    tone: 'border-amber-400/30 bg-amber-950/15 text-amber-100',
  },
  TIAN_ZHAI: {
    subtitle: '家庭、居住與資產基礎',
    icon: '⌂',
    story: '田宅宮像根基與安住的房間，看家庭、居住、空間與資產基礎帶來的安全感。',
    opportunity: '整理空間與生活秩序，會讓後續行動更有底氣。',
    pressure: '家庭或資產議題若拖太久，容易變成隱性壓力。',
    action: '先處理看得見的環境，再慢慢整理資產與家庭共識。',
    tone: 'border-yellow-400/30 bg-yellow-950/15 text-yellow-100',
  },
  FU_DE: {
    subtitle: '內心、興趣與精神狀態',
    icon: '◐',
    story: '福德宮像心裡的休息室，看精神能量、興趣、慾望與內在滿足感。',
    opportunity: '內心穩定時，判斷會更清楚，福氣也比較留得住。',
    pressure: '若只顧外在成果，容易忽略真正需要修復的地方。',
    action: '每天留一點安靜時間，讓心氣回來。',
    tone: 'border-violet-400/30 bg-violet-950/15 text-violet-100',
  },
  FU_MU: {
    subtitle: '父母、長輩與支持系統',
    icon: '△',
    story: '父母宮像長輩與制度的支持系統，也看上級、師長、傳承與保護力量。',
    opportunity: '適合請益、學習與修正舊觀念，讓經驗成為助力。',
    pressure: '權威或期待太重時，容易讓你忽略自己的節奏。',
    action: '尊重經驗，但把最後選擇放回自己手上。',
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

  if (!analysis) return null;

  const palaceSource: ZiweiFullPalace[] = analysis.allPalaces?.length ? analysis.allPalaces : analysis.palaces;
  const annualMap = new Map((annual?.sanFangFourZheng ?? []).map((item) => [item.palaceKey, item]));
  const sortedPalaces = [...palaceSource].sort((a, b) => {
    const aIndex = ZIWEI_TWELVE_PALACE_ORDER.indexOf(a.key as ZiweiPalaceKey);
    const bIndex = ZIWEI_TWELVE_PALACE_ORDER.indexOf(b.key as ZiweiPalaceKey);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
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

      <div className="mt-6 grid grid-cols-2 gap-3 max-[340px]:grid-cols-1 sm:grid-cols-3 xl:grid-cols-4">
        {sortedPalaces.map((palace, index) => {
          const story = ZIWEI_PALACE_STORY[palace.key] ?? {
            subtitle: `${normalizeZiweiPalaceName(palace.name)}主題`,
            icon: '✦',
            story: `${normalizeZiweiPalaceName(palace.name)}代表一段生活主題，今年先看它帶來的提醒。`,
            opportunity: '適合把重點整理清楚，找到可執行方向。',
            pressure: '訊號不足時，先以保守判讀為主。',
            action: '把重點化成一個可執行的小步驟。',
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
              className={`group min-h-[132px] rounded-[22px] border p-4 text-left transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-200/70 ${story.tone} ${active ? 'ring-2 ring-white/50' : ''}`}
              aria-expanded={active}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-black/20 text-xl shadow-[inset_0_0_18px_rgba(255,255,255,0.08)]">
                  {story.icon}
                </span>
                <span className="text-[11px] font-semibold tracking-[0.18em] opacity-60">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-4 font-serif text-xl font-black leading-tight sm:text-2xl">{normalizeZiweiPalaceName(palace.name)}</h3>
              <p className="mt-2 text-xs leading-5 opacity-75">{story.subtitle}</p>
              {annualSignal.score !== null && (
                <p className="mt-3 inline-flex rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[11px] font-semibold opacity-90">
                  {annualSignal.label} · {annualSignal.score}
                </p>
              )}
              <p className="mt-4 text-xs font-semibold opacity-90">查看分析 →</p>
            </button>
          );
        })}
      </div>

      {selectedPalace ? (
        <ZiweiPalaceStoryPanel
          palace={selectedPalace}
          annualPalace={annualMap.get(selectedPalace.key as 'MING' | 'CAI_BO' | 'GUAN_LU' | 'QIAN_YI')}
          annual={annual}
          story={ZIWEI_PALACE_STORY[selectedPalace.key]}
          year={annual?.year ?? new Date().getFullYear()}
          patternName={analysis.pattern.name}
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
  palace,
  annualPalace,
  annual,
  story,
  year,
  patternName,
}: {
  palace: ZiweiFullPalace;
  annualPalace?: ZiweiAnnualPalace;
  annual?: ZiweiAnnualFortune;
  story?: (typeof ZIWEI_PALACE_STORY)[string];
  year: number;
  patternName: string;
}) {
  const config = story ?? {
    subtitle: `${normalizeZiweiPalaceName(palace.name)}主題`,
    icon: '✦',
    story: `${normalizeZiweiPalaceName(palace.name)}代表一段生活主題，今年先看它帶來的提醒。`,
    opportunity: '適合把重點整理清楚，找到可執行方向。',
    pressure: '訊號不足時，先以保守判讀為主。',
    action: '把重點化成一個可執行的小步驟。',
    tone: 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
  };
  const mainStars = palace.majorStars.length > 0 ? palace.majorStars.join('、') : '無主星坐守';
  const supportStars = palace.minorStars.slice(0, 5).join('、') || '依三方四正補足訊號';
  const transformations = palace.transformations.length > 0 ? palace.transformations.join('、') : '今年以宮位結構與主星互動為主';
  const annualSignal = getZiweiAnnualSignal(palace.key, annualPalace, annual);

  return (
    <div className={`mt-6 rounded-[24px] border p-5 sm:p-6 ${config.tone}`}>
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

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold opacity-70">機會</p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--text-main)]">{annualSignal.focus ?? config.opportunity}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold opacity-70">壓力</p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--text-main)]">{annualSignal.tensions[0] ?? config.pressure}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold opacity-70">建議</p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--text-main)]">{annualSignal.action ?? config.action}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <p className="text-xs font-semibold tracking-[0.2em] opacity-70">看圖說故事</p>
        <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
          {annualSignal.advice ?? config.story}
        </p>
        {annualSignal.encouragement && (
          <p className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs leading-6 text-[color:var(--text-main)]">
            鼓勵：{annualSignal.encouragement}
          </p>
        )}
      </div>

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
          <p>輔助星曜：{supportStars}</p>
          <p>四化訊號：{transformations}</p>
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
    `【人和音律】姓名學五格剖析與人格超越基準映射... 已就緒`,
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
        <FeatureVisitorCounter featureKey="personality" className="mb-6" />
        <div className="mb-8 flex items-center gap-4">
          <Link href="/" className="text-xs tracking-widest text-[color:var(--text-muted)] transition hover:text-white">
            ← 返回首頁
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <Link href="/music" className="text-xs tracking-widest text-violet-300/70 transition hover:text-violet-300">
            🎵 人格
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <Link href="/" className="text-xs tracking-widest text-rose-300/70 transition hover:text-rose-300">
            💕 配對
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <span className="text-xs tracking-widest text-cyan-300">✨ 深度洞察</span>
        </div>

        {!result ? (
          <>
            <section className="mb-6 flex justify-center sm:mb-10">
              <div className="hidden">
                <div className="mb-4 inline-block rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-1 text-xs tracking-[0.35em] text-cyan-300">
                  AI 深度洞察
                </div>
                <h1 className="mystic-title mb-3 font-serif text-3xl leading-tight sm:text-5xl">
                  看懂你的潛力<br />找到下一步方向
                </h1>
                <p className="max-w-2xl text-sm leading-8 text-[color:var(--text-sub)]">
                  輸入基本資料，AI 會把命理、心理與統計訊號整理成白話建議。
                  重點放在能理解、能行動，不把多餘細節塞進畫面。
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
                    <span>👇 一鍵開啟 · 探索本命軌跡</span>
                  </button>

                  {/* 動態天宿氣場預言面板 */}
                  <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-left max-w-md shadow-[0_0_15px_rgba(34,211,238,0.05)]">
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 font-bold font-mono flex items-center gap-2">
                      <span className="animate-ping inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>🪐 今日天宿星格氣場</span>
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">
                      今日紫微天樞星高懸，血型磁場共振係數 0.92，宿命宮位大開，極利探索個人本命軌跡與潛能盲點。
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
                  className="form-input w-full text-base border border-white/10 rounded-lg px-4 py-3"
                  autoComplete="off"
                />
                {input.name.trim().length > 0 && input.name.trim().length < 2 && (
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
                {input.birthDate && (
                  <p className="mt-2 text-xs text-green-400">✓ 西元 {input.birthDate}</p>
                )}
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">3. 血型</label>
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
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">4. 性別</label>
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
                  真實時辰可提升紫微命宮精準度；不知道也沒關係，系統會依你的生日自動挑選良辰吉時，分析仍可照常完成。
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
                          系統依生日自動挑選良辰吉時，直接完成初步排盤。
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
                          展開時辰選單，使用真實資料完成更精準的排盤。
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
                  disabled={loading || validateForm() !== null}
                  className={`flex-1 py-5 text-base font-semibold rounded-2xl transition-all ${
                    loading || validateForm() !== null
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
                    '開始深度洞察'
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
            <div className="hidden fortune-card relative overflow-hidden border-amber-400/25 bg-slate-950/55 p-6 sm:p-8">
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
                  <p className="mt-1 text-xs text-cyan-100/70">{result?.ziweiSanFang?.timeConfidence === 'exact' ? '命財官遷已完成比對' : '暫不顯示單一命盤'}</p>
                </div>
              </div>

              {result?.ziweiSanFang?.timeConfidence === 'exact' && <div className="relative mt-6 grid grid-cols-2 border-y border-white/10 sm:grid-cols-5">
                {[
                  ['三方主星', result?.ziweiSanFang?.patternMetrics.coreStarCount ?? 0],
                  ['關鍵星覆蓋', result?.ziweiSanFang?.patternMetrics.patternStarCount ?? 0],
                  ['生年四化', result?.ziweiSanFang?.patternMetrics.transformationCount ?? 0],
                  ['生扶／比和', result?.ziweiSanFang?.patternMetrics.supportiveRelationCount ?? 0],
                  ['制約訊號', result?.ziweiSanFang?.patternMetrics.constrainingRelationCount ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-r border-white/10 px-3 py-3 text-center last:border-r-0 sm:border-b-0">
                    <p className="text-xs text-[color:var(--text-muted)]">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-cyan-100">{value}</p>
                  </div>
                ))}
              </div>}
              <p className="relative mt-5 border-t border-white/10 pt-4 text-xs text-[color:var(--text-muted)]">
                {result?.ziweiSanFang?.timeConfidence === 'exact'
                  ? `結構統計：${result.ziweiSanFang.patternMetrics.methodology} · 定格依據：${result.ziweiSanFang.pattern.basis}`
                  : '定格依據：請先提供真實出生時辰，避免以預設時辰產生錯誤命盤。'}
              </p>
            </div>

            <ZiweiTwelvePalaceCards analysis={result?.ziweiSanFang} annual={result?.annualFortune} />

            <div className="hidden">
              <SanFangSummaryCard analysis={result?.ziweiSanFang} />
              <AnnualFortunePanel analysis={result?.annualFortune} />
            </div>

            <div className="hidden">
              <ZiweiSanFangPanel analysis={result?.ziweiSanFang} />
            </div>

            {/* Gemini 文字洞察保留於回傳資料；紫微三方四正以可重算排盤面板呈現。 */}
            {result?.psychologyInsights && result.psychologyInsights.length > 0 && (
              <div className="hidden fortune-card p-6 sm:p-8">
                <p className="mb-6 text-xs uppercase tracking-[0.35em] text-cyan-300">靈魂心理學洞察</p>
                <div className="grid gap-6 md:grid-cols-3">
                  {result.psychologyInsights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="border-l-2 border-cyan-400/30 pl-4 py-1">
                      <p className="font-semibold text-cyan-300">{insight.title}</p>
                      <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{insight.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="hidden fortune-card p-6 sm:p-8">
              <p className="mb-6 text-xs uppercase tracking-[0.35em] text-cyan-300">關鍵發現</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {result?.bigDataInsights?.map((insight, index) => (
                  <div key={index} className="rounded-lg border border-white/5 bg-white/3 p-4">
                    <p className="text-sm font-semibold text-cyan-300">{insight.category}</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">{insight.finding}</p>
                    <p className="mt-3 text-xs text-[color:var(--text-muted)]">
                      樣本數: {insight?.sampleSize?.toLocaleString() ?? '0'}
                    </p>
                    {insight.scoreBasis && (
                      <p className="mt-2 text-xs leading-6 text-cyan-100/70">{insight.scoreBasis}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <details className="fortune-card p-5 sm:p-6">
              <summary className="cursor-pointer list-none text-sm font-semibold text-cyan-100">
                補充建議與摘要
                <span className="ml-2 text-xs font-normal text-[color:var(--text-muted)]">點開查看</span>
              </summary>
              <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
                {result?.personalizedRecommendations && result.personalizedRecommendations.length > 0 && (
                  <ul className="space-y-3 text-sm">
                    {result.personalizedRecommendations.slice(0, 4).map((rec, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="text-cyan-400">→</span>
                        <span className="text-[color:var(--text-sub)]">{rec}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-sm leading-8 text-[color:var(--text-sub)]">{result?.summary}</p>
              </div>
            </details>

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




