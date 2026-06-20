'use client';

import { useState } from 'react';
import VisualGravityCore from '@/components/VisualGravityCore';
import PersonalityMusicFlow, { type MusicFormData } from '@/components/PersonalityMusicFlow';
import PersonalityMusicReport from '@/components/PersonalityMusicReport';

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
  };
  meta: { zodiac: string; era: string };
}

type PageState = 'landing' | 'form' | 'result';

export default function MusicSystemPage() {
  const [pageState, setPageState] = useState<PageState>('landing');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MusicGenerateResponse | null>(null);
  const [submittedName, setSubmittedName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
    } catch (err) {
      console.error('[music] generate failed', err);
      setErrorMsg('連線失敗，請確認網路後再試。');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setErrorMsg('');
    setPageState('form');
  }

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="constellation-ring constellation-ring-top pointer-events-none z-0" />
      <div className="constellation-ring constellation-ring-bottom pointer-events-none z-0" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">

        {/* ── Landing ── */}
        {pageState === 'landing' && (
          <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-7">
              <div className="inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-1 text-xs font-semibold tracking-[0.3em] text-violet-300">
                天・地・人 AI 人格音樂系統 V1.0
              </div>

              <div className="space-y-4">
                <h1 className="mystic-title font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
                  生成只屬於你的<br />人格歌曲
                </h1>
                <p className="max-w-xl text-sm leading-8 text-[color:var(--text-sub)]">
                  輸入出生日期、血型、姓名與聲音特質，
                  AI 透過天地人三模型，融合年代音樂、人格大數據，
                  生成一首只屬於你的專屬個人歌曲。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="fortune-card sky-card p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-violet-300">天 35%</p>
                  <p className="mt-2 text-sm text-[color:var(--text-main)]">生日決定主旋律</p>
                </div>
                <div className="fortune-card earth-card p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-300">地 35%</p>
                  <p className="mt-2 text-sm text-[color:var(--text-main)]">血型決定節奏音色</p>
                </div>
                <div className="fortune-card human-card p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-pink-300">人 30%</p>
                  <p className="mt-2 text-sm text-[color:var(--text-main)]">姓名決定歌詞靈魂</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPageState('form')}
                  className="vip-gold-btn px-10 py-5 text-base"
                >
                  啟動人格音樂
                </button>
                <a
                  href="/"
                  className="text-sm text-[color:var(--text-muted)] underline underline-offset-4 hover:text-[color:var(--text-sub)]"
                >
                  返回人格解碼系統
                </a>
              </div>

              <p className="text-xs leading-6 text-[color:var(--text-muted)]">
                天地萬物皆有因果。人格形成選擇，選擇形成行動，行動累積結果。
                <br />
                心存善念，多行善事，才是真正改變命運的開始。
              </p>
            </div>

            <div className="flex justify-center">
              <VisualGravityCore />
            </div>
          </section>
        )}

        {/* ── Form ── */}
        {pageState === 'form' && (
          <section className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="fortune-card p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.35em] text-violet-300">人格音樂輸入</p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">
                  建立你的音樂人格
                </h2>
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

            <div className="flex flex-col items-center justify-center">
              <VisualGravityCore />
              <p className="mt-4 text-center text-xs text-[color:var(--text-muted)]">
                中央引力核正在校準你的氣場
              </p>
            </div>
          </section>
        )}

        {/* ── Result ── */}
        {pageState === 'result' && result && (
          <section>
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">
                人格音樂生成完成
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[color:var(--text-main)]">
                {submittedName}的專屬人格歌曲
              </h2>
            </div>

            <PersonalityMusicReport
              personalityMatrix={result.personality_matrix as any}
              musicParameters={result.music_parameters}
              musicReport={result.music_report}
              meta={result.meta}
              name={submittedName}
              onReset={handleReset}
            />
          </section>
        )}
      </main>
    </div>
  );
}
