'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import MegaInputGuide from '@/components/MegaInputGuide';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage, IDENTITY_TARGET_UPDATED_EVENT } from '@/lib/identity-split-client';

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
  googleExplanation?: string;
  googleProvider?: 'Google Gemini';
};

const VALID_LENGTHS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10]);

const PURPOSE_OPTIONS: Array<{ id: NumberPurpose; label: string; shortLabel: string; detail: string }> = [
  { id: 'general', label: '萬用碼', shortLabel: '這組數字', detail: '不限定用途，直接看整體結構' },
  { id: 'plate', label: '車牌號碼', shortLabel: '這張車牌', detail: '汽車與機車都可用，直接解讀車牌的數字結構' },
  { id: 'phone', label: '電話號碼', shortLabel: '這支電話', detail: '直接解讀聯絡與溝通節奏' },
  { id: 'birthdate', label: '出生年月日', shortLabel: '這組生日數字', detail: '直接解讀個人節奏與成長' },
];

const PURPOSE_COPY: Record<NumberPurpose, { goodHeading: string; riskHeading: string; strengthTitle: string; good: string; risk: string; next: string }> = {
  general: {
    goodHeading: '好在哪裡',
    riskHeading: '要留意什麼',
    strengthTitle: '八段強弱',
    good: '最能支持目前的整體使用節奏與資源安排。',
    risk: '是目前最需要先留意的壓力點。',
    next: '保留優勢，先把最低分的面向收穩。',
  },
  plate: {
    goodHeading: '車牌好在哪裡',
    riskHeading: '車牌要留意什麼',
    strengthTitle: '車牌八段強弱',
    good: '在這張車牌的數字解讀中，較能支持出行、往來與使用安排。',
    risk: '是這張車牌在使用節奏與外出安排上較需要留意的地方；不代表車況或行車安全的保證。',
    next: '以正常保養與安全駕駛為主，再把數字當作選牌參考。',
  },
  phone: {
    goodHeading: '電話號碼好在哪裡',
    riskHeading: '電話號碼要留意什麼',
    strengthTitle: '電話號碼八段強弱',
    good: '在這支電話的數字解讀中，較能支持聯絡、人際與工作溝通。',
    risk: '是這支電話在溝通節奏、回應壓力或人際往來上較需要留意的地方。',
    next: '把重要訊息說清楚、留出回應時間，讓溝通優勢真正發揮。',
  },
  birthdate: {
    goodHeading: '出生年月日好在哪裡',
    riskHeading: '出生年月日要留意什麼',
    strengthTitle: '出生年月日八段強弱',
    good: '在這組生日數字的解讀中，較能支持個人節奏與成長方向。',
    risk: '是這組生日數字反映出的壓力傾向，適合用來安排生活節奏。',
    next: '把優勢放進日常選擇，並先照顧最容易失衡的環節。',
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
  risk: '風險壓力',
  pressure: '壓力管理',
  stability: '穩定度',
  structure: '結構',
  balance: '平衡',
  pattern: '組合',
  trend: '趨勢',
};

const EIGHT_STRENGTH_KEYS = ['wealth', 'career', 'love', 'family', 'social', 'health', 'growth', 'stability'] as const;

const SAMPLE_NUMBERS = ['1688', '168888', '52013145', '0912345678'];

function cleanNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function pickEntries(values: Record<string, number>, count: number, order: 'desc' | 'asc' = 'desc') {
  return Object.entries(values)
    .sort((a, b) => order === 'desc' ? b[1] - a[1] : a[1] - b[1])
    .slice(0, count);
}

function getLevel(score: number) {
  if (score >= 82) {
    return {
      label: '很好',
      tone: '能量集中，適合主動推進。',
      className: 'border-emerald-200/35 bg-emerald-300/12 text-emerald-50',
    };
  }
  if (score >= 68) {
    return {
      label: '偏好',
      tone: '條件順手，可以穩定前進。',
      className: 'border-cyan-200/35 bg-cyan-300/12 text-cyan-50',
    };
  }
  if (score >= 55) {
    return {
      label: '好中帶壓',
      tone: '有機會，也有壓力，先控風險再前進。',
      className: 'border-amber-200/40 bg-amber-300/12 text-amber-50',
    };
  }
  if (score >= 40) {
    return {
      label: '壞中有轉',
      tone: '先整理節奏，避免急著擴張。',
      className: 'border-orange-200/40 bg-orange-300/12 text-orange-50',
    };
  }
  return {
    label: '需要避險',
    tone: '暫時不衝，先修正最弱環節。',
    className: 'border-rose-200/40 bg-rose-300/12 text-rose-50',
  };
}

export default function NumerologyPage() {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<NumberResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [purpose, setPurpose] = useState<NumberPurpose>('general');

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
  const score = result ? result.finalScore ?? result.score : 0;
  const level = result ? getLevel(score) : null;
  const topStrengths = useMemo(() => (result ? pickEntries(result.matrix, 3) : []), [result]);
  const topRisks = useMemo(() => (result ? pickEntries(result.matrix, 2, 'asc') : []), [result]);
  const bestPoint = topStrengths[0];
  const weakPoint = topRisks[0];
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
    } catch (event) {
      setError(event instanceof Error ? event.message : '數字分析暫時無法完成，請再試一次。');
    } finally {
      setLoading(false);
    }
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
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/85">CARD 02 · NUMBER TASTING</p>
              <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-amber-50">數字論好壞</h1>
              {/* 說明句已依指示隱藏：客戶直接看輸入規格與結果即可。 */}
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-200/35 bg-amber-300/12 font-serif text-3xl font-black text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.2)]">
              吉
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

        <section className="rounded-[26px] border border-white/12 bg-[linear-gradient(160deg,rgba(12,15,22,0.98),rgba(18,29,32,0.92),rgba(8,10,16,0.98))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.28)] sm:p-5">
          {/* 「請填阿拉伯數字」引導卡已隱藏（2026-08-11）：依指示不顯示 */}
          {false && (
            <MegaInputGuide
              title="請填阿拉伯數字"
              steps={['只輸入 0-9', '可填 4、6、8 或 10 碼', '看清大字後再按開始']}
              example="1688、8888、0912345678"
              tone="amber"
              className="mb-4"
            />
          )}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">NUMBER</p>
              <h2 className="mt-1 font-serif text-2xl font-black text-cyan-50">輸入數字</h2>
              <p className="mt-1 text-xs font-black text-amber-100/80">支援 2 到 10 碼阿拉伯數字</p>
            </div>
            <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-black text-cyan-100">
              {cleanValue.length}/10
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-full bg-white/10">
            <span className="block h-2 rounded-full bg-gradient-to-r from-amber-300 via-cyan-200 to-emerald-300 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-3 rounded-2xl border border-cyan-100/15 bg-cyan-200/[0.045] px-3 py-2.5 text-center">
            <p className="text-[10px] font-black tracking-[0.16em] text-cyan-100/65">1 · 選擇解讀用途（可略過，預設萬用碼）</p>
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
            直接輸入 2 到 10 碼阿拉伯數字，系統會自動辨識位數
          </p>

          <input
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
            {loading ? 'AI 正在完成判定' : '立即開始'}
          </button>
        </section>

        <section className="grid gap-3">
          <DailyAnalysisNotice moduleName="AI 數字論好壞" />
          <IdentitySplitSelector />
        </section>

        {result && level && (
          <section className="space-y-4 rounded-[26px] border border-amber-200/20 bg-[linear-gradient(145deg,rgba(12,15,22,0.98),rgba(28,23,14,0.95),rgba(8,10,16,0.98))] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.34)] sm:p-5">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-cyan-100/75">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                NUMBER SIGNAL · RESULT READY
              </div>
              <span className="font-mono text-[10px] font-black text-amber-100/75">{result.valueMasked ?? result.value}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">AI FINAL</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-serif text-5xl font-black leading-none text-amber-100">{score}</p>
                  <p className="mt-2 text-xs font-bold text-white/58">信心度 {result.confidenceScore}% · {MODE_LABEL[result.mode]}</p>
                </div>
                <span className={`rounded-full border px-4 py-2 text-sm font-black ${level.className}`}>{level.label}</span>
              </div>
              <p className="mt-4 text-lg font-black leading-8 text-cyan-50">{level.tone}</p>
            </div>

            {result.googleExplanation && (
              <article className="rounded-2xl border border-blue-200/25 bg-blue-300/[0.07] p-4">
                <p className="text-[10px] font-black tracking-[0.18em] text-blue-100">GOOGLE 解說</p>
                <p className="mt-2 text-sm font-bold leading-7 text-white/82">{result.googleExplanation}</p>
              </article>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-emerald-200/25 bg-emerald-300/[0.08] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">GOOD</p>
                <h3 className="mt-2 text-base font-black text-emerald-50">{purposeCopy.goodHeading}</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-white/76">
                  {bestPoint ? `${DIMENSION_LABELS[bestPoint[0]] ?? bestPoint[0]}最亮，${purposeCopy.good}` : `${purposeOption.shortLabel}仍有可用的支持點。`}
                </p>
              </article>
              <article className="rounded-2xl border border-rose-200/25 bg-rose-300/[0.08] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-100">RISK</p>
                <h3 className="mt-2 text-base font-black text-rose-50">{purposeCopy.riskHeading}</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-white/76">
                  {weakPoint ? `${DIMENSION_LABELS[weakPoint[0]] ?? weakPoint[0]}最低，${purposeCopy.risk}` : `${purposeOption.shortLabel}目前沒有明顯低點，但仍保留檢查節奏。`}
                </p>
              </article>
              <article className="rounded-2xl border border-amber-200/25 bg-amber-300/[0.1] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">NEXT</p>
                <h3 className="mt-2 text-base font-black text-amber-50">下一步</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-white/76">
                  {purposeCopy.next}
                </p>
              </article>
            </div>

            <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20 text-center">
              {[
                ['01', '好在哪裡', '保留最強推力'],
                ['02', '壞在哪裡', '先收最低風險'],
                ['03', '今天怎麼走', '只做一個決定'],
              ].map(([order, title, caption], index) => (
                <div key={order} className={`px-2 py-3 ${index < 2 ? 'border-r border-white/10' : ''}`}>
                  <p className="font-mono text-[10px] font-black text-amber-200/85">{order}</p>
                  <p className="mt-1 text-xs font-black text-cyan-50">{title}</p>
                  <p className="mt-1 text-[10px] font-semibold leading-4 text-white/48">{caption}</p>
                </div>
              ))}
            </div>

            <section className="rounded-2xl border border-violet-200/20 bg-violet-300/[0.055] p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black tracking-[0.18em] text-violet-100">EIGHT PARTS</p>
                  <h3 className="mt-1 text-base font-black text-violet-50">{purposeCopy.strengthTitle}</h3>
                </div>
                <p className="text-[10px] font-bold text-white/52">數字結構的八個面向</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {EIGHT_STRENGTH_KEYS.map((key, index) => {
                  const itemScore = result.matrix[key] ?? 0;
                  const tone = itemScore >= 68 ? 'bg-emerald-300' : itemScore >= 55 ? 'bg-cyan-300' : itemScore >= 40 ? 'bg-amber-300' : 'bg-rose-300';
                  const fortuneLabel = itemScore >= 90 ? '大吉' : itemScore >= 80 ? '吉' : itemScore >= 70 ? '中吉' : itemScore >= 60 ? '小吉' : itemScore >= 50 ? '平' : itemScore >= 40 ? '小凶' : itemScore >= 30 ? '凶' : '大凶';
                  const labelTone = itemScore >= 80 ? 'text-emerald-100' : itemScore >= 60 ? 'text-cyan-100' : itemScore >= 50 ? 'text-white/70' : itemScore >= 40 ? 'text-amber-100' : 'text-rose-100';
                  return (
                    <div key={key} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3 text-xs font-black">
                        <span className="text-white/78">{index + 1}. {DIMENSION_LABELS[key]}</span>
                        <span className={labelTone}>{fortuneLabel} · {itemScore}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <span className={`block h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${itemScore}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] font-bold leading-5 text-white/54">分數越高代表該面向的數字結構支持度較高；較低的段落用來提示優先留意處。</p>
            </section>

            <details open className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.045] p-4">
              <summary className="cursor-pointer text-sm font-black text-cyan-100">AI 精華分析</summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-black/18 p-3">
                  <p className="text-xs font-black text-emerald-100">最有利</p>
                  <div className="mt-2 space-y-2">
                    {topStrengths.map(([key, itemScore]) => (
                      <p key={key} className="flex items-center justify-between gap-3 text-sm font-bold text-white/76">
                        <span>{DIMENSION_LABELS[key] ?? key}</span>
                        <span className="text-emerald-100">{itemScore}</span>
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
                        <span className="text-rose-100">{itemScore}</span>
                      </p>
                    ))}
                  </div>
                </article>
              </div>
            </details>

            <details className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <summary className="cursor-pointer text-sm font-black text-amber-100">老師模式：完整指標</summary>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {Object.entries(result.indexes).map(([key, itemScore]) => (
                  <p key={key} className="rounded-xl border border-white/10 bg-black/18 px-3 py-2 text-xs font-bold text-white/58">
                    {DIMENSION_LABELS[key] ?? key}：<span className="text-cyan-100">{itemScore}</span>
                  </p>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold leading-6 text-white/44">
                老師模式只保留後端運算指標，給需要細看的人展開；一般客戶先看上方三句判定即可。
              </p>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}
