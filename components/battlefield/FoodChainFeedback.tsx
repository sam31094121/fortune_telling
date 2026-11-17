'use client';
/**
 * 食物鏈吃卡回饋（預覽／存檔後共用）。只照印伺服端算好的數字（describeCultivationChange），不自己算加成。
 * 手機 390 優先：單欄、縮圖 64px、主數字 ≥22px；存檔後約 1.2 秒「吞噬」動畫只用 transform／opacity，
 * 減少動態時直接顯示結果。固定中文與數字分成不同元素，五語字典逐句對得上、數字不進字典。
 */
import type { CultivationFeedback } from '@/lib/beast-game/cultivation-view';
import type { CultivationBatchSummary } from '@/lib/beast-game/cultivation-batch';
/** 單張回饋或批次總結（2026-11-16 批次吃卡：count＝這一批吃了幾張，數字仍全由伺服端算）。 */
type Change = CultivationFeedback | CultivationBatchSummary;
const countOf = (change: Change) => ('count' in change ? change.count : 1);
import CatalogBeastCard from './CatalogBeastCard';
import styles from './FoodChainFeedback.module.css';

function Stars({ count }: { count: number }) {
  return <span className={styles.stars} aria-label={`${count}/5`} data-fc-stars={count}>{Array.from({ length: 5 }, (_, i) => <i key={i} data-on={i < count ? 'true' : undefined}>★</i>)}</span>;
}

export default function FoodChainFeedback({ change, phase, iconOnly = false }: { change: Change; phase: 'preview' | 'saved'; iconOnly?: boolean }) {
  const s = change.starsAfter, before = change.starsBefore;
  const zero = change.addedBonus === '0';
  if (iconOnly) return <IconFeedback change={change} phase={phase} />;
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

/**
 * 純圖示版（神獸戰鬥）：卡圖 → 卡圖、大字「+X%」、💎／⚔ 攻擊前後數字、五顆星、還差幾張；
 * 不顯示說明文字，完整句子放讀屏專用的 aria 描述。
 */
function IconFeedback({ change, phase }: { change: Change; phase: 'preview' | 'saved' }) {
  const s = change.starsAfter, before = change.starsBefore, up = Boolean(s && before && s.stars > before.stars), count = countOf(change);
  const spoken = `${change.materialName}${count > 1 ? ` × ${count} 張` : ''} → ${change.targetName}：攻擊 +${change.addedBonus}（約 +${change.addedPercent.label}%），寶石捷連線攻擊 ${change.beforeOrbAttack} → ${change.afterOrbAttack}，神獸戰鬥攻擊 ${change.beforeBattleAttack} → ${change.afterBattleAttack}`
    + (change.inheritedBonus && change.inheritedBonus !== '0' ? `，含本體累積加成傳承 +${change.inheritedBonus}` : '')
    + (change.capped ? '，已到攻擊加成上限' : '')
    + (s ? `，${s.stars} 星${s.toNext === null ? '，已五星封頂' : `，下一星還差 ${s.toNext} 張`}` : '')
    + (phase === 'preview' ? `。確認後${count > 1 ? `這 ${count} 張材料` : change.materialName}會被吃掉（永久消耗）` : '。合體已保存');
  return <section className={`${styles.card} ${styles.iconCard}`} data-food-chain-feedback={phase} data-icon-only data-count={count} data-layer={change.layer} data-rule={change.rule} role={phase === 'saved' ? 'status' : undefined} aria-label={spoken}>
    <div className={styles.pair} data-absorbing={phase === 'saved' ? 'true' : undefined} aria-hidden="true">
      <div className={styles.thumb} data-fc-material-thumb><CatalogBeastCard id={change.materialCardId} />{phase === 'preview' && <span className={styles.eatMark}>🍴</span>}{count > 1 && <b className={styles.countMark} data-fc-count={count}>×{count}</b>}</div>
      <span className={styles.arrow}>➜</span>
      <div className={styles.thumb} data-fc-target-thumb><CatalogBeastCard id={change.targetCardId} />{phase === 'saved' && <b className={styles.pop}>+{change.addedPercent.label}%</b>}</div>
    </div>
    <p className={styles.bigGain} aria-hidden="true" data-fc-gain={change.addedBonus}><b data-fc-percent>+{change.addedPercent.label}%</b>{change.capped && <span className={styles.capIcon}>🔒</span>}{change.inheritedBonus && change.inheritedBonus !== '0' && <span className={styles.inheritIcon} data-fc-inherited={change.inheritedBonus}>⬆+{change.inheritedBonus}</span>}</p>
    <div className={styles.iconCompare} aria-hidden="true">
      <span data-fc-orb><i>💎</i>{change.beforeOrbAttack}<em>→</em><b>{change.afterOrbAttack}</b></span>
      <span data-fc-battle><i>⚔</i>{change.beforeBattleAttack}<em>→</em><b>{change.afterBattleAttack}</b></span>
    </div>
    {s && <div className={styles.starRow} data-fc-star-row aria-hidden="true">
      <Stars count={s.stars} />{up && <span className={styles.starUp}>↑</span>}
      {s.toNext !== null ? <span className={styles.next} data-fc-to-next-wrap><i>🃏</i><b data-fc-to-next>{s.toNext}</b></span> : <span className={styles.next} data-fc-maxed>✓</span>}
    </div>}
  </section>;
}
