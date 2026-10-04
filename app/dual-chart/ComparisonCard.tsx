'use client';

import type { DualChartResult } from '@/lib/dual-chart';
import styles from './dual-chart.module.css';

const ELEMENTS = ['金', '木', '水', '火', '土'];
const TEN_GODS = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印'];

function getElementCount(stem: string, branch: string): Record<string, number> {
  const count: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };

  // 簡化版：根據天干地支五行分類
  const stemElements: Record<string, string> = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火',
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水'
  };

  const branchElements: Record<string, string> = {
    '子': '水', '丑': '土',
    '寅': '木', '卯': '木',
    '辰': '土', '巳': '火',
    '午': '火', '未': '土',
    '申': '金', '酉': '金',
    '戌': '土', '亥': '水'
  };

  if (stemElements[stem]) count[stemElements[stem]]++;
  if (branchElements[branch]) count[branchElements[branch]]++;

  return count;
}

function ElementBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={styles.elementBar}>
      <label>{label}</label>
      <div className={styles.barContainer}>
        <div className={styles.barFill} style={{ width: `${percent}%` }} data-element={label}></div>
      </div>
      <span className={styles.barValue}>{value}</span>
    </div>
  );
}

function ElementComparison({ result }: { result: DualChartResult }) {
  // 計算八字五行
  const baziElements: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };

  // 簡化版：直接計算天干地支（實際應調用排盤引擎）
  try {
    const pc = result.bazi.professionalChart;
    const order = ['hour', 'day', 'month', 'year'] as const;
    order.forEach(key => {
      const ganzhi = pc.pillarDetails[key].ganzhi;
      if (ganzhi) {
        const elem = getElementCount(ganzhi[0], ganzhi[1]);
        Object.entries(elem).forEach(([k, v]) => baziElements[k] = (baziElements[k] || 0) + v);
      }
    });
  } catch {
    // fallback
  }

  // 紫微五行（簡化版：根據命宮主星）
  const ziweiElements: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  // 實際應根據紫微排盤的主星五行計算

  const maxValue = Math.max(
    Object.values(baziElements).reduce((a, b) => a + b, 0),
    Object.values(ziweiElements).reduce((a, b) => a + b, 0) || 2
  );

  return (
    <div className={styles.comparisonSection}>
      <h4>五行分佈對比</h4>
      <div className={styles.elementComparison}>
        <div className={styles.elementColumn}>
          <h5>八字</h5>
          {ELEMENTS.map(elem => (
            <ElementBar key={`bazi-${elem}`} label={elem} value={baziElements[elem] || 0} max={maxValue} />
          ))}
        </div>
        <div className={styles.elementColumn}>
          <h5>紫微</h5>
          {ELEMENTS.map(elem => (
            <ElementBar key={`ziwei-${elem}`} label={elem} value={ziweiElements[elem] || 0} max={maxValue} />
          ))}
        </div>
      </div>
      <p className={styles.comparisonHint}>
        金木水火土分佈越平衡，五行生剋越流暢。缺項用神可透過取名或生活調整補強。
      </p>
    </div>
  );
}

function TenGodMapping({ result }: { result: DualChartResult }) {
  // ⚠️ 十神映射表：所有數據由後端計算與提供
  // 前端禁止硬編碼任何紫微宮位術語，只照印後端資料

  const mappingData = result.guide?.tenGodMapping;

  if (!mappingData || !Array.isArray(mappingData)) {
    return null;
  }

  return (
    <div className={styles.comparisonSection}>
      <h4>十神 ↔️ 綜合對應</h4>
      <table className={styles.mappingTable}>
        <thead>
          <tr>
            <th>十神</th>
            <th>八字含義</th>
            <th>綜合解讀</th>
          </tr>
        </thead>
        <tbody>
          {mappingData.map((row: any, idx: number) => (
            <tr key={idx}>
              <td><strong>{row.tenGod}</strong></td>
              <td>{row.baziMeaning}</td>
              <td>{row.synthesis}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.comparisonHint}>
        {result.guide?.comparisonHint || '兩套系統搭配看，能更全面理解性格與命運的互動。'}
      </p>
    </div>
  );
}

function ShenShaExtended({ result }: { result: DualChartResult }) {
  const card = result.specialStars?.card;
  if (!card) return null;
  const hasHits = card.columns?.some((col: any) => col.hits?.length > 0) ?? false;
  if (!hasHits) return null;

  const teacherComments: Record<string, string> = {
    '天德': '天德是「不小心就走對運」的感覺。你做的決定往往無意中躲過災難，或在關鍵時刻得到貴人幫助。',
    '月德': '月德代表「日常小幸運」。月德月份出生的人，生活中的麻煩事往往能化解，平時感覺很順利。',
    '桃花': '桃花有兩面：吸引力與人緣，也可能是感情擾擾。八字桃花旺代表異性緣好，但要留意是否因此分心。',
    '隔角': '隔角代表「跳躍」。時柱隔角代表你下班時常有機運，做副業或兼職特別順。',
    '驛馬': '驛馬是「動」的象徵。年柱驛馬代表祖業難守，需要自己打拚；月日時驛馬代表工作多變，常需出差或轉換跑道。',
  };

  const hits = card.columns.flatMap(col => col.hits.map(hit => ({ ...hit, pillar: col.label })));

  return (
    <div className={styles.comparisonSection}>
      <h4>特星神煞延伸</h4>
      {hits.length > 0 ? (
        <ul className={styles.shenshaExtendedList}>
          {hits.slice(0, 5).map(hit => (
            <li key={`${hit.pillar}-${hit.name}`} data-shensha-tone={hit.tone}>
              <div className={styles.shenshaItemHead}>
                <b>{hit.name}</b>
                <span>{hit.pillar}</span>
                {hit.tone && <em>{hit.tone}</em>}
              </div>
              <p className={styles.shenshaComment}>
                {teacherComments[hit.name] || `${hit.name}的傳統解法是「${hit.rule}」。在你的命盤上，這代表${hit.pillar}柱的能量特徵。`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.comparisonHint}>暫無命中特星神煞。</p>
      )}
    </div>
  );
}

export default function ComparisonCard({ result }: { result: DualChartResult }) {
  return (
    <div className={styles.comparisonCard}>
      <header className={styles.comparisonHeader}>
        <h3>對比分析</h3>
        <p className={styles.comparisonSubtitle}>八字 × 紫微 的五行、十神、神煞交叉洞察</p>
      </header>

      <ElementComparison result={result} />
      <TenGodMapping result={result} />
      <ShenShaExtended result={result} />

      <footer className={styles.comparisonFooter}>
        <p>💡 <strong>使用提示</strong>：五行不平衡時，優先補八字用神；十神對應幫助你理解內在動力與外在舞台的互動；神煞延伸則給你生活應用的具體方向。</p>
      </footer>
    </div>
  );
}
