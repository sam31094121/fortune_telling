import type { CSSProperties, MouseEvent } from 'react';
import type { AsuraDisplay } from '@/lib/ghost-asura-display-contract';
import styles from './GhostAsuraCard.module.css';

export const COLUMN_ACCENTS = { year: '#fd722a', month: '#fdb303', day: '#19b5a5', hour: '#4aa8e8' };

function visit(event: MouseEvent<HTMLButtonElement>, column: string, id?: string) {
  const root = event.currentTarget.closest('[data-display-contract]');
  const group = root?.querySelector<HTMLElement>(`[data-asura-column="${column}"]`);
  const row = id ? [...(group?.querySelectorAll<HTMLElement>('[data-asura-id]') ?? [])].find(el => el.dataset.asuraId === id) : null;
  const detail = row?.querySelector<HTMLDetailsElement>('details');
  if (id && !detail) return;
  if (detail) detail.open = true;
  const target = detail?.querySelector<HTMLElement>('summary') ?? root?.querySelector<HTMLElement>(`[data-asura-pillar-head="${column}"]`);
  if (!target) return;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start', inline: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

export function PresentGuide({ display, sectionKey = 'pillars' }: { display: AsuraDisplay; sectionKey?: 'pillars' | 'verdict' }) {
  const guide = display.sections.find(section => section.key === sectionKey)?.guidance;
  const current = guide?.stage;
  const related = guide?.related ?? [];
  const period = sectionKey === 'verdict' ? '未來' : '現在';
  if (!current && !related.length) return null;
  return <nav className={styles.presentGuide} aria-label={`${period}的閱讀引導`}>
    {current && <section style={{ '--guide-accent': COLUMN_ACCENTS[current.key] } as CSSProperties}>
      <strong>先看你目前的年齡階段</strong>
      <p>下方「{current.ageText}」這一欄，對應你目前的年齡。點名稱就能看該張解說。</p>
      <button type="button" onClick={event => visit(event, current.key)}>前往{current.ageText}這一欄 ↓</button>
      <div className={styles.guideLinks}>{current.seals.map(seal => <button type="button" key={seal.id} onClick={event => visit(event, current.key, seal.id)}>{seal.name} · 查看</button>)}</div>
    </section>}
    {related.length > 0 && <section>
      <strong>「{period}」解說提到的印記</strong>
      <p>這些是解說中的對應卡片，可能分布在其他年齡欄，不用全部看完。</p>
      <div className={styles.guideLinks}>{related.map(target => <button type="button" key={`${target.columnKey}-${target.id}`} style={{ '--guide-accent': COLUMN_ACCENTS[target.columnKey] } as CSSProperties} onClick={event => visit(event, target.columnKey, target.id)}>{target.name}{sectionKey === 'verdict' ? '' : ` · ${target.ageText}`}</button>)}</div>
    </section>}
  </nav>;
}
