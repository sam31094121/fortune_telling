'use client';
import { useRef, useState } from 'react';
import type { DualChartResult } from '@/lib/dual-chart';
import styles from './dual-chart.module.css';
import { PillarGrid, LuckGrid } from './BaziChart';

const positions: Record<string, [number, number]> = { 巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4], 辰: [2, 1], 酉: [2, 4], 卯: [3, 1], 戌: [3, 4], 寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4] };
export default function ZiweiChart({ result }: { result: DualChartResult }) {
  const { ziwei, periods } = result;
  const [selected, setSelected] = useState(ziwei.lifePalace.key);
  const detail = useRef<HTMLElement>(null);
  const palace = ziwei.palaces.find(p => p.key === selected) ?? ziwei.lifePalace;
  const period = periods.find(p => p.branch === palace.earthlyBranch);
  return <>
    <p className={`${styles.note} ${styles.interactionHint}`}>點選任一宮位，下方會顯示完整星曜、亮度、四化與大限。</p>
    <div className={styles.ziweiScroll}><div className={styles.chart} aria-label="紫微十二宮傳統方盤">
      <div className={styles.center}>
        <strong>命主資料</strong>
        <p className={styles.owner}>{result.bazi.input.name || '命主'} · {ziwei.birthInput.gender}</p>
        <p className={styles.chartClass}>{result.ziweiProfile.polarity}{ziwei.birthInput.gender} · {ziwei.raw.fiveElementsClass} · 生肖{result.ziweiProfile.zodiac}</p>
        <p><span className={styles.metaLabel}>國曆</span>{ziwei.raw.solarDate}</p>
        <p><span className={styles.metaLabel}>農曆</span>{ziwei.raw.lunarDate}</p>
        <p><span className={styles.metaLabel}>時辰</span>{ziwei.raw.time} {ziwei.raw.timeRange}</p>
        <p><span className={styles.metaLabel}>命主</span>{ziwei.raw.soulMaster}<span className={styles.metaLabel}>身主</span>{ziwei.raw.bodyMaster}</p>
        <PillarGrid result={result} compact />
        <LuckGrid result={result} compact />
      </div>
      {ziwei.palaces.map(p => {
        const [row, column] = positions[p.earthlyBranch];
        const cycle = periods.find(period => period.branch === p.earthlyBranch);
        return <button key={p.key} type="button" aria-label={`查看${p.name}詳情`} aria-pressed={p.key === selected} className={`${styles.cell} ${p.key === 'MING' ? styles.life : ''} ${p.isBodyPalace ? styles.body : ''}`} style={{ gridRow: row, gridColumn: column }} onClick={() => { setSelected(p.key); detail.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }}>
          <span className={styles.cellStars}>{p.majorStarDetails.length ? p.majorStarDetails.map(star => <span key={star.name}>{star.name}{star.brightness && <small className={styles.starBrightness}>{star.brightness}</small>}{star.mutagen && <b className={styles.badge} data-mutagen={star.mutagen}>{star.mutagen}</b>}</span>) : <span className={styles.emptyStar}>空宮</span>}</span>
          <span className={styles.cellMinor}>{p.minorStars.slice(0, 3).map(star => star.name).join(' ')}{p.minorStars.length > 3 ? '…' : ''}</span>
          <span className={styles.printStars}>{p.minorStars.map(star => <span key={star.name}>{star.name}{star.brightness && <small>（{star.brightness}）</small>}{star.mutagen && <b className={styles.badge} data-mutagen={star.mutagen}>{star.mutagen}</b>}</span>)}</span>
          <span className={styles.palaceCycles}><span>長生：{cycle?.stage}</span><span>博士：{cycle?.boshi}</span><span>歲前：{cycle?.suiqian}</span><span>將前：{cycle?.jiangqian}</span></span>
          <span className={styles.cellTitle}>{p.name}{p.isBodyPalace && <b>身宮</b>}<span className={styles.cellBranch}>{p.heavenlyStem}{p.earthlyBranch}</span></span>
          <span className={styles.ageStrip}><b>小限</b><span className={styles.ageValues}>{cycle?.ages.map((age, index) => <span key={age}>{index > 0 ? '· ' : ''}{age}</span>)}</span></span>
          <span className={styles.cellPeriod}>大限 {cycle?.range.join('–')} 歲</span>
        </button>;
      })}
    </div></div>
    <section ref={detail} className={styles.palace} aria-live="polite" aria-label="選中宮位詳情">
      <h3>{palace.name} · {palace.heavenlyStem}{palace.earthlyBranch}{palace.isBodyPalace ? ' · 身宮' : ''}</h3>
      <p>大限：{period?.range.join('–')} 歲 · {period?.stage}<br />小限（虛歲）：{period?.ages.join('、')}<br />博士：{period?.boshi} · 歲前：{period?.suiqian} · 將前：{period?.jiangqian}</p>
      <p className={styles.stars}>{palace.majorStarDetails.length ? palace.majorStarDetails.map(star => `${star.name}${star.brightness ? `（${star.brightness}）` : ''}${star.mutagen ? ` · 化${star.mutagen}` : ''}`).join('、') : '無十四主星（空宮）'}</p>
      <p>輔星與雜曜：{palace.minorStars.map(star => `${star.name}${star.brightness ? `（${star.brightness}）` : ''}${star.mutagen ? ` · 化${star.mutagen}` : ''}`).join('、') || '無'}</p>
    </section>
    <div className={styles.printLegend}><span>命宮：實線框 · 身宮：虛線框</span><span>四化：{['祿', '權', '科', '忌'].map(value => <b key={value} className={styles.badge} data-mutagen={value}>{value}</b>)}</span><span>亮度：廟、旺、得、利、平、不、陷；無標記表示引擎未提供。</span></div>
    <p className={styles.note}>排盤核心：{ziwei.engineVersion}。大限為引擎的虛歲區間；以所填出生日期、時辰排盤。</p>
  </>;
}
