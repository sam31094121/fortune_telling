'use client';
/**
 * 食物鏈五星（英雄名錄樣式）：卡面「下方」一列五顆小星，已達成亮、未達成灰；星下顯示「約 +X%」與下一星還差幾張。
 * 只照印伺服端共同卡庫檢視（cultivationView）算好的欄位；不改卡圖、不改卡框（放在卡面元件外面）。
 * 只用在神獸戰鬥與寶石捷連線的共同卡庫畫面。
 */
import styles from './CardStarBar.module.css';

export interface CardStarInfo { stars: number; toNext: number | null; fed: number }

export default function CardStarBar({ stars, percent, atCap, iconOnly = false }: { stars?: CardStarInfo | null; percent?: string; atCap?: boolean; iconOnly?: boolean }) {
  if (!stars) return null;
  // 純圖示（神獸戰鬥）：五顆星＋「+X%」＋「🃏N」（還差幾張）；封頂顯示 ✓、加成滿顯示 🔒。讀屏內容由外層按鈕的 aria-label 提供。
  if (iconOnly) return <span className={styles.bar} data-card-stars={stars.stars} data-card-fed={stars.fed} aria-hidden="true">
    <span className={styles.row}>{Array.from({ length: 5 }, (_, i) => <i key={i} data-on={i < stars.stars ? 'true' : undefined}>★</i>)}</span>
    <span className={styles.iconLine}>{percent !== undefined && percent !== '0' && <b className={styles.power}>+{percent}%</b>}{atCap && <span>🔒</span>}<span className={styles.next}>{stars.toNext === null ? '✓' : <>🃏<b>{stars.toNext}</b></>}</span></span>
  </span>;
  return <span className={styles.bar} data-card-stars={stars.stars} data-card-fed={stars.fed}>
    <span className={styles.row} role="img" aria-label={`★ ${stars.stars}/5`}>{Array.from({ length: 5 }, (_, i) => <i key={i} data-on={i < stars.stars ? 'true' : undefined} aria-hidden="true">★</i>)}</span>
    {percent !== undefined && percent !== '0' && <span className={styles.power}><span>約</span> +{percent}%{atCap ? <> <span>攻擊加成已滿</span></> : null}</span>}
    <span className={styles.next}>{stars.toNext === null ? <span>已五星封頂</span> : <><span>下一星還差</span> <b>{stars.toNext}</b> <span>張</span></>}</span>
  </span>;
}
