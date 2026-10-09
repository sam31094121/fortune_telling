/**
 * 鬼魅阿修羅｜本性卡（名牌即卡）
 *
 * 位置：卡頭橫幅之下、過去／現在／未來三格之上，原「〔本人：名字〕」名牌的位置與結構 —— 名牌本身就是這張卡。
 * 形狀：390 手機上採「橫式名牌」，收合時只佔一列（約 16:5），三格仍留在首屏。
 * 收合：第一行姓名，第二行「看見你的本性」；點開往下展開四段：本性、優勢、弱點、風險。
 * 四段內容＝後端 AsuraDisplay.nature（AsuraNatureCardPublic，零術語）；前端零計算。
 * 沒有可追溯證據的段落（後端未給該欄）維持空位，不補字。沒填名字或後端無本性卡＝呼叫端不畫本卡（回到舊名牌）。
 */

'use client';

import { useId, useState } from 'react';
import styles from './GhostAsuraCard.module.css';

/** 翻譯桶（本卡固定字，零術語） */
export const NATURE_SHELL_UI = {
  self: '本人',
  guest: '親友',
  hint: '看見你的本性',
  essence: '本性',
  strength: '優勢',
  weakness: '弱點',
  risk: '風險',
  open: '展開本性、優勢、弱點、風險',
  close: '收合本性、優勢、弱點、風險',
} as const;

/** 四段順序固定：本性 → 優勢 → 弱點 → 風險（金二段、朱二段） */
const NATURE_SLOTS = [
  { key: 'essence', tone: 'gold' },
  { key: 'strength', tone: 'gold' },
  { key: 'weakness', tone: 'ember' },
  { key: 'risk', tone: 'ember' },
] as const;

export function AsuraNatureCard({
  name,
  identityTarget,
  nature,
}: {
  name?: string | null;
  identityTarget?: 'self' | 'guest' | null;
  /** 後端公開欄位（零術語）；缺的段落留空位 */
  nature?: { essence?: string | null; strength?: string | null; weakness?: string | null; risk?: string | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const who = identityTarget === 'guest' ? NATURE_SHELL_UI.guest : NATURE_SHELL_UI.self;
  const title = name && name.trim() ? name.trim() : who;
  return (
    <section className={open ? `${styles.natureCard} ${styles.natureCardOpen}` : styles.natureCard} data-asura-nature-card data-asura-target-badge aria-label={`${who}${title === who ? '' : `：${title}`}`}>
      <button
        type="button"
        className={styles.natureHead}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? NATURE_SHELL_UI.close : NATURE_SHELL_UI.open}
        onClick={() => setOpen((v) => !v)}
        data-asura-nature-toggle
      >
        <span className={styles.natureSeal} aria-hidden="true">
          {who.split('').map((ch) => <span key={ch}>{ch}</span>)}
        </span>
        <span className={styles.natureNameBlock}>
          <strong className={styles.natureName}>{title}</strong>
          <span className={styles.natureLegend}>
            <i className={styles.natureDot} aria-hidden="true" />
            <span>{NATURE_SHELL_UI.hint}</span>
          </span>
        </span>
        <span className={styles.natureChevron} aria-hidden="true" />
      </button>
      <div id={panelId} className={styles.naturePanel} role="region" aria-label={NATURE_SHELL_UI.hint} hidden={!open}>
        {NATURE_SLOTS.map((slot) => {
          const text = nature?.[slot.key] ?? null;
          return (
            <div key={slot.key} className={`${styles.natureSlot} ${slot.tone === 'ember' ? styles.natureSlotRisk : ''}`} data-asura-nature-slot={slot.key}>
              <span className={styles.natureSlotLabel}>{NATURE_SHELL_UI[slot.key]}</span>
              {text ? <p className={styles.natureSlotText}>{text}</p> : <span className={styles.natureSlotEmpty} aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
