'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TarotDeckAdminReview from '@/features/tarot/components/TarotDeckAdminReview';
import TarotOriginalFortuneTeller from '@/features/tarot/components/TarotOriginalFortuneTeller';
import { TAROT_CARDS } from '@/features/tarot/data/cards';
import { requestTarotShuffle } from '@/features/tarot/services/api';
import type { TarotDeckCard, TarotReadingScope, TarotSpreadType } from '@/features/tarot/types';

type TarotPageStep = 'ready_to_draw' | 'theater';

const DRAW_SCOPE: TarotReadingScope = 'self';
const DRAW_SPREAD: TarotSpreadType = 'three_card';
const TAROT_QUESTION_EXAMPLES = [
  '這段關係接下來該怎麼面對？',
  '我現在的工作方向需要看見什麼？',
  '這個決定目前最重要的提醒是什麼？',
] as const;

export default function TarotPageClient() {
  const [step, setStep] = useState<TarotPageStep>('ready_to_draw');
  const [deck, setDeck] = useState<TarotDeckCard[]>([]);
  const [selectedDeckCards, setSelectedDeckCards] = useState<TarotDeckCard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [tarotQuestion, setTarotQuestion] = useState('');
  const [activeQuestion, setActiveQuestion] = useState('');
  const [adminMode, setAdminMode] = useState(false);

  const cardsById = useMemo(() => new Map(TAROT_CARDS.map((card) => [card.id, card] as const)), []);

  useEffect(() => {
    try {
      window.localStorage.removeItem('tdh:daily-analysis:tarot:v1');
    } catch {
      // Tarot no longer uses the daily lock.
    }
  }, []);

  const openAdminReview = useCallback(() => {
    setAdminMode(true);
    setError('');
    setDeck([]);
    setSelectedDeckCards([]);
    setActiveQuestion('');
    setStep('ready_to_draw');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const beginShuffle = useCallback(async () => {
    if (isGenerating) return;

    const question = tarotQuestion.trim();
    if (question.length < 4) {
      setError('請輸入至少 4 個字，讓塔羅知道你想問的方向。');
      return;
    }

    setError('');
    setSelectedDeckCards([]);
    setIsGenerating(true);

    try {
      const shuffle = await requestTarotShuffle({
        categoryId: 'custom',
        question,
        scope: DRAW_SCOPE,
        spreadType: DRAW_SPREAD,
      });

      setDeck(shuffle.shuffleSequence.map((deckCard) => ({
        deckKey: deckCard.deckKey,
        cardId: deckCard.cardId,
        orientation: 'upright',
        order: deckCard.shuffleOrder,
      })));
      setActiveQuestion(question);
      setStep('theater');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '塔羅洗牌暫時失敗，請再試一次。');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, tarotQuestion]);

  const resetExperience = useCallback(() => {
    setAdminMode(false);
    setStep('ready_to_draw');
    setDeck([]);
    setSelectedDeckCards([]);
    setActiveQuestion('');
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

        {adminMode && <TarotDeckAdminReview cards={TAROT_CARDS} onClose={resetExperience} />}

        {!adminMode && step === 'ready_to_draw' && (
          <section className="fortune-card tarot-experience-hero border-cyan-200/25 p-5 sm:p-7">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">AI TAROT DRAW EXPERIENCE</p>
                <h1 className="mt-4 font-serif text-4xl font-black leading-tight text-cyan-50 sm:text-5xl">塔羅三張牌占卜</h1>
                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-[color:var(--text-sub)]">
                  輸入你現在想問的事情，系統會洗出 78 張牌，再用三張牌呈現過去、現在與未來的提醒。
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="tarot-experience-stat">
                    <span>78</span>
                    <p>完整牌組</p>
                  </div>
                  <div className="tarot-experience-stat">
                    <span>12</span>
                    <p>塔羅音效</p>
                  </div>
                  <div className="tarot-experience-stat">
                    <span>3</span>
                    <p>三張牌陣</p>
                  </div>
                </div>

                <form className="tarot-question-entry mt-4" onSubmit={(event) => { event.preventDefault(); void beginShuffle(); }}>
                  <label htmlFor="tarot-question-entry" className="block text-sm font-black text-cyan-50">
                    想問什麼事情？
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
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      disabled={isGenerating || tarotQuestion.trim().length < 4}
                      className="inline-flex w-full items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/15 px-7 py-3 text-sm font-black text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.18)] transition hover:border-cyan-100/60 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {isGenerating ? '正在洗牌...' : '開始算命'}
                    </button>
                    <button
                      type="button"
                      onClick={openAdminReview}
                      className="inline-flex w-full items-center justify-center rounded-full border border-amber-200/35 bg-amber-300/12 px-7 py-3 text-sm font-black text-amber-50 transition hover:border-amber-100/60 hover:bg-amber-300/20 sm:w-auto"
                    >
                      我要驗牌
                    </button>
                  </div>
                </form>
              </div>
              <div className="tarot-experience-deck-preview" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => (
                  <span key={index} style={{
                    ['--preview-x' as string]: `${(index - 7.5) * 0.34}rem`,
                    ['--preview-y' as string]: `${(index - 7.5) * -0.05}rem`,
                    ['--preview-rot' as string]: `${(index - 7.5) * 1.8}deg`,
                  }} />
                ))}
                <strong>T</strong>
              </div>
            </div>
          </section>
        )}

        {!adminMode && step === 'theater' && (
          <TarotOriginalFortuneTeller
            deck={deck}
            cardsById={cardsById}
            question={activeQuestion}
            onReset={resetExperience}
            onComplete={setSelectedDeckCards}
          />
        )}
      </div>
    </main>
  );
}
