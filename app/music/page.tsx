'use client';

import { useRef, useState, useEffect, useMemo, type PointerEvent } from 'react';
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
type MusicDailyResult = { result: MusicGenerateResponse; submittedName: string };

const MUSIC_GENERATION_FRIENDLY_FAILURE = '\u76ee\u524d\u66ab\u6642\u7121\u6cd5\u5b8c\u6210\u6b4c\u66f2\u751f\u6210\u3002\n\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002\n\u9020\u6210\u60a8\u7684\u4e0d\u4fbf\uff0c\u656c\u8acb\u898b\u8ad2\u3002';


type MusicLifeSongLayerMaterial = {
  layer: string;
  title: string;
  heading: string;
  body: string;
  professionalMaterial: string;
  aiInput: string;
  aiOutput: string;
  handoff: string;
  checkpoints: string[];
};

const MUSIC_LIFE_SONG_THREE_LAYER_MATERIAL: MusicLifeSongLayerMaterial[] = [
  {
    layer: '第一層',
    title: '專業素材',
    heading: 'AI 生命歌曲資料底盤',
    body: 'AI 先建立歌曲素材庫，不急著生成歌曲。此層把使用者目標、姓名、生日、血型、性別、時辰、五元素與補強方向轉成歌曲可使用的專業素材。',
    professionalMaterial: '建立歌曲主角、人生命題、情緒底色、五元素缺口、補強方向、聲線傾向、語言選擇與曲風基準。',
    aiInput: '讀取：分析自己/親友、本次目標、生命資料、歌曲風格、語言、五元素與補強方向。',
    aiOutput: '輸出：歌曲素材表、主角設定、情緒速度、核心補強方向與不可偏離的創作邊界。',
    handoff: '交給第二層時，只交付整理後的素材，不直接產生歌詞或旋律。',
    checkpoints: ['資料完整', '主角明確', '五元素補強方向明確', '歌曲用途明確'],
  },
  {
    layer: '第二層',
    title: 'AI 理解',
    heading: '歌曲世界觀與主題轉譯',
    body: '第二層只讀第一層素材，把專業資料翻譯成一般使用者聽得懂的歌曲世界觀。它要先理解這首歌為什麼存在，再決定故事、意境與情緒弧線。',
    professionalMaterial: '建立歌曲使命、故事主軸、情緒弧線、陪伴語氣、主題句、畫面感與副歌核心訊息。',
    aiInput: '讀取：第一層的歌曲素材表、主角設定、五元素補強方向與曲風基準。',
    aiOutput: '輸出：世界觀、歌曲主題、核心場景、情緒轉折、主歌/副歌敘事方向。',
    handoff: '交給第三層時，只交付可創作的歌曲藍圖，不重新讀原始命理資料。',
    checkpoints: ['世界觀成立', '主題不偏離', '情緒弧線清楚', '副歌核心明確'],
  },
  {
    layer: '第三層',
    title: 'AI 創作',
    heading: '歌名、歌詞、編曲與聲線生成',
    body: '第三層只讀第二層歌曲藍圖，依序完成歌名、歌曲介紹、歌詞、曲風、節奏、聲線與完整歌曲輸出。此層不要求使用者錄音，也不因麥克風權限中斷。',
    professionalMaterial: '完成歌曲命名、段落結構、主歌副歌、Hook、BPM、調性、樂器、AI 聲線、播放與收藏資料。',
    aiInput: '讀取：第二層的世界觀、主題句、情緒弧線、故事場景與創作邊界。',
    aiOutput: '輸出：完整生命歌曲、歌詞、製作計畫、AI 聲線、播放展示與成長中心紀錄。',
    handoff: '完成後交給結果頁與 Integration Layer；自己模式可寫入成長中心，親友模式只做單次分析。',
    checkpoints: ['歌名完成', '歌詞完整', '曲風參數完整', 'AI 聲線完成'],
  },
];

function MusicLifeSongThreeLayerCard({ context, mode = 'landing' }: { context?: MusicGenerateResponse['life_song_context'] | null; mode?: 'landing' | 'form' | 'result' }) {
  const isResult = mode === 'result' && context;
  const title = isResult ? 'AI 生命歌曲三層生成紀錄' : 'AI 生成一首歌｜三層專業流程';
  const subtitle = isResult ? '本次歌曲已依照三層流程完成：第一層建素材，第二層做 AI 理解，第三層進入 AI 創作。' : '這張卡不是直接輸入後生成，而是先建素材、再理解、最後創作，讓歌曲成為專屬陪伴。';
  const cardClassName = ['rounded-[26px] border border-violet-300/20 bg-[linear-gradient(135deg,rgba(76,29,149,0.26),rgba(15,23,42,0.78)_45%,rgba(2,6,23,0.82))] p-4 text-left shadow-[0_18px_44px_rgba(2,6,23,0.28)]', mode === 'landing' ? 'mt-5 w-full max-w-3xl' : 'mt-5'].join(' ');

  return (
    <section className={cardClassName}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-violet-200/80">AI LIFE SONG SYSTEM</p>
          <h2 className="mt-2 font-serif text-2xl font-black leading-tight text-violet-50 sm:text-3xl">{title}</h2>
        </div>
        <span className="w-fit rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-[11px] font-bold text-amber-100">三層已建立</span>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-sub)]">{subtitle}</p>

      {isResult && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/18 px-3 py-3 text-xs leading-6 text-violet-100/86">
          <p><b className="text-amber-100">歌曲目標：</b>{context.goal || '本次生命歌曲目標'}</p>
          <p><b className="text-amber-100">歌曲世界觀：</b>{context.worldView || 'AI 已建立歌曲世界觀'}</p>
          <p><b className="text-amber-100">核心主題：</b>{context.theme || 'AI 已完成主題轉譯'}</p>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {MUSIC_LIFE_SONG_THREE_LAYER_MATERIAL.map((item) => (
          <div key={item.layer} className="flex min-h-[360px] flex-col rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black tracking-[0.18em] text-violet-100/72">{item.layer}</span>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-amber-100/90">{item.title}</span>
            </div>
            <h3 className="mt-3 text-sm font-black leading-6 text-violet-50">{item.heading}</h3>
            <p className="mt-2 text-xs leading-6 text-[color:var(--text-main)]">{item.body}</p>

            <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-[11px] leading-5 text-[color:var(--text-sub)]">
              <p><b className="text-violet-100">專業素材：</b>{item.professionalMaterial}</p>
              <p><b className="text-cyan-100">承接輸入：</b>{item.aiInput}</p>
              <p><b className="text-amber-100">輸出結果：</b>{item.aiOutput}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {item.checkpoints.map((checkpoint) => (
                <span key={checkpoint} className="rounded-full border border-white/10 bg-black/16 px-2 py-1 text-[10px] font-semibold text-violet-100/78">{checkpoint}</span>
              ))}
            </div>

            <p className="mt-auto border-t border-white/10 pt-3 text-[11px] leading-5 text-[color:var(--text-muted)]">{item.handoff}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

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
            radial-gradient(ellipse 42% 42% at 50% 54%, rgba(201,162,74,0.09) 0%, transparent 62%)
          `,
        }}
      />

      <div className="music-landing-stack relative z-20 flex max-w-3xl flex-col items-center">
        <TaijiStandaloneCard className="music-landing-taiji mb-4" />

        <DailyAnalysisNotice record={dailyRecord} className="mb-5 w-full max-w-2xl text-left" />

        <div className="music-landing-copy">
          <span className="music-landing-eyebrow">{"AI LIFE SONG"}</span>
          <h1 className="music-landing-title">
            <span className="music-landing-title-line">{"AI \u5c08\u5c6c"}</span>
            <span className="music-landing-title-line music-landing-title-line--accent">{"\u751f\u547d\u6b4c\u66f2"}</span>
            <span className="music-landing-title-line">{"\u70ba\u4f60\u7684\u73fe\u5728\u800c\u5275\u4f5c"}</span>
          </h1>
          <p className="music-landing-subcopy">
            {"AI \u5148\u7406\u89e3\u4f60\u73fe\u5728\u6700\u60f3\u5b8c\u6210\u7684\u4e8b\uff0c\u518d\u6574\u5408\u547d\u7406\u3001\u4e94\u5143\u7d20\u8207\u88dc\u5f37\u65b9\u5411\uff0c\u5275\u4f5c\u4e00\u9996\u771f\u6b63\u5c6c\u65bc\u4f60\u7684\u751f\u547d\u6b4c\u66f2\u3002"}
          </p>
        </div>

        <MusicLifeSongThreeLayerCard mode="landing" />

        <div className="music-mic-entry-guide" aria-label="\u9ea5\u514b\u98a8\u9304\u97f3\u5165\u53e3\u5f15\u5c0e">
          <p>{"\u5b8c\u6574 AI \u751f\u547d\u6b4c\u66f2\u6d41\u7a0b"}</p>
          <div>
            <span>{"1 \u9078\u64c7\u73fe\u5728\u6700\u60f3\u5b8c\u6210\u7684\u4e8b"}</span>
            <span>{"2 \u9078\u64c7\u751f\u547d\u6b4c\u66f2\u98a8\u683c"}</span>
            <span>{"3 AI \u7d71\u6574\u547d\u7406\u3001\u8072\u97f3\u8207\u4e94\u5143\u7d20"}</span>
            <span>{"4 \u7522\u751f\u6b4c\u540d\u3001\u6b4c\u8a5e\u8207\u5b8c\u6574\u6b4c\u66f2"}</span>
          </div>
        </div>

        <div className="music-landing-actions mt-5 flex flex-col items-center gap-3">
          <button type="button" onPointerUp={handleStartPointerUp} onClick={handleStartClick} className="vip-gold-btn music-start-button w-full max-w-[22rem] px-8 py-4 text-base shadow-[0_0_25px_rgba(201,162,74,0.26)] border border-amber-400/20 sm:w-auto sm:px-14 sm:py-5 sm:text-lg sm:animate-bounce">
            {dailyRecord ? getDailyAnalysisButtonLabel(dailyRecord) : "\u958b\u59cb\u5275\u4f5c\u751f\u547d\u6b4c\u66f2"}
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
              {"\u8fd4\u56de\u9996\u9801"}
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
                <p className="text-xs uppercase tracking-[0.35em] text-violet-300">{"AI VOICE SONG"}</p>
                <h2 className="music-form-title mt-2 font-serif text-[color:var(--text-main)]"><span>{"AI \u5c08\u5c6c"}</span><span>{"\u751f\u547d\u6b4c\u66f2"}</span><span>{"\u70ba\u4f60\u7684\u73fe\u5728\u800c\u5275\u4f5c"}</span></h2>
                <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">
                  {"AI \u5148\u7406\u89e3\u4f60\u73fe\u5728\u6700\u60f3\u5b8c\u6210\u7684\u4e8b\uff0c\u518d\u6574\u5408\u547d\u7406\u3001\u4e94\u5143\u7d20\u8207\u88dc\u5f37\u65b9\u5411\uff0c\u5275\u4f5c\u4e00\u9996\u771f\u6b63\u5c6c\u65bc\u4f60\u7684\u751f\u547d\u6b4c\u66f2\u3002"}
                </p>
              </div>

                <MusicLifeSongThreeLayerCard mode="form" />

              <DailyAnalysisNotice record={dailyRecord} className="mb-6" />

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
              <p className="max-w-2xl text-xs font-semibold leading-6 tracking-[0.08em] text-violet-300 sm:text-sm">{"AI 專屬生命歌曲：AI 先理解你的目標，再整合命理、五元素、補強方向與 AI 自動聲線進行創作。"}</p>
              <h2 className="mt-1 font-serif text-3xl text-[color:var(--text-main)]">
                {submittedName}{"\u7684 AI \u5c08\u5c6c\u751f\u547d\u6b4c\u66f2"}
              </h2>
            </div>
            <Link href="/" className="feature-home-link feature-home-link--violet self-end shrink-0 sm:self-start">{"\u8fd4\u56de\u9996\u9801"}</Link>
          </div>

          {result.voice_profile && (
            <section className="mb-6 rounded-[22px] border border-violet-300/20 bg-violet-950/20 p-4 shadow-[0_10px_28px_rgba(2,6,23,0.22)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black tracking-[0.22em] text-violet-200">
                    {"🎵 AI 已自動生成專屬生命歌曲"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
                    {"AI 已自動建立演唱聲線並完成歌曲創作，不需要錄音或麥克風權限。"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
                  {"AI 自動聲線"}
                </span>
              </div>
              {result.voice_profile.sample && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
                    <p className="text-[10px] text-[color:var(--text-muted)]">{"AI 聲線"}</p>
                    <p className="mt-1 text-sm font-black text-violet-100">自動</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
                    <p className="text-[10px] text-[color:var(--text-muted)]">{"生成品質"}</p>
                    <p className="mt-1 text-sm font-black text-cyan-100">{result.voice_profile.sample.qualityScore}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
                    <p className="text-[10px] text-[color:var(--text-muted)]">{"節奏感"}</p>
                    <p className="mt-1 text-sm font-black text-amber-100">{Math.round(result.voice_profile.sample.tempoPulse * 100)}</p>
                  </div>
                </div>
              )}
            </section>
          )}
          <MusicLifeSongThreeLayerCard mode="result" context={result.life_song_context} />

          <div className="mb-6 mt-6">
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
