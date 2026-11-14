/**
 * 永久強化光環（動效助手 2026-11-14，米其林：強化效果在卡面與戰鬥畫面都看得到、是動畫不是靜態圖）。
 * 純展示：只吃「永久加成」與「原始攻擊」兩個數字，不讀存檔、不改數值；卡上不放字（數值留給 aria／卡下文字）。
 * 動畫只用 transform／opacity（合成器執行，不觸發版面重排）；prefers-reduced-motion 時保留靜態金邊與光點。
 * 父層需為定位容器（position: relative／absolute）。
 */
import styles from './EnhanceAura.module.css';

export interface EnhanceInfo { bonus: number; baseAttack: number }

/** 強化階級：加成占上限（原始攻擊 50%）的比例，1＝初階、2＝中階、3＝滿階。 */
export function enhanceTier(bonus: number, baseAttack: number): 0 | 1 | 2 | 3 {
  if (!(bonus > 0)) return 0;
  const cap = Math.max(1, Math.floor(baseAttack * 0.5));
  const ratio = bonus / cap;
  return ratio >= 0.67 ? 3 : ratio >= 0.34 ? 2 : 1;
}

export default function EnhanceAura({ bonus, baseAttack, variant = 'card' }: EnhanceInfo & { variant?: 'card' | 'battle' }) {
  const tier = enhanceTier(bonus, baseAttack);
  if (!tier) return null;
  return (
    <span className={styles.aura} data-testid="enhance-aura" data-enhance-tier={tier} data-variant={variant} aria-hidden="true">
      <span className={styles.edge} />
      <span className={styles.sheen}><i /></span>
      <span className={styles.sparks}><i /><i /><i /></span>
    </span>
  );
}
