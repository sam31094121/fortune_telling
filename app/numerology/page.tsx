'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import MegaInputGuide from '@/components/MegaInputGuide';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage, IDENTITY_TARGET_UPDATED_EVENT } from '@/lib/identity-split-client';
import { getNumerologyDisplayTier, NUMEROLOGY_ENERGY_LINE_STEPS, type NumerologyDisplayTier } from '@/lib/numerology-display-tiers';
import { getNumerologyExtremeCopy, getNumerologyExtremeVisual } from '@/lib/numerology-extreme-visual';
import { hasCompleteNumberCrossVerdict } from '@/lib/number-cross-gate';

type NumberMode = 'digit2' | 'digit3' | 'last4' | 'digit5' | 'six6' | 'digit7' | 'digit8' | 'digit9' | 'phone10';
type NumberPurpose = 'general' | 'plate' | 'phone' | 'birthdate';

type NumberResult = {
  ok: true;
  mode: NumberMode;
  value: string;
  valueMasked?: string;
  score: number;
  finalScore?: number;
  confidenceScore: number;
  indexes: Record<string, number>;
  matrix: Record<string, number>;
  analysisId?: string;
  requestId?: string;
  engineVersion?: string;
  crossVerdict?: {
    version: 'number-cross-verdict-v1';
    score: number;
    matrix: { score: number; weight: 60; contribution: number };
    iching: { score: number; weight: 40; contribution: number; signalSummary: string };
  };
  googleExplanation?: string;
  googleProvider?: 'Google Gemini';
  iching?: {
    hexagramName: string;
    kingWen: number;
    patternName: string;
    chainScore: number;
    verdictLine: string;
    digitReadings: Array<{ digit: string; trigram: string; nature: string; element: string; image: string; tone: string; psych: string }>;
    crossChain: Array<{ pair: string; kind: '相生' | '相剋' | '比和'; note: string }>;
    ghost: { spirit: string; field: string; karma: string };
  };
};

const VALID_LENGTHS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10]);

const PURPOSE_OPTIONS: Array<{ id: NumberPurpose; label: string; shortLabel: string; detail: string }> = [
  { id: 'general', label: '萬用碼', shortLabel: '這組數字', detail: '不限定用途，直接看整體結構' },
  { id: 'plate', label: '車牌號碼', shortLabel: '這張車牌', detail: '汽車與機車都可用，直接解讀車牌的數字結構' },
  { id: 'phone', label: '電話號碼', shortLabel: '這支電話', detail: '直接解讀聯絡與溝通節奏' },
  { id: 'birthdate', label: '出生年月日', shortLabel: '這組生日數字', detail: '直接解讀個人節奏與成長' },
];

const PURPOSE_COPY: Record<NumberPurpose, { goodHeading: string; riskHeading: string; good: string; risk: string; psychologyContext: string }> = {
  general: {
    goodHeading: '可運用的地方',
    riskHeading: '需要留意的地方',
    good: '可作為安排目前使用節奏與資源的參考。',
    risk: '適合優先安排與調整的地方。',
    psychologyContext: '這股能量主要反映在你目前整體的節奏與資源分配上。',
  },
  plate: {
    goodHeading: '車牌可運用的地方',
    riskHeading: '車牌需要留意的地方',
    good: '在這張車牌的數字解讀中，較能支持出行、往來與使用安排。',
    risk: '是這張車牌在使用節奏與外出安排上較需要留意的地方；不代表車況或行車安全的保證。',
    psychologyContext: '這股能量主要反映在你的出行、往來與車輛使用節奏上。',
  },
  phone: {
    goodHeading: '電話號碼可運用的地方',
    riskHeading: '電話號碼需要留意的地方',
    good: '在這支電話的數字解讀中，較能支持聯絡、人際與工作溝通。',
    risk: '是這支電話在溝通節奏、回應壓力或人際往來上較需要留意的地方。',
    psychologyContext: '這股能量主要反映在你的聯絡節奏、人際互動與工作溝通上。',
  },
  birthdate: {
    goodHeading: '出生年月日可運用的地方',
    riskHeading: '出生年月日需要留意的地方',
    good: '在這組生日數字的解讀中，較能支持個人節奏與成長方向。',
    risk: '是這組生日數字反映出的壓力傾向，適合用來安排生活節奏。',
    psychologyContext: '這股能量主要反映在你的個人成長步調與生活節奏上。',
  },
};

const MODE_LABEL: Record<NumberMode, string> = {
  digit2: '二碼判定',
  digit3: '三碼判定',
  last4: '後四碼',
  digit5: '五碼判定',
  six6: '六碼',
  digit7: '七碼判定',
  digit8: '八碼',
  digit9: '九碼判定',
  phone10: '十碼完整判定',
};

const DIMENSION_LABELS: Record<string, string> = {
  wealth: '財務資源',
  career: '事業推進',
  love: '感情互動',
  family: '家庭穩定',
  social: '人際連結',
  health: '身心節奏',
  growth: '成長動能',
  risk: '節奏提醒',
  pressure: '負荷安排',
  stability: '穩定度',
  structure: '結構',
  balance: '平衡',
  pattern: '組合',
  trend: '趨勢',
};

const EIGHT_STRENGTH_KEYS = ['wealth', 'career', 'love', 'family', 'social', 'health', 'growth', 'stability'] as const;

const TWO_AXIS_GROUPS = [
  { id: 'money', label: '金錢', icon: '💰', keys: ['wealth', 'career', 'growth', 'stability'] as const, note: '財務資源、事業推進、成長動能、穩定度融合成的物質面向。' },
  { id: 'relationship', label: '感情', icon: '💞', keys: ['love', 'family', 'social', 'health'] as const, note: '感情互動、家庭穩定、人際連結、身心節奏融合成的關係面向。' },
] as const;

const FORTUNE_TIER_GLOW: Record<string, string> = {
  '大吉': 'shadow-[0_0_10px_2px_rgba(110,231,183,0.65)]',
  '大吉帶吉': 'shadow-[0_0_10px_2px_rgba(110,231,183,0.65)]',
  '吉': 'shadow-[0_0_10px_2px_rgba(103,232,249,0.65)]',
  '半吉': 'shadow-[0_0_10px_2px_rgba(103,232,249,0.65)]',
  '凶帶吉': 'shadow-[0_0_10px_2px_rgba(252,211,77,0.65)]',
  '凶': 'shadow-[0_0_10px_2px_rgba(252,211,77,0.65)]',
  '大凶帶凶': 'shadow-[0_0_10px_2px_rgba(251,113,133,0.65)]',
  '大凶': 'shadow-[0_0_10px_2px_rgba(251,113,133,0.65)]',
};

function EnergyLine({ tier }: { tier: NumerologyDisplayTier }) {
  const activeIndex = NUMEROLOGY_ENERGY_LINE_STEPS.indexOf(tier);
  return (
    <div
      className="mt-3 flex items-stretch gap-[3px] rounded-xl border border-white/10 bg-black/25 p-1.5"
      role="img"
      aria-label={`八階能量線，目前判定：${tier.label}`}
    >
      {NUMEROLOGY_ENERGY_LINE_STEPS.map((step, index) => {
        const active = index === activeIndex;
        return (
          <div
            key={step.label}
            className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg py-1.5 transition-all duration-500 ${active ? 'bg-white/[0.06]' : ''}`}
          >
            <span
              className={`h-1.5 w-full rounded-full ${step.tone} transition-all duration-500 ${active ? `opacity-100 ${FORTUNE_TIER_GLOW[step.label] ?? ''}` : 'opacity-25'}`}
            />
            <span
              className={`flex h-12 items-center justify-center font-mono text-[10px] font-black leading-tight tracking-[0.08em] transition-all duration-500 ${active ? `${step.labelTone} opacity-100` : 'text-white/32 opacity-80'}`}
              style={{ writingMode: 'vertical-rl' }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const SAMPLE_NUMBERS = ['1688', '168888', '52013145', '0912345678'];

function cleanNumber(value: string) {
  return value
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, '')
    .slice(0, 10);
}

function pickEntries(values: Record<string, number>, count: number, order: 'desc' | 'asc' = 'desc') {
  return Object.entries(values)
    .sort((a, b) => order === 'desc' ? b[1] - a[1] : a[1] - b[1])
    .slice(0, count);
}

function getLevel(score: number) {
  if (score >= 82) {
    return {
      label: '結構較順',
      tone: '這組排列較容易形成連貫節奏，可挑一件事穩定推進。',
      className: 'border-emerald-200/35 bg-emerald-300/12 text-emerald-50',
    };
  }
  if (score >= 68) {
    return {
      label: '節奏可用',
      tone: '這組排列有可運用的地方，先把重點放在穩定與清楚。',
      className: 'border-cyan-200/35 bg-cyan-300/12 text-cyan-50',
    };
  }
  if (score >= 55) {
    return {
      label: '需要安排',
      tone: '這組排列提醒你先安排節奏，再決定要不要往前推進。',
      className: 'border-amber-200/40 bg-amber-300/12 text-amber-50',
    };
  }
  if (score >= 40) {
    return {
      label: '先整理節奏',
      tone: '先把訊息、時間或資源整理清楚，再做下一個選擇。',
      className: 'border-orange-200/40 bg-orange-300/12 text-orange-50',
    };
  }
  return {
    label: '先從簡單處開始',
    tone: '不急著放大這組數字的意義，先回到一個可完成的小步驟。',
    className: 'border-rose-200/40 bg-rose-300/12 text-rose-50',
  };
}

export default function NumerologyPage() {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<NumberResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [purpose, setPurpose] = useState<NumberPurpose>('general');
  const resultRef = useRef<HTMLElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const clearIdentityError = () => {
      setError((prev) => (prev === getIdentityRequiredMessage() ? '' : prev));
    };
    window.addEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
    return () => window.removeEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
  }, []);

  const cleanValue = cleanNumber(value);
  const canSubmit = VALID_LENGTHS.has(cleanValue.length);
  const progress = Math.min(100, Math.round((cleanValue.length / 10) * 100));
  const numberInputSize = cleanValue.length >= 9
      ? 'clamp(3.15rem, 13.4vw, 5.25rem)'
      : cleanValue.length >= 7
        ? 'clamp(4.15rem, 17vw, 6.6rem)'
        : 'clamp(6.25rem, 27vw, 8.8rem)';
  const numberInputDigitStyle = {
    '--fortune-number-input-size': numberInputSize,
    fontSize: numberInputSize,
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum" 1',
    letterSpacing: '0',
  } as CSSProperties & Record<'--fortune-number-input-size', string>;
  const crossVerdictComplete = result ? hasCompleteNumberCrossVerdict(result.crossVerdict, result.iching) : false;
  const score = crossVerdictComplete && result?.crossVerdict ? result.crossVerdict.score : 0;
  const level = result ? getLevel(score) : null;
  const directionalMatrix = useMemo(() => {
    if (!result) return {};
    return Object.fromEntries(EIGHT_STRENGTH_KEYS.map((key) => [key, result.matrix[key]]));
  }, [result]);
  const topStrengths = useMemo(() => pickEntries(directionalMatrix, 3), [directionalMatrix]);
  const topRisks = useMemo(() => pickEntries(directionalMatrix, 2, 'asc'), [directionalMatrix]);
  const bestPoint = topStrengths[0];
  const weakPoint = topRisks[0];
  const bestTier = bestPoint ? getNumerologyDisplayTier(bestPoint[1]) : null;
  const weakTier = weakPoint ? getNumerologyDisplayTier(weakPoint[1]) : null;
  const overallDirectionalScore = useMemo(() => {
    const values = EIGHT_STRENGTH_KEYS.map((key) => directionalMatrix[key]).filter((score): score is number => typeof score === 'number');
    if (values.length === 0) return 0;
    return values.reduce((sum, score) => sum + score, 0) / values.length;
  }, [directionalMatrix]);
  const overallTier = getNumerologyDisplayTier(score);
  const extremeVisual = getNumerologyExtremeVisual(overallTier.label);
  const extremeCopy = getNumerologyExtremeCopy(extremeVisual);
  const twoAxisScores = useMemo(() => TWO_AXIS_GROUPS.map((group) => {
    const values = group.keys.map((key) => directionalMatrix[key]).filter((score): score is number => typeof score === 'number');
    const average = values.length === 0 ? 0 : values.reduce((sum, score) => sum + score, 0) / values.length;
    return { ...group, average, tier: getNumerologyDisplayTier(average) };
  }), [directionalMatrix]);
  const purposeOption = PURPOSE_OPTIONS.find((option) => option.id === purpose) ?? PURPOSE_OPTIONS[0];
  const purposeCopy = PURPOSE_COPY[purpose];

  async function handleSubmit() {
    const target = getAnalysisIdentityTarget();
    if (!target) {
      setError(getIdentityRequiredMessage());
      return;
    }
    if (!canSubmit) {
      setError('請輸入 2 到 10 碼阿拉伯數字。');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/number-fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: cleanValue, purpose }),
      });
      const json = await response.json();
      if (!response.ok || !json?.ok) {
        throw new Error(json?.message || '數字分析暫時無法完成，請再試一次。');
      }
      setResult(json as NumberResult);
      markGrowthModuleCompleted('number');
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (event) {
      setError(event instanceof Error ? event.message : '數字分析暫時無法完成，請再試一次。');
    } finally {
      setLoading(false);
    }
  }

  function retryWithAnotherNumber() {
    setValue('');
    setResult(null);
    setError('');
    window.setTimeout(() => numberInputRef.current?.focus(), 0);
  }

  return (
    <main className="min-h-screen bg-[#080a10] px-4 py-5 text-[color:var(--text-main)] sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Link href="/" className="feature-home-link feature-home-link--cyan w-fit">
          返回首頁
        </Link>

        <section className="relative overflow-hidden rounded-[26px] border border-amber-200/20 bg-[linear-gradient(145deg,rgba(10,12,18,0.98),rgba(32,26,16,0.94)_52%,rgba(8,10,16,0.98))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-6">
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/60 to-transparent" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.2em] text-amber-200/85">數字文化解讀</p>
              <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-amber-50">易經論數字</h1>
              {/* 說明句已依指示隱藏：客戶直接看輸入規格與結果即可。 */}
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-200/35 bg-amber-300/12 font-serif text-3xl font-black text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.2)]">
              數
            </div>
          </div>

          {/* 可用推力／先看風險／一個行動三張引導卡已依指示隱藏：客戶直接輸入數字即可。 */}

          {/* S01-S03 接收/運算/判定狀態卡已隱藏（2026-08-10）：客戶不用看 */}
          <div className="mt-5 hidden grid-cols-3 gap-2">
            {['接收', '運算', '判定'].map((step, index) => {
              const passed = index === 0 ? purpose !== 'general' || cleanValue.length > 0 : index === 1 ? VALID_LENGTHS.has(cleanValue.length) : loading || Boolean(result);
              return (
                <div
                  key={step}
                  className={`rounded-2xl border px-3 py-2.5 ${
                    passed
                      ? 'border-emerald-200/30 bg-emerald-300/10 text-emerald-100'
                      : 'border-white/10 bg-white/[0.035] text-white/58'
                  }`}
                >
                  <p className="text-[10px] font-black tracking-[0.14em]">S0{index + 1}</p>
                  <p className="mt-1 text-sm font-black">{step}</p>
                  <p className="mt-0.5 text-[10px] font-black">{passed ? 'PASS' : 'READY'}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3">
          <DailyAnalysisNotice moduleName="易經論數字" />
          <IdentitySplitSelector nextStepLabel="接著選用途並輸入數字" />
        </section>

        <section className="rounded-[26px] border border-white/12 bg-[linear-gradient(160deg,rgba(12,15,22,0.98),rgba(18,29,32,0.92),rgba(8,10,16,0.98))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.28)] sm:p-5">
          {/* 「請填阿拉伯數字」引導卡已隱藏（2026-08-11）：依指示不顯示 */}
          {false && (
            <MegaInputGuide
              title="請填阿拉伯數字"
              steps={['只輸入 0-9', '可填 2 到 10 碼', '看清大字後再按開始']}
              example="1688、8888、0912345678"
              tone="amber"
              className="mb-4"
            />
          )}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-cyan-100/70">第二步</p>
              <h2 className="mt-1 font-serif text-2xl font-black text-cyan-50">輸入數字</h2>
              <p className="mt-1 text-xs font-black text-amber-100/80">支援 2 到 10 碼數字</p>
            </div>
            <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-black text-cyan-100">
              {cleanValue.length}/10
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-full bg-white/10">
            <span className="block h-2 rounded-full bg-gradient-to-r from-amber-300 via-cyan-200 to-emerald-300 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-3 rounded-2xl border border-cyan-100/15 bg-cyan-200/[0.045] px-3 py-2.5 text-center">
            <p className="text-[10px] font-black tracking-[0.16em] text-cyan-100/65">第二步 · 選擇解讀用途（可略過，預設萬用碼）</p>
            <p className="mt-1 text-[11px] font-bold text-white/60">不確定用途？直接使用閃爍的萬用碼；需要時再選車牌、電話或出生年月日。</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PURPOSE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { setPurpose(option.id); setResult(null); }}
                  aria-pressed={purpose === option.id}
                  className={`min-h-[72px] rounded-xl border px-2.5 py-2 text-left transition ${purpose === option.id ? 'border-2 border-amber-100 bg-amber-300/22 text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.38)]' : 'border-white/12 bg-black/15 text-white/62 hover:border-cyan-100/40 hover:text-cyan-50'} ${purpose === 'general' && option.id === 'general' ? 'animate-[pulse_1.6s_ease-in-out_infinite] ring-2 ring-amber-200/50 ring-offset-2 ring-offset-[#112026]' : ''}`}
                >
                  <span className="flex items-center justify-between gap-2 text-[11px] font-black"><span>{option.label}</span>{option.id === 'general' && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] tracking-[0.12em] text-slate-950">預設推薦</span>}</span>
                  <span className="mt-1 block text-[9px] font-bold leading-4 opacity-75">{option.detail}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-bold text-white/58">目前：{purposeOption.label}。依輸入位數與組合進行判定。</p>
          </div>

          <p className="mt-3 rounded-xl border-2 border-amber-100 bg-amber-300/20 px-3 py-2 text-center text-[12px] font-black text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.32)] ring-2 ring-amber-200/45 ring-offset-2 ring-offset-[#112026]">
            第三步 · 直接輸入 0–9 數字，例如 2559（全形數字也可）
          </p>

          <input
            ref={numberInputRef}
            value={value}
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => {
              const nextValue = cleanNumber(event.target.value);
              setValue(nextValue);
              setError('');
            }}
            onFocus={() => setError('')}
            placeholder="1688"
            aria-label="第 3 步，輸入數字"
            style={numberInputDigitStyle}
            className="fortune-number-max-input mt-4 min-h-[168px] w-full rounded-[30px] border-2 border-amber-100 bg-black/55 px-2 py-8 text-center font-mono font-black leading-none text-amber-50 shadow-[inset_0_0_42px_rgba(251,191,36,0.16),0_0_44px_rgba(251,191,36,0.32)] outline-none transition placeholder:text-white/24 ring-2 ring-amber-200/45 ring-offset-2 ring-offset-[#112026] focus:shadow-[inset_0_0_42px_rgba(251,191,36,0.2),0_0_52px_rgba(251,191,36,0.4)] sm:min-h-[196px]"
          />

          {/* 範例說明已依指示隱藏；客戶只需看上方的位數引導後直接輸入。 */}

          {/* 範例數字快捷鈕已隱藏（2026-08-10）：客戶不需要看到 */}
          <div className="mt-3 hidden grid-cols-2 gap-2 sm:grid-cols-4">
            {SAMPLE_NUMBERS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setValue(sample);
                  setError('');
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-cyan-50 transition active:scale-[0.98]"
              >
                {sample}
              </button>
            ))}
          </div>

          {error && <p className="mt-3 rounded-2xl border border-rose-200/35 bg-rose-300/10 p-3 text-sm font-bold leading-6 text-rose-100">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 min-h-[58px] w-full rounded-2xl border border-amber-200/55 bg-amber-300 px-5 py-4 text-base font-black text-slate-950 shadow-[0_0_30px_rgba(251,191,36,0.24)] transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? '易經正在完成判定' : '立即開始'}
          </button>
        </section>

        {result && !crossVerdictComplete && (
          <section ref={resultRef} tabIndex={-1} className="number-fortune-analysis-card scroll-mt-5 rounded-[26px] border border-amber-200/20 bg-slate-950/90 p-5 outline-none">
            <p className="text-base font-black text-amber-100">交叉判定尚未完成</p>
            <p className="mt-2 text-sm font-bold leading-6 text-white/70">需要同時取得數字結構與易經交叉資料後，才會顯示最終吉凶與能量線。請重新嘗試，不會以原始分數替代結論。</p>
          </section>
        )}
        {result && level && crossVerdictComplete && (
          <section ref={resultRef} tabIndex={-1} className="number-fortune-analysis-card scroll-mt-5 space-y-4 rounded-[26px] border border-amber-200/20 bg-[linear-gradient(145deg,rgba(12,15,22,0.98),rgba(28,23,14,0.95),rgba(8,10,16,0.98))] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.34)] outline-none sm:p-5">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-cyan-100/75">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                數字解讀完成
              </div>
              <span className="font-mono text-[10px] font-black text-amber-100/75">{result.valueMasked ?? result.value}</span>
            </div>
            {/* 「這組數字的節奏」（getLevel 5級敘事）與下方金錢／感情吉凶判定重複，已依指示隱藏；保留程式碼供之後需要時叫醒。 */}
            {false && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-[10px] font-black tracking-[0.2em] text-amber-200">這組數字的節奏</p>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-serif text-3xl font-black leading-none text-amber-100">{level!.label}</p>
                    <p className="mt-2 text-xs font-bold text-white/58">{MODE_LABEL[result!.mode]} · 固定規則的結構提示</p>
                  </div>
                  <span className={`rounded-full border px-4 py-2 text-sm font-black ${level!.className}`}>文化參考</span>
                </div>
                <p className="mt-4 text-lg font-black leading-8 text-cyan-50">{level!.tone}</p>
              </div>
            )}

            {/* 你的數字屬什麼卦：每一組輸入都經梅花易數起卦＋逐碼配卦＋生剋交叉，卦是比對出來的，不是亂補 */}
            {result.iching && (
              <details className="rounded-2xl border border-amber-200/30 bg-[linear-gradient(140deg,rgba(251,191,36,0.1),rgba(15,23,42,0.7))] p-4" aria-label="你的數字屬什麼卦">
                <summary className="flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-xl px-2 text-left transition hover:bg-amber-100/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-100">
                  <span className="numerology-hexagram-title text-lg font-black tracking-[0.1em] text-amber-50 sm:text-xl">數字易經卦象</span>
                  <span className="text-right text-xs font-bold leading-5 text-amber-100/80">點閱</span>
                </summary>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="mt-2 font-serif text-2xl font-black leading-8 text-amber-50">
                      第 {result.iching.kingWen} 卦「{result.iching.hexagramName}」・主題「{result.iching.patternName}」
                    </h3>
                  </div>
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-200/35 bg-amber-300/12 font-serif text-4xl font-black text-amber-100" aria-hidden="true">
                    {String.fromCodePoint(0x4dc0 + result.iching.kingWen - 1)}
                  </span>
                </div>
                <p className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-bold leading-7 text-amber-50/90">{result.iching.verdictLine}</p>
                <div className="mt-3">
                  <p className="text-[10px] font-black tracking-[0.16em] text-amber-100/75">逐碼配卦・每一個數字都有它的卦</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.iching.digitReadings.map((d, i) => (
                      <span key={`${d.digit}-${i}`} className="rounded-xl border border-amber-200/25 bg-black/25 px-2.5 py-1.5 text-center">
                        <span className="block font-mono text-base font-black text-amber-100">{d.digit}</span>
                        <span className="block text-[10px] font-black text-white/70">{d.trigram}{d.nature}・{d.element}</span>
                      </span>
                    ))}
                  </div>
                </div>
                {result.iching.crossChain.length > 0 && (
                  <details className="growth-detail-drawer mt-3">
                    <summary>查看逐碼關係與計算依據</summary>
                    <div className="mt-2 space-y-1.5">
                      {result.iching.crossChain.map((link, i) => (
                        <p key={i} className="text-xs font-bold leading-5 text-white/65">
                          {link.pair}【{link.kind}】{link.note}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </details>
            )}

            {result.googleExplanation && (
              <article className="rounded-2xl border border-blue-200/25 bg-blue-300/[0.07] p-4">
                <p className="text-[10px] font-black tracking-[0.18em] text-blue-100">延伸解說</p>
                <p className="mt-2 text-sm font-bold leading-7 text-white/82">{result.googleExplanation}</p>
              </article>
            )}

            {/* 「可運用・本次最強」「先留意・本次待補強」兩張卡片與下方金錢／感情吉凶判定內容重複，已依指示隱藏；保留程式碼供之後需要時叫醒。 */}
            {false && (
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-emerald-200/25 bg-emerald-300/[0.08] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black tracking-[0.18em] text-emerald-100">可運用・本次最強</p>
                    {bestTier && <span className="rounded-full border border-emerald-200/30 bg-emerald-300/15 px-2 py-0.5 text-[10px] font-black text-emerald-100">{bestTier!.label}</span>}
                  </div>
                  <h3 className="mt-2 text-base font-black text-emerald-50">{purposeCopy.goodHeading}</h3>
                  <p className="mt-2 text-sm font-bold leading-7 text-white/76">
                    {bestPoint ? `${DIMENSION_LABELS[bestPoint[0]] ?? bestPoint[0]}較可運用，${purposeCopy.good}` : `${purposeOption.shortLabel}仍有可用的支持點。`}
                  </p>
                  {bestTier && <p className="mt-2 text-[11px] font-semibold leading-5 text-emerald-100/75">{bestTier!.psychology}{purposeCopy.psychologyContext}</p>}
                </article>
                <article className="rounded-2xl border border-rose-200/25 bg-rose-300/[0.08] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black tracking-[0.18em] text-rose-100">先留意・本次待補強</p>
                    {weakTier && <span className="rounded-full border border-rose-200/30 bg-rose-300/15 px-2 py-0.5 text-[10px] font-black text-rose-100">{weakTier!.label}</span>}
                  </div>
                  <h3 className="mt-2 text-base font-black text-rose-50">{purposeCopy.riskHeading}</h3>
                  <p className="mt-2 text-sm font-bold leading-7 text-white/76">
                    {weakPoint ? `${DIMENSION_LABELS[weakPoint[0]] ?? weakPoint[0]}是本次優先安排的面向，${purposeCopy.risk}` : `${purposeOption.shortLabel}目前沒有明顯優先安排處，但仍可保留檢查節奏。`}
                  </p>
                  {weakTier && <p className="mt-2 text-[11px] font-semibold leading-5 text-rose-100/75">{weakTier!.psychology}{purposeCopy.psychologyContext}</p>}
                </article>
              </div>
            )}

            {/* 01/02/03 索引條原本對應上方三張卡片，「可運用」「先留意」已隱藏，索引條一併隱藏；保留程式碼供之後需要時叫醒。 */}
            {false && (
              <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20 text-center">
                {[
                  ['01', '可運用', '看見可用的安排'],
                  ['02', '先留意', '先收好需要調整處'],
                  ['03', '今天怎麼安排', '只做一個小決定'],
                ].map(([order, title, caption], index) => (
                  <div key={order} className={`px-2 py-3 ${index < 2 ? 'border-r border-white/10' : ''}`}>
                    <p className="font-mono text-[10px] font-black text-amber-200/85">{order}</p>
                    <p className="mt-1 text-xs font-black text-cyan-50">{title}</p>
                    <p className="mt-1 text-[10px] font-semibold leading-4 text-white/48">{caption}</p>
                  </div>
                ))}
              </div>
            )}

            <section className="rounded-2xl border border-violet-200/20 bg-violet-300/[0.055] p-4" aria-label="《易經》論數字：金錢與感情兩個中軸">
              <div className={`numerology-verdict-panel numerology-verdict-panel--${extremeVisual ?? 'standard'} mt-4 rounded-2xl border border-violet-200/25 bg-violet-300/[0.08] p-4`} aria-label={`${overallTier.label}判定；${extremeVisual ? '已啟用極位文化反思提示' : '一般判定'}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">融會貫通・單一判定</p>
                <p className={`mt-2 text-2xl font-black ${overallTier.labelTone}`}>{purposeOption.shortLabel}論吉凶：{overallTier.label}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-white/76">{overallTier.feel}</p>
                {result.crossVerdict && (
                  <p className="mt-2 text-xs font-bold leading-5 text-white/58">綜合判定 {result.crossVerdict.score} 分：數字結構 {result.crossVerdict.matrix.score} 分 × 60%（{result.crossVerdict.matrix.contribution}）＋易經訊號 {result.crossVerdict.iching.score} 分 × 40%（{result.crossVerdict.iching.contribution}）。作為文化解讀與自我反思參考，不代表保證或預測。</p>
                )}
                {extremeCopy && <p className="numerology-extreme-copy mt-3 rounded-xl px-3 py-2 text-xs font-black leading-5 text-white/82">{extremeCopy}</p>}
                {overallTier.label === '大凶' && (
                  <div className="mt-3 rounded-xl border border-rose-200/25 bg-black/20 p-3">
                    <p className="text-xs font-bold leading-5 text-white/72">想換一組數字重新探索嗎？這是數字結構的文化解讀，不代表改變命運或避免任何現實事件。</p>
                    <button type="button" onClick={retryWithAnotherNumber} className="mt-2 min-h-[44px] rounded-xl border border-rose-200/60 bg-rose-300/20 px-4 text-sm font-black text-rose-50">換一個號碼再試</button>
                  </div>
                )}
                <EnergyLine tier={overallTier} />
                <p className="mt-3 text-[10px] font-bold text-white/40">以下是這項判定融合出來的組成依據：金錢、感情兩個中軸。</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {twoAxisScores.map((axis) => (
                  <div key={axis.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-white/85">{axis.icon} {axis.label}</span>
                      <span className={`text-sm font-black ${axis.tier.labelTone}`}>{axis.tier.label}</span>
                    </div>
                    <p className="mt-2 text-xs font-bold leading-5 text-white/60">{axis.tier.feel}</p>
                    <p className="mt-2 text-[10px] font-semibold leading-4 text-white/40">{axis.note}</p>
                    <EnergyLine tier={axis.tier} />
                  </div>
                ))}
              </div>
              {/* 技術性校準說明對客戶沒意義，已依指示隱藏；保留程式碼供之後需要時叫醒。 */}
              {false && (
                <p className="mt-3 text-[11px] font-bold leading-5 text-white/54">金錢、感情兩個中軸各自融合 4 個面向的平均分數，共用同一條八階能量線，最高「大吉」、最低「大凶」。能量線保留大吉、大吉帶吉、吉、半吉、凶帶吉、凶、大凶帶凶、大凶八個位置，呈現分數落點的細微差異；但最終判定只會落在大吉、大吉帶吉、吉、凶、大凶帶凶、大凶六種標籤：55 至 59 分會跳至「吉」，50 至 54 分會跳至「凶」，所以「半吉」與「凶帶吉」只作為視覺刻度、不會成為判定落點。原始分數與 8 個面向的計算依據完整保留。分級門檻依這套固定規則實際算出的分數範圍校準，不是機率統計或人生保證。</p>
              )}
              <p className="mt-3 text-[11px] font-semibold leading-5 text-white/50">這不是在幫你貼標籤，是想讓你先看懂自己此刻站在哪一階；易經懂你走到這裡的不容易，才知道下一步怎麼走最順。</p>
            </section>

            {/* 「補充：結構重點」是 8 個原始面向的強弱清單，跟上方金錢／感情兩個中軸完全重複，已依指示隱藏；保留程式碼供之後需要時叫醒。 */}
            {false && (
              <details className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.045] p-4">
                <summary className="cursor-pointer text-sm font-black text-cyan-100">補充：結構重點</summary>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <article className="rounded-2xl border border-white/10 bg-black/18 p-3">
                    <p className="text-xs font-black text-emerald-100">較可運用</p>
                    <div className="mt-2 space-y-2">
                      {topStrengths.map(([key, itemScore]) => (
                        <p key={key} className="flex items-center justify-between gap-3 text-sm font-bold text-white/76">
                          <span>{DIMENSION_LABELS[key] ?? key}</span>
                          <span className="text-emerald-100">{getNumerologyDisplayTier(itemScore).label}<span className="ml-1 text-[10px] text-emerald-100/50">{itemScore}</span></span>
                        </p>
                      ))}
                    </div>
                  </article>
                  <article className="rounded-2xl border border-white/10 bg-black/18 p-3">
                    <p className="text-xs font-black text-rose-100">先留意</p>
                    <div className="mt-2 space-y-2">
                      {topRisks.map(([key, itemScore]) => (
                        <p key={key} className="flex items-center justify-between gap-3 text-sm font-bold text-white/76">
                          <span>{DIMENSION_LABELS[key] ?? key}</span>
                          <span className="text-rose-100">{getNumerologyDisplayTier(itemScore).label}<span className="ml-1 text-[10px] text-rose-100/50">{itemScore}</span></span>
                        </p>
                      ))}
                    </div>
                  </article>
                </div>
              </details>
            )}

            {/* 「老師模式：完整指標」依指示隱藏，不需要客戶看到；保留程式碼供之後需要時叫醒。 */}
            {false && (
              <details className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <summary className="cursor-pointer text-sm font-black text-amber-100">老師模式：完整指標</summary>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {Object.entries(result!.indexes).map(([key, itemScore]) => (
                    <p key={key} className="rounded-xl border border-white/10 bg-black/18 px-3 py-2 text-xs font-bold text-white/58">
                      {DIMENSION_LABELS[key] ?? key}：<span className="text-cyan-100">{itemScore}</span>
                    </p>
                  ))}
                </div>
                <p className="mt-3 text-xs font-semibold leading-6 text-white/44">
                  老師模式只保留後端運算指標，給需要細看的人展開；一般客戶先看上方三句判定即可。
                </p>
              </details>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
