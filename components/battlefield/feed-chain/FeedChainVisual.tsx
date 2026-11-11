/**
 * 餵食／合體鏈 P0 視覺元件（動效助手，DESIGN v2-2／v2-5）。
 * 純展示：只吃 props，不讀存檔／localStorage／store；卡上不放字，狀態寫在 aria-label。
 * - FeedStateIcon：鎖定（圓形＋鎖頭）／已用・寶珠端（方角＋圓珠）／已用・神獸端（方角＋爪印）
 * - FeedCountBadge：×N（疊卡）或 N（分頁、組標題）
 * - FeedCardStack：重複卡疊成一張＋×N；已用時卡圖去色
 * - MansionGroupHeader：四象收合組標題（圖示＋可用張數，無文字）
 */
import type { ReactNode } from 'react';
import styles from './FeedChainVisual.module.css';

export type FeedState = 'available' | 'locked' | 'used-orb' | 'used-beast';
export type Mansion = 'qinglong' | 'xuanwu' | 'baihu' | 'zhuque';

export const FEED_STATE_LABEL: Record<Exclude<FeedState, 'available'>, string> = {
  locked: '鎖定，前五主力',
  'used-orb': '已被寶珠合體使用',
  'used-beast': '已被神獸戰鬥使用',
};
export const MANSION_LABEL: Record<Mansion, string> = { qinglong: '青龍', xuanwu: '玄武', baihu: '白虎', zhuque: '朱雀' };

const GLYPH: Record<Exclude<FeedState, 'available'>, ReactNode> = {
  locked: <><path d="M3.4 5.2V3.9a1.6 1.6 0 0 1 3.2 0v1.3" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="2.2" y="5" width="5.6" height="4.2" rx=".9" fill="currentColor" /></>,
  'used-orb': <><circle cx="5" cy="5" r="3.7" fill="none" stroke="currentColor" strokeWidth="1.2" /><circle cx="5" cy="5" r="2" fill="currentColor" /><circle cx="4.1" cy="4.1" r=".6" fill="#14121a" /></>,
  'used-beast': <><ellipse cx="5" cy="6.7" rx="2.2" ry="1.8" fill="currentColor" /><circle cx="1.9" cy="4.3" r=".95" fill="currentColor" /><circle cx="3.8" cy="2.5" r=".95" fill="currentColor" /><circle cx="6.2" cy="2.5" r=".95" fill="currentColor" /><circle cx="8.1" cy="4.3" r=".95" fill="currentColor" /></>,
};

/** 狀態圖示（14px）。placement：放在卡上時的角落；省略＝行內（由呼叫端定位）。 */
export function FeedStateIcon({ state, placement, label }: { state: Exclude<FeedState, 'available'>; placement?: 'card'; label?: string }) {
  const pos = placement === 'card' ? (state === 'locked' ? styles.atTopLeft : styles.atBottomLeft) : '';
  return <span className={`${styles.badge} ${pos}`} data-feed-state={state} data-shape={state === 'locked' ? 'disc' : 'tile'} role="img" aria-label={label ?? FEED_STATE_LABEL[state]}
    style={placement ? undefined : { position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}><svg viewBox="0 0 10 10" aria-hidden="true">{GLYPH[state]}</svg></span>;
}

/** 數字徽章：times＝顯示「×」（疊卡用）。count 只放可用張數。label=""＝裝飾用（由外層 aria-label 說明，例如組標題）。 */
export function FeedCountBadge({ count, times = false, placement, label }: { count: number; times?: boolean; placement?: 'card'; label?: string }) {
  const n = Math.max(0, Math.floor(count));
  const decorative = label === '';
  return <span className={`${styles.count} ${placement === 'card' ? styles.countOnCard : ''}`} data-zero={n === 0} role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label ?? `可用 ${n} 張`}>
    {times && <span className={styles.times} aria-hidden="true">×</span>}<span aria-hidden="true">{n}</span></span>;
}

/**
 * 疊卡：把同一張卡的重複份數收成一張。children＝原本的卡面（例如 BeastCardFace），本元件不改它。
 * available＝可用張數（×N 只算可用）；state＝這疊卡的狀態。available<=1 且非已用時不顯示 ×N。
 */
export function FeedCardStack({ children, available, state = 'available', label }: { children: ReactNode; available: number; state?: FeedState; label?: string }) {
  const n = Math.max(0, Math.floor(available)); const depth = Math.min(2, Math.max(0, n - 1));
  const used = state === 'used-orb' || state === 'used-beast';
  return <span className={styles.stack} data-depth={depth} data-feed-state={state} data-feed-available={n} role={label ? 'group' : undefined} aria-label={label}>
    {depth >= 2 && <span className={styles.layer} data-depth="2" aria-hidden="true" />}
    {depth >= 1 && <span className={styles.layer} data-depth="1" aria-hidden="true" />}
    <span className={styles.stackFace}>{children}</span>
    {state !== 'available' && <FeedStateIcon state={state} placement="card" />}
    {!used && n >= 2 && <FeedCountBadge count={n} times placement="card" />}
  </span>;
}

const EMBLEM: Record<Mansion, ReactNode> = {
  // 青龍：兩道雲紋＋角
  qinglong: <><path d="M3 10c2.5-3 5.5-3 8 0s5.5 3 8 0" /><path d="M5 16c2.5-3 5.5-3 8 0s5.5 3 8 0" /><path d="M17 7.5l2.5-3.5M14.5 7l.8-4" /></>,
  // 白虎：圓臉＋額前虎紋（三橫一豎）＋兩耳
  baihu: <><circle cx="12" cy="13" r="8" /><path d="M6.2 7.4L5 3.8l3.6 1.5M17.8 7.4L19 3.8l-3.6 1.5" /><path d="M9 10h6M8.5 13h7M9 16h6M12 10v6" /></>,
  // 朱雀：火羽
  zhuque: <><path d="M12 3c3.2 4 6 7 6 11a6 6 0 0 1-12 0c0-4 2.8-7 6-11z" /><path d="M12 9.5c1.6 2 2.6 3.4 2.6 5a2.6 2.6 0 0 1-5.2 0c0-1.6 1-3 2.6-5z" /></>,
  // 玄武：龜甲六角＋蛇尾
  xuanwu: <><path d="M12 4l6.5 3.75v7.5L12 19l-6.5-3.75v-7.5z" /><path d="M12 8.5l3 1.75v3.5L12 15.5l-3-1.75v-3.5z" /><path d="M18.5 15.25c2 .8 2.5 2.8 1 4.2" /></>,
};

/** 四象收合組標題：button，只有圖示＋可用張數＋箭頭；名稱與張數在 aria-label。 */
export function MansionGroupHeader({ mansion, available, expanded, onToggle, controlsId }: { mansion: Mansion; available: number; expanded: boolean; onToggle?: () => void; controlsId?: string }) {
  const n = Math.max(0, Math.floor(available));
  return <button type="button" className={styles.group} data-mansion={mansion} aria-expanded={expanded} aria-controls={controlsId} onClick={onToggle}
    aria-label={`${MANSION_LABEL[mansion]}組，可用 ${n} 張，${expanded ? '已展開' : '已收合'}`}>
    <svg className={styles.emblem} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{EMBLEM[mansion]}</svg>
    <FeedCountBadge count={n} label="" />
    <svg className={styles.chevron} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 5.5L7 9l3.5-3.5" /></svg>
  </button>;
}
