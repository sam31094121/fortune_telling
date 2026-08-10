'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import Link from 'next/link';
import PersonalityMusicFlow, { type MusicFormData } from '@/components/PersonalityMusicFlow';
import PersonalityMusicReport from '@/components/PersonalityMusicReport';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import FeatureVisitorCounter from '@/components/FeatureVisitorCounter';
import TaijiStandaloneCard from '@/components/TaijiStandaloneCard';
import { getCompletedGrowthModules, getGrowthElements, markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';
import FiveElementPriorityCard from '@/components/FiveElementPriorityCard';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import MegaInputGuide from '@/components/MegaInputGuide';
import { getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';
import type { FiveElementIntegrationResult } from '@/lib/five-element-engine';

interface SongTrack {
  title: string;
  artist: string;
  videoId: string;
}

interface VoiceProfile {
  workflowStatus: string;
  consentAccepted: boolean;
  recorded: boolean;
  localOnly: boolean;
  sample: null | {
    durationSeconds: number;
    qualityScore: number;
    averageVolume: number;
    dynamicRange: number;
    brightness: number;
    tempoPulse: number;
    inferredCharacteristics: string[];
    recordedAt: string;
  };
  selfDialogueConcept: string;
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

interface MusicGenerateResponse {
  life_song_context?: {
    targetMode: 'self' | 'guest' | null;
    goal: string;
    goalNote: string;
    creativeStyle: string;
    growthSummary: string;
    worldView: string;
    theme: string;
    scene: string;
  };
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
  voice_profile?: VoiceProfile;
  fiveElement?: FiveElementIntegrationResult;
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

type PageState = 'landing' | 'form' | 'result';
type MusicDailyResult = { result: MusicGenerateResponse; submittedName: string };

const MUSIC_GENERATION_FRIENDLY_FAILURE = '目前暫時無法完成歌曲生成。\n請稍後再試。\n造成您的不便，敬請見諒。';

const VOICE_PROMISES = [
  { title: '先聽見聲音', body: '進入後先選催淚女聲或深情男聲，客戶能立刻感覺到方向。' },
  { title: '再整理資料', body: '生日、姓名、血型與時辰只分段出現，手機上不會一次塞滿。' },
  { title: '最後出歌', body: 'AI 會輸出歌名、歌詞、主唱方向與完整創作藍圖。' },
];

function LandingHero({ onStart, dailyRecord }: { onStart: () => void; dailyRecord: DailyAnalysisRecord<MusicDailyResult> | null }) {
  const lastStartTouchRef = useRef(0);

  const handleStartPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    lastStartTouchRef.current = Date.now();
    onStart();
  };

  const handleStartClick = () => {
    if (Date.now() - lastStartTouchRef.current < 650) return;
    onStart();
  };

  return (
    <section className="music-landing-hero relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 50% 50%, rgba(109,74,255,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 42% 42% at 50% 54%, rgba(201,162,74,0.1) 0%, transparent 62%)
          `,
        }}
      />

      <div className="music-landing-stack relative z-20 flex max-w-3xl flex-col items-center">
        <TaijiStandaloneCard className="music-landing-taiji mb-4" />

        <DailyAnalysisNotice record={dailyRecord} className="mb-5 w-full max-w-2xl text-left" moduleName="AI 生命歌曲" />
        <IdentitySplitSelector className="mb-5 w-full max-w-2xl text-left" />

        <div className="music-landing-copy">
          <span className="music-landing-eyebrow">AI EMOTIONAL VOICE SONG</span>
          <h1 className="music-landing-title">
            <span className="music-landing-title-line">AI 生命歌曲</span>
            <span className="music-landing-title-line music-landing-title-line--accent">先讓你聽見情緒</span>
            <span className="music-landing-title-line">再把故事唱出來</span>
          </h1>
          <p className="music-landing-subcopy">
            選一個能打動你的男聲或女聲，AI 會把生命主題、姓名、生日與五元素整理成一首專屬歌曲。
          </p>
        </div>

        <section className="mt-5 grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3" aria-label="AI 生命歌曲三步驟">
          {VOICE_PROMISES.map((item, index) => (
            <article key={item.title} className="rounded-[22px] border border-violet-300/18 bg-white/[0.045] p-4 shadow-[0_14px_34px_rgba(2,6,23,0.22)]">
              <p className="text-[11px] font-black tracking-[0.22em] text-amber-100">第 {index + 1} 道</p>
              <h2 className="mt-2 text-base font-black leading-6 text-violet-50">{item.title}</h2>
              <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{item.body}</p>
            </article>
          ))}
        </section>

        <div className="music-landing-actions mt-5 flex flex-col items-center gap-3">
          <button type="button" onPointerUp={handleStartPointerUp} onClick={handleStartClick} className="vip-gold-btn music-start-button w-full max-w-[22rem] px-8 py-4 text-base shadow-[0_0_25px_rgba(201,162,74,0.26)] border border-amber-400/20 sm:w-auto sm:px-14 sm:py-5 sm:text-lg sm:animate-bounce">
            {dailyRecord ? getDailyAnalysisButtonLabel(dailyRecord) : '開始創作生命歌曲'}
          </button>
          <Link href="/" className="feature-home-link feature-home-link--violet">
            返回首頁
          </Link>
        </div>
      </div>
    </section>
  );
}

function MusicAnalyticalConsole({ name }: { name: string }) {
  const logs = [
    `讀取使用者資料：${name || '未命名'}`,
    'AI 正在整合生命主題、聲線、五元素與歌曲風格。',
    '準備歌名、歌詞方向、主唱情緒與完整創作藍圖。',
  ];

  return (
    <div className="fortune-card border border-violet-500/20 bg-slate-950/80 p-6 font-mono shadow-[0_0_30px_rgba(139,92,246,0.08)] sm:p-8">
      <p className="text-xs uppercase tracking-[0.22em] text-violet-300">AI 正在生成您的專屬歌曲</p>
      <div className="mt-6 min-h-[150px] space-y-3.5 text-xs leading-7 text-violet-100 sm:text-sm">
        {logs.map((log, index) => (
          <div key={`${log}-${index}`} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.8)]" />
            <span>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VoiceResultCard({ voiceProfile }: { voiceProfile: VoiceProfile }) {
  const traits = voiceProfile.sample?.inferredCharacteristics ?? [];
  const isFemale = traits.includes('ai_voice_female');
  const isMale = traits.includes('ai_voice_male');
  const voiceLabel = isFemale ? '催淚女聲' : isMale ? '深情男聲' : 'AI 自動聲線';

  return (
    <section className="mb-6 rounded-[22px] border border-violet-300/20 bg-violet-950/20 p-4 shadow-[0_10px_28px_rgba(2,6,23,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[0.22em] text-violet-200">AI 主唱聲線</p>
          <h2 className="mt-2 text-xl font-black leading-tight text-violet-50">{voiceLabel}</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
            AI 已依照你選擇的聲線建立演唱方向：溫度、呼吸、情緒轉折與副歌釋放都會一起送進歌曲生成。
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
          聲線已鎖定
        </span>
      </div>
      {voiceProfile.sample && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <p className="text-[10px] text-[color:var(--text-muted)]">模式</p>
            <p className="mt-1 text-sm font-black text-violet-100">AI 主唱</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <p className="text-[10px] text-[color:var(--text-muted)]">品質</p>
            <p className="mt-1 text-sm font-black text-cyan-100">{voiceProfile.sample.qualityScore}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <p className="text-[10px] text-[color:var(--text-muted)]">情緒脈衝</p>
            <p className="mt-1 text-sm font-black text-amber-100">{Math.round(voiceProfile.sample.tempoPulse * 100)}</p>
          </div>
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
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<MusicDailyResult> | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const record = readDailyAnalysis<MusicDailyResult>('music');
    if (!record) return;
    setDailyRecord(record);
    setResult(record.result.result);
    setSubmittedName(record.result.submittedName);
    setPageState('result');
  }, []);

  useEffect(() => {
    if (pageState === 'result' || loading || errorMsg) {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pageState, loading, errorMsg]);

  async function handleSubmit(data: MusicFormData) {
    const existing = readDailyAnalysis<MusicDailyResult>('music');
    if (existing) {
      setDailyRecord(existing);
      setResult(existing.result.result);
      setSubmittedName(existing.result.submittedName);
      setPageState('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!getAnalysisIdentityTarget()) {
      setErrorMsg(getIdentityRequiredMessage());
      setPageState('form');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    setSubmittedName(data.name.trim());

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);

    try {
      const targetMode = getAnalysisIdentityTarget();
      const growthContext = targetMode === 'self'
        ? { completedModules: getCompletedGrowthModules(), elements: getGrowthElements() }
        : null;

      const response = await fetch('/api/music-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          lifeGoal: data.lifeGoal,
          lifeGoalNote: data.lifeGoalNote.trim(),
          songCreativeStyle: data.songCreativeStyle,
          analysisTarget: targetMode,
          growthContext,
          birthDate: data.birthDate,
          bloodType: data.bloodType,
          name: data.name.trim(),
          gender: data.gender,
          shichen: data.shichen,
          voiceCharacteristics: data.voiceCharacteristics,
          vocalGenderPreference: data.vocalGenderPreference,
          magneticVoice: data.magneticVoice,
          magneticVoiceType: data.magneticVoiceType,
          preferredSongLanguage: data.preferredSongLanguage,
          songEnergyStyle: data.songEnergyStyle,
          voiceConsent: data.voiceConsent,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setErrorMsg(json.error || MUSIC_GENERATION_FRIENDLY_FAILURE);
        return;
      }

      setResult(json as MusicGenerateResponse);
      setDailyRecord(saveDailyAnalysis<MusicDailyResult>('music', { result: json as MusicGenerateResponse, submittedName: data.name.trim() }));
      if (targetMode === 'self') markGrowthModuleCompleted('music', (json as MusicGenerateResponse).fiveElement?.brandElement);
      setPageState('result');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('[music] generate failed', error);
      setErrorMsg(MUSIC_GENERATION_FRIENDLY_FAILURE);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  function handleStart() {
    const existing = readDailyAnalysis<MusicDailyResult>('music');
    if (existing) {
      setDailyRecord(existing);
      setResult(existing.result.result);
      setSubmittedName(existing.result.submittedName);
      setPageState('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPageState('form');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function handleReset() {
    const existing = readDailyAnalysis<MusicDailyResult>('music');
    if (existing) {
      setDailyRecord(existing);
      setResult(existing.result.result);
      setSubmittedName(existing.result.submittedName);
      setPageState('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setResult(null);
    setErrorMsg('');
    setPageState('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div ref={mainRef} className="app-bg min-h-[100svh] overflow-x-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="constellation-ring constellation-ring-top pointer-events-none z-0" />
      <div className="constellation-ring constellation-ring-bottom pointer-events-none z-0" />

      {pageState === 'form' && (
        <div className="relative z-30 mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-3">
            <FeatureVisitorCounter featureKey="music" className="shrink-0" />
            <Link href="/" className="feature-home-link feature-home-link--violet mt-1 shrink-0">
              返回首頁
            </Link>
          </div>
        </div>
      )}

      {pageState === 'landing' && <LandingHero onStart={handleStart} dailyRecord={dailyRecord} />}

      {pageState === 'form' && (
        <main ref={formRef} className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">
          <section className="mx-auto max-w-3xl">
            <div className="fortune-card p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.35em] text-violet-300">AI VOICE SONG</p>
                <h1 className="mt-2 font-serif text-2xl font-black leading-tight text-[color:var(--text-main)]">生成一首會被記住的生命歌曲</h1>
              </div>

              <DailyAnalysisNotice record={dailyRecord} className="mb-6" moduleName="AI 生命歌曲" onViewResult={dailyRecord ? handleStart : undefined} />

              <IdentitySplitSelector className="mb-6" />

              <MegaInputGuide
                title="照順序填歌曲資料"
                steps={['先選人生主題', '再選音樂風格與聲音', '最後填姓名、生日、血型、性別']}
                example="可以寫：我想把撐了很久的自己唱出來。"
                tone="violet"
                className="mb-6"
              />

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
          </section>
        </main>
      )}

      {pageState === 'result' && result && (
        <main className="relative z-10 mx-auto max-w-6xl overflow-hidden px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <DailyAnalysisNotice record={dailyRecord} className="mb-6" moduleName="AI 生命歌曲" />

          <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="max-w-2xl text-xs font-semibold leading-6 tracking-[0.08em] text-violet-300 sm:text-sm">
                AI 已完成歌曲方向：主題、聲線、五元素與創作藍圖都已整理完成。
              </p>
              <h2 className="mt-1 font-serif text-3xl text-[color:var(--text-main)]">
                {submittedName}的 AI 專屬生命歌曲
              </h2>
            </div>
            <Link href="/" className="feature-home-link feature-home-link--violet shrink-0 self-end sm:self-start">返回首頁</Link>
          </div>

          {result.voice_profile && <VoiceResultCard voiceProfile={result.voice_profile} />}

          <div className="mb-6">
            <FiveElementPriorityCard result={result.fiveElement} />
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
            voiceProfile={result?.voice_profile}
            lifeSongContext={result?.life_song_context}
            name={submittedName}
            onReset={handleReset}
          />
        </main>
      )}
    </div>
  );
}
