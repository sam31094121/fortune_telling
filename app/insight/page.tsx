'use client';

import { useState } from 'react';
import Link from 'next/link';
import VisualGravityCore from '@/components/VisualGravityCore';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import NextStepGuide from '@/components/NextStepGuide';
import { SHICHEN_LIST } from '@/lib/shichen-engine';

// 時辰：null=未選（送出時自動採良辰吉時）、'unknown'=明確不知道、0–11=已選時辰
type ShichenChoice = number | 'unknown' | null;

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
}

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
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
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all hover:border-white/20 ${tones[tone]}`}
    >
      <p className="text-lg font-bold">{title}</p>
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
        <p>百分位：PR {item.percentile}</p>
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

export default function InsightPage() {
  const [input, setInput] = useState<InsightData>({
    name: '',
    birthDate: '',
    bloodType: 'A',
    gender: 'female',
    shichen: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<InsightResult | null>(null);

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

    if (!input.bloodType || !['A', 'B', 'AB', 'O'].includes(input.bloodType)) {
      return '請選擇有效的血型。';
    }

    if (!input.gender || !['male', 'female'].includes(input.gender)) {
      return '請選擇性別。';
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
            bloodType: input.bloodType,
            gender: input.gender,
            shichen: input.shichen,
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

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/" className="text-xs tracking-widest text-[color:var(--text-muted)] transition hover:text-white">
            ← 返回首頁
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <Link href="/music" className="text-xs tracking-widest text-violet-300/70 transition hover:text-violet-300">
            🎵 人格
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <Link href="/match" className="text-xs tracking-widest text-rose-300/70 transition hover:text-rose-300">
            💕 配對
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <span className="text-xs tracking-widest text-cyan-300">✨ 深度洞察</span>
        </div>

        {!result ? (
          <>
            <section className="mb-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-4 inline-block rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-1 text-xs tracking-[0.35em] text-cyan-300">
                  AI 深度洞察
                </div>
                <h1 className="mystic-title mb-4 font-serif text-4xl leading-tight sm:text-5xl">
                  看懂你的潛力<br />找到下一步方向
                </h1>
                <p className="max-w-2xl text-sm leading-8 text-[color:var(--text-sub)]">
                  輸入基本資料，AI 會把命理、心理與統計訊號整理成白話建議。
                  重點放在能理解、能行動，不把多餘細節塞進畫面。
                </p>
              </div>
              <div className="flex justify-center lg:justify-end">
                <VisualGravityCore />
              </div>
            </section>

            <div className="fortune-card space-y-8 p-6 sm:p-8">
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
                    input.shichen !== null
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                      : 'bg-white/10 text-[color:var(--text-muted)] border border-white/10'
                  }`}>
                    ✓ 時辰 {input.shichen === null ? '(自動吉時)' : input.shichen === 'unknown' ? '(良辰吉時)' : SHICHEN_LIST[input.shichen].label}
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
                  onChange={(solarDate) => {
                    if (solarDate && solarDate.trim()) {
                      setInput({ ...input, birthDate: solarDate.trim() });
                    }
                  }}
                  accent="violet"
                  label="國曆生日（民國年）"
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
                      active={input.bloodType === bloodType}
                      title={`${bloodType} 型`}
                      description={BLOOD_DESC[bloodType]}
                      onClick={() => setInput({ ...input, bloodType })}
                      tone={index % 2 === 0 ? 'violet' : 'cyan'}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">4. 性別</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceCard
                    active={input.gender === 'female'}
                    title="女性"
                    description="用來修飾外在表現。"
                    onClick={() => setInput({ ...input, gender: 'female' })}
                    tone="pink"
                  />
                  <ChoiceCard
                    active={input.gender === 'male'}
                    title="男性"
                    description="只做外在呈現修飾。"
                    onClick={() => setInput({ ...input, gender: 'male' })}
                    tone="cyan"
                  />
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                  5. 出生時辰
                  <span className="ml-1 text-xs font-normal text-[color:var(--text-muted)]">（選填）</span>
                  {input.shichen !== null && <span className="text-green-400"> ✓</span>}
                </label>
                <p className="mb-4 text-xs leading-6 text-[color:var(--text-muted)]">
                  知道時辰會讓分析更細；不知道也沒關係。點「我不知道時辰」，系統會用良辰吉時補位。
                </p>

                <button
                  type="button"
                  onClick={() => setInput({ ...input, shichen: 'unknown' })}
                  className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${
                    input.shichen === 'unknown'
                      ? 'border-emerald-400 bg-emerald-400/15'
                      : 'border-white/15 bg-white/5 hover:border-white/25'
                  }`}
                >
                  <p className={`text-base font-bold ${input.shichen === 'unknown' ? 'text-emerald-300' : 'text-[color:var(--text-main)]'}`}>
                    我不知道 / 記不得時辰
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
                    系統會用良辰吉時補位，一樣能完成分析。
                  </p>
                </button>

                {input.shichen === 'unknown' && (
                  <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-950/20 p-4 text-xs leading-6 text-emerald-200">
                    已為你保留良辰吉時。日後想起真實時辰，再補上會更精準。
                  </div>
                )}

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="shrink-0 text-xs text-[color:var(--text-muted)]">或選擇真實出生時辰</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SHICHEN_LIST.map((s) => {
                    const selected = input.shichen === s.branchIndex;
                    return (
                      <button
                        key={s.branchIndex}
                        type="button"
                        onClick={() => setInput({ ...input, shichen: s.branchIndex })}
                        className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                          selected ? 'border-cyan-400 bg-cyan-400/15' : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <p className={`text-base font-bold ${selected ? 'text-cyan-300' : 'text-[color:var(--text-main)]'}`}>{s.label}</p>
                        <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-sub)]">{s.range}</p>
                        <p className="mt-1 text-[11px] leading-4 text-[color:var(--text-muted)]">{s.imagery}</p>
                      </button>
                    );
                  })}
                </div>
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
          </>
        ) : (
          <div className="space-y-6">
            <div className="fortune-card p-6 sm:p-8 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">洞察報告完成</p>
              <h2 className="mt-3 font-serif text-5xl text-[color:var(--text-main)]">{result.accuracyScore}%</h2>
              <p className="mt-2 text-sm text-[color:var(--text-sub)]">資料信心度</p>
              <p className="mx-auto mt-6 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
                整合 {result.dataSourceCount.toLocaleString()} 筆趨勢樣本與個人訊號
              </p>
            </div>

            {result.scoreMethodology && (
              <div className="fortune-card p-6 sm:p-8">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">分數計算邏輯</p>
                <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">每個分數都有固定來源</h3>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-950/15 p-4">
                    <p className="text-xs tracking-[0.25em] text-cyan-300">公式</p>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--text-main)]">{result.scoreMethodology.formula}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs tracking-[0.25em] text-[color:var(--text-muted)]">百分位</p>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{result.scoreMethodology.percentile}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs tracking-[0.25em] text-[color:var(--text-muted)]">樣本基準</p>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{result.scoreMethodology.sampleBasis}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs tracking-[0.25em] text-[color:var(--text-muted)]">同分處理</p>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{result.scoreMethodology.duplicatePolicy}</p>
                  </div>
                </div>

                {result.accuracyBreakdown && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {result.accuracyBreakdown.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[color:var(--text-main)]">{item.label}</p>
                          <p className="text-lg font-bold text-cyan-200">{item.value}</p>
                        </div>
                        <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="fortune-card p-6 sm:p-8">
                <p className="mb-6 text-xs uppercase tracking-[0.35em] text-cyan-300">核心指標來源</p>
                <div className="grid gap-4 xl:grid-cols-2">
                  {result.statisticalAnalysis.map((item) => (
                    <ScoreEvidenceCard key={item.dimension} item={item} />
                  ))}
                </div>
              </div>

              <div className="fortune-card p-6 sm:p-8">
                <p className="mb-6 text-xs uppercase tracking-[0.35em] text-cyan-300">心理學洞察</p>
                <div className="space-y-4 text-sm">
                  {result.psychologyInsights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="border-l-2 border-cyan-400/30 pl-4">
                      <p className="font-semibold text-cyan-300">{insight.title}</p>
                      <p className="mt-1 text-[color:var(--text-sub)]">{insight.description}</p>
                      <p className="mt-2 text-xs text-[color:var(--text-muted)]">信心度: {insight.confidence}%</p>
                      {insight.confidenceSource && (
                        <p className="mt-1 text-xs leading-6 text-cyan-100/70">{insight.confidenceSource}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="fortune-card p-6 sm:p-8">
              <p className="mb-6 text-xs uppercase tracking-[0.35em] text-cyan-300">關鍵發現</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {result.bigDataInsights.map((insight, index) => (
                  <div key={index} className="rounded-lg border border-white/5 bg-white/3 p-4">
                    <p className="text-sm font-semibold text-cyan-300">{insight.category}</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">{insight.finding}</p>
                    <p className="mt-3 text-xs text-[color:var(--text-muted)]">
                      樣本數: {insight.sampleSize.toLocaleString()}
                    </p>
                    {insight.scoreBasis && (
                      <p className="mt-2 text-xs leading-6 text-cyan-100/70">{insight.scoreBasis}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="fortune-card p-6 sm:p-8">
              <p className="mb-4 text-xs uppercase tracking-[0.35em] text-cyan-300">個性化建議</p>
              <ul className="space-y-3 text-sm">
                {result.personalizedRecommendations.map((rec, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-cyan-400">→</span>
                    <span className="text-[color:var(--text-sub)]">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="fortune-card p-6 sm:p-8 text-center">
              <p className="mb-4 font-semibold text-[color:var(--text-main)]">重點摘要</p>
              <p className="text-sm leading-8 text-[color:var(--text-sub)]">{result.summary}</p>
            </div>

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
        )}
      </main>
    </div>
  );
}
