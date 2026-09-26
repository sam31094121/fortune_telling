import type { ReactNode } from 'react';
import type { DualChartResult } from '@/lib/dual-chart';
import styles from './dual-chart.module.css';
import ElementRing from './ElementRing';
import ShenShaSourceEvidence, { ShenShaComparisonSummary, ShenShaEvidenceLinks } from '@/components/bazi/customer/ShenShaSourceEvidence';
import { shenShaDisplayCopy, shenShaDisplayNames } from '@/lib/shensha-display-copy';

const order = ['hour', 'day', 'month', 'year'] as const;
const labels = { hour: '時', day: '日', month: '月', year: '年' };
const shenShaLabels = { tianyi: '天乙', wenchang: '文昌', taohua: '桃花', yima: '驛馬', huagai: '華蓋' } as const;
function shenShaAvailability(result: DualChartResult) {
  const gate = result.bazi.professionalChart.traditionalInterpretationGate;
  const allowed = new Set(Object.entries(gate?.shenShaRules ?? {}).filter(([, rule]) => gate?.coreReady && rule.ready && rule.status === 'VERIFIED' && rule.outputStatus === 'READY').map(([id]) => id));
  const hasData = Array.isArray(result.core.shenSha);
  const restricted = Object.entries(shenShaLabels).filter(([id]) => !allowed.has(id));
  const isConflict = (id: string) => {
    const rule = gate?.shenShaRules?.[id as keyof typeof shenShaLabels];
    return rule?.status === 'CONFLICT' || rule?.outputStatus === 'BLOCKED_VARIANT';
  };
  const conflicts = restricted.filter(([id]) => isConflict(id)).map(([, name]) => name);
  const pending = restricted.filter(([id]) => !isConflict(id)).map(([, name]) => name);
  return { allowed, hasData, conflicts, pending };
}

export function ShenShaRestrictions({ result, language = 'zh' }: { result: DualChartResult; language?: string }) {
  const { conflicts, pending } = shenShaAvailability(result);
  const locale = language === 'en' ? 'en' : 'zh';
  const copy = shenShaDisplayCopy[locale];
  const names = (items: string[]) => items.map(name => locale === 'en' ? shenShaDisplayNames.en[Object.keys(shenShaLabels).find(id => shenShaLabels[id as keyof typeof shenShaLabels] === name) as keyof typeof shenShaLabels] : name).join(locale === 'en' ? ', ' : '、');
  return <>{conflicts.length > 0 && <span data-shensha-restriction="conflict">{locale === 'en' ? copy.compactConflict : copy.conflict}{names(conflicts)}{locale === 'en' ? '. ' : '。'}<ShenShaEvidenceLinks rules={result.bazi.professionalChart.traditionalInterpretationGate?.shenShaRules} ids={Object.entries(shenShaLabels).filter(([, name]) => conflicts.includes(name)).map(([id]) => id)} language={language} /> </span>}{pending.length > 0 && <span data-shensha-restriction="pending">{copy.pending}{names(pending)}{locale === 'en' ? '. ' : '。'}</span>}</>;
}

export function PillarGrid({ result, compact = false, language = 'zh' }: { result: DualChartResult; compact?: boolean; language?: string }) {
  const { core, bazi } = result;
  const pc = bazi.professionalChart;
  const { allowed, hasData, conflicts } = shenShaAvailability(result);
  const row = (title: string, render: (key: typeof order[number]) => ReactNode, className?: string) => <tr className={className}>{order.map(key => <td key={key}>{render(key)}</td>)}<th scope="row">{title}</th></tr>;
  return <table className={`${styles.pillarGrid} ${compact ? styles.compactGrid : ''}`} aria-label={compact ? '中央八字摘要' : '八字四柱時日月年主表'}>
    <thead><tr>{order.map(key => <th key={key} scope="col">{labels[key]}柱</th>)}<th>項目</th></tr></thead>
    <tbody>
      {row('主星', key => pc.pillarDetails[key].stemTenGod)}
      {row('天干', key => pc.pillarDetails[key].ganzhi[0], styles.largeGlyph)}
      {row('地支', key => pc.pillarDetails[key].ganzhi[1], styles.largeGlyph)}
      {row('藏干', key => pc.hiddenStemStructure[key].map(h => h.stem).join('　'))}
      {row('副星', key => pc.hiddenStemStructure[key].map(h => <span className={styles.stack} key={h.stem}>{h.tenGod}</span>))}
      {row('十二運', key => core.twelveStages[key])}
      {!compact && (!allowed.size || !hasData ? <tr className={styles.shenshaRow}>
        <td colSpan={4} data-shensha-state={!allowed.size ? conflicts.length ? 'restricted' : 'pending' : 'unavailable'}>
          <span className={styles.shenshaStatus}>{!allowed.size ? conflicts.length ? '取法分歧，暫未提供' : '尚待核對' : '資料待補'}</span>
          <small className={styles.shenshaStatus}>{!allowed.size ? '四柱神煞暫未提供，不代表沒有神煞。' : '請重新排盤，暫不判定是否命中。'}</small>
        </td><th scope="row">神煞</th>
      </tr> : row('神煞', key => {
        const hits = Array.isArray(core.shenSha) ? [...new Map(core.shenSha.filter(s => allowed.has(s.id) && s.evidence.startsWith(key.toUpperCase() + ' ')).map(s => [s.name, s])).values()] : [];
        return hits.length ? hits.map(hit => <span className={styles.stack} key={hit.name} title={hit.rule}>{hit.name}{hit.source && <a className={styles.shenshaSource} href={hit.source.url} target="_blank" rel="noreferrer" aria-label={`${hit.name}來源：${hit.source.title}，卷上${hit.source.printedPage}頁`}>原典 {hit.source.printedPage}頁</a>}</span>) : null;
      }, styles.shenshaRow))}
    </tbody>
  </table>;
}

export function LuckGrid({ result, compact = false }: { result: DualChartResult; compact?: boolean }) {
  const cycles = Array.isArray(result.core.daYun) ? [...result.core.daYun].reverse() : [];
  return <table className={`${styles.luckGrid} ${compact ? styles.compactGrid : ''}`} aria-label="大運年齡干支表"><tbody>
    <tr>{cycles.map(c => <td key={c.index}>{compact ? c.startAge : `${c.startAge}–${c.endAge}`}</td>)}<th scope="row">歲</th></tr>
    <tr>{cycles.map(c => <td key={c.index}><b>{c.ganZhi}</b></td>)}<th scope="row">大運</th></tr>
    {!compact && <tr>{cycles.map(c => <td key={c.index}>{c.startYear}</td>)}<th scope="row">年起</th></tr>}
  </tbody></table>;
}

export default function BaziChart({ result, monochrome = false, language = 'zh' }: { result: DualChartResult; monochrome?: boolean; language?: string }) {
  const { core, bazi, annual } = result;
  const pc = bazi.professionalChart;
  const traditionalGate = pc.traditionalInterpretationGate;
  const { allowed, hasData } = shenShaAvailability(result);
  const meta = core.daYunMeta;
  const copy = shenShaDisplayCopy[language === 'en' ? 'en' : 'zh'];
  const sourceNotes = <><p className={`${styles.micro} ${styles.shenshaNote}`}>{!allowed.size
    ? '本次神煞暫未提供；不影響四柱、藏干與十神資料。'
    : !hasData
    ? '神煞資料待補，請重新排盤；暫不判定是否命中。'
    : <>{copy.compactAdopted} {copy.compactScope} </>}<ShenShaRestrictions result={result} language={language} /><ShenShaComparisonSummary rules={traditionalGate?.shenShaRules} language={language} includeMatched={false} /></p>
    <ShenShaSourceEvidence rules={traditionalGate?.shenShaRules} language={language} className={styles.shenshaEvidence} /></>;
  return <><div className={styles.reportScroll}><div className={styles.baziReport}>
    <div className={styles.birthBand}><b>{bazi.input.name || '命主'}</b><span>{bazi.input.gender === 'male' ? '男' : '女'} · {core.pillars.year.yinYang}年</span><span>國曆 {bazi.input.birthDate}　{bazi.input.birthTime}</span><span>農曆 {core.calendar.lunarDate}</span></div>
    <div className={styles.baziColumns}>
      <aside className={styles.baziSidebar}>
        <ElementRing percentages={pc.elementStatistics.percentages} monochrome={monochrome} />
        <dl className={styles.summaryGrid}>
          {Object.entries({ 日主: `${core.dayMaster.stem}${core.dayMaster.element}（${core.dayMaster.yinYang}）`, 命宮: core.mingGong, 身宮: core.shenGong, 胎元: core.taiYuan, 胎息: core.taiXi, 年空: core.kongWang.yearXunKong, 日空: core.kongWang.dayXunKong }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <p className={styles.micro}>{traditionalGate?.customerMessage ?? '傳統解釋守門尚未完成，本次不作格局、旺衰與喜用定論。'}</p>
        <h3 className={styles.subheading}>流年 · {annual[0].year}–{annual.at(-1)?.year}</h3>
        {[0, 5, 10].map(start => <table key={start} className={styles.annualGrid} aria-label={`流年 ${annual[start].year} 年起`}><tbody>
          <tr>{annual.slice(start, start + 5).reverse().map(a => <th key={a.year}>{a.year}<small>{a.age}虛歲</small></th>)}</tr>
          <tr>{annual.slice(start, start + 5).reverse().map(a => <td key={a.year}><b>{a.ganzhi}</b><span>{a.stemGod}</span><span>{a.branchGod}</span></td>)}</tr>
        </tbody></table>)}
        <p className={styles.micro}>上列依次為干支、干十神、支主氣十神；立春換年。流年神煞未提供。</p>
      </aside>
      <section className={styles.baziMain}>
        <PillarGrid result={result} language={language} />
        <div className={styles.startLuck}>{typeof meta === 'object' ? `出生後 ${meta.startAgeYears} 年 ${meta.startAgeMonths} 月 ${meta.startAgeDays} 天起運 · ${meta.direction === 'FORWARD' ? '順行' : '逆行'}` : '起運資料未提供'}</div>
        <LuckGrid result={result} />
        <section className={styles.relations} data-density={core.interactions.length > 6 ? 'dense' : core.interactions.length > 4 ? 'compact' : 'regular'}><h3>命局合沖刑害破</h3>{core.interactions.length ? core.interactions.map((r, index) => <p key={index}><b>{r.interactionType}</b><span className={styles.relationParticipants}>{r.participants.join('、')}</span><small>{r.affectedPillars.map(key => ({ YEAR: '年柱', MONTH: '月柱', DAY: '日柱', HOUR: '時柱' })[key] ?? key).join('、')}</small></p>) : <p>本系統規則未命中</p>}</section>
        {sourceNotes}
      </section>
    </div>
    <footer className={styles.reportFooter}>節氣：{core.calendar.solarTerm} {core.calendar.solarTermTime}<br />台灣標準時間 UTC+8 · 年以立春、月以節氣為界 · 晚子時日柱不換日 · 未做真太陽時校正</footer>
  </div></div><section className={styles.screenShenShaNotes} aria-label={language === 'en' ? 'Shensha source status' : '神煞來源狀態'}>{sourceNotes}</section></>;
}
