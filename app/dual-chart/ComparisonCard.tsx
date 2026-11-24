'use client';

import type { DualChartResult } from '@/lib/dual-chart';
import styles from './dual-chart.module.css';

const TEN_GODS = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印'];

function ElementBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={styles.elementBar}>
      <label>{label}</label>
      <div className={styles.barContainer}>
        <div className={styles.barFill} style={{ width: `${percent}%` }} data-element={label}></div>
      </div>
      <span className={styles.barValue}>{value}%</span>
    </div>
  );
}

// 五行分佈對比：數字全部由後端 elementComparison 算好，這裡只照印；沒有就顯示「暫時無法取得」。
function ElementComparison({ result }: { result: DualChartResult }) {
  const cmp = result.elementComparison;
  const bazi = cmp?.bazi;
  const ziwei = cmp?.ziwei;
  const elements = cmp?.elements ?? [];
  const max = bazi?.state === 'READY' ? Math.max(...elements.map(e => bazi.percentages[e] ?? 0), 1) : 1;

  return (
    <div className={styles.comparisonSection}>
      <h4>五行分佈對比</h4>
      <div className={styles.elementComparison}>
        <div className={styles.elementColumn}>
          <h5>八字</h5>
          {bazi?.state === 'READY'
            ? elements.map(elem => <ElementBar key={`bazi-${elem}`} label={elem} value={bazi.percentages[elem] ?? 0} max={max} />)
            : <p className={styles.micro}>暫時無法取得</p>}
          {bazi?.state === 'READY' && <p className={styles.micro}>{bazi.basis}</p>}
        </div>
        <div className={styles.elementColumn}>
          <h5>紫微</h5>
          {ziwei?.state === 'READY'
            ? <><p className={styles.ziweiBureau}>{ziwei.bureau}・屬{ziwei.element}</p><p className={styles.micro}>{ziwei.basis}</p></>
            : <p className={styles.comparisonHint}>暫時無法取得</p>}
          <p className={styles.micro}>{ziwei?.distribution.note ?? '暫時無法取得'}</p>
        </div>
      </div>
    </div>
  );
}

function TenGodMapping({ result }: { result: DualChartResult }) {
  // ⚠️ 十神映射表：所有數據由後端計算與提供
  // 前端禁止硬編碼任何紫微宮位術語，只照印後端資料

  const guide = (result as { guide?: { tenGodMapping?: Array<{ tenGod: string; baziMeaning: string; synthesis: string }>; comparisonHint?: string } }).guide;
  const mappingData = guide?.tenGodMapping;

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
        {guide?.comparisonHint || '兩套系統搭配看，能更全面理解性格與命運的互動。'}
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
