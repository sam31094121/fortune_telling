import { enforceAiCopywritingTone, uniqueAiCopywritingLines } from '@/lib/ai-copywriting-style-center';
import { FIVE_ELEMENT_DEFINITIONS, type FiveElementIntegrationResult, type FiveElementKey } from '@/lib/five-element-engine';

export default function FiveElementPriorityCard({ result }: { result?: FiveElementIntegrationResult }) {
  if (!result) return null;
  const primary = FIVE_ELEMENT_DEFINITIONS[result.primaryElement];
  const secondary = FIVE_ELEMENT_DEFINITIONS[result.secondaryElement];
  const strong = FIVE_ELEMENT_DEFINITIONS[result.strongElement];
  const primaryNeed = result.elementScores[result.primaryElement]?.need ?? 0;
  const product = result.productRecommendation;
  const quote = result.positiveQuote;
  const scoreEntries = (Object.entries(result.elementScores) as Array<[FiveElementKey, FiveElementIntegrationResult['elementScores'][FiveElementKey]]>)
    .sort(([, a], [, b]) => b.need - a.need);
  const priorityOrder = result.decision.priorityOrder?.length ? result.decision.priorityOrder : scoreEntries.map(([element]) => element);
  const thirdElement = priorityOrder.find((element) => element !== result.primaryElement && element !== result.secondaryElement) ?? result.strongElement;
  const third = FIVE_ELEMENT_DEFINITIONS[thirdElement];
  const titlePrefix = 'AI 判定｜目前最缺：';
  const elementSuffix = '元素';
  const urgentLabel = '第一補強';
  const needLabel = '補強需求';
  const secondLabel = '第二補強';
  const thirdLabel = '第三補強';
  const supportLabel = '目前支撐';
  const actionLabel = '立即執行';
  const evidenceLabel = '判定依據（已去重）';
  const signalLabel = '五元素缺口排名';
  const productLabel = '五元素能量手鍊補強方案';
  const quoteLabel = '最後的正向提醒';
  const firstName = `${primary.displayZh}${elementSuffix}`;
  const secondName = `${secondary.displayZh}${elementSuffix}`;
  const thirdName = `${third.displayZh}${elementSuffix}`;
  const supportName = `${strong.displayZh}${elementSuffix}`;
  const decisionSummary = `AI 判定：目前最缺【${firstName}】。第一補強鎖定【${firstName}】。完成後再補【${secondName}】，最後補【${thirdName}】。`;
  const planCards = [
    {
      label: '第一層',
      title: '明確判定',
      body: `目前核心缺口直接鎖定：${firstName}。本層只定方向，不分散焦點。`,
      className: 'border-rose-200/30 bg-rose-500/12 text-rose-50',
    },
    {
      label: '第二層',
      title: '補強排序',
      body: `第一補強：${firstName}。第二補強：${secondName}。第三補強：${thirdName}。`,
      className: 'border-cyan-200/25 bg-cyan-400/10 text-cyan-50',
    },
    {
      label: '第三層',
      title: '執行落地',
      body: '今天開始執行前三項行動。完成第一補強後，再進入第二補強。',
      className: 'border-amber-200/25 bg-amber-300/10 text-amber-50',
    },
  ];
  const displayKeywords = uniqueAiCopywritingLines(result.keywords, 8);
  const displayActions = uniqueAiCopywritingLines(result.recommendedActions, 3);
  const displayReasons = uniqueAiCopywritingLines(result.reasons);
  const displayProductReasons = uniqueAiCopywritingLines(result.productMatch.matchReason, 3);
  const displaySupportDirections = uniqueAiCopywritingLines(product.supportDirections, 6);
  const decisionConclusion = enforceAiCopywritingTone(result.decision.conclusion) || decisionSummary;
  const decisionTemplate = enforceAiCopywritingTone(result.decision.priorityTemplate);
  const changeTarget = enforceAiCopywritingTone(result.decision.changeTarget);
  const conflictNote = enforceAiCopywritingTone(result.decision.conflictNote);
  const productHeadline = enforceAiCopywritingTone(product.headline);
  const productBraceletCore = enforceAiCopywritingTone(product.braceletCore);
  const productDescription = enforceAiCopywritingTone(product.description);
  const quoteElementFit = enforceAiCopywritingTone(quote.elementFit);
  const quoteReminder = enforceAiCopywritingTone(quote.reminder);

  return (
    <section id="five-element-priority" className="fortune-card relative overflow-hidden border-rose-300/35 bg-[linear-gradient(135deg,rgba(127,29,29,0.38),rgba(15,23,42,0.9)_42%,rgba(120,53,15,0.32))] p-5 shadow-[0_0_40px_rgba(251,113,133,0.18)] sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-300" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-200">ELEMENT PRIORITY</p>
          <h2 className="mt-3 break-words font-serif text-5xl font-black leading-tight text-amber-100 drop-shadow-[0_0_22px_rgba(251,191,36,0.18)] sm:text-7xl">
            {titlePrefix}<span className="text-rose-200 drop-shadow-[0_0_18px_rgba(251,113,133,0.55)]">{primary.displayZh}</span>{elementSuffix}
          </h2>
          <p className="mt-4 max-w-3xl text-lg font-black leading-9 text-amber-50 sm:text-2xl">{decisionSummary}</p>
          <div className="mt-5 rounded-3xl border border-rose-200/30 bg-rose-500/12 p-4 shadow-[0_0_30px_rgba(251,113,133,0.12)] sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-100">PROFESSIONAL REVISION PLAN</p>
            <p className="mt-2 text-lg font-black leading-8 text-rose-50">{decisionConclusion}</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {planCards.map((card) => (
                <article key={card.label} className={`rounded-2xl border p-3 ${card.className}`}>
                  <p className="text-[11px] font-black tracking-[0.2em] opacity-80">{card.label}</p>
                  <h3 className="mt-1 text-xl font-black">{card.title}</h3>
                  <p className="mt-2 text-sm font-bold leading-7 opacity-90">{card.body}</p>
                </article>
              ))}
            </div>
            <details className="mt-3 rounded-2xl border border-white/10 bg-black/18 p-3">
              <summary className="cursor-pointer text-xs font-black text-amber-100">完整排序模板</summary>
              <pre className="mt-3 whitespace-pre-line rounded-xl border border-white/10 bg-black/18 px-3 py-2 font-sans text-sm font-black leading-7 text-amber-100">{decisionTemplate}</pre>
            </details>
            <p className="mt-3 text-sm font-bold leading-7 text-amber-100">{changeTarget}</p>
            {conflictNote && (
              <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{conflictNote}</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {displayKeywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-amber-200/30 bg-amber-300/12 px-3 py-1 text-xs font-black text-amber-100">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200/25 bg-black/25 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-rose-100">{urgentLabel}</p>
              <p className="mt-1 font-serif text-5xl font-black leading-none text-rose-100">{primary.displayZh}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[color:var(--text-muted)]">{needLabel}</p>
              <p className="mt-1 text-3xl font-black text-amber-200">{primaryNeed}</p>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300" style={{ width: Math.max(10, primaryNeed) + '%' }} />
          </div>
          <p className="mt-3 text-sm font-bold leading-7 text-rose-50">{enforceAiCopywritingTone(primary.direction)}</p>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-200/20 bg-white/[0.045] p-4">
          <p className="text-xs font-black text-cyan-100">{secondLabel}</p>
          <p className="mt-1 text-2xl font-black text-cyan-50">{secondName}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/20 bg-white/[0.045] p-4">
          <p className="text-xs font-black text-emerald-100">{thirdLabel}</p>
          <p className="mt-1 text-2xl font-black text-emerald-50">{thirdName}</p>
        </div>
        <div className="rounded-2xl border border-rose-200/20 bg-white/[0.045] p-4">
          <p className="text-xs font-black text-rose-100">{supportLabel}</p>
          <p className="mt-1 text-xl font-black text-rose-50">{supportName}</p>
        </div>
      </div>

      <div className="relative mt-5 rounded-2xl border border-amber-200/25 bg-amber-300/10 p-4 shadow-[inset_0_0_24px_rgba(251,191,36,0.05)] sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">{productLabel}</p>
        <h3 className="mt-2 text-2xl font-black text-amber-50">{product.title}</h3>
        <p className="mt-2 text-sm font-black leading-7 text-amber-100">{productHeadline}</p>
        <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-500/10 px-3 py-2 text-sm font-black leading-7 text-rose-100">{productBraceletCore}</p>
        <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{productDescription}</p>
        <div className="mt-3 space-y-2">
          {displayProductReasons.map((reason) => (
            <p key={reason} className="rounded-xl border border-amber-200/15 bg-black/15 px-3 py-2 text-xs font-bold leading-6 text-amber-100">{reason}</p>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {displaySupportDirections.map((item) => (
            <span key={item} className="rounded-full border border-amber-200/25 bg-black/18 px-3 py-1 text-xs font-black text-amber-100">{item}</span>
          ))}
        </div>
        <button type="button" className="mt-4 w-full rounded-2xl border border-amber-200/35 bg-amber-300/14 px-4 py-3 text-sm font-black text-amber-50 transition hover:border-amber-100/60">
          {product.ctaLabel}
        </button>
        <p className="mt-3 text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">{product.disclaimer}</p>
      </div>

      <div className="relative mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-amber-200/20 bg-black/18 p-4">
          <p className="text-sm font-black text-amber-100">{actionLabel}</p>
          <div className="mt-3 space-y-2">
            {displayActions.map((action, index) => (
              <p key={action} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold leading-7 text-[color:var(--text-sub)]">
                {index + 1}. {action}
              </p>
            ))}
          </div>
        </div>
        <details className="rounded-2xl border border-white/10 bg-black/18 p-4">
          <summary className="cursor-pointer text-sm font-black text-cyan-100">{evidenceLabel}</summary>
          <div className="mt-3 space-y-2">
            {displayReasons.map((reason) => (
              <p key={reason} className="text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{reason}</p>
            ))}
          </div>
          <p className="mt-4 text-xs font-black text-cyan-100">{signalLabel}</p>
          <div className="mt-2 space-y-2">
            {scoreEntries.map(([element, score]) => {
              const definition = FIVE_ELEMENT_DEFINITIONS[element];
              return (
                <div key={element} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-xs font-bold text-[color:var(--text-sub)]">
                  <span>{definition.displayZh}{elementSuffix}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-cyan-300" style={{ width: Math.max(6, score.need) + '%' }} /></span>
                  <span className="text-right text-cyan-100">{score.need}</span>
                </div>
              );
            })}
          </div>
        </details>
      </div>

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">{quoteLabel}</p>
        <blockquote className="mt-3 text-lg font-black leading-8 text-cyan-50">&quot;{quote.quote}&quot;</blockquote>
        <p className="mt-2 text-sm font-bold text-amber-100">{quote.author} ｜ {quote.role}</p>
        <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{quoteElementFit}</p>
        <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{quoteReminder}</p>
        <a href={quote.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[11px] font-bold text-cyan-200 underline-offset-4 hover:underline">
          {quote.sourceName}
        </a>
      </div>
    </section>
  );
}
