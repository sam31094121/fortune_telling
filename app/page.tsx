'use client';

import { useMemo, useState, useDeferredValue, useEffect, useRef } from 'react';
import Link from 'next/link';
import { injectPerformanceCSS } from '@/lib/performance-css';
import VisualGravityCore from '@/components/VisualGravityCore';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import NextStepGuide from '@/components/NextStepGuide';
import { SHICHEN_LIST } from '@/lib/shichen-engine';

interface PersonInput {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
  shichen: number | 'unknown' | null;
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

interface KarmaStory {
  resonance_score: number;
  active_giver: string;
  needs_understanding: string;
  relationship_theme: string;
  story: string;
  today_advice: string;
  closing_wisdom: string;
}

interface PersonDisplay {
  name: string;
  zodiacZh: string;
  chineseZodiac: string;
  wuxing: string;
  bloodType: string;
}

interface MatchResponse {
  result: MatchResult;
  displayA: PersonDisplay;
  displayB: PersonDisplay;
  karma_story?: KarmaStory;
}

type StepKey = 'personA-base' | 'personA-shichen' | 'personB-base' | 'personB-shichen' | 'review';

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const EMPTY: PersonInput = { name: '', birthDate: '', bloodType: 'A', gender: 'female', shichen: null };

const BLOOD_DESC: Record<PersonInput['bloodType'], string> = {
  A: '細膩穩定，重視秩序與安全感。',
  B: '自主鮮明，節奏感強，較有個人風格。',
  AB: '理性感性並存，觀察力與距離感並行。',
  O: '主動直接，行動力高，帶動感明顯。',
};

const STEP_ORDER: StepKey[] = ['personA-base', 'personA-shichen', 'personB-base', 'personB-shichen', 'review'];

function getPersonError(label: string, person: PersonInput) {
  if (person.name.trim().length < 2) return `請先輸入${label}姓名，至少 2 個字。`;
  if (!person.birthDate) return `請先輸入${label}的民國年國曆生日。`;
  return '';
}

function ElderChoiceCard({
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
      ? 'border-violet-400 bg-violet-500/20 text-violet-100 shadow-[0_0_20px_rgba(109,74,255,0.35)]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-violet-500/30',
    amber: active
      ? 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-[0_0_20px_rgba(201,162,74,0.35)]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-amber-500/30',
    pink: active
      ? 'border-pink-400 bg-pink-500/20 text-pink-100 shadow-[0_0_20px_rgba(215,139,255,0.35)]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-pink-500/30',
    cyan: active
      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-cyan-500/30',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all duration-300 neon-card-hover holo-card-container relative overflow-hidden ${tones[tone]}`}
    >
      <div className="holo-shine" />
      <p className="text-lg font-bold relative z-10">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)] relative z-10">{description}</p>
    </button>
  );
}

function NumberTicker({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(value);
      return;
    }

    const duration = 1000; // 1秒
    const startTime = performance.now();

    function updateNumber(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      }
    }

    requestAnimationFrame(updateNumber);
  }, [value]);

  return <>{count}</>;
}

function ScoreRow({ label, score, tone }: { label: string; score: number; tone: 'violet' | 'amber' | 'cyan' | 'pink' }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 80);
    return () => clearTimeout(timer);
  }, [score]);

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
        <span className="text-sm font-semibold text-[color:var(--text-main)]">
          <NumberTicker value={score} />
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${width}%`, background: gradients[tone] }} 
        />
      </div>
    </div>
  );
}

function AnalyticalConsole({
  nameA,
  nameB,
  birthA,
  birthB,
}: {
  nameA: string;
  nameB: string;
  birthA: string;
  birthB: string;
}) {
  const [logs, setLogs] = useState<string[]>([]);

  const fullLogs = useMemo(() => [
    `[SYSTEM] 讀取「天宿」星宮：第一位 ${nameA || '本體'} (${birthA || '吉時'})`,
    `[SYSTEM] 讀取「天宿」星宮：第二位 ${nameB || '客體'} (${birthB || '吉時'})`,
    `[CALCULATOR] 映射「地脈」血型引力場關係矩陣... OK`,
    `[VOICE] 聲學頻率模型提取：合成 432Hz 靈魂能量音訊共鳴... READY`,
    `[DECRYPT] 映射「人和」緣分課題... 正在寫入 VIP 加密天宿數據艙`,
    `[AI_STATUS] 分析完成，正在載入最終配對結果...`
  ], [nameA, nameB, birthA, birthB]);

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
    }, 400);
    return () => clearInterval(interval);
  }, [fullLogs]);

  return (
    <div className="fortune-card p-6 sm:p-8 font-mono border border-cyan-500/20 bg-slate-950/80 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">🧬 大數據 AI 運算終端</p>
      <div className="mt-6 space-y-3.5 text-xs sm:text-sm text-cyan-100 leading-7 min-h-[160px]">
        {logs.map((log, index) => (
          <p key={index} className="animate-fade-in">
            {log}
          </p>
        ))}
        {logs.length < fullLogs.length && (
          <p className="text-cyan-400">
            [RUNNING] 正在解密星圖矩陣...<span className="console-cursor" />
          </p>
        )}
      </div>
    </div>
  );
}

function PersonStep({
  title,
  description,
  accent,
  value,
  onChange,
}: {
  title: string;
  description: string;
  accent: 'violet' | 'amber';
  value: PersonInput;
  onChange: (value: PersonInput) => void;
}) {
  return (
    <div className={`fortune-card p-6 sm:p-8 transition-all duration-500 ${accent === 'violet' ? 'astral-glow-violet hover:border-violet-500/25' : 'astral-glow-amber hover:border-amber-500/25'}`}>
      <p className={`inline-flex rounded-full border px-4 py-1 text-xs tracking-[0.3em] ${accent === 'violet' ? 'border-violet-400/25 bg-violet-950/20 text-violet-300' : 'border-amber-400/25 bg-amber-950/20 text-amber-300'}`}>
        {title}
      </p>

      <h2 className="mt-4 font-serif text-3xl text-[color:var(--text-main)]">照順序填，不會漏</h2>
      <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{description}</p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">1. 姓名</label>
          <input
            type="text"
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            placeholder="請輸入姓名，至少 2 個字"
            className="form-input w-full text-base neon-input-focus neon-card-hover"
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">2. 國曆生日（民國年）</label>
          <LunarBirthdayInput
            value={value.birthDate}
            onChange={(solarDate) => onChange({ ...value, birthDate: solarDate })}
            accent={accent}
            label="請輸入國曆生日（民國年）"
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">3. 血型</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {BLOOD_TYPES.map((bloodType, index) => (
              <ElderChoiceCard
                key={bloodType}
                active={value.bloodType === bloodType}
                title={`${bloodType} 型`}
                description={BLOOD_DESC[bloodType]}
                onClick={() => onChange({ ...value, bloodType })}
                tone={index % 2 === 0 ? accent : accent === 'violet' ? 'cyan' : 'pink'}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">4. 性別</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ElderChoiceCard
              active={value.gender === 'female'}
              title="女性"
              description="用來修飾外在表現。"
              onClick={() => onChange({ ...value, gender: 'female' })}
              tone="pink"
            />
            <ElderChoiceCard
              active={value.gender === 'male'}
              title="男性"
              description="只做外在呈現修飾。"
              onClick={() => onChange({ ...value, gender: 'male' })}
              tone="cyan"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShichenStep({
  title,
  description,
  accent,
  value,
  onChange,
}: {
  title: string;
  description: string;
  accent: 'violet' | 'amber';
  value: PersonInput;
  onChange: (value: PersonInput) => void;
}) {
  const accentClasses = accent === 'violet'
    ? { 
        label: 'border-violet-400/25 bg-violet-950/20 text-violet-300', 
        button: 'border-violet-400 bg-violet-500/20 text-violet-100 shadow-[0_0_20px_rgba(109,74,255,0.35)]' 
      }
    : { 
        label: 'border-amber-400/25 bg-amber-950/20 text-amber-300', 
        button: 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-[0_0_20px_rgba(201,162,74,0.35)]' 
      };

  return (
    <div className={`fortune-card p-6 sm:p-8 transition-all duration-500 ${accent === 'violet' ? 'astral-glow-violet hover:border-violet-500/25' : 'astral-glow-amber hover:border-amber-500/25'}`}>
      <p className={`inline-flex rounded-full border px-4 py-1 text-xs tracking-[0.3em] ${accentClasses.label}`}>
        {title}
      </p>

      <h2 className="mt-4 font-serif text-3xl text-[color:var(--text-main)]">選擇出生時辰</h2>
      <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{description}</p>

      <div className="mt-8 space-y-6">
        <div>
          <button
            type="button"
            onClick={() => onChange({ ...value, shichen: 'unknown' })}
            className={`w-full rounded-2xl border px-4 py-4 text-left transition-all duration-300 neon-card-hover ${
              value.shichen === 'unknown'
                ? accentClasses.button
                : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-white/20'
            }`}
          >
            <p className="text-lg font-bold">🕊️ 我不知道 / 記不得時辰</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">已為你保留良辰吉時。日後想起真實時辰，再補上會更精準。</p>
          </button>
        </div>

        <div>
          <p className="mb-4 text-xs text-[color:var(--text-muted)]">或選擇真實出生時辰</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SHICHEN_LIST.map((s) => {
              const selected = value.shichen === s.branchIndex;
              return (
                <button
                  key={s.branchIndex}
                  type="button"
                  onClick={() => onChange({ ...value, shichen: s.branchIndex })}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all duration-300 neon-card-hover ${
                    selected
                      ? accentClasses.button
                      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-white/20'
                  }`}
                >
                  <p className="font-semibold">{s.label}</p>
                  <p className="mt-1 text-xs text-[color:var(--text-sub)]">{s.range}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [step, setStep] = useState<StepKey>('personA-base');
  const [personA, setPersonA] = useState<PersonInput>({ ...EMPTY, gender: 'female' });
  const [personB, setPersonB] = useState<PersonInput>({ ...EMPTY, gender: 'male' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<MatchResponse | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  function handleUnlockVIP() {
    setUnlocking(true);
    setTimeout(() => {
      setUnlocking(false);
      setIsUnlocked(true);
    }, 2800);
  }

  // 監聽步驟切換與結果生成，自動平滑定位，避免螢幕異常跳動與跑版
  useEffect(() => {
    const timer = setTimeout(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [step, !!data]);

  // 使用 useDeferredValue 防止表單輸入影響 3D 動畫
  const deferredPersonA = useDeferredValue(personA);
  const deferredPersonB = useDeferredValue(personB);

  // 注入性能 CSS
  useEffect(() => {
    injectPerformanceCSS();
  }, []);

  const stepIndex = STEP_ORDER.indexOf(step);
  const personAError = getPersonError('第一位', personA);
  const personBError = getPersonError('第二位', personB);
  const personAShichenError = personA.shichen === null ? '請選擇時辰或點「我不知道」' : '';
  const personBShichenError = personB.shichen === null ? '請選擇時辰或點「我不知道」' : '';

  const reviewReady = !personAError && !personBError && personA.shichen !== null && personB.shichen !== null;

  const reviewCards = useMemo(
    () => [
      { label: '第一位', person: personA, accent: 'violet' as const },
      { label: '第二位', person: personB, accent: 'amber' as const },
    ],
    [personA, personB],
  );

  function goNext() {
    setError('');

    if (step === 'personA-base') {
      if (personAError) {
        setError(personAError);
        return;
      }
      setStep('personA-shichen');
      return;
    }

    if (step === 'personA-shichen') {
      if (personAShichenError) {
        setError(personAShichenError);
        return;
      }
      setStep('personB-base');
      return;
    }

    if (step === 'personB-base') {
      if (personBError) {
        setError(personBError);
        return;
      }
      setStep('personB-shichen');
      return;
    }

    if (step === 'personB-shichen') {
      if (personBShichenError) {
        setError(personBShichenError);
        return;
      }
      setStep('review');
    }
  }

  function goBack() {
    setError('');

    if (step === 'personA-shichen') {
      setStep('personA-base');
      return;
    }

    if (step === 'personB-base') {
      setStep('personA-shichen');
      return;
    }

    if (step === 'personB-shichen') {
      setStep('personB-base');
      return;
    }

    if (step === 'review') {
      setStep('personB-shichen');
    }
  }

  async function handleSubmit() {
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
          // 等待後重試
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
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

      // 獲得配對結果後，嘗試生成因果故事
      try {
        const karmaResponse = await fetch('/api/karma-story-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            personA,
            personB,
            matchResult: json.result,
          }),
        });

        if (karmaResponse.ok) {
          const karmaData = (await karmaResponse.json()) as { karma_story?: KarmaStory };
          if (karmaData.karma_story) {
            setData((prev) => (prev ? { ...prev, karma_story: karmaData.karma_story } : null));
          }
        }
      } catch {
        // 因果故事生成失敗時不影響配對結果
        console.log('[karma-story] generation skipped or failed');
      }
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
    setStep('personA-base');
    setIsUnlocked(false);
  }

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />

      {/* 仙氣天然流星雨天幕 */}
      <div className="shooting-stars-container">
        <div className="shooting-star" />
        <div className="shooting-star" />
        <div className="shooting-star" />
        <div className="shooting-star" />
      </div>

      {unlocking && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md">
          <div className="relative flex items-center justify-center">
            {/* 三軌對齊 3D 科技星盤 */}
            <div className="absolute h-48 w-48 rounded-full border-2 border-dashed border-violet-500/30 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="absolute h-40 w-40 rounded-full border border-double border-amber-500/40 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
            <div className="absolute h-32 w-32 rounded-full border border-rose-500/30 animate-spin" style={{ animationDuration: '8s' }} />
            {/* 仙氣天然發光中心 */}
            <div className="z-10 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600/20 via-pink-600/20 to-amber-600/20 text-4xl font-bold text-white shadow-[0_0_50px_15px_rgba(215,139,255,0.4)]">
              ☯️
            </div>
          </div>
          <p className="mt-8 text-lg font-bold tracking-widest text-amber-200 animate-pulse">
            🪐 天宿星軌對齊中，解密天宿命盤...
          </p>
          <div className="mt-4 flex gap-1.5 text-xs text-violet-300/70">
            <span className="animate-bounce">🧬 正在重組前世今生大數據，啟封音律...</span>
          </div>
        </div>
      )}

      <main ref={mainRef} className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 flex items-center gap-4">
          <span className="text-xs tracking-widest text-rose-300">💕 AI 靈魂配對</span>
          <span className="text-[color:var(--text-muted)]">·</span>
          <Link href="/music" className="text-xs tracking-widest text-violet-300/70 transition hover:text-violet-300">
            🎵 人格音樂
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <Link href="/insight" className="text-xs tracking-widest text-amber-300/70 transition hover:text-amber-300">
            🔍 AI 深度洞察
          </Link>
        </div>

        <section className="mb-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-4 inline-block rounded-full border border-rose-400/20 bg-rose-400/8 px-4 py-1 text-xs tracking-[0.35em] text-rose-300">
              配對你的命運靈魂伴侶
            </div>
            <h1 className="mystic-title mb-4 font-serif text-5xl leading-tight sm:text-6xl md:text-7xl">
              探索靈魂連結<br />與個人深度洞察
            </h1>
            <div className="mt-8 space-y-5">
              <p className="text-xl sm:text-2xl font-bold text-rose-300 tracking-wide">
                💕 AI 靈魂配對 — 分析相處節奏與互補點
              </p>
              <p className="text-xl sm:text-2xl font-bold text-violet-300 tracking-wide">
                🎵 人格音樂 — 生成個人主題曲
              </p>
              <p className="text-xl sm:text-2xl font-bold text-amber-300 tracking-wide">
                🔍 AI 深度洞察 — 全面分析性格與潛能
              </p>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <VisualGravityCore />
          </div>
        </section>

        {!data && (
          <div className="space-y-6">
            {loading ? (
              <AnalyticalConsole
                nameA={personA.name}
                nameB={personB.name}
                birthA={personA.birthDate}
                birthB={personB.birthDate}
              />
            ) : (
              <>
                <div className="fortune-card p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm tracking-[0.4em] font-semibold text-[color:var(--text-muted)]">目前進度</p>
                      <p className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-[color:var(--text-main)]">
                        {['personA-base', 'personA-shichen'].includes(step) && '先填第一位'}
                        {['personB-base', 'personB-shichen'].includes(step) && '再填第二位'}
                        {step === 'review' && '確認後開始配對'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:min-w-[120px]">
                      <div
                        className={`rounded-2xl border-2 px-4 py-4 text-center transition-all shadow-sm ${
                          ['personA-base', 'personA-shichen'].includes(step)
                            ? 'border-rose-400/60 bg-rose-500/15 shadow-rose-500/20'
                            : ['personB-base', 'personB-shichen', 'review'].includes(step)
                              ? 'border-violet-400/50 bg-violet-500/12 shadow-violet-500/15'
                              : 'border-white/20 bg-white/8'
                        }`}
                      >
                        <p className="text-lg font-bold text-[color:var(--text-main)]">{['personB-base', 'personB-shichen', 'review'].includes(step) ? '✓' : '1'}</p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--text-sub)]">第一位</p>
                      </div>
                      <div
                        className={`rounded-2xl border-2 px-4 py-4 text-center transition-all shadow-sm ${
                          ['personB-base', 'personB-shichen'].includes(step)
                            ? 'border-rose-400/60 bg-rose-500/15 shadow-rose-500/20'
                            : step === 'review'
                              ? 'border-violet-400/50 bg-violet-500/12 shadow-violet-500/15'
                              : 'border-white/20 bg-white/8'
                        }`}
                      >
                        <p className="text-lg font-bold text-[color:var(--text-main)]">{step === 'review' ? '✓' : '2'}</p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--text-sub)]">第二位</p>
                      </div>
                      <div
                        className={`rounded-2xl border-2 px-4 py-4 text-center transition-all shadow-sm ${
                          step === 'review'
                            ? 'border-rose-400/60 bg-rose-500/15 shadow-rose-500/20'
                            : 'border-white/20 bg-white/8'
                        }`}
                      >
                        <p className="text-lg font-bold text-[color:var(--text-main)]">3</p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--text-sub)]">確認</p>
                      </div>
                    </div>
                  </div>
                </div>

                {step === 'personA-base' && (
                  <PersonStep
                    title="第一位資料"
                    description="先輸入第一位的姓名、生日、血型和性別。填好後再進下一位。"
                    accent="violet"
                    value={personA}
                    onChange={setPersonA}
                  />
                )}

                {step === 'personA-shichen' && (
                  <ShichenStep
                    title="第一位時辰"
                    description="如果知道出生時辰，可以讓配對分析更精細；不知道也完全沒關係。"
                    accent="violet"
                    value={personA}
                    onChange={setPersonA}
                  />
                )}

                {step === 'personB-base' && (
                  <PersonStep
                    title="第二位資料"
                    description="接著輸入第二位。欄位一樣，跟著順序填就好。"
                    accent="amber"
                    value={personB}
                    onChange={setPersonB}
                  />
                )}

                {step === 'personB-shichen' && (
                  <ShichenStep
                    title="第二位時辰"
                    description="同樣的，知道時辰更好，不知道也沒關係。"
                    accent="amber"
                    value={personB}
                    onChange={setPersonB}
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
                            <div>
                              <span className="text-[color:var(--text-muted)]">出生時辰：</span>
                              <span className="text-[color:var(--text-main)]">
                                {person.shichen === 'unknown'
                                  ? '系統已配置良辰吉時'
                                  : person.shichen !== null
                                    ? (SHICHEN_LIST.find((s) => s.branchIndex === person.shichen)?.label || '未知')
                                    : '未填'}
                              </span>
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
                  {step !== 'personA-base' && (
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
                      className="vip-gold-btn flex-1 py-5 text-base disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {step === 'personA-base' && '下一步：選擇時辰'}
                      {step === 'personA-shichen' && '下一步：填第二位'}
                      {step === 'personB-base' && '下一步：選擇時辰'}
                      {step === 'personB-shichen' && '下一步：確認資料'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!reviewReady || loading}
                      className="vip-gold-btn flex-1 py-5 text-base disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading ? '正在整理配對結果…' : '查看配對結果'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className={`fortune-card p-6 sm:p-8 text-center transition-all duration-700 ${isUnlocked ? 'vip-gold-card shadow-[0_0_40px_rgba(201,162,74,0.3)]' : 'astral-glow-violet'}`}>
              <p className={`text-xs uppercase tracking-[0.35em] ${isUnlocked ? 'text-amber-300 font-semibold' : 'text-rose-300 font-medium'}`}>
                {isUnlocked ? '👑 尊榮 VIP 天宿配對報告' : '配對結果'}
              </p>
              <h2 className={`mt-3 font-serif text-5xl ${isUnlocked ? 'vip-glow-text font-black' : 'text-[color:var(--text-main)]'}`}>
                <NumberTicker value={data.result.match_score} />
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-sub)]">相處共鳴指數</p>
              <p className="mx-auto mt-6 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">{data.result.summary}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className={`fortune-card p-6 sm:p-8 transition-all duration-500 ${isUnlocked ? 'vip-gold-card' : ''}`}>
                <p className={`mb-6 text-xs uppercase tracking-[0.35em] ${isUnlocked ? 'text-amber-300 font-semibold' : 'text-[color:var(--text-muted)]'}`}>四項核心指標</p>
                <div className="space-y-5">
                  <ScoreRow label="共鳴感" score={data.result.resonance} tone="violet" />
                  <ScoreRow label="溝通感" score={data.result.communication} tone="cyan" />
                  <ScoreRow label="穩定度" score={data.result.stability} tone="amber" />
                  <ScoreRow label="衝突風險" score={data.result.conflict_risk} tone="pink" />
                </div>
              </div>

              <div className={`fortune-card p-6 sm:p-8 transition-all duration-500 ${isUnlocked ? 'vip-gold-card' : ''}`}>
                <p className={`mb-6 text-xs uppercase tracking-[0.35em] ${isUnlocked ? 'text-amber-300 font-semibold' : 'text-[color:var(--text-muted)]'}`}>雙方基本資料</p>
                <div className="space-y-5 text-sm">
                  <div>
                    <p className="font-semibold text-violet-300">{data.displayA.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayA.zodiacZh} · {data.displayA.chineseZodiac} · 五行 {data.displayA.wuxing} · {data.displayA.bloodType} 型
                    </p>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div>
                    <p className="font-semibold text-amber-300">{data.displayB.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayB.zodiacZh} · {data.displayB.chineseZodiac} · 五行 {data.displayB.wuxing} · {data.displayB.bloodType} 型
                    </p>
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
                <div key={section.title} className={`fortune-card p-5 sm:p-6 transition-all duration-500 ${isUnlocked ? 'vip-gold-card' : ''}`}>
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

            {/* 未解鎖時顯示的科技加密艙門 */}
            {!isUnlocked && (
              <div className="tech-decrypt-overlay p-8 text-center relative border border-amber-500/20 shadow-[0_0_30px_rgba(201,162,74,0.12)] animate-rise">
                <div className="code-stream-effect" />
                <div className="relative z-10 py-10 space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-4xl shadow-[0_0_30px_10px_rgba(201,162,74,0.22)] border border-amber-400/30 animate-pulse">
                    👑
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-amber-300 font-semibold">大數據天宿因果 · VIP 專屬</p>
                    <h3 className="mt-4 font-serif text-3xl font-bold text-white">解鎖前世因果故事與天命聲律</h3>
                    <p className="mx-auto mt-4 max-w-lg text-sm leading-8 text-[color:var(--text-sub)]">
                      包含雙方前世今生的緣分故事、今生修煉避坑建議，以及專屬生成的靈魂頻譜共振主題曲。
                    </p>

                    <div className="mt-8 border-t border-amber-500/15 pt-6 text-left max-w-xl mx-auto space-y-3.5">
                      <p className="text-xs uppercase tracking-[0.25em] text-amber-300 font-semibold font-mono">🧬 釋義：天地人因果天宿密碼</p>
                      <blockquote className="border-l border-amber-500/40 pl-4 text-xs italic text-[color:var(--text-sub)] leading-7">
                        「人一出生，天宿天命便與天地人三才緊密相連。大樹落葉，落葉歸根，這是命運的因果軌道。然而『菩提本無樹，明鏡亦非台，本來無一物，何處惹塵埃』。世人之所以在紅塵關係中受盡折磨，是因為凡夫俗子執著於色相與得失，陷入『人有色無空』的執念。<br/><br/>
                        天宿命運有軌跡，但命運絕對可以改變。改命的重中之重，在於『自己有沒有真正改過自新、廣結善緣、學會放下』。以善為本，順天而行則合；執迷不悟，逆天而行則亡。」
                      </blockquote>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleUnlockVIP}
                      className="vip-gold-btn px-10 py-5 text-lg font-bold tracking-wider shadow-[0_0_30px_rgba(201,162,74,0.3)] hover:shadow-[0_0_40px_rgba(201,162,74,0.5)] transition-all duration-300"
                    >
                      ✨ 一鍵對齊星宿解鎖 VIP 報告
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 已解鎖時顯示的 VIP 聲學與天命報告 */}
            {data.karma_story && isUnlocked && (
              <div className="space-y-6 animate-rise">
                {/* 聲學音樂適配區 (動態跳動頻譜) */}
                <div className="fortune-card vip-gold-card p-6 sm:p-8 relative overflow-hidden">
                  <div className="absolute right-6 top-6 flex items-center gap-2">
                    <span className="text-[10px] tracking-wider text-amber-300/80 font-mono">432Hz CO-RESONANCE</span>
                    <div className="tech-waveform">
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                    </div>
                  </div>
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-300 font-semibold">🎵 人格天命主題音樂</p>
                  <h3 className="mt-3 font-serif text-2xl text-white">天宿聲律共鳴頻率 — 仙宿調色盤</h3>
                  <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">
                    系統已自動提取雙方的生辰與血型能量頻率，合成了專屬的靈魂配對音樂。目前聲波正以 428Hz-432Hz 療癒共鳴頻率在瀏覽器背景對齊中。
                  </p>
                </div>

                {/* 前世因果標題 */}
                <div className="fortune-card vip-gold-card p-6 sm:p-8 relative">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-amber-300">💫 因果大數據故事</p>
                      <h2 className="mt-3 font-serif text-3xl text-white">配對前世今生因果關係</h2>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-[color:var(--text-muted)]">天宿關係共鳴度</p>
                      <p className="mt-2 font-serif text-4xl text-amber-300 font-black text-shadow-glow">{data.karma_story.resonance_score}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="fortune-card vip-gold-card p-5 sm:p-6">
                    <p className="text-xs text-violet-300 font-semibold">主動付出者</p>
                    <p className="mt-3 text-lg text-white font-bold">{data.karma_story.active_giver}</p>
                  </div>
                  <div className="fortune-card vip-gold-card p-5 sm:p-6">
                    <p className="text-xs text-amber-300 font-semibold">需要被理解者</p>
                    <p className="mt-3 text-lg text-white font-bold">{data.karma_story.needs_understanding}</p>
                  </div>
                </div>

                <div className="fortune-card vip-gold-card p-6 sm:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-300 font-semibold">關係課題</p>
                  <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">{data.karma_story.relationship_theme}</p>
                </div>

                <div className="fortune-card vip-gold-card p-6 sm:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-rose-300 font-semibold">因果故事</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[color:var(--text-sub)]">{data.karma_story.story}</p>
                </div>

                <div className="fortune-card vip-gold-card p-6 sm:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-300 font-semibold">今生建議</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[color:var(--text-sub)]">{data.karma_story.today_advice}</p>
                </div>

                <div className="fortune-card vip-gold-card p-6 sm:p-8 border-emerald-400/30">
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-300 font-semibold">善念結語</p>
                  <p className="mt-4 whitespace-pre-wrap italic text-sm leading-8 text-[color:var(--text-sub)]">{data.karma_story.closing_wisdom}</p>
                </div>

                {/* 順天改命官方修行指引板塊 */}
                <div className="fortune-card vip-gold-card p-6 sm:p-8 border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-950 to-amber-950/20 shadow-[0_0_30px_rgba(201,162,74,0.15)] relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4">
                    <span className="text-8xl">☯️</span>
                  </div>
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-300 font-semibold font-mono">☯️ 順天改命 · 天宿法門</p>
                  <h3 className="mt-3 font-serif text-xl font-bold text-white">改命在於改心，行善方能順天</h3>
                  <div className="mt-4 text-sm leading-8 text-[color:var(--text-sub)] space-y-4">
                    <p>
                      天宿因果有軌，如大樹落葉必將歸根；但人心無界，一念動則乾坤變。修行之要，不在於逃避業力，而在於「以善為本，順天而行」。
                    </p>
                    <p>
                      「菩提本無樹，明鏡亦非台。」關係中的糾纏與痛楚，皆因心有色相、執迷不悟（人有色無空）。當你真正看透這層幻象，學會放下對他人的控制與索求，回歸「善」的本心，這段關係的因果便已在默默中改寫。
                    </p>
                    <p className="font-semibold text-amber-300">
                      順天者昌，逆天者亡。改命的重中之重，永遠在於你今天是否願意跨出「改過自新、廣結善緣、放下執念」的第一步。
                    </p>
                  </div>
                </div>
              </div>
            )}

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
