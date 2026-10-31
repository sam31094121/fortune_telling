'use client';
/** 自選 5 張出陣（同屬性可重複）。只列 .v2 卡池（playableCards ∩ card-face-stats）。不改卡圖、品質、進度、存檔。 */
import { useEffect, useMemo, useState } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import { MATCH3_ORB_ELEMENTS, MATCH3_ORB_LABEL, TEAM_SIZE, type Match3ModeId } from '@/lib/beast-game/match3';
import type { BeastElement } from '@/lib/beast-game/elements';
import Match3Board from './Match3Board';
import styles from './Match3Board.module.css';

export default function Match3Entry({ seed, mode }: { seed?: number; mode?: Match3ModeId }) {
  const pool = useMemo(() => playableCards().filter((c) => CARD_FACE_STATS[c.id]), []);
  const [teamIds, setTeamIds] = useState<string[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [tab, setTab] = useState<BeastElement | 'ALL'>('ALL');
  const [ready, setReady] = useState(false); // 先讀完網址參數再開局，避免先用預設隊伍開一局
  useEffect(() => { // 外部傳入：?team=id1,id2,...（不合法時沿用預設五元素各一）
    const q = new URLSearchParams(window.location.search).get('team');
    if (q) setTeamIds(q.split(',').filter(Boolean));
    setReady(true);
  }, []);
  if (!ready) return <section className={styles.wrap} aria-busy="true" />;
  if (!picking) return (<>
    <Match3Board seed={seed} mode={mode} teamIds={teamIds} onRepick={() => { setSel(teamIds ?? []); setPicking(true); }} />
  </>);
  const shown = pool.filter((c) => tab === 'ALL' || c.element === tab);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < TEAM_SIZE ? [...s, id] : s));
  return (
    <section className={styles.picker} data-testid="team-picker" aria-label="自選出陣">
      <p className={styles.hint}>選 {TEAM_SIZE} 張（同屬性可重複）。同屬性多張時：戰鬥中點哪張，哪張就是主攻（預設第一張），其餘當輔助拿一半能量。</p>
      <div className={styles.pickTabs}>{(['ALL', ...MATCH3_ORB_ELEMENTS] as const).map((e) => <button key={e} type="button" aria-pressed={tab === e} onClick={() => setTab(e)}>{e === 'ALL' ? '全部' : MATCH3_ORB_LABEL[e]}</button>)}</div>
      <div className={styles.pickRow} data-testid="picked-row">{sel.map((id, i) => { const c = pool.find((x) => x.id === id)!; return <button key={id} type="button" onClick={() => toggle(id)}>{i + 1}. {c.name}（{MATCH3_ORB_LABEL[c.element]}）×</button>; })}</div>
      <div className={styles.pickGrid}>{shown.map((c) => <button key={c.id} type="button" data-testid="pick-card" data-el={c.element} data-id={c.id} aria-pressed={sel.includes(c.id)} onClick={() => toggle(c.id)}>{c.name}<small>{MATCH3_ORB_LABEL[c.element]}・攻 {CARD_FACE_STATS[c.id].attack}</small></button>)}</div>
      <div className={styles.pickBar}>
        <button type="button" className={styles.again} data-testid="start-battle" disabled={sel.length !== TEAM_SIZE} onClick={() => { setTeamIds(sel); setPicking(false); }}>開戰（{sel.length}/{TEAM_SIZE}）</button>
        <button type="button" className={styles.again} onClick={() => { setTeamIds(null); setPicking(false); }}>用預設隊伍</button>
      </div>
    </section>
  );
}
