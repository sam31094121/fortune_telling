'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PersonalityMusicFlow, { type MusicFormData } from '@/components/PersonalityMusicFlow';
import PersonalityMusicReport from '@/components/PersonalityMusicReport';
import NextStepGuide from '@/components/NextStepGuide';
import FeatureVisitorCounter from '@/components/FeatureVisitorCounter';
import TaijiStandaloneCard from '@/components/TaijiStandaloneCard';

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
        <TaijiStandaloneCard className="mb-8" />

        <div className="hidden mb-8 rounded-full border border-violet-400/35 bg-violet-500/10 px-5 py-1.5 text-xs font-semibold tracking-[0.35em] text-violet-200">
          AI 人格音樂
        </div>

        <h1 className="hidden mystic-title font-serif text-5xl leading-tight sm:text-6xl lg:text-7xl">
          把你的性格<br />聽成一首歌
        </h1>

        <p className="hidden mt-8 max-w-2xl text-base leading-8 text-[color:var(--text-sub)]">
          輸入生日、血型、姓名與聲音特徵，AI 會整理你的性格節奏與音樂風格，
          產出一份好懂的人格主題曲預覽。
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <button type="button" onClick={onStart} className="vip-gold-btn px-14 py-5 text-lg animate-bounce shadow-[0_0_25px_rgba(201,162,74,0.3)] border border-amber-400/20">
            👇 一鍵開啟 · 生成我的主題曲
          </button>
          <Link href="/" className="text-xs tracking-widest text-[color:var(--text-muted)] transition hover:text-white">
            回到人格解碼首頁
          </Link>
        </div>

        <div className="hidden mt-14 grid grid-cols-3 gap-4">
          {[
            { label: '生日', desc: '抓出情緒底色', color: 'rgba(109,74,255,0.7)' },
            { label: '血型', desc: '補上表達節奏', color: 'rgba(201,162,74,0.7)' },
            { label: '姓名', desc: '生成專屬歌詞靈魂', color: 'rgba(215,139,255,0.7)' },
          ].map((item) => (
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
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">{item.desc}</p>
            </div>
          ))}
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
            vocalGenderPreference: data.vocalGenderPreference,
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
      <div className="relative z-30 mx-auto max-w-6xl px-4 pt-6">
        <FeatureVisitorCounter featureKey="music" />
      </div>

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
              <TaijiStandaloneCard />
              <p className="hidden text-center text-xs tracking-widest text-[color:var(--text-muted)]">
                正在校準你的音樂輪廓
              </p>
              <div className="hidden w-full max-w-sm space-y-3 text-xs text-[color:var(--text-muted)]">
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
