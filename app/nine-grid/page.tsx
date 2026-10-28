'use client';

/**
 * 九宮格靈動數字：填寫頁
 * 後端運算、前端只顯示：引導文字、解說、算出來的事實都來自 /api/nine-grid（解說全部來自技能檔案
 * docs/技能戰鬥檔案/九宮格靈動數字/九宮格靈動數字.json），這裡只負責好看、好填與逐步提示。
 * 輸入只要西元出生年月日（日期元件支援國曆、農曆與民國年，會自動換成西元），不需要姓名、性別、時辰，也不用登入。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import NineGridCard from '@/components/nine-grid/NineGridCard';
import AsuraFusionCard from '@/components/nine-grid/AsuraFusionCard';
import type { AsuraFusion } from '@/lib/nine-grid-asura-fusion';
import type { NineGridStudy } from '@/lib/nine-grid-numbers';
import { NINE_GRID_GUIDE } from '@/lib/i18n-copy/nine-grid-guide';
import mystic from '@/components/nine-grid/LuoshuMystic.module.css';

type Guidance = NineGridStudy['guidance'];

type StepState = 'done' | 'active' | 'idle';

export default function NineGridPage() {
  const [birthDate, setBirthDate] = useState('');
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [study, setStudy] = useState<NineGridStudy | null>(null);
  const [fusion, setFusion] = useState<AsuraFusion | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultRun, setResultRun] = useState(0);
  const [error, setError] = useState('');
  const [guideOff, setGuideOff] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/nine-grid')
      .then((response) => response.json())
      .then((data: { guidance?: Guidance }) => { if (alive && data.guidance) setGuidance(data.guidance); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const handleBirthDate = useCallback((solarDate: string) => {
    setBirthDate(solarDate.trim());
    setError('');
  }, []);

  // 阿修羅九宮融會由後端 /api/nine-grid/asura 組好，這裡只負責取回與顯示；較舊的回應不得蓋掉較新的。
  const fusionRun = useRef(0);
  const loadFusion = useCallback(async (date: string, name?: string) => {
    fusionRun.current += 1;
    const run = fusionRun.current;
    try {
      const response = await fetch('/api/nine-grid/asura', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(name ? { birthDate: date, name } : { birthDate: date }) });
      const data = (await response.json()) as { ok: boolean; asuraFusion?: AsuraFusion };
      if (run === fusionRun.current && response.ok && data.ok && data.asuraFusion) setFusion(data.asuraFusion);
    } catch {
      // 融會取不到時不顯示該卡，九宮格本身不受影響。
    }
  }, []);

  async function handleSubmit() {
    if (loading) return;
    if (!birthDate) { setError('請先填好出生年月日'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/nine-grid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ birthDate }) });
      const data = (await response.json()) as { ok: boolean; study?: NineGridStudy; message?: string };
      if (!response.ok || !data.ok || !data.study) {
        setStudy(null);
        setFusion(null);
        setError(data.message ?? '目前沒辦法畫出九宮格，請稍後再試一次');
        return;
      }
      setStudy(data.study);
      setFusion(null);
      void loadFusion(birthDate);
      setResultRun((run) => run + 1);

    } catch {
      setError('網路連線不穩，這次沒有送出成功，請確認連線後再按一次');
    } finally {
      setLoading(false);
    }
  }

  const steps = guidance?.steps ?? [];
  const stepStates: StepState[] = study
    ? ['done', 'done', 'done']
    : birthDate ? ['done', 'done', 'active'] : ['active', 'idle', 'idle'];

  return (
    <main className="app-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-violet-200/90 hover:text-violet-50">← 返回首頁</Link>

        <section id="nine-grid-input" className={`fortune-card ${mystic.playbackCard} mt-3 overflow-hidden p-5 sm:p-8`}>
          <div className="flex items-center justify-center gap-3 text-center">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-300/80" aria-hidden="true" />
            <p className="text-[11px] font-black tracking-[0.34em] text-amber-300/90">生命靈數</p>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-300/80" aria-hidden="true" />
          </div>
          <h1 className="mx-auto mt-4 bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300/80 bg-clip-text text-center font-serif text-4xl font-black leading-[1.12] tracking-[0.1em] text-transparent sm:text-5xl">
            九宮格靈動數字
          </h1>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-amber-200/70" />
            <span className="text-sm text-amber-200/90">✦</span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-amber-200/70" />
          </div>

          {guidance && (
            <p className="mx-auto mt-5 max-w-xl text-center text-base font-bold leading-8 text-violet-50">{guidance.title.text}</p>
          )}

          {steps.length > 0 && (
            <ol className="mt-5 grid gap-2.5 sm:grid-cols-3" aria-label="三個步驟">
              {steps.map((step, index) => {
                const state = stepStates[index] ?? 'idle';
                return (
                  <li
                    key={step.text}
                    className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-300 ${state === 'active' ? 'border-amber-300/70 bg-amber-300/10 shadow-[0_0_18px_rgba(251,191,36,0.25)]' : state === 'done' ? 'border-emerald-300/40 bg-emerald-300/[0.07]' : 'border-white/10 bg-white/[0.03] opacity-80'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${state === 'done' ? 'border-emerald-300 bg-emerald-300/20 text-emerald-100' : state === 'active' ? 'border-amber-300 bg-amber-300/20 text-amber-50' : 'border-white/25 text-white/60'}`}
                    >
                      {state === 'done' ? '✓' : index + 1}
                    </span>
                    <span className="min-w-0 break-words text-sm font-semibold leading-6 text-violet-50">{step.text}</span>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="mt-6 rounded-3xl border border-amber-300/25 bg-gradient-to-b from-amber-300/[0.07] to-transparent p-4 sm:p-5">
            <LunarBirthdayInput value={birthDate} onChange={handleBirthDate} accent="amber" label="出生日期（萬年曆）" />
            {birthDate && (
              <p className="mt-3 flex items-center gap-2 text-sm font-black text-emerald-300">
                <span aria-hidden="true">✓</span>
                <span>西元 {birthDate}</span>
              </p>
            )}
            {birthDate && !study && !guideOff && (
              <div className={`${mystic.guide} mt-3 flex items-center gap-2 rounded-xl border border-amber-200/25 bg-black/40 py-1 pl-3 pr-1`} role="status">
                <span aria-hidden="true" className="text-amber-200">✦</span>
                <p className="flex-1 break-words text-[12px] font-semibold leading-5 text-amber-50">{NINE_GRID_GUIDE['zh-TW'].birthEntered.text}</p>
                <button type="button" onClick={() => setGuideOff(true)} aria-label="關閉提示" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-amber-100">×</button>
              </div>
            )}
            {guidance && !birthDate && (
              <p className="mt-3 break-words text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{guidance.inputHint.text}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm font-bold leading-6 text-rose-100">{error}</p>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || !birthDate}
            className="mt-6 flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 px-6 text-lg font-black tracking-[0.12em] text-[#241800] shadow-[0_0_28px_rgba(251,191,36,0.35)] transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/10 disabled:from-white/10 disabled:via-white/10 disabled:to-white/10 disabled:text-white/50 disabled:shadow-none"
          >
            {loading ? '正在畫九宮格…' : birthDate ? '開始畫九宮格' : '先填好出生年月日'}
          </button>
        </section>

        <div ref={resultRef} className="scroll-mt-4">
          {study && (
            <div key={resultRun} className="mt-5 space-y-3">
              {guidance && <p className="px-1 text-center text-sm font-bold leading-7 text-violet-100/90">{guidance.resultIntro.text}</p>}
              <NineGridCard study={study} birthDate={birthDate} onNameApplied={(name) => void loadFusion(birthDate, name)} />
              {fusion && <AsuraFusionCard fusion={fusion} />}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
