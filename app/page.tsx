'use client';

import { useState, useRef } from 'react';
import MultiStepForm from '@/components/MultiStepForm';
import ResultDisplay from '@/components/ResultDisplay';
import type { AnalysisResult, PreviewAnalysisResult, ApiError, PersonInput } from '@/lib/types';

const EMPTY_PERSON: PersonInput = {
  name: '',
  bloodType: '',
  birthday: '',
};

export default function HomePage() {
  const [person, setPerson] = useState<PersonInput>({ ...EMPTY_PERSON });

  const [loading, setLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  const [previewResult, setPreviewResult] = useState<PreviewAnalysisResult | null>(null);
  const [vipResult, setVipResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const resultRef = useRef<HTMLDivElement>(null);

  // 1. 啟動免費天地預分析
  async function handleAnalyzePreview() {
    setErrorMsg('');
    setPreviewResult(null);
    setVipResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthday: person.birthday,
          bloodType: person.bloodType,
        }),
      });

      const data = (await res.json()) as PreviewAnalysisResult | ApiError;

      if (!res.ok) {
        const message = 'error' in data ? data.error : '天地預分析失敗，請稍後再試';
        setErrorMsg(message);
        return;
      }

      setPreviewResult(data as PreviewAnalysisResult);

      // 產生結果後，平滑滾動到結果顯示區域
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err) {
      console.error('[page] 呼叫 /api/preview 失敗：', err);
      setErrorMsg('連線發生問題，請檢查網路後再試');
    } finally {
      setLoading(false);
    }
  }

  // 2. 解鎖 VIP 完整天地人三才分析
  async function handleUnlockVip(nameInput: string) {
    setErrorMsg('');
    setIsUnlocking(true);

    // 同步更新姓名狀態
    const updatedPerson = { ...person, name: nameInput };
    setPerson(updatedPerson);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: updatedPerson }),
      });

      const data = (await res.json()) as AnalysisResult | ApiError;

      if (!res.ok) {
        const message = 'error' in data ? data.error : 'VIP 解鎖失敗，請稍後再試';
        setErrorMsg(message);
        setIsUnlocking(false); // 出錯時提早關閉動畫
        return;
      }

      setVipResult(data as AnalysisResult);
    } catch (err) {
      console.error('[page] 呼叫 /api/analyze 失敗：', err);
      setErrorMsg('連線發生問題，請檢查網路後再試');
      setIsUnlocking(false);
    } finally {
      // 這裡動畫結束在 ResultDisplay 中已有延遲，在此同步做保底控制
      setTimeout(() => {
        setIsUnlocking(false);
      }, 500);
    }
  }

  return (
    <div className="app-bg min-h-screen relative overflow-hidden">
      {/* 炫光星空背景 */}
      <div className="starfield z-0 pointer-events-none" />
      <div className="constellation-ring constellation-ring-top z-0 pointer-events-none" />
      <div className="constellation-ring constellation-ring-bottom z-0 pointer-events-none" />

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-16">
        {/* 標題 */}
        <header className="mb-10 text-center space-y-3">
          <div className="inline-block rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-400/20">
            🌌 大數據 · 天地人三才 AI 人格解碼系統
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-serif tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-amber-200 to-pink-200 mystic-title">
            天地人解碼
          </h1>
          <p className="max-w-md mx-auto text-sm text-slate-400 leading-relaxed">
            輸入生日（天之星軌）與血型（地之行為），大數據即時演算。第二層輸入姓名（人之契合），解鎖靈魂聲學與核心命盤。
          </p>
        </header>

        {/* 1. 多步驟引導表單區 (未有預分析結果時顯示) */}
        {!previewResult && (
          <section className="fortune-card p-6 sm:p-8 animate-rise">
            <MultiStepForm
              person={person}
              onChange={setPerson}
              onSubmitPreview={handleAnalyzePreview}
              onSubmitAnalyze={() => {}} // 完整分析會在結果頁解鎖時觸發
              disabled={loading}
            />

            {/* 表單載入狀態 */}
            {loading && (
              <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-6 border-t border-white/5 animate-pulse-subtle">
                <div className="flex space-x-2">
                  <div className="h-3 w-3 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-3 w-3 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-3 w-3 rounded-full bg-pink-400 animate-bounce" />
                </div>
                <p className="text-sm font-serif text-amber-300">大數據星盤演算中，請稍候...</p>
              </div>
            )}

            {/* 錯誤訊息 */}
            {errorMsg && (
              <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 text-center text-sm text-rose-300 animate-rise">
                ⚠️ {errorMsg}
              </div>
            )}
          </section>
        )}

        {/* 2. 分析結果展示區 */}
        {previewResult && (
          <div ref={resultRef} className="fortune-card p-6 sm:p-8 mt-6 border-amber-400/20 animate-rise">
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-slate-500">大數據人格解碼</span>
                <h2 className="text-xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-amber-300 font-bold">
                  分析結果
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewResult(null);
                  setVipResult(null);
                  setPerson({ ...EMPTY_PERSON });
                  setErrorMsg('');
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                ← 重新解碼
              </button>
            </div>
            
            <ResultDisplay 
              previewResult={previewResult}
              vipResult={vipResult}
              onUnlock={handleUnlockVip}
              isUnlocking={isUnlocking}
            />

            {/* 錯誤訊息 (在結果頁解鎖出錯時顯示) */}
            {errorMsg && (
              <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 text-center text-sm text-rose-300 animate-rise">
                ⚠️ {errorMsg}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
