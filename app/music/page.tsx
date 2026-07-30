'use client';

import { useRef, useState, useEffect, useMemo, type PointerEvent } from 'react';
import Link from 'next/link';
import PersonalityMusicFlow, { type MusicFormData } from '@/components/PersonalityMusicFlow';
import PersonalityMusicReport from '@/components/PersonalityMusicReport';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import FeatureVisitorCounter from '@/components/FeatureVisitorCounter';
import TaijiStandaloneCard from '@/components/TaijiStandaloneCard';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';
import FiveElementPriorityCard from '@/components/FiveElementPriorityCard';
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

const MUSIC_GENERATION_FRIENDLY_FAILURE = '\u76ee\u524d\u66ab\u6642\u7121\u6cd5\u5b8c\u6210\u6b4c\u66f2\u751f\u6210\u3002\n\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002\n\u9020\u6210\u60a8\u7684\u4e0d\u4fbf\uff0c\u656c\u8acb\u898b\u8ad2\u3002';

function LandingHero({ onStart }: { onStart: () => void }) {
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
            radial-gradient(ellipse 42% 42% at 50% 54%, rgba(201,162,74,0.09) 0%, transparent 62%)
          `,
        }}
      />

      <div className="music-landing-stack relative z-20 flex max-w-3xl flex-col items-center">
        <TaijiStandaloneCard className="music-landing-taiji mb-4" />

        <div className="music-landing-copy">
          <span className="music-landing-eyebrow">{"AI \u8072\u97f3\u6b4c\u66f2"}</span>
          <h1 className="music-landing-title">
            <span className="music-landing-title-line">{"AI\u751f\u6210\u4e00\u9996\u6b4c"}</span>
            <span className="music-landing-title-line music-landing-title-line--accent">{"\u81ea\u6211\u4eba\u683c\u5206\u88c2"}</span>
            <span className="music-landing-title-line">{"\u8ddf\u4f60\u81ea\u6211\u5c0d\u8a71"}</span>
          </h1>
          <p className="music-landing-subcopy">
            {"\u9019\u9996\u6b4c\uff0c\u662f\u4f60\u4eba\u683c\u5206\u88c2\u5f8c\uff0c\u6bcf\u4e00\u500b\u81ea\u5df1\u5171\u540c\u5531\u51fa\u7684\u5167\u5fc3\u7368\u767d\u3002"}
          </p>
        </div>

        <div className="music-mic-entry-guide" aria-label="\u9ea5\u514b\u98a8\u9304\u97f3\u5165\u53e3\u5f15\u5c0e">
          <p>{"\u8981\u7528\u81ea\u5df1\u7684\u8072\u97f3\u751f\u6210\u6b4c\u66f2\uff1f"}</p>
          <div>
            <span>{"1 \u9ede\u4e0b\u65b9\u6309\u9215\u76f4\u63a5\u958b\u9304\u97f3"}</span>
            <span>{"2 \u9ea5\u514b\u98a8\u7cfb\u7d71\u6703\u76f4\u63a5\u51fa\u73fe"}</span>
            <span>{"3 \u9304 15 \u79d2\u6216\u6539\u7528 AI \u8072\u97f3"}</span>
            <span>{"4 \u586b\u597d\u8cc7\u6599\u5f8c\u751f\u6210\u6b4c\u66f2"}</span>
          </div>
        </div>

        <div className="music-landing-actions mt-5 flex flex-col items-center gap-3">
          <button type="button" onPointerUp={handleStartPointerUp} onClick={handleStartClick} className="vip-gold-btn music-start-button w-full max-w-[22rem] px-8 py-4 text-base shadow-[0_0_25px_rgba(201,162,74,0.26)] border border-amber-400/20 sm:w-auto sm:px-14 sm:py-5 sm:text-lg sm:animate-bounce">
            {"\u76f4\u63a5\u958b\u555f\u9ea5\u514b\u98a8\u9304\u97f3\u7cfb\u7d71"}
          </button>
          <Link href="/" className="feature-home-link feature-home-link--violet">
            {"\u8fd4\u56de\u9996\u9801"}
          </Link>
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
    `\u8b80\u53d6\u4f7f\u7528\u8005\u8cc7\u6599\uff1a${name || '\u672a\u547d\u540d'}`,
    '\u78ba\u8a8d\u8072\u97f3\u751f\u6210\u65b9\u5f0f...',
    '\u5efa\u7acb\u4eba\u683c\u5206\u88c2\u8207\u81ea\u6211\u5c0d\u8a71\u7684\u6b4c\u66f2\u7d50\u69cb...',
    '\u628a\u60c5\u7dd2\u3001\u7bc0\u594f\u8207\u5167\u5fc3\u7368\u767d\u8f49\u6210\u65cb\u5f8b\u65b9\u5411...',
    '\u6b63\u5728\u751f\u6210\u60a8\u7684\u5c08\u5c6c\u6b4c\u66f2\uff0c\u8acb\u7a0d\u5019\u5e7e\u79d2\u9418...',
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
    <div className="fortune-card border border-violet-500/20 bg-slate-950/80 p-6 font-mono shadow-[0_0_30px_rgba(139,92,246,0.08)] sm:p-8">
      <p className="text-xs uppercase tracking-[0.22em] text-violet-300">{"AI \u8072\u97f3\u4eba\u683c\u751f\u6210\u4e2d"}</p>
      <div className="mt-6 min-h-[150px] space-y-3.5 text-xs leading-7 text-violet-100 sm:text-sm">
        {logs.map((log, index) => (
          <div key={`${log}-${index}`} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.8)]" />
            <span>{log}</span>
          </div>
        ))}
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
      markGrowthModuleCompleted('music');
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
    <div ref={mainRef} className="app-bg min-h-[100svh] overflow-x-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="constellation-ring constellation-ring-top pointer-events-none z-0" />
      <div className="constellation-ring constellation-ring-bottom pointer-events-none z-0" />
      {pageState === 'form' && (
        <div className="relative z-30 mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-3">
            <FeatureVisitorCounter featureKey="music" className="shrink-0" />
            <Link href="/" className="feature-home-link feature-home-link--violet mt-1 shrink-0">
              {"\u8fd4\u56de\u9996\u9801"}
            </Link>
          </div>
        </div>
      )}

      {pageState === 'landing' && <LandingHero onStart={handleStart} />}

      {pageState === 'form' && (
        <main ref={formRef} className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">

          <section className="mx-auto max-w-3xl">
            <div className="fortune-card p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.35em] text-violet-300">{"AI VOICE SONG"}</p>
                <h2 className="music-form-title mt-2 font-serif text-[color:var(--text-main)]"><span>{"AI\u751f\u6210\u4e00\u9996\u6b4c"}</span><span>{"\u81ea\u6211\u4eba\u683c\u5206\u88c2"}</span><span>{"\u8ddf\u4f60\u81ea\u6211\u5c0d\u8a71"}</span></h2>
                <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">
                  {"\u9019\u9996\u6b4c\uff0c\u662f\u4f60\u4eba\u683c\u5206\u88c2\u5f8c\uff0c\u6bcf\u4e00\u500b\u81ea\u5df1\u5171\u540c\u5531\u51fa\u7684\u5167\u5fc3\u7368\u767d\u3002"}
                </p>
              </div>

              <IdentitySplitSelector className="mb-6" />

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
          <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="max-w-2xl text-xs font-semibold leading-6 tracking-[0.08em] text-violet-300 sm:text-sm">{"AI\u751f\u6210\u4e00\u9996\u6b4c \u81ea\u6211\u4eba\u683c\u5206\u88c2\u8ddf\u81ea\u6211\u5c0d\u8a71\u3002\u9019\u9996\u6b4c\uff0c\u662f\u4f60\u4eba\u683c\u5206\u88c2\u5f8c\uff0c\u6bcf\u4e00\u500b\u81ea\u5df1\u5171\u540c\u5531\u51fa\u7684\u5167\u5fc3\u7368\u767d\u3002"}</p>
              <h2 className="mt-1 font-serif text-3xl text-[color:var(--text-main)]">
                {submittedName}{"\u7684\u4eba\u683c\u4e3b\u984c\u66f2"}
              </h2>
            </div>
            <Link href="/" className="feature-home-link feature-home-link--violet self-end shrink-0 sm:self-start">{"\u8fd4\u56de\u9996\u9801"}</Link>
          </div>

          {result.voice_profile && (
            <section className="mb-6 rounded-[22px] border border-violet-300/20 bg-violet-950/20 p-4 shadow-[0_10px_28px_rgba(2,6,23,0.22)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black tracking-[0.22em] text-violet-200">
                    {result.voice_profile.recorded ? "\u{1F3B5} \u60a8\u7684\u5c08\u5c6c\u6b4c\u66f2\u5df2\u5b8c\u6210\uff01" : result.voice_profile.workflowStatus === 'AI_VOICE_READY' ? "\u{1F3B5} \u60a8\u7684\u5c08\u5c6c\u6b4c\u66f2\u5df2\u5b8c\u6210\uff01" : "\u672c\u4eba\u8072\u97f3\u6458\u8981\u6821\u6e96"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
                    {result.voice_profile.recorded
                      ? "AI \u5df2\u5b8c\u6210\u60a8\u7684\u8072\u97f3\u5206\u6790\uff0c\u4e26\u5efa\u7acb\u5c08\u5c6c\u8072\u97f3\u6a21\u578b\u7528\u65bc\u6b4c\u66f2\u5275\u4f5c\u3002\u795d\u60a8\u8076\u807d\u6109\u5feb\uff01"
                      : result.voice_profile.selfDialogueConcept}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
                  {result.voice_profile.recorded ? "\u5df2\u9304\u97f3\u6458\u8981\u6821\u6e96" : result.voice_profile.workflowStatus === 'AI_VOICE_READY' ? 'AI \u8072\u97f3\u751f\u6210' : result.voice_profile.consentAccepted ? "\u5df2\u6388\u6b0a" : "\u672a\u555f\u7528"}
                </span>
              </div>
              {result.voice_profile.sample && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
                    <p className="text-[10px] text-[color:var(--text-muted)]">{"\u9304\u97f3\u79d2\u6578"}</p>
                    <p className="mt-1 text-sm font-black text-violet-100">{result.voice_profile.sample.durationSeconds}s</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
                    <p className="text-[10px] text-[color:var(--text-muted)]">{"\u8072\u97f3\u6e05\u6670\u5ea6"}</p>
                    <p className="mt-1 text-sm font-black text-cyan-100">{result.voice_profile.sample.qualityScore}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
                    <p className="text-[10px] text-[color:var(--text-muted)]">{"\u5c0d\u8a71\u7bc0\u594f"}</p>
                    <p className="mt-1 text-sm font-black text-amber-100">{Math.round(result.voice_profile.sample.tempoPulse * 100)}</p>
                  </div>
                </div>
              )}
            </section>
          )}

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
            name={submittedName}
            onReset={handleReset}
          />
        </main>
      )}
    </div>
  );
}
