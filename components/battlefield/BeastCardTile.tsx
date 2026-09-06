'use client';

/**
 * 神獸卡片框架
 * ============================================================================
 *
 * 業主定調：「把卡片的主軸卡片顯示出來就好，剩下的說明都把它折起來，
 * 客戶需要看的時候再點閱……簡單、簡潔、有力，乾淨俐落，
 * 每一張卡片都一樣，用這種高規格、科技感。」
 *
 * 【一個元件，六十張長得一樣】
 *
 * 尺寸、比例、圓角、邊框、名字位置都在這裡決定。
 * 任何地方要顯示神獸卡就用它，不另外排一套版——
 * 「每一張都一樣」靠的是只有一份實作，不是靠每次都記得對齊。
 *
 * 【格子裡只有卡面與名字】
 *
 * 元素、階級、角色、技能、數值全部收進底部詳情。
 * 原本每格底下掛四段小字，六十格排下來是一面字牆，卡面被擠成配角。
 * 想知道的人點一下就有；不想知道的人不必先讀完才看得到圖。
 */

import { useEffect } from 'react';
import styles from './BeastCardTile.module.css';
// 正統比例與圖窗的唯一來源。這裡不重新定義，只疊手感與狀態。
import frame from '@/components/BeastCardFrame.module.css';

export interface BeastTileCard {
  id: string;
  name: string;
  thumbnail: string;
  element: string;
  /** 以下都是「折起來」的內容，格子上不顯示。 */
  role?: string;
  tier?: string;
  skillName?: string;
  description?: string;
  passive?: string;
  story?: string;
  stats?: { hp: number; attack: number; defense: number; speed: number };
}

const ELEMENT_COLOR: Record<string, string> = {
  SPACE: '#e2e8f0', AIR: '#6ee7b7', WATER: '#7dd3fc', FIRE: '#fda4af', EARTH: '#fcd34d',
};
const ELEMENT_LABEL: Record<string, string> = {
  SPACE: '空', AIR: '風', WATER: '水', FIRE: '火', EARTH: '地',
};

/** 一格卡片。只有卡面、名字、一枚元素色點。 */
export function BeastCardTile({
  card, selected, owned, onOpen,
}: {
  card: BeastTileCard;
  selected?: boolean;
  owned?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={[styles.tile, selected ? styles.selected : ''].filter(Boolean).join(' ')}
      onClick={onOpen}
      aria-label={`${card.name}，${ELEMENT_LABEL[card.element] ?? card.element}${selected ? '，已選取' : ''}`}
      aria-pressed={selected}
    >
      {/*
        卡身用正統卡框（63 × 88，撲克牌形）。比例、圖窗、名字條都來自
        BeastCardFrame——那是被 test:beast-card-spec 鎖住的唯一來源。
        這裡只多一層手感：厚度、投影、按下去的回饋。
      */}
      <span className={`${frame.card} ${styles.body}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={frame.art} src={card.thumbnail} alt="" loading="lazy" decoding="async" />
        <span className={styles.dot} style={{ color: ELEMENT_COLOR[card.element] ?? '#94a3b8' }} aria-hidden="true" />
        {owned && <span className={styles.owned}>藏</span>}
        {/* 名字條高度固定，六十張並排時底部一定對齊。 */}
        <span className={`${frame.nameBar} ${styles.name}`} style={{ display: 'block' }}>{card.name}</span>
      </span>
    </button>
  );
}

/**
 * 底部詳情。
 *
 * 從下方升起，蓋住一部分畫面但不整頁跳走——客戶還看得到自己剛才在哪裡。
 * Esc 與點背景都能關；手機沒有 Esc，所以背景一定要能點。
 */
export function CardDetailSheet({
  card, owned, note, actionLabel, onAction, onClose,
}: {
  card: BeastTileCard;
  owned?: boolean;
  /** 額外一行狀態，例如成長進度。沒有就不顯示。 */
  note?: string;
  /** 主要動作，例如「選入隊伍」。沒有就只顯示關閉。 */
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <button type="button" className={styles.backdrop} aria-label="關閉卡片詳情" onClick={onClose} />
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={`${card.name} 詳細資料`} data-card-sheet>
        <div className={styles.sheetHead}>
          <div className={`${styles.sheetArt} ${frame.card}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={frame.art} src={card.thumbnail} alt="" />
          </div>
          <div className={styles.sheetTitle}>
            <strong>{card.name}</strong>
            <span>
              {ELEMENT_LABEL[card.element] ?? card.element}
              {card.tier ? ` · ${card.tier} 階` : ''}
              {card.role ? ` · ${card.role}` : ''}
              {owned ? ' · 已收藏' : ''}
            </span>
          </div>
        </div>

        {note && <p className={styles.block}><strong>狀態</strong>{note}</p>}

        {card.stats && (
          <div className={styles.stats}>
            {([['生命', card.stats.hp], ['攻擊', card.stats.attack], ['防禦', card.stats.defense], ['速度', card.stats.speed]] as const).map(
              ([label, value]) => (
                <div key={label} className={styles.stat}>
                  <span className={styles.statValue}>{value}</span>
                  <span className={styles.statLabel}>{label}</span>
                </div>
              ),
            )}
          </div>
        )}

        {card.skillName && (
          <p className={styles.block}>
            <strong>技能</strong>
            {card.skillName}：{card.description}
          </p>
        )}
        {card.passive && (
          <p className={styles.block}><strong>被動</strong>{card.passive}</p>
        )}
        {card.story && (
          <p className={styles.block}><strong>來歷</strong>{card.story}</p>
        )}

        {actionLabel && onAction && (
          <button
            type="button"
            className={styles.close}
            style={{ background: '#ffdfa4', color: '#302113', borderColor: 'transparent' }}
            onClick={() => { onAction(); onClose(); }}
          >
            {actionLabel}
          </button>
        )}
        <button type="button" className={styles.close} onClick={onClose}>關閉</button>
      </section>
    </>
  );
}

export default BeastCardTile;
