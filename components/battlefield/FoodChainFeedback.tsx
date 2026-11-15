'use client';
/**
 * 食物鏈吃卡回饋（預覽／存檔後共用）。只照印伺服端算好的數字（describeCultivationChange），不自己算加成。
 * 手機 390 優先：單欄、縮圖 64px、主數字 ≥22px；存檔後約 1.2 秒「吞噬」動畫只用 transform／opacity，
 * 減少動態時直接顯示結果。固定中文與數字分成不同元素，五語字典逐句對得上、數字不進字典。
 */
import type { CultivationFeedback } from '@/lib/beast-game/cultivation-view';
import CatalogBeastCard from './CatalogBeastCard';
import styles from './FoodChainFeedback.module.css';

function Stars({ count }: { count: number }) {
  return <span className={styles.stars} aria-label={`${count}/5`} data-fc-stars={count}>{Array.from({ length: 5 }, (_, i) => <i key={i} data-on={i < count ? 'true' : undefined}>★</i>)}</span>;
}

export default function FoodChainFeedback({ change, phase }: { change: CultivationFeedback; phase: 'preview' | 'saved' }) {
  const s = change.starsAfter, before = change.starsBefore;
  const zero = change.addedBonus === '0';
  return <section className={styles.card} data-food-chain-feedback={phase} data-layer={change.layer} data-rule={change.rule} aria-live={phase === 'saved' ? 'polite' : undefined}>
    <div className={styles.pair} data-absorbing={phase === 'saved' ? 'true' : undefined}>
      <div className={styles.thumb} data-fc-material-thumb><CatalogBeastCard id={change.materialCardId} /></div>
      <span className={styles.arrow} aria-hidden="true">➜</span>
      <div className={styles.thumb} data-fc-target-thumb><CatalogBeastCard id={change.targetCardId} />{phase === 'saved' && <b className={styles.pop} aria-hidden="true">+{change.addedBonus}</b>}</div>
    </div>
    <p className={styles.who}><strong data-fc-material>{change.materialName}</strong><span aria-hidden="true"> → </span><strong data-fc-target>{change.targetName}</strong></p>
    <p className={styles.gain} data-fc-gain={change.addedBonus}>
      <span>攻擊</span> <b>+{change.addedBonus}</b> <span className={styles.pct}>· <span>約</span> <span data-fc-percent>+{change.addedPercent.label}%</span></span>
    </p>
    <dl className={styles.compare}>
      <div data-fc-orb><dt>寶石捷連線攻擊</dt><dd><span>{change.beforeOrbAttack}</span><span aria-hidden="true"> → </span><b>{change.afterOrbAttack}</b></dd></div>
      <div data-fc-battle><dt>神獸戰鬥攻擊</dt><dd><span>{change.beforeBattleAttack}</span><span aria-hidden="true"> → </span><b>{change.afterBattleAttack}</b></dd></div>
      <div data-fc-total><dt>累計永久加成</dt><dd><span>+{change.beforeBonus}</span><span aria-hidden="true"> → </span><b>+{change.afterBonus}</b> <small>· <span>約</span> +{change.totalPercentAfter.label}%</small></dd></div>
    </dl>
    {change.inheritedBonus && change.inheritedBonus !== '0' && <p className={styles.note} data-fc-inherited={change.inheritedBonus}><span>含本體累積加成傳承</span> <b>+{change.inheritedBonus}</b></p>}
    {change.capped && <p className={styles.note} data-fc-capped><span>{zero ? '攻擊加成已達上限（卡面 50%），這次只累積星級。' : '已到攻擊加成上限（卡面 50%），這次只加到上限。'}</span></p>}
    {s && <div className={styles.starRow} data-fc-star-row>
      <span>星級</span>{before && before.stars !== s.stars ? <><Stars count={before.stars} /><span aria-hidden="true">→</span></> : null}<Stars count={s.stars} />
      {s.toNext !== null ? <span className={styles.next}><span>下一星還差</span> <b data-fc-to-next>{s.toNext}</b> <span>張</span></span> : <span className={styles.next} data-fc-maxed><span>已五星封頂</span></span>}
    </div>}
    {phase === 'preview' && <p className={styles.warn} data-fc-consume><span>確認後</span>{' '}<strong>{change.materialName}</strong>{' '}<span>會被吃掉（永久消耗）</span></p>}
  </section>;
}
