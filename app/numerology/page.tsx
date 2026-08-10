'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';

type NumberMode = 'last4' | 'six6' | 'digit8' | 'phone10';

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
};

const VALID_LENGTHS = new Set([4, 6, 8, 10]);

const MODE_LABEL: Record<NumberMode, string> = {
  last4: '後四碼',
  six6: '六碼',
  digit8: '八碼',
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

const SAMPLE_NUMBERS = ['1688', '8888', '5201314', '0912345678'];

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

  const cleanValue = cleanNumber(value);
  const canSubmit = VALID_LENGTHS.has(cleanValue.length);
  const progress = Math.min(100, Math.round((cleanValue.length / 10) * 100));
  const numberInputDigitStyle = {
    fontSize: cleanValue.length >= 9
      ? 'clamp(3.15rem, 13.4vw, 5.25rem)'
      : cleanValue.length >= 7
        ? 'clamp(4.15rem, 17vw, 6.6rem)'
        : 'clamp(6.25rem, 27vw, 8.8rem)',
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum" 1',
    letterSpacing: '0',
  } as const;
  const score = result ? result.finalScore ?? result.score : 0;
  const level = result ? getLevel(score) : null;
  const topStrengths = useMemo(() => (result ? pickEntries(result.matrix, 3) : []), [result]);
  const topRisks = useMemo(() => (result ? pickEntries(result.matrix, 2, 'asc') : []), [result]);
  const bestPoint = topStrengths[0];
  const weakPoint = topRisks[0];

  async function handleSubmit() {
    const target = getAnalysisIdentityTarget();
    if (!target) {
      setError(getIdentityRequiredMessage());
      return;
    }
    if (!canSubmit) {
      setError('請輸入 4、6、8 或 10 碼數字。');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/number-fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: cleanValue }),
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
              <p className="mt-3 text-sm font-bold leading-7 text-white/72">
                輸入一組數字，AI 先端出三句：好在哪裡、壞在哪裡、今天怎麼走。
              </p>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-200/35 bg-amber-300/12 font-serif text-3xl font-black text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.2)]">
              吉
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {['接收', '運算', '判定'].map((step, index) => {
              const passed = index === 0 ? cleanValue.length > 0 : index === 1 ? loading || Boolean(result) : Boolean(result);
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
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">NUMBER</p>
              <h2 className="mt-1 font-serif text-2xl font-black text-cyan-50">輸入數字</h2>
            </div>
            <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-black text-cyan-100">
              {cleanValue.length}/10
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-full bg-white/10">
            <span className="block h-2 rounded-full bg-gradient-to-r from-amber-300 via-cyan-200 to-emerald-300 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <input
            value={value}
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => {
              setValue(cleanNumber(event.target.value));
              setError('');
            }}
            onFocus={() => setError('')}
            placeholder="1688"
            aria-label="數字論好壞輸入框"
            style={numberInputDigitStyle}
            className="mt-4 min-h-[168px] w-full rounded-[30px] border border-amber-100/45 bg-black/55 px-2 py-8 text-center font-mono font-black leading-none text-amber-50 shadow-[inset_0_0_38px_rgba(251,191,36,0.12),0_0_38px_rgba(34,211,238,0.18)] outline-none transition placeholder:text-white/24 focus:border-amber-200/85 focus:shadow-[inset_0_0_42px_rgba(251,191,36,0.16),0_0_44px_rgba(251,191,36,0.22)] sm:min-h-[196px]"
          />

          <p className="mt-2 px-2 text-center text-sm font-black leading-6 text-amber-100/82">
            請輸入阿拉伯數字 0-9，例如 1688、8888、0912345678
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-emerald-200/25 bg-emerald-300/[0.08] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">GOOD</p>
                <h3 className="mt-2 text-base font-black text-emerald-50">好在哪裡</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-white/76">
                  {bestPoint ? `${DIMENSION_LABELS[bestPoint[0]] ?? bestPoint[0]}最亮，這組數字能支持你把事情往前推。` : '這組數字仍有可用的支持點。'}
                </p>
              </article>
              <article className="rounded-2xl border border-rose-200/25 bg-rose-300/[0.08] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-100">RISK</p>
                <h3 className="mt-2 text-base font-black text-rose-50">壞在哪裡</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-white/76">
                  {weakPoint ? `${DIMENSION_LABELS[weakPoint[0]] ?? weakPoint[0]}最低，今天先別硬衝，先把風險收小。` : '目前沒有明顯低點，但仍要保留檢查節奏。'}
                </p>
              </article>
              <article className="rounded-2xl border border-amber-200/25 bg-amber-300/[0.1] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">NEXT</p>
                <h3 className="mt-2 text-base font-black text-amber-50">下一步</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-white/76">
                  保留好的力量，避開最低分的風險，今天只完成一個最小決定。
                </p>
              </article>
            </div>

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
