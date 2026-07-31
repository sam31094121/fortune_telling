'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import TarotDrawEntry from '@/features/tarot/components/TarotDrawEntry';
import TarotQuestionFlow from '@/features/tarot/components/TarotQuestionFlow';
import TarotShuffleAnimation from '@/features/tarot/components/TarotShuffleAnimation';
import TarotReadingResult from '@/features/tarot/components/TarotReadingResult';
import TarotReadingHistory from '@/features/tarot/components/TarotReadingHistory';
import { TAROT_CARDS } from '@/features/tarot/data/cards';
import { useTarotHistory } from '@/features/tarot/hooks/useTarotHistory';
import { createTarotReadingId, drawTarotCard } from '@/features/tarot/services/draw';
import { generateTarotInterpretation } from '@/features/tarot/services/interpretation';
import {
  TAROT_FIXED_DISCLAIMER,
  type TarotCard,
  type TarotFlowStep,
  type TarotInterpretationOutput,
  type TarotReading,
  type TarotReadingContext,
} from '@/features/tarot/types';

function getCardByReading(reading: TarotReading | undefined, cardsById: Map<string, TarotCard>) {
  if (!reading) return null;
  return cardsById.get(reading.cardId) ?? null;
}

function createInterpretation(reading: TarotReading, card: TarotCard): TarotInterpretationOutput {
  const keywords = reading.orientation === 'upright' ? card.uprightKeywords : card.reversedKeywords;
  const baseMeaning = reading.orientation === 'upright' ? card.uprightMeaning : card.reversedMeaning;
  return generateTarotInterpretation({
    category: reading.category,
    question: reading.question,
    cardName: card.nameZh,
    orientation: reading.orientation,
    keywords,
    baseMeaning,
    reflectionPrompt: card.reflectionPrompt,
  });
}

function fallbackInterpretation(card: TarotCard): TarotInterpretationOutput {
  return {
    summary: `${card.nameZh}的牌義資料已保留，但本次解讀生成暫時失敗。你可以先閱讀牌面核心意義，或按下重新產生解讀。`,
    questionConnection: '目前暫時無法整理與問題的連結，請稍後重新產生解讀。牌面不會因此改變。',
    reflectionQuestion: card.reflectionPrompt,
    actionSuggestion: '先把問題拆成一個今天能完成的小行動，並記錄做完後的感受。',
    disclaimer: TAROT_FIXED_DISCLAIMER,
  };
}

export default function TarotPageClient() {
  const [step, setStep] = useState<TarotFlowStep>('question');
  const [readingContext, setReadingContext] = useState<TarotReadingContext | null>(null);
  const [reading, setReading] = useState<TarotReading | undefined>();
  const [interpretation, setInterpretation] = useState<TarotInterpretationOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { history, historyError, addReading, deleteReading, clearHistory } = useTarotHistory();

  useEffect(() => () => {
    if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
  }, []);

  const cardsById = useMemo(() => new Map(TAROT_CARDS.map((card) => [card.id, card])), []);
  const currentCard = getCardByReading(reading, cardsById);

  function handleQuestionReady(context: TarotReadingContext) {
    setReadingContext(context);
    setReading(undefined);
    setInterpretation(null);
    setError('');
    setStep('ready_to_draw');
  }

  function handleStartDraw() {
    if (isGenerating || !readingContext) return;
    setError('');
    setIsGenerating(true);
    try {
      const result = drawTarotCard(TAROT_CARDS);
      const nextReading: TarotReading = {
        id: createTarotReadingId(),
        category: readingContext.categoryId,
        question: readingContext.question,
        cardId: result.card.id,
        orientation: result.orientation,
        createdAt: new Date().toISOString(),
      };
      setReading(nextReading);
      setInterpretation(createInterpretation(nextReading, result.card));
      addReading(nextReading);
      setStep('shuffling');
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
      shuffleTimerRef.current = setTimeout(() => {
        setStep('result');
        setIsGenerating(false);
        shuffleTimerRef.current = null;
      }, 1800);
    } catch (caught) {
      setIsGenerating(false);
      setError(caught instanceof Error ? caught.message : '塔羅牌資料載入失敗，請稍後再試。');
    }
  }

  function handleRegenerateInterpretation() {
    if (!reading || !currentCard) {
      setError('找不到本次牌面資料，請重新抽牌。');
      return;
    }
    try {
      setInterpretation(createInterpretation(reading, currentCard));
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '解讀生成失敗，請稍後再試。');
      setInterpretation(fallbackInterpretation(currentCard));
    }
  }

  function handleResetQuestion() {
    if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    setStep('question');
    setReadingContext(null);
    setReading(undefined);
    setInterpretation(null);
    setIsGenerating(false);
    setError('');
  }

  function handleViewHistory(item: TarotReading) {
    const card = cardsById.get(item.cardId);
    if (!card) {
      setError('這筆紀錄的牌面資料已不存在，請刪除後重新抽牌。');
      return;
    }
    if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    setReadingContext({ categoryId: item.category, question: item.question });
    setReading(item);
    setInterpretation(createInterpretation(item, card));
    setIsGenerating(false);
    setError('');
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden">
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-9">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">TAROT GUIDE</p>
            <h1 className="mt-2 font-serif text-4xl font-black leading-tight text-[color:var(--text-main)] sm:text-5xl">塔羅指引</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
              先選擇問題方向，再確認本次問題；塔羅會以固定的分類與問題進入單張牌流程。
            </p>
          </div>
          <Link href="/" className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white">
            返回首頁
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="min-w-0 space-y-5">
            {step === 'question' && <TarotQuestionFlow onReady={handleQuestionReady} />}

            {step === 'ready_to_draw' && readingContext && (
              <TarotDrawEntry
                categoryId={readingContext.categoryId}
                question={readingContext.question}
                isGenerating={isGenerating}
                onBack={handleResetQuestion}
                onStartDraw={handleStartDraw}
              />
            )}

            {step === 'shuffling' && <TarotShuffleAnimation />}

            {step === 'result' && currentCard && interpretation && reading && (
              <TarotReadingResult
                category={reading.category}
                question={reading.question}
                card={currentCard}
                orientation={reading.orientation}
                interpretation={interpretation}
                error={error}
                onRegenerate={handleRegenerateInterpretation}
                onReset={handleResetQuestion}
              />
            )}
          </div>

          <TarotReadingHistory
            history={history}
            cardsById={cardsById}
            selectedId={reading?.id}
            error={historyError}
            onView={handleViewHistory}
            onDelete={deleteReading}
            onClear={clearHistory}
          />
        </div>
      </main>
    </div>
  );
}
