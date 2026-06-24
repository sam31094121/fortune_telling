'use client';

import { useRef, useState } from 'react';
import MultiStepForm from '@/components/MultiStepForm';
import VisualGravityCore from '@/components/VisualGravityCore';
import ResultDisplay from '@/components/ResultDisplay';
import type {
  AnalysisResult,
  ApiError,
  BloodType,
  PersonInput,
  PreviewAnalysisResult,
} from '@/lib/types';

interface FormPersonInput {
  name: string;
  bloodType: BloodType;
  birthday: string;
  gender: 'male' | 'female';
}

const EMPTY_PERSON: FormPersonInput = {
  name: '',
  bloodType: '',
  birthday: '',
  gender: 'female',
};

const REQUEST_TIMEOUT_MS = 20000;

async function fetchJsonWithTimeout<T>(input: RequestInfo, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const data = (await response.json()) as T;

    if (!response.ok) {
      throw data;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

export default function HomePage() {
  const [person, setPerson] = useState<FormPersonInput>({ ...EMPTY_PERSON });
  const [loading, setLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewAnalysisResult | null>(null);
  const [vipResult, setVipResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleAnalyzePreview() {
    if (loading || isUnlocking) return;
    setErrorMsg('');
    setPreviewResult(null);
    setVipResult(null);
    setLoading(true);

    try {
      const data = await fetchJsonWithTimeout<PreviewAnalysisResult | ApiError>('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthday: person.birthday,
          bloodType: person.bloodType,
        }),
      });

      setPreviewResult(data as PreviewAnalysisResult);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    } catch (error) {
      console.error('[page] preview failed', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setErrorMsg('AI 總機分析逾時，請稍後再試。');
      } else if (typeof error === 'object' && error && 'error' in error && typeof (error as ApiError).error === 'string') {
        setErrorMsg((error as ApiError).error);
      } else {
        setErrorMsg('目前無法連線到分析服務，請稍後再試。');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlockVip(nameInput: string, genderInput: 'male' | 'female') {
    if (loading || isUnlocking) return;
    setErrorMsg('');
    setPreviewResult(null);
    setIsUnlocking(true);

    const nextPerson: PersonInput = {
      birthday: person.birthday,
      bloodType: person.bloodType as Exclude<BloodType, ''>,
      name: nameInput.trim(),
      gender: genderInput,
    };

    setPerson((current) => ({
      ...current,
      name: nameInput.trim(),
      gender: genderInput,
    }));

    try {
      const data = await fetchJsonWithTimeout<AnalysisResult | ApiError>('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: nextPerson }),
      });

      setVipResult(data as AnalysisResult);
    } catch (error) {
      console.error('[page] analyze failed', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setErrorMsg('完整分析逾時，請稍後再試。');
      } else if (typeof error === 'object' && error && 'error' in error && typeof (error as ApiError).error === 'string') {
        setErrorMsg((error as ApiError).error);
      } else {
        setErrorMsg('目前無法完成姓名解碼，請稍後再試。');
      }
    } finally {
      setIsUnlocking(false);
    }
  }

  function handleReset() {
    setPerson({ ...EMPTY_PERSON });
    setPreviewResult(null);
    setVipResult(null);
    setErrorMsg('');
    setLoading(false);
    setIsUnlocking(false);
  }

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="constellation-ring constellation-ring-top pointer-events-none z-0" />
      <div className="constellation-ring constellation-ring-bottom pointer-events-none z-0" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="mb-8 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1 text-xs font-semibold tracking-[0.3em] text-amber-300">
                AI 總機人格分析系統
              </div>
              <a
                href="/music"
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-1 text-xs font-semibold tracking-[0.2em] text-violet-300 transition hover:bg-violet-400/20"
              >
                人格
              </a>
              <a
                href="/match"
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-1 text-xs font-semibold tracking-[0.2em] text-rose-300 transition hover:bg-rose-400/20"
              >
                配對
              </a>
              <a
                href="/insight"
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold tracking-[0.2em] text-cyan-300 transition hover:bg-cyan-400/20"
              >
                ✨ 深度洞察
              </a>
            </div>

            <div className="space-y-4">
              <h1 className="mystic-title font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
                輸入資料，啟動 AI 總機分析
              </h1>
              <p className="max-w-2xl text-sm leading-8 text-[color:var(--text-sub)] sm:text-base">
                只需要輸入基本資料；系統內部會結合八字、紫微斗數與 AI
                總機模型進行綜合運算，完成後呈現清楚好懂的分析結果。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="fortune-card sky-card p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-violet-300">輸入資料</p>
                <p className="mt-2 text-sm text-[color:var(--text-main)]">生日、血型與基本資訊</p>
              </div>
              <div className="fortune-card earth-card p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300">AI 總機</p>
                <p className="mt-2 text-sm text-[color:var(--text-main)]">系統自動綜合運算</p>
              </div>
              <div className="fortune-card human-card p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-pink-300">分析結果</p>
                <p className="mt-2 text-sm text-[color:var(--text-main)]">只顯示客戶看得懂的重點</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <VisualGravityCore />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="fortune-card p-6 sm:p-8">
            <MultiStepForm
              person={person}
              onChange={setPerson}
              onSubmitPreview={handleAnalyzePreview}
              disabled={loading || isUnlocking}
            />

            {loading && (
              <div className="mt-8 rounded-2xl border border-violet-400/15 bg-violet-950/20 p-4 text-center text-sm text-violet-200">
                AI 總機正在綜合運算，請稍候…
              </div>
            )}

            {errorMsg && (
              <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-300">
                {errorMsg}
              </div>
            )}
          </div>

          <div ref={resultRef} className="min-h-[320px]">
            {previewResult ? (
              <ResultDisplay
                previewResult={previewResult}
                vipResult={vipResult}
                onUnlock={handleUnlockVip}
                onReset={handleReset}
                isUnlocking={isUnlocking || loading}
                errorMsg={errorMsg}
              />
            ) : (
              <div className="fortune-card flex min-h-[320px] flex-col justify-center p-6 sm:p-8">
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  預備狀態
                </p>
                <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)]">
                  先完成基本資料輸入
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-8 text-[color:var(--text-sub)]">
                  請先輸入生日與血型。系統會在內部完成八字、紫微斗數與 AI
                  總機綜合分析；畫面不顯示內部算法，只呈現整理後的重點結果。
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


