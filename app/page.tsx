// 主頁面：兩人輸入表單 → 呼叫 /api/analyze → 顯示結果
// MVP 採單頁設計，結果直接呈現在表單下方

'use client';

import { useState } from 'react';
import InputForm from '@/components/InputForm';
import ResultDisplay from '@/components/ResultDisplay';
import type { AnalysisResult, ApiError, PersonInput } from '@/lib/types';

// 每位使用者的初始值
const EMPTY_PERSON: PersonInput = {
  name: '',
  bloodType: 'A',
  birthday: '',
};

export default function HomePage() {
  const [personA, setPersonA] = useState<PersonInput>({ ...EMPTY_PERSON });
  const [personB, setPersonB] = useState<PersonInput>({ ...EMPTY_PERSON });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 兩人都填了生日才允許送出
  const canSubmit = Boolean(personA.birthday) && Boolean(personB.birthday) && !loading;

  async function handleAnalyze() {
    setErrorMsg('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personA, personB }),
      });

      const data = (await res.json()) as AnalysisResult | ApiError;

      if (!res.ok) {
        // 後端回傳的友善錯誤訊息
        const message = 'error' in data ? data.error : '分析失敗，請稍後再試';
        setErrorMsg(message);
        return;
      }

      setResult(data as AnalysisResult);
    } catch (err) {
      // 網路層或非預期錯誤
      console.error('[page] 呼叫 /api/analyze 失敗：', err);
      setErrorMsg('連線發生問題，請檢查網路後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* 標題 */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">血型生日配對分析</h1>
        <p className="mt-2 text-gray-500">
          輸入兩人的血型與生日，由 AI 命理老師為你解析配對程度
        </p>
      </header>

      {/* 兩人輸入 */}
      <div className="grid gap-5 sm:grid-cols-2">
        <InputForm title="第一位" value={personA} onChange={setPersonA} disabled={loading} />
        <InputForm title="第二位" value={personB} onChange={setPersonB} disabled={loading} />
      </div>

      {/* 送出按鈕 */}
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!canSubmit}
        className="mt-6 w-full rounded-xl bg-brand px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {loading ? '命理老師分析中…' : '開始分析'}
      </button>

      {/* 提示：尚未填生日 */}
      {!personA.birthday || !personB.birthday ? (
        <p className="mt-3 text-center text-sm text-gray-400">請先填寫兩人的生日</p>
      ) : null}

      {/* 錯誤訊息 */}
      {errorMsg && (
        <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-center text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* 結果 */}
      {result && (
        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <ResultDisplay result={result} />
        </section>
      )}
    </main>
  );
}
