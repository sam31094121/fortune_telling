'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import InputForm from '@/components/InputForm';
import PreviewDisplay from '@/components/PreviewDisplay';
import ResultDisplay from '@/components/ResultDisplay';
import type { AnalysisResult, ApiError, PersonInput, PreviewAnalysisResult } from '@/lib/types';
import { getZodiacSign } from '@/lib/zodiac';

const EMPTY_PERSON: PersonInput = {
  name: '',
  bloodType: '',
  birthday: '',
};

const STAGE_ONE_COPY: Record<string, { score: number; title: string; lines: string[] }> = {
  摩羯座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  水瓶座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  雙魚座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  牡羊座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  金牛座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  雙子座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  巨蟹座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  獅子座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  處女座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  天秤座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  天蠍座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
  射手座: { score: 15, title: '人格骨架已建立', lines: ['先建立情緒、理性、社交等基礎參數。', '這一階段不下結論，只建立人格骨架。'] },
};

const BLOOD_PREVIEW: Record<'A' | 'B' | 'AB' | 'O', { score: number; lines: string[] }> = {
  A: { score: 30, lines: ['血型會補充安全感與互動模式。', '它只能修飾生日建立的骨架，不能推翻。'] },
  B: { score: 30, lines: ['血型會補充行動節奏與社交表現。', '它只能修飾生日建立的骨架，不能推翻。'] },
  AB: { score: 30, lines: ['血型會補充矛盾感、抽離感與人際邊界。', '它只能修飾生日建立的骨架，不能推翻。'] },
  O: { score: 30, lines: ['血型會補充推進力、責任感與承壓方式。', '它只能修飾生日建立的骨架，不能推翻。'] },
};

export default function HomePage() {
  const [person, setPerson] = useState<PersonInput>({ ...EMPTY_PERSON });
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewAnalysisResult | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const previewKeyRef = useRef('');

  const zodiac = getZodiacSign(person.birthday);
  const stageOne = zodiac ? STAGE_ONE_COPY[zodiac] ?? STAGE_ONE_COPY.摩羯座 : null;
  const stageTwo = person.bloodType ? BLOOD_PREVIEW[person.bloodType] : null;
  const canUnlock = Boolean(person.birthday && person.bloodType && person.name.trim()) && !loading;
  const canOpenVip = Boolean(person.birthday && person.bloodType);

  const stageProgress = useMemo(() => {
    if (result) return 100;
    if (person.name.trim()) return 70;
    if (person.bloodType) return 30;
    if (person.birthday) return 15;
    return 0;
  }, [person, result]);

  useEffect(() => {
    const canPreview = Boolean(person.birthday && person.bloodType);
    const previewKey = canPreview ? `${person.birthday}-${person.bloodType}` : '';

    if (!canPreview) {
      setPreviewResult(null);
      previewKeyRef.current = '';
      return;
    }

    if (previewKeyRef.current === previewKey) return;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthday: person.birthday, bloodType: person.bloodType }),
        });

        const data = (await response.json()) as PreviewAnalysisResult | ApiError;
        if (!response.ok) {
          setErrorMsg('error' in data ? data.error : '天地預分析暫時無法完成。');
          return;
        }

        previewKeyRef.current = previewKey;
        setPreviewResult(data as PreviewAnalysisResult);
      } catch (error) {
        console.error('[page] preview failed', error);
        setErrorMsg('天地預分析暫時中斷，請稍後再試。');
      } finally {
        setPreviewLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [person.birthday, person.bloodType]);

  async function handleUnlock() {
    if (!canUnlock) return;

    setLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person }),
      });

      const data = (await response.json()) as AnalysisResult | ApiError;

      if (!response.ok) {
        setErrorMsg('error' in data ? data.error : '系統暫時無法完成解碼，請稍後再試。');
        return;
      }

      setResult(data as AnalysisResult);
      setPaywallOpen(false);
    } catch (error) {
      console.error('[page] unlock failed', error);
      setErrorMsg('能量場連線中斷，請檢查網路後再試一次。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-bg min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
        <div className="starfield" />
        <div className="constellation-ring constellation-ring-top" />
        <div className="constellation-ring constellation-ring-bottom" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <header className="animate-rise text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[color:var(--text-sub)] sm:text-sm sm:tracking-[0.45em]">
            Trinity Destiny Engine V2.0
          </p>
          <div className="mx-auto mb-8 flex justify-center">
            <div className="destiny-orb">
              <div className="destiny-orb-core" />
            </div>
          </div>
          <h1 className="mystic-title mx-auto max-w-4xl text-3xl leading-tight sm:text-5xl lg:text-6xl">
            天地人 AI 人格解碼系統™
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-[color:var(--text-sub)] sm:text-lg sm:leading-8">
            透過生日、血型先完成免費天地預分析，再以 VIP 姓名解碼完成三合一最終融合；真正的改運之道，仍以善為本，多多行善。
          </p>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-start">
          <div className="fortune-card animate-rise p-5 sm:p-8">
            <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  免費體驗區
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
                  天 → 地 預分析引擎
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[color:var(--text-sub)]">
                免費只需輸入生日與血型，系統就會先做天地大數據預分析，建立你的人格骨架與行為模式。
              </p>
            </div>

            <InputForm value={person} onChange={setPerson} disabled={loading} />

            <div className="mt-8 space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                      免費完成度
                    </p>
                    <h3 className="mt-2 font-serif text-xl text-[color:var(--text-main)]">
                      {previewResult ? '天地預分析已完成' : '免費人格輪廓建立中'}
                    </h3>
                  </div>
                  <span className="text-3xl font-semibold text-[color:var(--fortune-good)]">
                    {stageProgress}%
                  </span>
                </div>
                <div className="energy-bar mt-4">
                  <div className="energy-fill" style={{ width: `${stageProgress}%` }} />
                </div>
                <p className="mt-3 text-sm leading-7 text-[color:var(--text-sub)]">
                  生日與血型完成後會自動進行天地大數據預分析；姓名解碼屬於 VIP 付費服務，會在下一階段啟動三合一最終融合。
                </p>
              </div>

              {previewLoading ? (
                <p className="text-center text-sm text-[color:var(--text-muted)]">
                  天地大數據預分析運算中…
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => setPaywallOpen(true)}
                disabled={!canOpenVip}
                className="primary-button w-full px-6 py-4 text-sm sm:text-lg"
              >
                進入 VIP 姓名解碼服務
              </button>

              {!canOpenVip ? (
                <p className="text-center text-sm text-[color:var(--text-muted)]">
                  先完成生日與血型，免費建立天地預分析；再進入 VIP 姓名解碼服務。
                </p>
              ) : null}

              {errorMsg ? (
                <div className="rounded-[20px] border border-[color:rgba(255,92,122,0.35)] bg-[color:rgba(255,92,122,0.08)] px-5 py-4 text-sm leading-7 text-[color:#ffd4db]">
                  {errorMsg}
                </div>
              ) : null}
            </div>
          </div>

          <aside className="grid min-w-0 gap-5">
            <div className="fortune-card sky-card animate-rise p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                權重引擎
              </p>
              <h2 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">固定權重，不可互推翻</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-[color:var(--text-sub)]">天</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--human-cyan)]">15%</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">人格骨架</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-[color:var(--text-sub)]">地</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--earth-gold)]">15%</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">行為模式</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-[color:var(--text-sub)]">人</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--human-pink)]">70%</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">個體差異</p>
                </div>
              </div>
            </div>

            {stageOne ? (
              <div className="fortune-card sky-card animate-rise p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  STEP 1
                </p>
                <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">{stageOne.title}</h3>
                <p className="mt-2 text-lg text-[color:var(--human-cyan)]">完成度 {stageOne.score}%</p>
                <div className="mt-5 space-y-3 text-sm leading-7 text-[color:var(--text-sub)]">
                  {stageOne.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {stageTwo ? (
              <div className="fortune-card earth-card animate-rise p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  STEP 2
                </p>
                <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">天地完成</h3>
                <p className="mt-2 text-lg text-[color:var(--earth-gold)]">完成度 {stageTwo.score}%</p>
                <div className="mt-5 space-y-3 text-sm leading-7 text-[color:var(--text-sub)]">
                  {stageTwo.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="fortune-card human-card animate-rise p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                VIP 服務
              </p>
              <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">
                姓名解碼是付費專屬服務
              </h3>
              <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">
                名字不放在免費區。使用者進入 VIP 後，才會啟動姓名能量模型，完成三合一總和、財富動機、感情模式與最終個體差異分析。
              </p>
            </div>
          </aside>
        </section>

        {paywallOpen ? (
          <section className="mt-10 animate-rise">
            <div className="fortune-card p-6 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                VIP 付費服務
              </p>
              <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)] sm:text-4xl">
                姓名專屬解碼區
              </h2>
              <p className="mt-2 text-lg text-[color:var(--fortune-good)] sm:text-xl">
                解鎖剩餘 70% 個人專屬人格模型
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)]">
                這裡是付費服務專區。天地預分析已先完成，現在只針對姓名做高權重個人化校正，完成三合一總和與更高精準度的人格模型。
              </p>
              <div className="mx-auto mt-8 max-w-xl rounded-[24px] border border-[color:rgba(244,201,93,0.25)] bg-[color:rgba(109,74,255,0.09)] px-6 py-5 text-left">
                <label className="mb-2 block text-sm text-[color:var(--text-sub)]">VIP 姓名輸入</label>
                <input
                  type="text"
                  value={person.name}
                  maxLength={20}
                  placeholder="例如：王小明"
                  onChange={(event) => setPerson((prev) => ({ ...prev, name: event.target.value }))}
                  onInput={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      name: (event.target as HTMLInputElement).value,
                    }))
                  }
                  className="form-input"
                />
                <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
                  姓名屬於 VIP 解碼內容，會作為 70% 權重的最後校正器，不會推翻天地，只會深化你的個體差異。
                </p>
              </div>
              <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  '個人專屬人格模型',
                  '財富動機',
                  '感情模式',
                  '潛意識盲點',
                  '人生優勢',
                  '12 維度最終圖譜',
                  '天地人融合摘要',
                  '人格共鳴度',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-[color:var(--text-sub)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleUnlock}
                disabled={!canUnlock}
                className="primary-button mt-8 w-full px-8 py-4 text-sm sm:w-auto sm:text-lg"
              >
                {loading ? '人格模型融合中…' : '立即解鎖完整報告'}
              </button>
              {!person.name.trim() ? (
                <p className="mt-4 text-sm leading-7 text-[color:var(--text-muted)]">
                  請先在 VIP 區輸入姓名，才能啟動最終三合一解碼。
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {result ? (
          <section className="mt-10 animate-rise">
            <ResultDisplay result={result} />
          </section>
        ) : previewResult ? (
          <section className="mt-10 animate-rise">
            <PreviewDisplay result={previewResult} />
          </section>
        ) : (
          <section className="mt-10">
            <div className="fortune-card animate-rise p-6 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                預分析待啟動
              </p>
              <h2 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
                免費先看天地，VIP 再解姓名
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)] sm:text-base">
                只要生日與血型輸入完成，系統就會先自動做免費天地預分析；姓名則獨立放在 VIP 專區，作為付費解碼服務。
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
