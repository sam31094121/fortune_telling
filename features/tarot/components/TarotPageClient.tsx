'use client';

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import TarotCardSelection from '@/features/tarot/components/TarotCardSelection';
import TarotReadingResult from '@/features/tarot/components/TarotReadingResult';
import TarotShuffleAnimation from '@/features/tarot/components/TarotShuffleAnimation';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import { TAROT_CARDS } from '@/features/tarot/data/cards';
import { requestTarotShuffle } from '@/features/tarot/services/api';
import { getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';
import type { TarotCard, TarotDeckCard, TarotFlowStep, TarotReadingScope, TarotSpreadType } from '@/features/tarot/types';

type DrawOnlyStep = Extract<TarotFlowStep, 'ready_to_draw' | 'shuffling' | 'selecting_card' | 'result'>;
type TarotDailyResult = { selectedDeckCards: TarotDeckCard[]; deckSize: number; sessionId: string; question: string };

const DRAW_SCOPE: TarotReadingScope = 'self';
const DRAW_SPREAD: TarotSpreadType = 'three_card';
const DRAW_COUNT = 3;
const SHUFFLE_DISPLAY_MS = 5000;
const TAROT_QUESTION_EXAMPLES = [
  '這段關係接下來該怎麼面對？',
  '我現在的工作方向需要看見什麼？',
  '這個決定目前最重要的提醒是什麼？',
] as const;

function buildPreviewCardStyle(index: number): CSSProperties {
  const offset = index - 7.5;
  return {
    ['--preview-x' as string]: `${offset * 0.34}rem`,
    ['--preview-y' as string]: `${offset * -0.05}rem`,
    ['--preview-rot' as string]: `${offset * 1.8}deg`,
  };
}

export default function TarotPageClient() {
  const [step, setStep] = useState<DrawOnlyStep>('ready_to_draw');
  const [deck, setDeck] = useState<TarotDeckCard[]>([]);
  const [selectedDeckCards, setSelectedDeckCards] = useState<TarotDeckCard[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [deckSize, setDeckSize] = useState(78);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [tarotQuestion, setTarotQuestion] = useState('');
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<TarotDailyResult> | null>(null);
  const shuffleTimerRef = useRef<number | null>(null);

  const cardsById = useMemo(() => new Map(TAROT_CARDS.map((card) => [card.id, card] as const)), []);

  const revealedCards = useMemo(
    () => selectedDeckCards.map((deckCard) => cardsById.get(deckCard.cardId)).filter((card): card is TarotCard => Boolean(card)),
    [cardsById, selectedDeckCards],
  );

  useEffect(() => {
    const record = readDailyAnalysis<TarotDailyResult>('tarot');
    if (record) {
      setDailyRecord(record);
      setSelectedDeckCards(record.result.selectedDeckCards);
      setDeckSize(record.result.deckSize);
      setSessionId(record.result.sessionId);
      setTarotQuestion(record.result.question);
      setStep('result');
    }
    return () => {
      if (shuffleTimerRef.current) window.clearTimeout(shuffleTimerRef.current);
    };
  }, []);

  const beginShuffle = useCallback(async () => {
    if (isGenerating) return;

    const existing = readDailyAnalysis<TarotDailyResult>('tarot');
    if (existing) {
      setDailyRecord(existing);
      setSelectedDeckCards(existing.result.selectedDeckCards);
      setDeckSize(existing.result.deckSize);
      setSessionId(existing.result.sessionId);
      setTarotQuestion(existing.result.question);
      setStep('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const question = tarotQuestion.trim();
    if (question.length < 4) {
      setError('請先寫下你現在最想了解的一件事，至少 4 個字。');
      return;
    }

    if (shuffleTimerRef.current) window.clearTimeout(shuffleTimerRef.current);
    setError('');
    setSelectedDeckCards([]);
    setIsGenerating(true);
    setStep('shuffling');

    try {
      const shuffle = await requestTarotShuffle({
        categoryId: 'custom',
        question,
        scope: DRAW_SCOPE,
        spreadType: DRAW_SPREAD,
      });

      setDeck(shuffle.visibleDeck);
      setDeckSize(shuffle.deckSize);
      setSessionId(shuffle.sessionId);

      shuffleTimerRef.current = window.setTimeout(() => {
        setIsGenerating(false);
        setStep('selecting_card');
      }, SHUFFLE_DISPLAY_MS);
    } catch (caught) {
      setIsGenerating(false);
      setStep('ready_to_draw');
      setError(caught instanceof Error ? caught.message : '洗牌流程暫時無法啟動，請重新嘗試。');
    }
  }, [isGenerating, tarotQuestion]);

  const handleCardsSelected = useCallback((deckCards: TarotDeckCard[]) => {
    setSelectedDeckCards(deckCards);
    const record = saveDailyAnalysis<TarotDailyResult>('tarot', {
      selectedDeckCards: deckCards,
      deckSize,
      sessionId,
      question: tarotQuestion.trim(),
    });
    setDailyRecord(record);
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [deckSize, sessionId, tarotQuestion]);

  const resetExperience = useCallback(() => {
    if (shuffleTimerRef.current) window.clearTimeout(shuffleTimerRef.current);
    setStep('ready_to_draw');
    setDeck([]);
    setSelectedDeckCards([]);
    setSessionId('');
    setError('');
    setTarotQuestion('');
    setIsGenerating(false);
  }, []);

  return (
    <main className="min-h-screen bg-[color:var(--deep)] px-4 py-8 text-[color:var(--text-main)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-[color:var(--text-sub)] transition hover:border-cyan-200/30 hover:text-cyan-100">
            回首頁
          </Link>
          <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
            Tarot Draw 1.0
          </span>
        </div>

        {step === 'ready_to_draw' && (
          <section className="fortune-card tarot-experience-hero border-cyan-200/25 p-5 sm:p-7">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">AI TAROT DRAW EXPERIENCE</p>
                <h1 className="mt-4 font-serif text-4xl font-black leading-tight text-cyan-50 sm:text-5xl">塔羅抽牌體驗系統 1.0</h1>
                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-[color:var(--text-sub)]">
                  本階段只完成洗牌、展開、親手選牌與翻牌展示。系統不進行 AI 解讀、不輸出補強、不寫入成長中心。
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="tarot-experience-stat">
                    <span>78</span>
                    <p>完整牌庫洗牌</p>
                  </div>
                  <div className="tarot-experience-stat">
                    <span>12</span>
                    <p>牌背展開挑選</p>
                  </div>
                  <div className="tarot-experience-stat">
                    <span>3</span>
                    <p>依序翻開牌面</p>
                  </div>
                </div>

                <DailyAnalysisNotice record={dailyRecord} className="mt-6" />
                <form className="tarot-question-entry mt-4" onSubmit={(event) => { event.preventDefault(); void beginShuffle(); }}>
                  <label htmlFor="tarot-question-entry" className="block text-sm font-black text-cyan-50">
                    請專注你現在最想了解的一件事。
                  </label>
                  <textarea
                    id="tarot-question-entry"
                    value={tarotQuestion}
                    onChange={(event) => {
                      setTarotQuestion(event.target.value);
                      if (error) setError('');
                    }}
                    maxLength={160}
                    rows={4}
                    placeholder="例如：我現在面對這件事，最需要看見什麼？"
                    className="tarot-question-entry__textarea"
                  />
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2" aria-label="塔羅問題範例">
                      {TAROT_QUESTION_EXAMPLES.map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => {
                            setTarotQuestion(example);
                            setError('');
                          }}
                          className="tarot-question-entry__example"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[color:var(--text-muted)]">{tarotQuestion.trim().length}/160</span>
                  </div>
                  {error && (
                    <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-950/25 px-4 py-3 text-sm font-bold leading-7 text-rose-100">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isGenerating || tarotQuestion.trim().length < 4}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/15 px-7 py-3 text-sm font-black text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.18)] transition hover:border-cyan-100/60 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {getDailyAnalysisButtonLabel(dailyRecord)}
                  </button>
                </form>
              </div>
              <div className="tarot-experience-deck-preview" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => (
                  <span key={index} style={buildPreviewCardStyle(index)} />
                ))}
                <strong>T</strong>
              </div>
            </div>
          </section>
        )}

        {step === 'shuffling' && <TarotShuffleAnimation spreadType={DRAW_SPREAD} requiredDrawCount={DRAW_COUNT} deckSize={deckSize} />}

        {step === 'selecting_card' && (
          <TarotCardSelection
            deck={deck}
            cardsById={cardsById}
            spreadType={DRAW_SPREAD}
            requiredDrawCount={DRAW_COUNT}
            isGenerating={isGenerating}
            onSelect={handleCardsSelected}
            onShuffleAgain={beginShuffle}
          />
        )}

        {step === 'result' && (
          <TarotReadingResult
            cards={revealedCards}
            selectedDeckCards={selectedDeckCards}
            deckSize={deckSize}
            sessionId={sessionId}
            error={error}
            onReset={resetExperience}
          />
        )}
      </div>
    </main>
  );
}