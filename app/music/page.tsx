'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import VisualGravityCore from '@/components/VisualGravityCore';
import PersonalityMusicFlow, { type MusicFormData } from '@/components/PersonalityMusicFlow';
import PersonalityMusicReport from '@/components/PersonalityMusicReport';
import NextStepGuide from '@/components/NextStepGuide';

interface SongTrack {
  title: string;
  artist: string;
  videoId: string;
}

interface MusicGenerateResponse {
  personality_matrix: Record<string, number>;
  music_parameters: {
    bpm: number;
    key: string;
    genre: string;
    mood: string[];
    vocal_style: string;
    instrument: string[];
    lyric_theme: string[];
  };
  music_report: {
    music_narrative: string;
    song_title_suggestion: string;
    lyric_opening: string;
    music_message: string;
    wisdom_note: string;
    english_song_reason: string;
    mandarin_song_reason: string;
    taiwanese_song_reason: string;
  };
  song_drafts?: {
    english: SongDraft;
    mandarin: SongDraft;
    taiwanese: SongDraft;
  };
  production_plan?: ProductionPlan;
  fusion_song?: {
    fusion_title: string;
    fusion_concept: string;
    fusion_lyrics: string[];
    fusion_style: string;
  };
  english_track: SongTrack;
  mandarin_track: SongTrack | null;
  taiwanese_track: SongTrack | null;
  meta: {
    zodiac: string;
    era: string;
    eraDisplayName?: string;
    wuxing?: string;
    wuxingColor?: string;
    chineseZodiac?: string;
    heavenlyStem?: string;
    archetype?: string;
    archetypeSymbol?: string;
    archetypeEn?: string;
    archetypeDescription?: string;
    archetypeMusicPersona?: string;
    archetypeShadow?: string;
    archetypeCoreWound?: string;
    archetypeCoreGift?: string;
    archetypeLifeLesson?: string;
    archetypeShadowIntegration?: string;
    archetypeSecondary?: string;
    archetypeSecondarySymbol?: string;
    ocean?: {
      openness: number;
      conscientiousness: number;
      extraversion: number;
      agreeableness: number;
      neuroticism: number;
    };
    shichen?: {
      isKnown: boolean;
      label: string;
      range: string;
      branch: string;
      wuxing: string;
      dayPillar: string;
      hourPillar: string;
      friendlyNote: string;
    };
  };
}

interface SongDraft {
  language_label: string;
  title: string;
  concept: string;
  lyrics: string[];
  style: string;
  vocal_direction: string;
}

interface ProductionPlan {
  producer_summary: string;
  fusion_strategy: string;
  final_song_brief: string;
  arrangement_plan: string[];
  vocal_cast: string[];
  lead_vocal_choice: string;
  language_distribution: string;
  hook_design: string;
  popular_music_dna?: string[];
  global_trend_blend?: string[];
  trend_arrangement_recipe?: string;
  rhythm_strategy?: string;
  trend_safety_note?: string;
  hit_formula?: string;
  hook_repeat_strategy?: string;
  emotional_arc?: string;
  generation_prompt: string;
  next_step_note: string;
}

type PageState = 'landing' | 'form' | 'result';

function LandingHero({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 50% 50%, rgba(109,74,255,0.22) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(201,162,74,0.10) 0%, transparent 60%)
          `,
        }}
      />

      <div className="relative z-20 flex max-w-3xl flex-col items-center">
        {/* ☯️ 太極天宿羅盤主視覺焦點 (Hero Focus Section) */}
        <div className="mb-8 text-center flex flex-col items-center justify-center relative overflow-hidden py-8 px-6 rounded-3xl border border-white/5 bg-slate-950/20 shadow-[0_0_50px_rgba(201,162,74,0.05)]">
          {/* 大太極 SVG 動畫 */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-[30px] animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-amber-500/5 blur-[50px]" />
            
            {/* 旋轉外八卦盤 */}
            <svg
              className="w-full h-full text-cyan-400/25 absolute"
              style={{ animation: 'spin 40s linear infinite' }}
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 3" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 5" />
              <g fontSize="3" fill="currentColor" opacity="0.6" fontFamily="monospace">
                <text x="48.5" y="12">子</text>
                <text x="68" y="17">丑</text>
                <text x="83" y="32">寅</text>
                <text x="88.5" y="51.5">卯</text>
                <text x="83" y="71">辰</text>
                <text x="68" y="86">巳</text>
                <text x="48.5" y="91">午</text>
                <text x="29" y="86">未</text>
                <text x="14" y="71">申</text>
                <text x="8.5" y="51.5">酉</text>
                <text x="14" y="32">戌</text>
                <text x="29" y="17">亥</text>
              </g>
            </svg>

            {/* 逆向旋轉內太極盤 */}
            <svg
              className="w-[74%] h-[74%] text-amber-400 absolute"
              style={{ animation: 'spin 18s linear infinite reverse' }}
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient id="focusTaijiGradMusic" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C9A24A" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
                <filter id="focusTaijiGlowMusic" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <g filter="url(#focusTaijiGlowMusic)">
                <path
                  d="M 50,5 A 45,45 0 0,0 50,95 A 22.5,22.5 0 0,0 50,50 A 22.5,22.5 0 0,1 50,5 Z"
                  fill="url(#focusTaijiGradMusic)"
                />
                <path
                  d="M 50,95 A 45,45 0 0,0 50,5 A 22.5,22.5 0 0,0 50,50 A 22.5,22.5 0 0,1 50,95 Z"
                  fill="#020617"
                  opacity="0.9"
                />
                <circle cx="50" cy="27.5" r="5" fill="#020617" />
                <circle cx="50" cy="72.5" r="5" fill="#22D3EE" />
              </g>
            </svg>
          </div>

          {/* 簡明吸睛引導 */}
          <h1 className="mt-6 font-serif text-3xl sm:text-4xl text-white font-extrabold tracking-wider text-shadow-glow">
            ☯️ 人格天命 · 宿命律動
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-cyan-200/80 tracking-[0.2em] font-medium max-w-md px-6">
            以聲波與天干五行合成專屬你的人格主題曲。
          </p>
          
          <button
            type="button"
            onClick={onStart}
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/20 px-10 py-4 text-base font-bold text-white hover:bg-violet-500/35 transition-all shadow-[0_0_20px_rgba(109,74,255,0.3)] animate-bounce"
          >
            <span>👇 一鍵開啟 · 生成我的主題曲</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function MusicAnalyticalConsole({
  name,
}: {
  name: string;
}) {
  const [logs, setLogs] = useState<string[]>([]);

  const fullLogs = useMemo(() => [
    `【天宿天盤】讀取聲音與姓名特徵：${name || '未知本體'}`,
    `【地脈羅盤】校準星座與人格節奏軌道... 已就緒`,
    `【人和音律】血型表達風格與年代偏好映射... 已就緒`,
    `【天星解密】音律聲學模型提取：合成 432Hz 靈魂頻率預覽... 正在寫入`,
    `【天宿智算】正在生成專屬歌詞與音樂敘述結構...`,
  ], [name]);

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
    }, 450);
    return () => clearInterval(interval);
  }, [fullLogs]);

  return (
    <div className="fortune-card p-6 sm:p-8 font-mono border border-violet-500/20 bg-slate-950/80 shadow-[0_0_30px_rgba(139,92,246,0.08)]">
      <p className="text-xs uppercase tracking-[0.35em] text-violet-300">🧬 大數據音樂人格運算終端</p>
      <div className="mt-6 space-y-3.5 text-xs sm:text-sm text-violet-100 leading-7 min-h-[150px]">
        {logs.map((log, index) => (
          <p key={index} className="animate-fade-in">
            {log}
          </p>
        ))}
        {logs.length < fullLogs.length && (
          <p className="text-violet-400">
            【天盤運轉】正在解密聲律矩陣...<span className="console-cursor" />
          </p>
        )}
      </div>
    </div>
  );
}

export default function MusicSystemPage() {
  const [pageState, setPageState] = useState<PageState>('landing');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MusicGenerateResponse | null>(null);
  const [submittedName, setSubmittedName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageState === 'result' || loading || errorMsg) {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pageState, loading, errorMsg]);

  async function handleSubmit(data: MusicFormData) {
    setErrorMsg('');
    setLoading(true);
    setSubmittedName(data.name.trim());

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);

    try {
      const response = await fetch('/api/music-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          birthDate: data.birthDate,
          bloodType: data.bloodType,
          name: data.name.trim(),
          gender: data.gender,
          shichen: data.shichen,
          voiceCharacteristics: data.voiceCharacteristics,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setErrorMsg(json.error || '音樂人格分析失敗，請稍後再試。');
        return;
      }

      setResult(json as MusicGenerateResponse);
      setPageState('result');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('[music] generate failed', error);
      setErrorMsg(error instanceof DOMException && error.name === 'AbortError'
        ? '分析等候時間過長，請稍後再試。'
        : '目前無法連線到音樂人格服務，請稍後再試。');
    } finally {
      window.clearTimeout(timeout);
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
    <div ref={mainRef} className="app-bg min-h-screen overflow-x-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="constellation-ring constellation-ring-top pointer-events-none z-0" />
      <div className="constellation-ring constellation-ring-bottom pointer-events-none z-0" />

      {pageState === 'landing' && <LandingHero onStart={handleStart} />}

      {pageState === 'form' && (
        <main ref={formRef} className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPageState('landing')}
                className="text-xs tracking-widest text-[color:var(--text-muted)] transition hover:text-white"
              >
                ← 上一步
              </button>
              <span className="text-[color:var(--text-muted)]">·</span>
              <Link href="/" className="text-xs tracking-widest text-[color:var(--text-muted)] transition hover:text-white">
                🏠 首頁
              </Link>
              <span className="text-[color:var(--text-muted)]">·</span>
              <Link href="/insight" className="text-xs tracking-widest text-cyan-300/70 transition hover:text-cyan-300">
                ✨ 深度洞察
              </Link>
            </div>
            <div className="rounded-full border border-violet-400/30 px-4 py-1 text-xs font-semibold tracking-[0.3em] text-violet-200">
              AI 人格音樂
            </div>
          </div>

          <section className="grid gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <div className="fortune-card p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.35em] text-violet-300">主題曲資料</p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">建立你的音樂輪廓</h2>
                <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                  只填會影響音樂風格的重點資料
                </p>
              </div>

              <PersonalityMusicFlow onSubmit={handleSubmit} loading={loading} />

              {loading && (
                <div className="mt-6">
                  <MusicAnalyticalConsole name={submittedName} />
                </div>
              )}

              {errorMsg && (
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-300">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center gap-6">
              <div style={{ width: 'min(380px, 90vw)', height: 'min(380px, 90vw)' }}>
                <VisualGravityCore />
              </div>
              <p className="text-center text-xs tracking-widest text-[color:var(--text-muted)]">
                正在校準你的音樂輪廓
              </p>
              <div className="w-full max-w-sm space-y-3 text-xs text-[color:var(--text-muted)]">
                {[
                  '年代音樂偏好',
                  '星座與人格節奏',
                  '血型表達風格',
                  '姓名與聲音氣質',
                ].map((text) => (
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

      {pageState === 'result' && result && (
        <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14 overflow-hidden">
          <div className="absolute right-0 top-0 opacity-[0.06] pointer-events-none translate-x-12 -translate-y-12">
            <svg
              className="w-80 h-80 text-violet-400"
              style={{ animation: 'spin 80s linear infinite' }}
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="taijiGradMusic" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
                </linearGradient>
                <filter id="taijiGlowMusic" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,2" opacity="0.3" fill="none" />
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4,4" opacity="0.5" fill="none" />
              <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="0.25" opacity="0.4" fill="none" />
              <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="0.5" strokeDasharray="8,2" opacity="0.3" fill="none" />
              <g fontSize="4.5" fill="currentColor" opacity="0.7" fontFamily="monospace" filter="url(#taijiGlowMusic)">
                <text x="50" y="10" textAnchor="middle">☰</text>
                <text x="78" y="22" textAnchor="middle" transform="rotate(45, 78, 22)">☴</text>
                <text x="90" y="50" textAnchor="middle" transform="rotate(90, 90, 50)">☲</text>
                <text x="78" y="78" textAnchor="middle" transform="rotate(135, 78, 78)">☳</text>
                <text x="50" y="90" textAnchor="middle" transform="rotate(180, 50, 90)">☷</text>
                <text x="22" y="78" textAnchor="middle" transform="rotate(225, 22, 78)">☱</text>
                <text x="10" y="50" textAnchor="middle" transform="rotate(270, 10, 50)">☵</text>
                <text x="22" y="22" textAnchor="middle" transform="rotate(315, 22, 22)">☶</text>
              </g>
              <g filter="url(#taijiGlowMusic)">
                <path
                  d="M 50 16 A 34 34 0 0 1 50 84 A 17 17 0 0 1 50 50 A 17 17 0 0 0 50 16 Z"
                  fill="url(#taijiGradMusic)"
                  stroke="none"
                />
                <circle cx="50" cy="33" r="4" fill="#020617" stroke="none" />
                <circle cx="50" cy="67" r="4" fill="currentColor" stroke="none" opacity="0.9" />
              </g>
            </svg>
          </div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">音樂人格結果</p>
              <h2 className="mt-1 font-serif text-3xl text-[color:var(--text-main)]">{submittedName} 的人格主題曲</h2>
            </div>
            <button
              type="button"
              onClick={() => setPageState('landing')}
              className="text-xs tracking-widest text-[color:var(--text-muted)] transition hover:text-white"
            >
              返回首頁
            </button>
          </div>

          <PersonalityMusicReport
            personalityMatrix={(result?.personality_matrix ?? {}) as any}
            musicParameters={result?.music_parameters ?? { bpm: 120, key: 'C', genre: 'Pop', mood: [], vocal_style: '', instrument: [], lyric_theme: [] }}
            musicReport={result?.music_report ?? { music_narrative: '', song_title_suggestion: '', lyric_opening: '', music_message: '', wisdom_note: '', english_song_reason: '', mandarin_song_reason: '', taiwanese_song_reason: '' }}
            meta={result?.meta ?? { zodiac: '', era: '' }}
            englishTrack={result?.english_track ?? { title: '', artist: '', videoId: '' }}
            mandarinTrack={result?.mandarin_track ?? null}
            taiwaneseTrack={result?.taiwanese_track ?? null}
            songDrafts={result?.song_drafts}
            productionPlan={result?.production_plan}
            fusionSong={result?.fusion_song}
            name={submittedName}
            onReset={handleReset}
          />

          <div className="mt-8">
            <NextStepGuide current="music" />
          </div>
        </main>
      )}
    </div>
  );
}
