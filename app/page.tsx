'use client';

import { useMemo, useState } from 'react';
import InputForm from '@/components/InputForm';
import ResultDisplay from '@/components/ResultDisplay';
import type { AnalysisResult, ApiError, PersonInput } from '@/lib/types';
import { getZodiacSign } from '@/lib/zodiac';

const EMPTY_PERSON: PersonInput = {
  name: '',
  bloodType: '',
  birthday: '',
};

const STAGE_ONE_COPY: Record<string, { score: number; title: string; lines: string[] }> = {
  摩羯座: {
    score: 63,
    title: '你屬於高敏感觀察型人格',
    lines: ['習慣先觀察，再決定是否投入。', '你對風險與秩序特別有感，會先保留底牌。'],
  },
  水瓶座: {
    score: 65,
    title: '你屬於獨立洞察型人格',
    lines: ['思考常比情緒更早抵達現場。', '你重視自由，也很在意精神共鳴。'],
  },
  雙魚座: {
    score: 67,
    title: '你屬於高感受共振型人格',
    lines: ['你會先接收氣氛，再整理邏輯。', '你對他人的情緒波動非常敏銳。'],
  },
  牡羊座: {
    score: 64,
    title: '你屬於直覺啟動型人格',
    lines: ['做決定往往快於解釋。', '你有一種不想被拖慢節奏的本能。'],
  },
  金牛座: {
    score: 66,
    title: '你屬於穩定積累型人格',
    lines: ['你需要安全感，才會真正打開自己。', '一旦信任建立，你會非常持久與可靠。'],
  },
  雙子座: {
    score: 64,
    title: '你屬於多線感知型人格',
    lines: ['你對資訊與變化有天然敏銳度。', '表面輕盈，內在其實很會觀察人性。'],
  },
  巨蟹座: {
    score: 68,
    title: '你屬於情感守護型人格',
    lines: ['你很重視關係中的溫度與歸屬。', '情緒安全，是你判斷投入與否的關鍵。'],
  },
  獅子座: {
    score: 65,
    title: '你屬於能量發散型人格',
    lines: ['你天生帶有被看見的磁場。', '即使低調，也會默默希望自己的價值被認可。'],
  },
  處女座: {
    score: 67,
    title: '你屬於精準修正型人格',
    lines: ['你擅長從細節看穿整體走向。', '標準感很強，因此對自己也不輕鬆。'],
  },
  天秤座: {
    score: 66,
    title: '你屬於平衡審視型人格',
    lines: ['你會衡量局勢，再做最不失衡的選擇。', '你重視關係品質，也在意外界觀感。'],
  },
  天蠍座: {
    score: 69,
    title: '你屬於深層感知型人格',
    lines: ['你很少真的隨便相信誰。', '一旦投入，你會非常深，也非常真。'],
  },
  射手座: {
    score: 64,
    title: '你屬於探索擴張型人格',
    lines: ['你需要空間，才能維持靈魂的活力。', '你討厭被過度定義，也不愛被限制。'],
  },
};

const BLOOD_PREVIEW: Record<'A' | 'B' | 'AB' | 'O', { score: number; lines: string[] }> = {
  A: {
    score: 81,
    lines: ['你比一般人更重視安全感。', '內心比外表更固執，重大決策傾向自己承擔壓力。'],
  },
  B: {
    score: 79,
    lines: ['你重視真實感，不喜歡被過度規訓。', '遇到壓力時會先拉開距離，等自己理清再回來。'],
  },
  AB: {
    score: 83,
    lines: ['你同時擁有理性觀察與情緒敏感。', '外界常覺得你難懂，但你其實只是不輕易曝光核心。'],
  },
  O: {
    score: 80,
    lines: ['你天生帶有推進事情的力量。', '越重要的局面，你越容易把責任扛到自己身上。'],
  },
};

export default function HomePage() {
  const [person, setPerson] = useState<PersonInput>({ ...EMPTY_PERSON });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [paywallOpen, setPaywallOpen] = useState(false);

  const zodiac = getZodiacSign(person.birthday);
  const stageOne = zodiac ? STAGE_ONE_COPY[zodiac] ?? STAGE_ONE_COPY.摩羯座 : null;
  const stageTwo = person.bloodType ? BLOOD_PREVIEW[person.bloodType] : null;
  const canUnlock = Boolean(person.birthday && person.bloodType && person.name.trim()) && !loading;

  const stageProgress = useMemo(() => {
    if (person.name.trim()) return 100;
    if (person.bloodType) return 81;
    if (person.birthday) return 63;
    return 0;
  }, [person]);

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
            Trinity Destiny Engine V1.0
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
            全球數百萬人格樣本訓練，結合生日、血型與姓名，建立你的專屬人格模型。
          </p>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-start">
          <div className="fortune-card animate-rise p-5 sm:p-8">
            <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  人｜個體命運
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
                  三合一人格模型
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[color:var(--text-sub)]">
                天看先天命格，地看後天氣場，人看個體命運。姓名權重最高，會在最後一步解鎖完整報告。
              </p>
            </div>

            <InputForm value={person} onChange={setPerson} disabled={loading} />

            <div className="mt-8 space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                      系統同步進度
                    </p>
                    <h3 className="mt-2 font-serif text-xl text-[color:var(--text-main)]">
                      天地人融合中
                    </h3>
                  </div>
                  <span className="text-3xl font-semibold text-[color:var(--fortune-good)]">
                    {stageProgress}%
                  </span>
                </div>
                <div className="energy-bar mt-4">
                  {/* animate-energy-fill(scaleX) 和 CSS width transition 互搶，只保留 transition */}
                  <div className="energy-fill" style={{ width: `${stageProgress}%` }} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPaywallOpen(true)}
                disabled={!person.birthday || !person.bloodType || !person.name.trim()}
                className="primary-button w-full px-6 py-4 text-sm sm:text-lg"
              >
                最後一步｜解鎖完整天地人人格解碼
              </button>

              {!person.name.trim() ? (
                <p className="text-center text-sm text-[color:var(--text-muted)]">
                  生日決定你的輪廓，血型決定你的模式，名字決定你的獨特性。
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
                核心理念
              </p>
              <h2 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">三層權重引擎</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-[color:var(--text-sub)]">天</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--human-cyan)]">15%</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">生日／先天命格</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-[color:var(--text-sub)]">地</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--earth-gold)]">15%</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">血型／後天氣場</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-[color:var(--text-sub)]">人</p>
                  <p className="mt-2 font-serif text-2xl text-[color:var(--human-pink)]">70%</p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">姓名／個體命運</p>
                </div>
              </div>
            </div>

            {stageOne ? (
              <div className="fortune-card sky-card animate-rise p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  第一階段完成
                </p>
                <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">天格分析完成</h3>
                <p className="mt-2 text-lg text-[color:var(--human-cyan)]">人格輪廓匹配度 {stageOne.score}%</p>
                <p className="mt-5 text-lg text-[color:var(--text-main)]">{stageOne.title}</p>
                <div className="mt-4 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
                  {stageOne.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {stageTwo ? (
              <div className="fortune-card earth-card animate-rise p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                  第二階段完成
                </p>
                <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">天地分析完成</h3>
                <p className="mt-2 text-lg text-[color:var(--earth-gold)]">人格輪廓匹配度 {stageTwo.score}%</p>
                <div className="mt-5 space-y-3 text-sm leading-7 text-[color:var(--text-sub)]">
                  {stageTwo.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="fortune-card human-card animate-rise p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                最終高潮頁
              </p>
              <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)]">
                我們無法預測你的未來
              </h3>
              <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">
                但我們可以讓你看見，那個連自己都沒發現的自己。
              </p>
            </div>
          </aside>
        </section>

        {paywallOpen ? (
          <section className="mt-10 animate-rise">
            <div className="fortune-card p-6 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                第三階段｜姓名能量解碼
              </p>
              <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)] sm:text-4xl">
                最後一步
              </h2>
              <p className="mt-2 text-lg text-[color:var(--fortune-good)] sm:text-xl">
                解鎖完整天地人人格解碼
              </p>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)] sm:text-base">
                系統已完成前置分析。接下來將解鎖姓名能量解碼、財富磁場分析、感情模式分析、人生優勢分析、潛意識盲點分析與專屬天地人報告。
              </p>
              <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  '姓名能量解碼',
                  '財富磁場分析',
                  '感情模式分析',
                  '人生優勢分析',
                  '潛意識盲點分析',
                  '專屬天地人報告',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-[color:var(--text-sub)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-8 max-w-xl rounded-[24px] border border-[color:rgba(244,201,93,0.25)] bg-[color:rgba(109,74,255,0.09)] px-6 py-5">
                <p className="text-sm leading-8 text-[color:var(--text-main)]">
                  生日決定你的輪廓，血型決定你的模式，名字決定你的獨特性。
                </p>
              </div>
              <button
                type="button"
                onClick={handleUnlock}
                disabled={!canUnlock}
                className="primary-button mt-8 w-full px-8 py-4 text-sm sm:w-auto sm:text-lg"
              >
                {loading ? '天地人融合完成中…' : '立即解鎖完整報告'}
              </button>
              <p className="mt-4 text-xs leading-6 text-[color:var(--text-muted)]">
                目前為 V1.0 體驗版，按下後直接展示完整報告頁，尚未串接實際金流。
              </p>
            </div>
          </section>
        ) : null}

        {result ? (
          <section className="mt-10 animate-rise">
            <ResultDisplay result={result} />
          </section>
        ) : (
          <section className="mt-10">
            <div className="fortune-card animate-rise p-6 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                最終報告頁
              </p>
              <h2 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
                天地人融合完成
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[color:var(--text-sub)] sm:text-base">
                完整報告會顯示人格共鳴度、姓名能量主題、財富與感情磁場，以及你最值得看見的人生優勢與潛意識盲點。
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
