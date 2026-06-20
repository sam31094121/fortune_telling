'use client';

import { useEffect, useRef, useState } from 'react';
import VisualGravityCore from '@/components/VisualGravityCore';
import PersonalityMusicFlow, { type MusicFormData } from '@/components/PersonalityMusicFlow';
import PersonalityMusicReport from '@/components/PersonalityMusicReport';

interface MandarinTrack {
  title: string;
  artist: string;
  videoId: string;
}

interface MusicGenerateResponse {
  personality_matrix: Record<string, number>;
  music_parameters: {
    bpm: number; key: string; genre: string; mood: string[];
    vocal_style: string; instrument: string[]; lyric_theme: string[];
  };
  music_report: {
    music_narrative: string; song_title_suggestion: string;
    lyric_opening: string; music_message: string; wisdom_note: string;
  };
  mandarin_tracks?: MandarinTrack[];
  meta: {
    zodiac: string; era: string; eraDisplayName?: string;
    wuxing?: string; wuxingColor?: string;
    chineseZodiac?: string; heavenlyStem?: string;
    archetype?: string; archetypeSymbol?: string; archetypeEn?: string;
    archetypeDescription?: string; archetypeMusicPersona?: string;
    archetypeShadow?: string; archetypeCoreWound?: string;
    archetypeCoreGift?: string; archetypeLifeLesson?: string;
    archetypeShadowIntegration?: string;
    archetypeSecondary?: string; archetypeSecondarySymbol?: string;
    ocean?: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number };
  };
}

type PageState = 'landing' | 'form' | 'result';

/* 打字機效果 hook */
function useTypewriter(text: string, speed = 55, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const timer = setTimeout(() => {
      const id = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(id); setDone(true); }
      }, speed);
      return () => clearInterval(id);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

/* Landing Hero — 全螢幕焦點衝擊版 */
function LandingHero({ onStart }: { onStart: () => void }) {
  const { displayed: line1, done: done1 } = useTypewriter('生成只屬於你的', 60, 400);
  const { displayed: line2, done: done2 } = useTypewriter('人格歌曲', 80, 1600);
  const [showSub, setShowSub] = useState(false);
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    if (done2) {
      const t1 = setTimeout(() => setShowSub(true), 300);
      const t2 = setTimeout(() => setShowCta(true), 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [done2]);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">

      {/* 深度光暈背景層 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 50% 50%, rgba(109,74,255,0.22) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(201,162,74,0.10) 0%, transparent 60%)
          `,
        }}
      />

      {/* VisualGravityCore — 中央大尺寸，作為文字背景 */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 'min(640px, 95vw)',
          height: 'min(640px, 95vw)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.55,
          filter: 'blur(0.5px)',
        }}
      >
        <VisualGravityCore />
      </div>

      {/* 中央掃光焦點環 */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 'min(480px, 85vw)',
          height: 'min(480px, 85vw)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(109,74,255,0.06) 0%, transparent 75%)',
          boxShadow: '0 0 120px 40px rgba(109,74,255,0.08)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />

      {/* 文字主體 — z 軸在最上層，絕對置中 */}
      <div className="relative z-20 flex flex-col items-center px-6 text-center">

        {/* 系統標籤 */}
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full border px-5 py-1.5 text-xs font-semibold tracking-[0.35em]"
          style={{
            borderColor: 'rgba(109,74,255,0.4)',
            background: 'rgba(109,74,255,0.12)',
            color: 'rgba(180,160,255,0.9)',
            backdropFilter: 'blur(12px)',
          }}
        >
          天・地・人 AI 人格音樂系統 V1.0
        </div>

        {/* 主標題 — 強衝擊字體 */}
        <h1
          className="font-serif leading-[1.1] tracking-tight"
          style={{
            fontSize: 'clamp(2.8rem, 9vw, 7rem)',
            color: '#f8f4e6',
            textShadow: `
              0 0 80px rgba(109,74,255,0.6),
              0 0 40px rgba(109,74,255,0.4),
              0 2px 30px rgba(0,0,0,0.8)
            `,
            minHeight: '2.4em',
          }}
        >
          <span className="block">{line1}<span className="animate-pulse">|</span></span>
          {done1 && (
            <span
              className="block"
              style={{
                background: 'linear-gradient(135deg, #f8f4e6 0%, #d4b8ff 40%, #c9a24a 80%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 30px rgba(109,74,255,0.5))',
              }}
            >
              {line2}{!done2 && <span className="animate-pulse" style={{ WebkitTextFillColor: '#d4b8ff' }}>|</span>}
            </span>
          )}
        </h1>

        {/* 副標題 */}
        <p
          className="mt-8 max-w-[520px] text-base leading-8 transition-all duration-700"
          style={{
            color: 'rgba(184,174,221,0.9)',
            opacity: showSub ? 1 : 0,
            transform: showSub ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          輸入出生日期、血型、姓名，AI 透過天地人三模型，
          <br className="hidden sm:block" />
          融合全球大數據與年代音樂，生成一首只屬於你的個人歌曲。
        </p>

        {/* CTA 按鈕組 */}
        <div
          className="mt-10 flex flex-col items-center gap-4 transition-all duration-700"
          style={{
            opacity: showCta ? 1 : 0,
            transform: showCta ? 'translateY(0)' : 'translateY(16px)',
          }}
        >
          <button
            type="button"
            onClick={onStart}
            className="vip-gold-btn px-14 py-5 text-lg"
            style={{
              boxShadow: '0 0 40px rgba(201,162,74,0.35), 0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            啟動人格音樂
          </button>

          <a
            href="/"
            className="text-xs tracking-widest transition"
            style={{ color: 'rgba(124,115,153,0.8)' }}
          >
            返回人格解碼系統 →
          </a>
        </div>

        {/* 天地人三維度說明 — 底部橫列 */}
        <div
          className="mt-16 grid grid-cols-3 gap-4 transition-all duration-1000"
          style={{
            opacity: showCta ? 1 : 0,
            transform: showCta ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '200ms',
          }}
        >
          {[
            { label: '天 35%', sub: '生日決定主旋律與情緒基調', color: 'rgba(109,74,255,0.7)' },
            { label: '地 35%', sub: '血型決定節奏感與音色厚度', color: 'rgba(201,162,74,0.7)' },
            { label: '人 30%', sub: '姓名決定歌詞靈魂與記憶點', color: 'rgba(215,139,255,0.7)' },
          ].map(item => (
            <div
              key={item.label}
              className="rounded-2xl px-4 py-4 text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${item.color.replace('0.7', '0.25')}`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <p className="text-xs font-bold tracking-[0.3em]" style={{ color: item.color }}>
                {item.label}
              </p>
              <p className="mt-1 text-xs leading-5" style={{ color: 'rgba(184,174,221,0.7)' }}>
                {item.sub}
              </p>
            </div>
          ))}
        </div>

        {/* 善念底部文案 */}
        {showCta && (
          <p
            className="mt-10 text-xs leading-7 tracking-wider"
            style={{ color: 'rgba(124,115,153,0.6)' }}
          >
            天地萬物皆有因果。心存善念，多行善事，才是真正改變命運的開始。
          </p>
        )}
      </div>

      {/* 底部引導滾動箭頭 */}
      {showCta && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div
            className="h-6 w-6 rotate-45 rounded-br-sm border-b-2 border-r-2"
            style={{ borderColor: 'rgba(109,74,255,0.4)' }}
          />
        </div>
      )}
    </section>
  );
}

export default function MusicSystemPage() {
  const [pageState, setPageState] = useState<PageState>('landing');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MusicGenerateResponse | null>(null);
  const [submittedName, setSubmittedName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(data: MusicFormData) {
    setErrorMsg('');
    setLoading(true);
    setSubmittedName(data.name.trim());

    try {
      const response = await fetch('/api/music-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: data.birthDate,
          bloodType: data.bloodType,
          name: data.name.trim(),
          gender: data.gender,
          voiceCharacteristics: data.voiceCharacteristics,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setErrorMsg(json.error || '人格音樂生成失敗，請稍後再試。');
        return;
      }

      setResult(json as MusicGenerateResponse);
      setPageState('result');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('[music] generate failed', err);
      setErrorMsg('連線失敗，請確認網路後再試。');
    } finally {
      setLoading(false);
    }
  }

  function handleStart() {
    setPageState('form');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function handleReset() {
    setResult(null);
    setErrorMsg('');
    setPageState('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="constellation-ring constellation-ring-top pointer-events-none z-0" />
      <div className="constellation-ring constellation-ring-bottom pointer-events-none z-0" />

      {/* ── Landing ── */}
      {pageState === 'landing' && <LandingHero onStart={handleStart} />}

      {/* ── Form ── */}
      {pageState === 'form' && (
        <main
          ref={formRef}
          className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
        >
          {/* 頂部頁眉 */}
          <div className="mb-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPageState('landing')}
              className="flex items-center gap-2 text-sm transition"
              style={{ color: 'rgba(124,115,153,0.8)' }}
            >
              ← 返回
            </button>
            <div
              className="rounded-full border px-4 py-1 text-xs font-semibold tracking-[0.3em]"
              style={{ borderColor: 'rgba(109,74,255,0.3)', color: 'rgba(180,160,255,0.8)' }}
            >
              天・地・人 AI 人格音樂系統 V1.0
            </div>
          </div>

          <section className="grid gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <div className="fortune-card p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.35em] text-violet-300">人格音樂輸入</p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">
                  建立你的音樂人格
                </h2>
                <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                  全球大數據分析 · 天地人三模型融合
                </p>
              </div>

              <PersonalityMusicFlow onSubmit={handleSubmit} loading={loading} />

              {loading && (
                <div className="mt-6 rounded-2xl border border-violet-400/15 bg-violet-950/20 p-4 text-center text-sm text-violet-200">
                  天地人三模型正在融合，AI 生成你的專屬音樂中…
                </div>
              )}

              {errorMsg && (
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-300">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* 右側：引力核 + 說明 */}
            <div className="flex flex-col items-center justify-center gap-6">
              <div style={{ width: 'min(380px, 90vw)', height: 'min(380px, 90vw)' }}>
                <VisualGravityCore />
              </div>
              <p className="text-center text-xs tracking-widest text-[color:var(--text-muted)]">
                中央引力核正在校準你的氣場
              </p>
              <div className="w-full max-w-sm space-y-3 text-xs text-[color:var(--text-muted)]">
                {[
                  '全球 1950s–2020s 年代音樂數據庫',
                  '12 星座 × 31 日 人格矩陣引擎',
                  '4 血型 × 性別 行為模型校正',
                  '姓名筆畫能量學 × 音韻心理學',
                ].map(text => (
                  <div key={text} className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-violet-400/60" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ── Result ── */}
      {pageState === 'result' && result && (
        <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">
                人格音樂生成完成
              </p>
              <h2 className="mt-1 font-serif text-3xl text-[color:var(--text-main)]">
                {submittedName}的專屬人格歌曲
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setPageState('landing')}
              className="text-xs tracking-widest transition"
              style={{ color: 'rgba(124,115,153,0.7)' }}
            >
              ← 返回首頁
            </button>
          </div>

          <PersonalityMusicReport
            personalityMatrix={result.personality_matrix as any}
            musicParameters={result.music_parameters}
            musicReport={result.music_report}
            meta={result.meta}
            mandarinTracks={result.mandarin_tracks}
            name={submittedName}
            onReset={handleReset}
          />
        </main>
      )}
    </div>
  );
}
