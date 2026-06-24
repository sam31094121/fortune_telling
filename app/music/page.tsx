'use client';

import { useRef, useState } from 'react';
import VisualGravityCore from '@/components/VisualGravityCore';
import PersonalityMusicFlow, { type MusicFormData } from '@/components/PersonalityMusicFlow';
import PersonalityMusicReport from '@/components/PersonalityMusicReport';

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

      <div
        className="pointer-events-none absolute"
        style={{
          width: 'min(640px, 95vw)',
          height: 'min(640px, 95vw)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.55,
        }}
      >
        <VisualGravityCore />
      </div>

      <div className="relative z-20 flex max-w-3xl flex-col items-center">
        <div className="mb-8 inline-flex rounded-full border border-violet-400/35 bg-violet-500/10 px-5 py-1.5 text-xs font-semibold tracking-[0.35em] text-violet-200">
          天・地・人 AI 人格音樂系統 V1.0
        </div>

        <h1 className="mystic-title font-serif text-5xl leading-tight sm:text-6xl lg:text-7xl">
          讓你的命格<br />變成一首歌
        </h1>

        <p className="mt-8 max-w-2xl text-base leading-8 text-[color:var(--text-sub)]">
          輸入民國年國曆生日、血型、姓名與聲音特徵，系統會先自動換算西元，再融合天地人模型與音樂參數，產出你的專屬人格音樂報告。
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <button type="button" onClick={onStart} className="vip-gold-btn px-14 py-5 text-lg">
            啟動人格音樂
          </button>
          <a href="/" className="text-xs tracking-widest text-[color:var(--text-muted)] transition hover:text-white">
            返回人格解碼首頁
          </a>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-4">
          {[
            { label: '天 35%', desc: '生日決定主旋律與情緒底色', color: 'rgba(109,74,255,0.7)' },
            { label: '地 35%', desc: '血型補充節奏感與表達方式', color: 'rgba(201,162,74,0.7)' },
            { label: '人 30%', desc: '姓名校正歌詞靈魂與記憶點', color: 'rgba(215,139,255,0.7)' },
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
    <div className="app-bg min-h-screen overflow-x-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="constellation-ring constellation-ring-top pointer-events-none z-0" />
      <div className="constellation-ring constellation-ring-bottom pointer-events-none z-0" />

      {pageState === 'landing' && <LandingHero onStart={handleStart} />}

      {pageState === 'form' && (
        <main ref={formRef} className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPageState('landing')}
              className="flex items-center gap-2 text-sm text-[color:var(--text-muted)] transition hover:text-white"
            >
              ← 返回
            </button>
            <div className="rounded-full border border-violet-400/30 px-4 py-1 text-xs font-semibold tracking-[0.3em] text-violet-200">
              天・地・人 AI 人格音樂系統 V1.0
            </div>
          </div>

          <section className="grid gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <div className="fortune-card p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.35em] text-violet-300">人格音樂輸入</p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">建立你的音樂人格</h2>
                <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                  全球大數據分析 × 天地人三模型融合
                </p>
              </div>

              <PersonalityMusicFlow onSubmit={handleSubmit} loading={loading} />

              {loading && (
                <div className="mt-6 rounded-2xl border border-violet-400/15 bg-violet-950/20 p-4 text-center text-sm text-violet-200">
                  正在生成三首原創歌、融合主題曲與 AI 製作分配，請稍候…
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
                中央引力核正在校準你的氣場
              </p>
              <div className="w-full max-w-sm space-y-3 text-xs text-[color:var(--text-muted)]">
                {[
                  '全球 1950s–2020s 年代音樂數據庫',
                  '12 星座 × 31 日 人格矩陣引擎',
                  '4 血型 × 性別 行為模型校正',
                  '姓名筆畫能量學 × 音韻心理學',
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
        <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
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
            personalityMatrix={result.personality_matrix as never}
            musicParameters={result.music_parameters}
            musicReport={result.music_report}
            meta={result.meta}
            englishTrack={result.english_track}
            mandarinTrack={result.mandarin_track}
            taiwaneseTrack={result.taiwanese_track}
            songDrafts={result.song_drafts}
            productionPlan={result.production_plan}
            fusionSong={result.fusion_song}
            name={submittedName}
            onReset={handleReset}
          />
        </main>
      )}
    </div>
  );
}
