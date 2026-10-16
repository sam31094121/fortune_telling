import type { DualChartResult } from '@/lib/dual-chart';
import styles from './dual-chart.module.css';

/** Owner-authorized local-method reference display; source status and shared gates stay unchanged. */
export default function BaziElementReading({ chart, core, tianYun, zodiac }: { chart: DualChartResult['bazi']['professionalChart']; core: DualChartResult['core']; tianYun?: DualChartResult['tianYun']; zodiac?: string }) {
  const ready = chart.traditionalInterpretationGate?.coreReady === true;
  const value = (input: unknown) => ready && typeof input === 'string' && input.trim() && !['UNKNOWN', 'NOT_CALCULATED'].includes(input)
    ? input : '';
  return <dl className={`${styles.summaryGrid} ${styles.elementReading}`} aria-label="五行與命盤摘要">
    {[
      ['日主', `${core.dayMaster.stem}${core.dayMaster.element}（${core.dayMaster.yinYang}）`],
      ['強弱', value(chart.strengthAnalysis?.verdict)],
      ['喜用神', [value(chart.gods?.joyGod), value(chart.gods?.usefulGod)].filter(Boolean).join('、')],
      ['忌神', value(chart.gods?.avoidGod)],
      ['格局', value(chart.structurePattern?.primaryPattern)],
      ['天運五行', ready && tianYun?.element && ['金', '木', '水', '火', '土'].includes(tianYun.element) ? tianYun.element : ''],
      ['星座', ready ? zodiac ?? '' : ''],
      ['命宮', core.mingGong], ['身宮', core.shenGong],
      ['胎元', core.taiYuan], ['胎息', core.taiXi],
      ['年空', core.kongWang.yearXunKong], ['日空', core.kongWang.dayXunKong],
    ].filter(([, input]) => Boolean(input))
      // 版面整齊：整格字數少的排上面、最多的排最下面；字數相同維持原順序（Array.sort 為穩定排序）
      .sort((x, y) => (x[0].length + String(x[1]).length) - (y[0].length + String(y[1]).length))
      .map(([label, input]) => <div key={label} data-reading={['強弱', '喜用神', '忌神', '格局', '天運五行', '星座'].includes(label) || undefined}><dt>{label}</dt><dd>{input}</dd></div>)}
  </dl>;
}
