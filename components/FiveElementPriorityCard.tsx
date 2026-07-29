import { FIVE_ELEMENT_DEFINITIONS, type FiveElementIntegrationResult, type FiveElementKey } from '@/lib/five-element-engine';

export default function FiveElementPriorityCard({ result }: { result?: FiveElementIntegrationResult }) {
  if (!result) return null;
  const primary = FIVE_ELEMENT_DEFINITIONS[result.primaryElement];
  const secondary = FIVE_ELEMENT_DEFINITIONS[result.secondaryElement];
  const strong = FIVE_ELEMENT_DEFINITIONS[result.strongElement];
  const avoid = result.avoidElement ? FIVE_ELEMENT_DEFINITIONS[result.avoidElement] : null;
  const primaryNeed = result.elementScores[result.primaryElement]?.need ?? 0;
  const product = result.productRecommendation;
  const quote = result.positiveQuote;
  const scoreEntries = (Object.entries(result.elementScores) as Array<[FiveElementKey, FiveElementIntegrationResult['elementScores'][FiveElementKey]]>)
    .sort(([, a], [, b]) => b.need - a.need);
  const titlePrefix = '\u672c\u6b21\u5224\u5b9a\u4f60\u7f3a\uff1a';
  const elementSuffix = '\u5143\u7d20';
  const urgentLabel = '\u672c\u6b21\u5fc5\u88dc';
  const needLabel = '\u88dc\u5f37\u9700\u6c42';
  const secondLabel = '\u7b2c\u4e8c\u9806\u4f4d\uff0c\u4e0d\u5148\u88dc';
  const strongLabel = '\u76ee\u524d\u8f03\u5f37';
  const avoidLabel = '\u672c\u6b21\u5148\u4e0d\u88dc';
  const actionLabel = '\u8acb\u5148\u505a\u9019\u4e09\u4ef6\u4e8b';
  const evidenceLabel = '\u70ba\u4ec0\u9ebc\u9019\u6a23\u5224\u65b7';
  const signalLabel = '\u4e94\u5143\u7d20\u7f3a\u53e3\u6392\u540d';
  const noAvoidText = '\u6c92\u6709\u904e\u5f37\u5143\u7d20\uff1b\u672c\u6b21\u53ea\u9700\u5c08\u5fc3\u88dc\u7b2c\u4e00\u5143\u7d20';
  const productLabel = '\u4e94\u5143\u7d20\u80fd\u91cf\u624b\u93c8\u88dc\u5f37\u65b9\u6848';
  const quoteLabel = '\u6700\u5f8c\u7684\u6b63\u5411\u63d0\u9192';

  return (
    <section id="five-element-priority" className="fortune-card relative overflow-hidden border-rose-300/35 bg-[linear-gradient(135deg,rgba(127,29,29,0.38),rgba(15,23,42,0.9)_42%,rgba(120,53,15,0.32))] p-5 shadow-[0_0_40px_rgba(251,113,133,0.18)] sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-300" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-200">ELEMENT PRIORITY</p>
          <h2 className="mt-3 break-words font-serif text-4xl font-black leading-tight text-amber-100 sm:text-6xl">
            {titlePrefix}<span className="text-rose-200 drop-shadow-[0_0_18px_rgba(251,113,133,0.55)]">{primary.displayZh}</span>{elementSuffix}
          </h2>
          <p className="mt-4 max-w-3xl text-base font-black leading-8 text-amber-50 sm:text-lg">{result.summary}</p>
          <div className="mt-4 rounded-2xl border border-rose-200/25 bg-rose-500/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-100">{result.decision.title}</p>
            <p className="mt-2 text-base font-black leading-7 text-rose-50">{result.decision.conclusion}</p>
            <p className="mt-2 text-sm font-bold leading-7 text-amber-100">{result.decision.changeTarget}</p>
            {result.decision.conflictNote && (
              <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{result.decision.conflictNote}</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.keywords.map((keyword) => (
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
          <p className="mt-3 text-sm font-bold leading-7 text-rose-50">{primary.direction}</p>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-200/20 bg-white/[0.045] p-4">
          <p className="text-xs font-black text-cyan-100">{secondLabel}</p>
          <p className="mt-1 text-2xl font-black text-cyan-50">{secondary.displayZh}{elementSuffix}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/20 bg-white/[0.045] p-4">
          <p className="text-xs font-black text-emerald-100">{strongLabel}</p>
          <p className="mt-1 text-2xl font-black text-emerald-50">{strong.displayZh}{elementSuffix}</p>
        </div>
        <div className="rounded-2xl border border-rose-200/20 bg-white/[0.045] p-4">
          <p className="text-xs font-black text-rose-100">{avoidLabel}</p>
          <p className="mt-1 text-xl font-black text-rose-50">{avoid ? avoid.displayZh + elementSuffix : noAvoidText}</p>
        </div>
      </div>


      <div className="relative mt-5 rounded-2xl border border-amber-200/25 bg-amber-300/10 p-4 shadow-[inset_0_0_24px_rgba(251,191,36,0.05)] sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">{productLabel}</p>
        <h3 className="mt-2 text-2xl font-black text-amber-50">{product.title}</h3>
        <p className="mt-2 text-sm font-black leading-7 text-amber-100">{product.headline}</p>
        <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-500/10 px-3 py-2 text-sm font-black leading-7 text-rose-100">{product.braceletCore}</p>
        <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{product.description}</p>
        <div className="mt-3 space-y-2">
          {result.productMatch.matchReason.slice(0, 3).map((reason) => (
            <p key={reason} className="rounded-xl border border-amber-200/15 bg-black/15 px-3 py-2 text-xs font-bold leading-6 text-amber-100">{reason}</p>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.supportDirections.map((item) => (
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
            {result.recommendedActions.slice(0, 3).map((action, index) => (
              <p key={action} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold leading-7 text-[color:var(--text-sub)]">
                {index + 1}. {action}
              </p>
            ))}
          </div>
        </div>
        <details className="rounded-2xl border border-white/10 bg-black/18 p-4">
          <summary className="cursor-pointer text-sm font-black text-cyan-100">{evidenceLabel}</summary>
          <div className="mt-3 space-y-2">
            {result.reasons.map((reason) => (
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
        <blockquote className="mt-3 text-lg font-black leading-8 text-cyan-50">\"{quote.quote}\"</blockquote>
        <p className="mt-2 text-sm font-bold text-amber-100">{quote.author} ? {quote.role}</p>
        <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{quote.elementFit}</p>
        <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{quote.reminder}</p>
        <a href={quote.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[11px] font-bold text-cyan-200 underline-offset-4 hover:underline">
          {quote.sourceName}
        </a>
      </div>
    </section>
  );
}

