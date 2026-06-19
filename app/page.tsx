'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import InputForm from '@/components/InputForm';
import PreviewDisplay from '@/components/PreviewDisplay';
import ResultDisplay from '@/components/ResultDisplay';
import { TRINITY_DISPLAY_WEIGHTS, TRINITY_PROGRESS } from '@/lib/trinity-weights';
import type { AnalysisResult, ApiError, PersonInput, PreviewAnalysisResult } from '@/lib/types';
import { getZodiacSign } from '@/lib/zodiac';

const EMPTY_PERSON: PersonInput = {
  name: '',
  bloodType: '',
  birthday: '',
};

const STAGE_ONE_COPY: Record<string, { score: number; title: string; lines: string[] }> = {
  摩羯座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  水瓶座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  雙魚座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  牡羊座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  金牛座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  雙子座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  巨蟹座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  獅子座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  處女座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  天秤座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  天蠍座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
  射手座: { score: TRINITY_PROGRESS.sky, title: '天之人格已解鎖', lines: ['12 個人格維度初始參數已建立。', '天的維度只定義輪廓，不急著下最終結論。'] },
};

const BLOOD_PREVIEW: Record<'A' | 'B' | 'AB' | 'O', { score: number; lines: string[] }> = {
  A: { score: TRINITY_PROGRESS.earth, lines: ['地的維度補充了安全感與互動模式的修正值。', '它只能深化天的結論，不能推翻。'] },
  B: { score: TRINITY_PROGRESS.earth, lines: ['地的維度補充了行動節奏與社交表現的修正值。', '它只能深化天的結論，不能推翻。'] },
  AB: { score: TRINITY_PROGRESS.earth, lines: ['地的維度補充了矛盾感與人際邊界的修正值。', '它只能深化天的結論，不能推翻。'] },
  O: { score: TRINITY_PROGRESS.earth, lines: ['地的維度補充了推進力與承壓方式的修正值。', '它只能深化天的結論，不能推翻。'] },
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`伺服器回傳非 JSON 內容（HTTP ${response.status}）。`);
  }
  return response.json() as Promise<T>;
}

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
    if (result) return TRINITY_PROGRESS.human;
    if (person.bloodType) return TRINITY_PROGRESS.earth;
    if (person.birthday) return TRINITY_PROGRESS.sky;
    return 0;
  }, [person, result]);

  useEffect(() => {
    const canPreview = Boolean(person.birthday && person.bloodType);
    const previewKey = canPreview ? `${person.birthday}-${person.bloodType}` : '';

    if (!canPreview) {
      setPreviewResult(null);
      setPreviewLoading(false);
      previewKeyRef.current = '';
      return;
    }

    if (previewKeyRef.current === previewKey) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setErrorMsg('');
      try {
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthday: person.birthday, bloodType: person.bloodType }),
          signal: controller.signal,
        });

        const data = await readJsonResponse<PreviewAnalysisResult | ApiError>(response);
        if (!response.ok) {
          setErrorMsg('error' in data ? data.error : '天地預分析暫時無法完成。');
          return;
        }

        previewKeyRef.current = previewKey;
        setPreviewResult(data as PreviewAnalysisResult);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('[page] preview failed', error);
        setErrorMsg('天地預分析暫時中斷，請稍後再試。');
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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

      const data = await readJsonResponse<AnalysisResult | ApiError>(response);

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
          <div className="mx-auto mb-8 flex justify-center">
            <div className="energy-trinity">
              <div className="trinity-core" />
              <span className="trinity-diamond trinity-diamond-sky">✦</span>
              <span className="trinity-diamond trinity-diamond-earth">✦</span>
              <span className="trinity-diamond trinity-diamond-human">✦</span>
              <span className="trinity-diamond trinity-diamond-bottom">✦</span>
              <div className="trinity-node trinity-node-sky">
                <div className="trinity-dot trinity-dot-sky" />
                <span className="trinity-node-label">天</span>
              </div>
              <div className="trinity-node trinity-node-earth">
                <div className="trinity-dot trinity-dot-earth" />
                <span className="trinity-node-label">地</span>
              </div>
              <div className="trinity-node trinity-node-human">
                <div className="trinity-dot trinity-dot-human" />
                <span className="trinity-node-label">人</span>
              </div>
            </div>
          </div>
          <h1 className="mystic-title mx-auto text-5xl leading-tight sm:text-7xl lg:text-8xl">
            天地人
          </h1>
          <p className="mt-3 text-xs uppercase tracking-[0.45em] text-[color:var(--text-sub)] sm:text-sm sm:tracking-[0.55em]">
            AI 人格解碼系統
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)] sm:text-base sm:leading-9">
            每個人都由三種力量組成。<br />
            天，塑造你的天賦與思維。地，塑造你的行為與關係。人，塑造你的選擇與人生。<br />
            透過天地人模型，探索更完整的自己。
          </p>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-start">
          <div className="fortune-card animate-rise p-5 sm:p-8">
            <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  解鎖階段
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
                  天地解鎖引擎
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[color:var(--text-sub)]">
                輸入生日與出生資訊，AI 模型會先解鎖天之人格與地之維度，建立你的專屬人格基礎模型。
              </p>
            </div>

            <InputForm value={person} onChange={setPerson} disabled={loading} />

            <div className="mt-8 space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                      人格完成度
                    </p>
                    <h3 className="mt-2 font-serif text-xl text-[color:var(--text-main)]">
                      {previewResult ? '天地能量已融合' : '人格模型建構中'}
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
                  輸入生日與出生資訊後，系統會自動解鎖天地兩個維度；人格核心融合為 VIP 專屬，在下一階段啟動。
                </p>
              </div>

              {previewLoading ? (
                <p className="text-center text-sm text-[color:var(--text-muted)]">
                  人格維度分析運算中…
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => setPaywallOpen(true)}
                disabled={!canOpenVip}
                className="primary-button w-full px-6 py-4 text-sm sm:text-lg"
              >
                融合人格核心
              </button>

              {!canOpenVip ? (
                <p className="text-center text-sm text-[color:var(--text-muted)]">
                  先解鎖天地兩個維度，再進行人格核心融合。
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
                三力量架構
              </p>
              <h2 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">天地人能量比例</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-[color:var(--text-sub)]">天</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--human-cyan)]">{TRINITY_DISPLAY_WEIGHTS.sky}%</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">天賦 · 思維</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-[color:var(--text-sub)]">地</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--earth-gold)]">{TRINITY_DISPLAY_WEIGHTS.earth}%</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">行為 · 關係</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-[color:var(--text-sub)]">人</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--human-pink)]">{TRINITY_DISPLAY_WEIGHTS.human}%</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">選擇 · 人生</p>
                </div>
              </div>
            </div>

            {stageOne ? (
              <div className="fortune-card sky-card animate-rise p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  STEP 1
                </p>
                <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">{stageOne.title}</h3>
                <p className="mt-2 text-lg text-[color:var(--human-cyan)]">人格完成度 {stageOne.score}%</p>
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
                <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">地之能量已融合</h3>
                <p className="mt-2 text-lg text-[color:var(--earth-gold)]">人格完成度 {stageTwo.score}%</p>
                <div className="mt-5 space-y-3 text-sm leading-7 text-[color:var(--text-sub)]">
                  {stageTwo.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="fortune-card human-card animate-rise p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                人格核心
              </p>
              <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">
                融合人格核心
              </h3>
              <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">
                完成天地兩個維度後，人格核心融合才會啟動。姓名負責最後 30% 的個體校正，完成天地人三合一最終人格模型。
              </p>
            </div>
          </aside>
        </section>

        {paywallOpen ? (
          <section className="mt-10 animate-rise">
            <div className="fortune-card p-6 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                人格核心融合
              </p>
              <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)] sm:text-4xl">
                融合人格核心
              </h2>
              <p className="mt-2 text-lg text-[color:var(--fortune-good)] sm:text-xl">
                最後一步 完成天地人融合
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)]">
                天地兩個維度已建立完成。現在加入姓名，啟動人格核心校正，完成三合一最終人格模型與個體差異分析。
              </p>
              <div className="mx-auto mt-8 max-w-xl rounded-[24px] border border-[color:rgba(244,201,93,0.25)] bg-[color:rgba(109,74,255,0.09)] px-6 py-5 text-left">
                <label className="mb-2 block text-sm text-[color:var(--text-sub)]">輸入姓名，完成人格融合</label>
                <input
                  type="text"
                  value={person.name}
                  maxLength={20}
                  placeholder="例如：王小明"
                  onChange={(event) => setPerson((prev) => ({ ...prev, name: event.target.value }))}
                  className="form-input"
                />
                <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
                  姓名以 30% 權重作為人格核心校正器，不會推翻天地已建立的維度，只會深化你的個體差異。
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
                {loading ? '人格核心融合中…' : '啟動人格核心融合'}
              </button>
              {!person.name.trim() ? (
                <p className="mt-4 text-sm leading-7 text-[color:var(--text-muted)]">
                  請輸入姓名，才能啟動人格核心融合。
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
                天地能量等待
              </p>
              <h2 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
                天地能量等待啟動
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)] sm:text-base">
                輸入生日與出生資訊，AI 會自動解鎖天地兩個人格維度；完成後再融合人格核心，建立你的完整天地人模型。
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
