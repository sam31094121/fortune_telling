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

  const stageProgress = useMemo(() => {
    if (person.name.trim()) return 100;
    if (person.bloodType) return 30;
    if (person.birthday) return 15;
    return 0;
  }, [person]);

  useEffect(() => {
    const canPreview = Boolean(person.birthday && person.bloodType);
    const previewKey = canPreview ? `${person.birthday}-${person.bloodType}` : '';

    if (!canPreview) {
      setPreviewResult(null);
      previewKeyRef.current = '';
      return;
    }

    if (previewKeyRef.current === previewKey) return;

    // 輸入變了：立即清掉舊結果與舊錯誤，避免顯示過期資料
    setPreviewResult(null);
    setErrorMsg('');

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
            透過生日、血型、姓名，先做天地預分析，再完成三合一最終融合；真正的改運之道，仍以善為本，多多行善。
          </p>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-start">
          <div className="fortune-card animate-rise p-5 sm:p-8">
            <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  系統主流程
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
                  天 → 地 → 人 融合引擎
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[color:var(--text-sub)]">
                天先建骨架，地只做補充，人作為最後校正器。後面的資訊永遠不能推翻前面的結論。
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
                      {previewResult ? '天地預分析已完成' : '人格輪廓已建立'}
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
                  天地完成後會先自動進行大數據預分析；姓名輸入後，再啟動三合一總和與更高精準度的人格融合。
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
                disabled={!person.birthday || !person.bloodType || !person.name.trim()}
                className="primary-button w-full px-6 py-4 text-sm sm:text-lg"
              >
                解鎖剩餘 70% 個人專屬人格模型
              </button>

              {!person.name.trim() ? (
                <p className="text-center text-sm text-[color:var(--text-muted)]">
                  先完成生日與血型，建立骨架與行為模式；再用姓名解鎖最終個體差異。
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
                STEP 3
              </p>
              <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">
                姓名是最後校正器
              </h3>
              <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">
                姓名不會重新算一次，而是把你的人格模型個人化，補上財富動機、感情模式、盲點與優勢。
              </p>
            </div>
          </aside>
        </section>

        {paywallOpen ? (
          <section className="mt-10 animate-rise">
            <div className="fortune-card p-6 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                個人專屬人格模型
              </p>
              <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)] sm:text-4xl">
                解鎖剩餘 70%
              </h2>
              <p className="mt-2 text-lg text-[color:var(--fortune-good)] sm:text-xl">
                姓名輸入完成，現在進入最終人格融合
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)]">
                這一步不是推翻天地，而是在原本的預分析上，加入姓名校正器，完成三合一總和與更高精準度的人格模型。
              </p>
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
            </div>
          </section>
        ) : null}

        {result ? (
          <section className="mt-10 animate-rise">
            <ResultDisplay result={result} />
          </section>
        ) : previewLoading ? (
          /* 天地預分析進行中：顯示等待卡，不讓舊資料繼續停在畫面 */
          <section className="mt-10">
            <div className="fortune-card animate-rise p-6 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                天地大數據運算中
              </p>
              <h2 className="mt-5 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
                正在建立人格骨架…
              </h2>
              <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                <div className="h-full animate-[shimmer_1.6s_ease_infinite] rounded-full bg-gradient-to-r from-transparent via-[color:var(--fortune-good)] to-transparent" />
              </div>
              <p className="mx-auto mt-6 max-w-md text-sm leading-8 text-[color:var(--text-sub)]">
                系統正在根據生日與血型建立你的人格骨架與行為模式，通常需要 2 至 4 秒。
              </p>
            </div>
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
                天地先行，人再融合
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)] sm:text-base">
                只要生日與血型輸入完成，系統就會先自動做天地預分析；姓名輸入後，再完成三合一總和與最終人格融合。
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
