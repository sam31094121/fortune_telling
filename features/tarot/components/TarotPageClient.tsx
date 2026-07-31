'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import TarotCardSelection from '@/features/tarot/components/TarotCardSelection';
import TarotDrawEntry from '@/features/tarot/components/TarotDrawEntry';
import TarotQuestionFlow from '@/features/tarot/components/TarotQuestionFlow';
import TarotShuffleAnimation from '@/features/tarot/components/TarotShuffleAnimation';
import TarotReadingResult from '@/features/tarot/components/TarotReadingResult';
import TarotReadingHistory from '@/features/tarot/components/TarotReadingHistory';
import TarotSystemStats from '@/features/tarot/components/TarotSystemStats';
import { TAROT_CARDS } from '@/features/tarot/data/cards';
import { useTarotHistory } from '@/features/tarot/hooks/useTarotHistory';
import { recordTarotIntegrationSignal } from '@/features/tarot/services/integration';
import { requestTarotInterpretation, requestTarotReading, requestTarotShuffle, requestTarotStats, type TarotStatsSnapshot } from '@/features/tarot/services/api';
import {
  TAROT_FIXED_DISCLAIMER,
  type TarotCard,
  type TarotDeckCard,
  type TarotFlowStep,
  type TarotInterpretationOutput,
  type TarotReading,
  type TarotReadingContext,
  type TarotReadingScope,
} from '@/features/tarot/types';

function getCardByReading(reading: TarotReading | undefined, cardsById: Map<string, TarotCard>) {
  if (!reading) return null;
  return cardsById.get(reading.cardId) ?? null;
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
  const [readingScope, setReadingScope] = useState<TarotReadingScope>('self');
  const [deck, setDeck] = useState<TarotDeckCard[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [reading, setReading] = useState<TarotReading | undefined>();
  const [interpretation, setInterpretation] = useState<TarotInterpretationOutput | null>(null);
  const [systemStats, setSystemStats] = useState<TarotStatsSnapshot | null>(null);
  const [statsError, setStatsError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [integrationMessage, setIntegrationMessage] = useState('');
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { history, historyError, addReading, deleteReading, clearHistory } = useTarotHistory();

  useEffect(() => () => {
    if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    requestTarotStats()
      .then((stats) => {
        if (!active) return;
        setSystemStats(stats);
        setStatsError('');
      })
      .catch((caught) => {
        if (!active) return;
        setStatsError(caught instanceof Error ? caught.message : '塔羅統計讀取失敗。');
      });
    return () => {
      active = false;
    };
  }, []);

  const cardsById = useMemo(() => new Map(TAROT_CARDS.map((card) => [card.id, card])), []);
  const currentCard = getCardByReading(reading, cardsById);

  function handleQuestionReady(context: TarotReadingContext) {
    setReadingContext(context);
    setReadingScope(context.scope);
    setDeck([]);
    setSessionId('');
    setReading(undefined);
    setInterpretation(null);
    setIntegrationMessage('');
    setError('');
    setStep('ready_to_draw');
  }

  async function handleStartDraw() {
    if (isGenerating || !readingContext) return;
    setError('');
    setIntegrationMessage('');
    setIsGenerating(true);
    try {
      const shuffle = await requestTarotShuffle({
        categoryId: readingContext.categoryId,
        question: readingContext.question,
        scope: readingScope,
      });
      setSessionId(shuffle.sessionId);
      setDeck(shuffle.visibleDeck);
      setReading(undefined);
      setInterpretation(null);
      setSystemStats((previous) => previous ? {
        ...previous,
        deckIntegrity: shuffle.deckIntegrity,
        deckSize: shuffle.deckSize,
        totals: { ...previous.totals, shuffles: previous.totals.shuffles + 1 },
      } : previous);
      setStep('shuffling');
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
      shuffleTimerRef.current = setTimeout(() => {
        setStep('selecting_card');
        setIsGenerating(false);
        shuffleTimerRef.current = null;
      }, 1500);
    } catch (caught) {
      setIsGenerating(false);
      setError(caught instanceof Error ? caught.message : '塔羅洗牌後端暫時無法回應。');
    }
  }

  const handleDeckCardSelect = useCallback(async (deckCard: TarotDeckCard) => {
    if (!sessionId) {
      setError('洗牌場次不存在，請重新洗牌。');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await requestTarotReading({ sessionId, deckKey: deckCard.deckKey });
      recordTarotIntegrationSignal(result.integrationSignal);
      setReading(result.reading);
      setInterpretation(result.interpretation);
      setSystemStats(result.stats);
      addReading(result.reading);
      setIntegrationMessage(result.reading.scope === 'self'
        ? '本次塔羅已由後端送出 Integration Layer 訊號，可供個人成長中心後續整合使用；未直接修改會員核心五元素。'
        : '本次塔羅以親友單次分析保存，不會更新會員核心資料。');
      setError('');
      setStep('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '後端選牌解讀失敗，請重新洗牌。');
      setStep('selecting_card');
    } finally {
      setIsGenerating(false);
    }
  }, [addReading, sessionId]);

  async function handleRegenerateInterpretation() {
    if (!reading || !currentCard) {
      setError('找不到本次牌面資料，請重新抽牌。');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await requestTarotInterpretation({ reading });
      setInterpretation(result.interpretation);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '後端重新解讀失敗，請稍後再試。');
      setInterpretation(fallbackInterpretation(currentCard));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleResetQuestion() {
    if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    setStep('question');
    setReadingContext(null);
    setReadingScope('self');
    setDeck([]);
    setSessionId('');
    setReading(undefined);
    setInterpretation(null);
    setIsGenerating(false);
    setIntegrationMessage('');
    setError('');
  }

  async function handleViewHistory(item: TarotReading) {
    const card = cardsById.get(item.cardId);
    if (!card) {
      setError('這筆紀錄的牌面資料已不存在，請刪除後重新抽牌。');
      return;
    }
    if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    setIsGenerating(true);
    try {
      const result = await requestTarotInterpretation({ reading: item });
      setReadingContext({ categoryId: item.category, question: item.question, scope: item.scope });
      setReadingScope(item.scope);
      setDeck([]);
      setSessionId('');
      setReading(result.reading);
      setInterpretation(result.interpretation);
      setIntegrationMessage(item.scope === 'self'
        ? '這筆歷史紀錄由後端重新解讀，屬於自我分析；不代表曾直接覆蓋會員核心五元素。'
        : '這筆歷史紀錄由後端重新解讀，屬於親友單次分析，不會更新會員核心資料。');
      setError('');
      setStep('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '後端讀取歷史解讀失敗，暫時顯示備用資料。');
      setReading(item);
      setInterpretation(fallbackInterpretation(card));
      setStep('result');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden">
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-9">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">TAROT GUIDE</p>
            <h1 className="mt-2 font-serif text-4xl font-black leading-tight text-[color:var(--text-main)] sm:text-5xl">塔羅指引</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
              先默念問題，再由後端塔羅系統洗出牌序；使用者親手從牌背中選牌，AI 只負責解讀與送交 Integration Layer。
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
                scope={readingScope}
                isGenerating={isGenerating}
                onScopeChange={setReadingScope}
                onBack={handleResetQuestion}
                onStartDraw={handleStartDraw}
              />
            )}

            {step === 'shuffling' && <TarotShuffleAnimation />}

            {step === 'selecting_card' && (
              <TarotCardSelection
                deck={deck}
                cardsById={cardsById}
                onSelect={handleDeckCardSelect}
                onShuffleAgain={handleStartDraw}
              />
            )}

            {step === 'result' && currentCard && interpretation && reading && (
              <TarotReadingResult
                category={reading.category}
                question={reading.question}
                card={currentCard}
                orientation={reading.orientation}
                scope={reading.scope}
                interpretation={interpretation}
                integrationMessage={integrationMessage}
                error={error}
                onRegenerate={handleRegenerateInterpretation}
                onReset={handleResetQuestion}
              />
            )}

            {error && step !== 'result' && (
              <p className="rounded-2xl border border-rose-300/25 bg-rose-950/25 p-4 text-sm font-semibold leading-7 text-rose-100">{error}</p>
            )}
          </div>

          <div className="space-y-5">
            <TarotReadingHistory
              history={history}
              cardsById={cardsById}
              selectedId={reading?.id}
              error={historyError}
              onView={handleViewHistory}
              onDelete={deleteReading}
              onClear={clearHistory}
            />
            <TarotSystemStats stats={systemStats} error={statsError} />
          </div>
        </div>
      </main>
    </div>
  );
}