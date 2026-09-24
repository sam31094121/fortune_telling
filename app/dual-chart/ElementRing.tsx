'use client';
import { useId } from 'react';
import styles from './dual-chart.module.css';

const elements = ['木', '火', '土', '金', '水'] as const;
const colors = ['#43836a', '#b7584d', '#ab8745', '#84718f', '#477c9b'];
const textures = ['斜線', '點紋', '方格', '橫線', '直線'];
function sectorPath(start: number, share: number) {
  const point = (radius: number, turn: number) => { const angle = turn * Math.PI * 2 - Math.PI / 2; return `${80 + radius * Math.cos(angle)} ${80 + radius * Math.sin(angle)}`; };
  const mid = start + share / 2;
  const end = start + share;
  return `M${point(74, start)} A74 74 0 0 1 ${point(74, mid)} A74 74 0 0 1 ${point(74, end)} L${point(50, end)} A50 50 0 0 0 ${point(50, mid)} A50 50 0 0 0 ${point(50, start)} Z`;
}

export default function ElementRing({ percentages, monochrome = false }: { percentages: Record<typeof elements[number], number>; monochrome?: boolean }) {
  const id = useId().replace(/:/g, '');
  const total = elements.reduce((sum, el) => sum + percentages[el], 0);
  let accumulated = 0;
  const sectors = elements.map((element, index) => {
    const share = total > 0 ? percentages[element] / total : 0;
    const start = accumulated;
    accumulated += share;
    return { element, index, share, start, pattern: `url(#${id}-texture-${index})` };
  });
  return <section className={styles.elementSummary} aria-label="五行加權比例">
    <svg className={styles.elementRingSvg} viewBox="0 0 160 160" role="img" aria-label={elements.map(el => `${el} ${percentages[el]}%`).join('、')}>
      <defs>{elements.map((el, index) => <pattern key={el} id={`${id}-texture-${index}`} patternUnits="userSpaceOnUse" width="6" height="6"><rect width="6" height="6" fill="white" />
        {index === 0 && <path d="M-1 1L1-1M0 6L6 0M5 7L7 5" stroke="#222" strokeWidth="1" />}
        {index === 1 && <circle cx="3" cy="3" r="1.15" fill="#222" />}
        {index === 2 && <path d="M0 0H6M0 0V6" stroke="#333" strokeWidth="1" />}
        {index === 3 && <path d="M0 3H6" stroke="#222" strokeWidth="1" />}
        {index === 4 && <path d="M3 0V6" stroke="#222" strokeWidth="1" />}
      </pattern>)}</defs>
      {sectors.filter(s => s.share > 0).map(s => <path key={s.element} data-element={s.element} data-percentage={percentages[s.element]} className={styles.ringSector} d={sectorPath(s.start, s.share)} fill={monochrome ? s.pattern : colors[s.index]} />)}
      {sectors.filter(s => s.share > 0).map(s => { const angle = s.start * Math.PI * 2 - Math.PI / 2; return <line key={s.element} x1={80 + 50 * Math.cos(angle)} y1={80 + 50 * Math.sin(angle)} x2={80 + 74 * Math.cos(angle)} y2={80 + 74 * Math.sin(angle)} stroke="#333" strokeWidth=".8" />; })}
      <circle cx="80" cy="80" r="74" fill="none" stroke="#444" strokeWidth=".8" /><circle cx="80" cy="80" r="50" fill="none" stroke="#444" strokeWidth=".8" />
      <text x="80" y="79" textAnchor="middle" fontSize="24" fontWeight="700" fill="currentColor">五行</text><text x="80" y="99" textAnchor="middle" fontSize="11" fill="currentColor">加權比例</text>
    </svg>
    <div className={styles.elementLegend}>{sectors.map(s => <span key={s.element}><svg viewBox="0 0 14 14" aria-hidden="true"><rect x=".5" y=".5" width="13" height="13" stroke="#555" strokeWidth="1" fill={monochrome ? s.pattern : colors[s.index]} className={styles.ringSwatch} /></svg>{s.element} {percentages[s.element]}%<small> {textures[s.index]}</small></span>)}</div>
    <p className={styles.micro}>含天干、地支、藏干與月令權重</p>
  </section>;
}
