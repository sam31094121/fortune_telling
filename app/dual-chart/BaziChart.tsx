import type { ReactNode } from 'react';
import type { DualChartResult } from '@/lib/dual-chart';
import styles from './dual-chart.module.css';
import ElementRing from './ElementRing';

const order = ['hour', 'day', 'month', 'year'] as const;
const labels = { hour: '時', day: '日', month: '月', year: '年' };

export function PillarGrid({ result, compact = false }: { result: DualChartResult; compact?: boolean }) {
  const { core, bazi } = result;
  const pc = bazi.professionalChart;
  const traditionalGate = pc.traditionalInterpretationGate;
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
      {!compact && row('神煞', key => {
        if (traditionalGate?.shenShaReady !== true) return '未校驗';
        const names = Array.isArray(core.shenSha) ? [...new Set(core.shenSha.filter(s => s.evidence.startsWith(key.toUpperCase() + ' ')).map(s => s.name))] : [];
        return names.length ? names.map(name => <span className={styles.stack} key={name}>{name}</span>) : '—';
      }, styles.shenshaRow)}
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

export default function BaziChart({ result, monochrome = false }: { result: DualChartResult; monochrome?: boolean }) {
  const { core, bazi, annual } = result;
  const pc = bazi.professionalChart;
  const traditionalGate = pc.traditionalInterpretationGate;
  const meta = core.daYunMeta;
  return <div className={styles.reportScroll}><div className={styles.baziReport}>
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
        <PillarGrid result={result} />
        <div className={styles.startLuck}>{typeof meta === 'object' ? `出生後 ${meta.startAgeYears} 年 ${meta.startAgeMonths} 月 ${meta.startAgeDays} 天起運 · ${meta.direction === 'FORWARD' ? '順行' : '逆行'}` : '起運資料未提供'}</div>
        <LuckGrid result={result} />
        <section className={styles.relations} data-density={core.interactions.length > 6 ? 'dense' : core.interactions.length > 4 ? 'compact' : 'regular'}><h3>命局合沖刑害破</h3>{core.interactions.length ? core.interactions.map((r, index) => <p key={index}><b>{r.interactionType}</b><span className={styles.relationParticipants}>{r.participants.join('、')}</span><small>{r.affectedPillars.map(key => ({ YEAR: '年柱', MONTH: '月柱', DAY: '日柱', HOUR: '時柱' })[key] ?? key).join('、')}</small></p>) : <p>本系統規則未命中</p>}</section>
        <p className={styles.micro}>神煞尚未通過完整來源校驗，本版不作「無命中」或完整神煞定論。</p>
      </section>
    </div>
    <footer className={styles.reportFooter}>節氣：{core.calendar.solarTerm} {core.calendar.solarTermTime}<br />台灣標準時間 UTC+8 · 年以立春、月以節氣為界 · 晚子時日柱不換日 · 未做真太陽時校正</footer>
  </div></div>;
}
