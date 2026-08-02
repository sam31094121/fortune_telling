'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import TarotDeckAdminReview from '@/features/tarot/components/TarotDeckAdminReview';
import TarotOriginalFortuneTeller from '@/features/tarot/components/TarotOriginalFortuneTeller';
import { TAROT_CARDS } from '@/features/tarot/data/cards';
import { requestTarotShuffle } from '@/features/tarot/services/api';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';
import { readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';
import type { TarotDeckCard, TarotReadingScope, TarotSpreadType } from '@/features/tarot/types';

type TarotPageStep = 'ready_to_draw' | 'theater';

type TarotDailyResult = {
  question: string;
  deck: TarotDeckCard[];
  scope?: TarotReadingScope;
};

const DRAW_SPREAD: TarotSpreadType = 'three_card';
const TAROT_QUESTION_EXAMPLES = [
  { label: '範例 1', text: '我現在最需要看清楚的是什麼？' },
  { label: '範例 2', text: '這段關係目前真正的課題是什麼？' },
  { label: '範例 3', text: '接下來三個月我該優先調整哪個方向？' },
] as const;

const TAROT_QUESTION_GUIDE_STEPS = [
  {
    step: '1',
    title: '選擇對象',
    body: '先選我自己或親朋好友，資料立即分流。',
  },
  {
    step: '2',
    title: '固定一件事',
    body: '只輸入一個核心問題，抽牌焦點更準。',
  },
  {
    step: '3',
    title: '開始洗牌',
    body: '系統洗 78 張牌，由你親手選牌。',
  },
] as const;

export default function TarotPageClient() {
  const [step, setStep] = useState<TarotPageStep>('ready_to_draw');
  const [deck, setDeck] = useState<TarotDeckCard[]>([]);
  const [selectedDeckCards, setSelectedDeckCards] = useState<TarotDeckCard[]>([]);
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<TarotDailyResult> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [tarotQuestion, setTarotQuestion] = useState('');
  const [activeQuestion, setActiveQuestion] = useState('');
  const [activeScope, setActiveScope] = useState<TarotReadingScope>('self');
  const [adminMode, setAdminMode] = useState(false);

  const cardsById = useMemo(() => new Map(TAROT_CARDS.map((card) => [card.id, card] as const)), []);
  const trimmedQuestionLength = tarotQuestion.trim().length;
  const questionReady = trimmedQuestionLength >= 4;
  const submitLabel = isGenerating
    ? '正在洗牌...'
    : dailyRecord
      ? '查看今日塔羅抽牌'
      : questionReady
        ? '開始 78 張洗牌'
        : '先輸入問題';

  const restoreDailyRecord = useCallback((record: DailyAnalysisRecord<TarotDailyResult>) => {
    setDailyRecord(record);
    setDeck(record.result.deck);
    setSelectedDeckCards([]);
    setActiveQuestion(record.result.question);
    setActiveScope(record.result.scope ?? 'self');
    setTarotQuestion(record.result.question);
    setError('');
    setAdminMode(false);
    setStep('theater');
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80);
  }, []);

  useEffect(() => {
    const record = readDailyAnalysis<TarotDailyResult>('tarot');
    if (!record) return;
    setDailyRecord(record);
    setTarotQuestion(record.result.question);
  }, []);

  const openAdminReview = useCallback(() => {
    setAdminMode(true);
    setError('');
    setDeck([]);
    setSelectedDeckCards([]);
    setActiveQuestion('');
    setActiveScope('self');
    setStep('ready_to_draw');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const beginShuffle = useCallback(async () => {
    if (isGenerating) return;

    const existingDaily = readDailyAnalysis<TarotDailyResult>('tarot');
    if (existingDaily) {
      restoreDailyRecord(existingDaily);
      return;
    }

    const targetMode = getAnalysisIdentityTarget();
    if (!targetMode) {
      setError(getIdentityRequiredMessage());
      return;
    }

    const question = tarotQuestion.trim();
    if (question.length < 4) {
      setError('請輸入至少 4 個字，讓塔羅知道你真正想問的一件事。');
      return;
    }

    setError('');
    setSelectedDeckCards([]);
    setIsGenerating(true);

    try {
      const scope: TarotReadingScope = targetMode === 'guest' ? 'other' : 'self';
      const shuffle = await requestTarotShuffle({
        categoryId: 'custom',
        question,
        scope,
        spreadType: DRAW_SPREAD,
      });

      const nextDeck = shuffle.shuffleSequence.map((deckCard) => ({
        deckKey: deckCard.deckKey,
        cardId: deckCard.cardId,
        orientation: 'upright' as const,
        order: deckCard.shuffleOrder,
      }));

      setDeck(nextDeck);
      setActiveQuestion(question);
      setActiveScope(scope);
      setStep('theater');
      const nextRecord = saveDailyAnalysis<TarotDailyResult>('tarot', { question, deck: nextDeck, scope });
      if (nextRecord) setDailyRecord(nextRecord);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '塔羅洗牌暫時失敗，請重新嘗試。');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, restoreDailyRecord, tarotQuestion]);

  const resetExperience = useCallback(() => {
    setAdminMode(false);
    setStep('ready_to_draw');
    setDeck([]);
    setSelectedDeckCards([]);
    setActiveQuestion('');
    setActiveScope('self');
    setError('');
    setTarotQuestion('');
    setIsGenerating(false);
  }, []);

  return (
    <main className="min-h-screen bg-[color:var(--deep)] px-4 py-8 text-[color:var(--text-main)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-[color:var(--text-sub)] transition hover:border-cyan-200/30 hover:text-cyan-100">
            返回首頁
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
                <h1 className="mt-4 font-serif text-4xl font-black leading-tight text-cyan-50 sm:text-5xl">AI 塔羅牌</h1>
                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-[color:var(--text-sub)]">
                  請先專注你現在最想了解的一件事。系統會完成 78 張牌洗牌，接著由你親手進入抽牌體驗。
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="tarot-experience-stat">
                    <span>78</span>
                    <p>完整牌庫</p>
                  </div>
                  <div className="tarot-experience-stat">
                    <span>12</span>
                    <p>展牌選擇</p>
                  </div>
                  <div className="tarot-experience-stat">
                    <span>3</span>
                    <p>親手抽牌</p>
                  </div>
                </div>

                <DailyAnalysisNotice record={dailyRecord} className="mt-5" moduleName="AI 塔羅牌" onViewResult={dailyRecord ? () => restoreDailyRecord(dailyRecord) : undefined} />
                <IdentitySplitSelector className="mt-5" />
                <div className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-sm font-black leading-7 text-amber-100">
                  AI 判定：塔羅牌已接入資料分流。選「我自己」會保留給個人成長中心累積；選「親朋好友」只完成本次單次抽牌，不寫入會員成長資料。
                </div>

                <form className="tarot-question-entry mt-4" onSubmit={(event) => { event.preventDefault(); void beginShuffle(); }}>
                  <div className="tarot-question-entry__steps" aria-label="塔羅抽牌三步驟">
                    {TAROT_QUESTION_GUIDE_STEPS.map((item) => (
                      <div key={item.step} className="tarot-question-entry__step">
                        <span className="tarot-question-entry__step-number">{item.step}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="tarot-question-entry__label-row">
                    <label htmlFor="tarot-question-entry">
                      請專注你現在最想了解的一件事
                    </label>
                    <span>{trimmedQuestionLength}/160</span>
                  </div>
                  <textarea
                    id="tarot-question-entry"
                    value={tarotQuestion}
                    onChange={(event) => {
                      setTarotQuestion(event.target.value);
                      if (error) setError('');
                    }}
                    maxLength={160}
                    rows={4}
                    placeholder="請輸入你想問的一件事，例如：我現在最需要看清楚的是什麼？"
                    className="tarot-question-entry__textarea"
                  />
                  <p className={`tarot-question-entry__field-hint ${questionReady ? 'tarot-question-entry__field-hint--ready' : ''}`}>
                    {questionReady ? '問題已建立，可以開始洗牌。' : '請輸入至少 4 個字，或直接點選下方範例。'}
                  </p>
                  <div className="tarot-question-entry__examples">
                    <div className="tarot-question-entry__example-head">
                      <span>不知道怎麼問，直接點一個範例</span>
                    </div>
                    <div className="flex flex-wrap gap-2" aria-label="塔羅問題範例">
                      {TAROT_QUESTION_EXAMPLES.map((example) => (
                        <button
                          key={example.text}
                          type="button"
                          onClick={() => {
                            setTarotQuestion(example.text);
                            setError('');
                          }}
                          className="tarot-question-entry__example"
                        >
                          <span className="tarot-question-entry__example-badge">{example.label}</span>
                          <span>{example.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {error && (
                    <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-950/25 px-4 py-3 text-sm font-bold leading-7 text-rose-100">
                      {error}
                    </p>
                  )}
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      disabled={isGenerating || (!dailyRecord && !questionReady)}
                      className={`tarot-question-entry__submit ${questionReady || dailyRecord ? 'tarot-question-entry__submit--ready' : 'tarot-question-entry__submit--locked'}`}
                    >
                      {submitLabel}
                    </button>
                    <button
                      type="button"
                      onClick={openAdminReview}
                      className="inline-flex w-full items-center justify-center rounded-full border border-amber-200/35 bg-amber-300/12 px-7 py-3 text-sm font-black text-amber-50 transition hover:border-amber-100/60 hover:bg-amber-300/20 sm:w-auto"
                    >
                      查看 78 張牌庫
                    </button>
                  </div>
                </form>
              </div>
              <div className="tarot-experience-deck-preview" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => {
                  const offset = index - 7.5;
                  const arc = Math.abs(offset);
                  return (
                    <span key={index} style={{
                      ['--preview-x' as string]: `${offset * 0.43}rem`,
                      ['--preview-y' as string]: `${arc * 0.052 - 0.26}rem`,
                      ['--preview-rot' as string]: `${offset * 2.05}deg`,
                      ['--preview-depth' as string]: `${(7.5 - arc) * 3.2}px`,
                      ['--preview-delay' as string]: `${index * 36}ms`,
                      ['--preview-ridge' as string]: `${0.12 + index * 0.006}rem`,
                      ['--preview-warmth' as string]: `${0.55 + index * 0.018}`,
                      zIndex: index + 1,
                    }} />
                  );
                })}
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
            scope={activeScope}
            onReset={resetExperience}
            onComplete={setSelectedDeckCards}
          />
        )}
      </div>
    </main>
  );
}