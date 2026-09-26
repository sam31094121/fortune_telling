import { shenShaDisplayCopy, shenShaDisplayNames } from '@/lib/shensha-display-copy';

export type ShenShaDisplayRule = {
  status?: string; ready?: boolean; verificationScope?: string; outputStatus?: string;
  method?: { title: string; edition: string; ruleVersion: string; summary: string; sourceUrl: string; printedPage: string };
  comparisons?: ReadonlyArray<{ status: string; title: string; detail: string; sourceUrl: string; locator: string;
    citations?: ReadonlyArray<{ book: string; locator: string; quote: string; url: string; verification: string }>;
  }>;
};

export function ShenShaEvidenceLinks({ rules, ids, language = 'zh' }: { rules?: Record<string, ShenShaDisplayRule>; ids: string[]; language?: string }) {
  const locale = language === 'en' ? 'en' : 'zh';
  return <>{ids.flatMap(id => {
    const rule = rules?.[id];
    const name = shenShaDisplayNames[locale][id as keyof typeof shenShaDisplayNames.zh] ?? id;
    const sources = rule?.comparisons?.filter(item => item.status === 'DOCUMENTED_VARIANT' && item.sourceUrl && item.locator) ?? [];
    return sources.map((item, index) => <a key={`${id}-${index}`} data-shensha-evidence-link href={item.sourceUrl} rel="noreferrer" aria-label={`${name} · ${item.title} · ${item.locator}`} style={{ textDecoration: 'underline', marginInlineStart: '0.5em' }}>{locale === 'en' ? 'View evidence' : '查看依據'} · {name}</a>);
  })}</>;
}

export function ShenShaComparisonSummary({ rules, language = 'zh', includeMatched = true }: { rules?: Record<string, ShenShaDisplayRule>; language?: string; includeMatched?: boolean }) {
  const locale = language === 'en' ? 'en' : 'zh';
  const copy = shenShaDisplayCopy[locale];
  const groups = { variant: [] as string[], matched: [] as string[], pendingComparison: [] as string[] };
  for (const [id, name] of Object.entries(shenShaDisplayNames[locale])) {
    const comparisons = rules?.[id]?.comparisons ?? [];
    if (!comparisons.length || comparisons.some(item => item.status === 'PENDING_COLLATION' || !item.sourceUrl || !item.locator)) groups.pendingComparison.push(name);
    if (rules?.[id]?.outputStatus !== 'BLOCKED_VARIANT' && comparisons.some(item => item.status === 'DOCUMENTED_VARIANT' && item.sourceUrl && item.locator)) groups.variant.push(name);
    if (includeMatched && comparisons.some(item => item.status === 'MATCHED_SCOPE' && item.sourceUrl && item.locator)) groups.matched.push(name);
  }
  return <>{(Object.keys(groups) as Array<keyof typeof groups>).filter(key => groups[key].length).map(key => <span key={key} data-shensha-comparison={key}>{copy[key]}{locale === 'en' ? ': ' : '：'}{groups[key].join(locale === 'en' ? ', ' : '、')}{locale === 'en' ? '. ' : '。'}{key === 'variant' && <ShenShaEvidenceLinks rules={rules} ids={Object.keys(shenShaDisplayNames[locale]).filter(id => rules?.[id]?.comparisons?.some(item => item.status === 'DOCUMENTED_VARIANT' && item.sourceUrl && item.locator))} language={language} />} </span>)}</>;
}

/** Metadata never unlocks a rule; the main tables separately apply status and ready. */
export default function ShenShaSourceEvidence({ rules, language = 'zh', className }: {
  rules?: Record<string, ShenShaDisplayRule>; language?: string; className?: string;
}) {
  const locale = language === 'en' ? 'en' : 'zh';
  const copy = shenShaDisplayCopy[locale];
  return <details className={className} data-shensha-source-evidence>
    <summary>{copy.details}</summary>
    {Object.entries(shenShaDisplayNames[locale]).map(([id, name]) => {
      const rule = rules?.[id];
      const method = rule?.method;
      return <section key={id}>
        <strong>{name} · {rule?.status === 'VERIFIED' && rule.verificationScope === 'SELECTED_EDITION' ? copy.checked : copy.withheld}</strong>
        {method ? <p>{copy.method}：<a href={method.sourceUrl} target="_blank" rel="noreferrer">{method.title} · {method.edition} · {method.printedPage}</a><br />{method.summary}<small> · {method.ruleVersion}</small></p> : <p>{copy.missing}</p>}
        {rule?.comparisons?.length ? rule.comparisons.map((comparison, index) => {
          const evidenced = Boolean(comparison.sourceUrl && comparison.locator);
          const status = evidenced && comparison.status === 'DOCUMENTED_VARIANT' ? copy.variant
            : evidenced && comparison.status === 'MATCHED_SCOPE' ? copy.matched : copy.pendingComparison;
          return <div key={index} data-comparison-status={status}><p>{status} · {comparison.title}：{comparison.detail}{evidenced && <> · <a href={comparison.sourceUrl} rel="noreferrer">{comparison.locator}</a></>}</p>
            {comparison.citations?.filter(citation => citation.book && citation.quote).map((citation, citationIndex) => <blockquote key={citationIndex} lang="zh-Hant"><p>《{citation.book}》 · {citation.locator}：「{citation.quote}」</p><small>{citation.verification}</small>{citation.url && <a href={citation.url} rel="noreferrer">{language === 'en' ? 'Original text' : '原文出處'}</a>}</blockquote>)}
          </div>;
        }) : <p>{copy.pendingComparison}</p>}
      </section>;
    })}
  </details>;
}
