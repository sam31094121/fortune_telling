'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import TarotDeckAdminReview from '@/features/tarot/components/TarotDeckAdminReview';
import TarotOriginalFortuneTeller from '@/features/tarot/components/TarotOriginalFortuneTeller';
import { TAROT_CARD_BACK_URL } from '@/features/tarot/constants/cardBack';
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
  sessionId?: string;
};

const DRAW_SPREAD: TarotSpreadType = 'three_card';
const TAROT_DECK_INTEGRITY = {
  total: TAROT_CARDS.length,
  major: TAROT_CARDS.filter((card) => card.arcana === 'major').length,
  minor: TAROT_CARDS.filter((card) => card.arcana === 'minor').length,
};
// 範例問題卡片開關：依需求隱藏整張卡片，之後要恢復把這裡改回 true 即可
const SHOW_QUESTION_EXAMPLES = false;

const TAROT_QUESTION_EXAMPLES = [
  {
    number: '01',
    label: '我怕的不是失去他，是承認他從沒真正選過我',
    cue: '你留在原地，究竟是在等愛，還是在等一個不會來的交代？',
    text: '我捨不得的是這個人，還是承認自己一直沒有被珍惜？我還要把最後一次機會交出去嗎？',
  },
  {
    number: '02',
    label: '我不是怕離開，是怕承認這幾年可能走錯了',
    cue: '你不甘心的，是現在的工作，還是已經投進去的時間？',
    text: '我繼續留著是在替未來鋪路，還是只是不敢面對沉沒的成本？現在該承擔哪一種痛？',
  },
  {
    number: '03',
    label: '我把自己塞得很忙，因為安靜下來就得承認我不快樂',
    cue: '你真正害怕的那件事，並沒有因為拖延而消失',
    text: '我一直用忙碌躲開的是哪一個決定？如果今天不再替自己找藉口，我必須面對什麼？',
  },
] as const;

export default function TarotPageClient() {
  const [step, setStep] = useState<TarotPageStep>('ready_to_draw');
  const [deck, setDeck] = useState<TarotDeckCard[]>([]);
  const [selectedDeckCards, setSelectedDeckCards] = useState<TarotDeckCard[]>([]);
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<TarotDailyResult> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  /** 真實洗牌演出（2026-08-12 依指示）：只做視覺呈現，洗牌順序仍 100% 由後端決定，零改核心 */
  const [isShuffling, setIsShuffling] = useState(false);
  const [error, setError] = useState('');
  const [tarotQuestion, setTarotQuestion] = useState('');
  const [activeQuestion, setActiveQuestion] = useState('');
  const [activeScope, setActiveScope] = useState<TarotReadingScope>('self');
  const [activeSessionId, setActiveSessionId] = useState('');
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
    setActiveSessionId(record.result.sessionId ?? '');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const closeAdminReview = useCallback(() => {
    setAdminMode(false);
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
    setIsShuffling(true);
    const shuffleStartedAt = Date.now();

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

      // 洗牌演出至少完整播放 3.4 秒，讓客戶親眼看到 78 張牌交錯洗切（純視覺，順序早由後端定案）
      const MIN_SHUFFLE_SHOW_MS = 3400;
      const elapsed = Date.now() - shuffleStartedAt;
      if (elapsed < MIN_SHUFFLE_SHOW_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_SHUFFLE_SHOW_MS - elapsed));
      }

      setDeck(nextDeck);
      setActiveQuestion(question);
      setActiveScope(scope);
      setActiveSessionId(shuffle.sessionId);
      setStep('theater');
      const nextRecord = saveDailyAnalysis<TarotDailyResult>('tarot', { question, deck: nextDeck, scope, sessionId: shuffle.sessionId });
      if (nextRecord) setDailyRecord(nextRecord);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '塔羅洗牌暫時失敗，請重新嘗試。');
    } finally {
      setIsGenerating(false);
      setIsShuffling(false);
    }
  }, [isGenerating, restoreDailyRecord, tarotQuestion]);

  const resetExperience = useCallback(() => {
    setAdminMode(false);
    setStep('ready_to_draw');
    setDeck([]);
    setSelectedDeckCards([]);
    setActiveQuestion('');
    setActiveScope('self');
    setActiveSessionId('');
    setError('');
    setTarotQuestion('');
    setIsGenerating(false);
  }, []);

  return (
    <main className="min-h-screen bg-[color:var(--deep)] px-4 py-8 text-[color:var(--text-main)] sm:px-6 lg:px-8">
      {/* 真實洗牌演出層（2026-08-12）：78 張牌背交錯洗切，順序仍由後端亂數決定 */}
      {isShuffling && (
        <div className="tarot-shuffle-overlay" role="status" aria-live="polite" aria-label="78 張塔羅牌洗牌中">
          <div className="tarot-shuffle-overlay__stage" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, index) => (
              <span
                key={index}
                className="tarot-shuffle-overlay__card"
                style={{ animationDelay: `${index * 0.11}s`, zIndex: (index * 5) % 14 }}
              >
                <img src={TAROT_CARD_BACK_URL} alt="" />
                <span className="tarot-shuffle-overlay__gem" />
              </span>
            ))}
          </div>
          <p className="tarot-shuffle-overlay__title">78 張牌洗牌中</p>
          <p className="tarot-shuffle-overlay__sub">亂數交錯洗切，請稍候幾秒…</p>
          <div className="tarot-shuffle-overlay__bar" aria-hidden="true"><span /></div>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="feature-home-link feature-home-link--cyan shrink-0">
            返回首頁
          </Link>
          <span className="hidden rounded-full border border-amber-200/25 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
            Tarot Draw 1.0
          </span>
        </div>

        {adminMode && <TarotDeckAdminReview cards={TAROT_CARDS} onClose={closeAdminReview} />}

        {!adminMode && step === 'ready_to_draw' && (
          <div className="tarot-entry-two-card-grid">
          <section className="fortune-card tarot-experience-hero tarot-experience-hero--primary border-cyan-200/25 p-5 sm:p-7">
            <div className="tarot-experience-copy">
                {/* 主標視覺強化（2026-08-12 依指示）：超大置中主標，強烈視覺衝擊 */}
                <h1 className="tarot-brand-mark" aria-label="古老塔羅牌">
                  <span className="tarot-brand-mark__ai">古老</span>
                  <span className="tarot-brand-mark__name">塔羅牌</span>
                </h1>
                <div className="tarot-brand-divider" aria-hidden="true">
                  <span />
                  <i />
                  <span />
                </div>
                {/* 78/12/3 統計卡已隱藏（2026-08-10）：客戶沒必要看 */}
                <div className="mt-6 hidden gap-3 sm:grid-cols-3">
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

                {/* 資料分流說明卡已隱藏（2026-08-11）：內部機制說明，客戶不用看 */}
                <div className="mt-4 hidden rounded-2xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-sm font-black leading-7 text-amber-100">
                  易經卜卦判定：塔羅牌已接入資料分流。選「我自己」會保留給個人成長中心累積；選「親朋好友」只完成本次單次抽牌，不寫入會員成長資料。
                </div>

                <form className="tarot-question-entry mt-4" onSubmit={(event) => { event.preventDefault(); void beginShuffle(); }}>
                  <div className="tarot-question-entry__label-row">
                    <label htmlFor="tarot-question-entry">
                      今天想問什麼？
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
                    placeholder="說出或寫下你的問題，例如：我今天的任務能完成嗎？"
                    className="tarot-question-entry__textarea"
                  />
                  <p className={`tarot-question-entry__field-hint ${questionReady ? 'tarot-question-entry__field-hint--ready' : ''}`}>
                    {questionReady
                      ? '問題已建立，可以開始洗牌。'
                      : SHOW_QUESTION_EXAMPLES
                        ? '請輸入至少 4 個字，或直接點選下方範例。'
                        : '請輸入至少 4 個字。'}
                  </p>
                  <IdentitySplitSelector compact className="mt-3" nextStepLabel="接著開始洗牌" />
                  {/* 範例問題卡片依需求隱藏；SHOW_QUESTION_EXAMPLES 改回 true 即可恢復 */}
                  {SHOW_QUESTION_EXAMPLES && (
                    <div className="tarot-question-entry__examples">
                      <div className="tarot-question-entry__example-head">
                        <strong>最讓你刺痛的那一句，往往就是你真正該問的事</strong>
                        <span>不要挑最好回答的。選你最想跳過的那一句，牌才會照見你真正不敢面對的地方。</span>
                      </div>
                      <div className="tarot-question-entry__example-list flex flex-wrap gap-2" aria-label="塔羅問題範例">
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
                            <span className="tarot-question-entry__example-badge">{example.number}</span>
                            <span className="tarot-question-entry__example-copy">
                              <strong>{example.label}</strong>
                              <small>{example.cue}</small>
                              <span>{example.text}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {error && (
                    <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-950/25 px-4 py-3 text-sm font-bold leading-7 text-rose-100">
                      {error}
                    </p>
                  )}
                  <div className="tarot-question-entry__actions mt-3">
                    <button
                      type="submit"
                      disabled={isGenerating || (!dailyRecord && !questionReady)}
                      className={`tarot-question-entry__action tarot-question-entry__submit ${questionReady || dailyRecord ? 'tarot-question-entry__submit--ready' : 'tarot-question-entry__submit--locked'}`}
                    >
                      <span className="tarot-question-entry__action-icon" aria-hidden="true">◈</span>
                      <span>{submitLabel}</span>
                    </button>
                    <button
                      type="button"
                      onClick={openAdminReview}
                      className="tarot-question-entry__action tarot-question-entry__library"
                    >
                      <span className="tarot-question-entry__action-icon" aria-hidden="true">◫</span>
                      <span>查看 78 張牌庫</span>
                    </button>
                  </div>
                </form>
            </div>
          </section>

          </div>
        )}

        {!adminMode && step === 'theater' && (
          <TarotOriginalFortuneTeller
            deck={deck}
            cardsById={cardsById}
            question={activeQuestion}
            scope={activeScope}
            sessionId={activeSessionId}
            onReset={resetExperience}
            onComplete={setSelectedDeckCards}
          />
        )}
      </div>
    </main>
  );
}
