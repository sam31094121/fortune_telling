'use client';
import Link from 'next/link';
/** 自選 5 張出陣（同屬性可重複）。只列 .v2 卡池（playableCards ∩ card-face-stats）。不改卡圖與品質；困難版以遊玩身分隔離闖關進度。 */
import { useEffect, useMemo, useState } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import { getSkill } from '@/cards/skills';
import { MATCH3_ORB_ELEMENTS, MATCH3_ORB_LABEL, TEAM_SIZE, validTeamIds, type Match3ModeId } from '@/lib/beast-game/match3';
import type { BeastElement } from '@/lib/beast-game/elements';
import Match3Board from './Match3Board';
import { BeastCardFace } from './BeastCardTile';
import styles from './Match3Board.module.css';
import pickerStyles from './Match3TeamPicker.module.css';
import { readMatch3Progress, saveMatch3Progress, resetGuestMatch3Progress } from '@/lib/beast-game/match3/progress-store';

/** 卡面技能直接來自該卡登錄的第一項技能；不依賴選卡頁不存在的手冊 Provider。 */
function pickerFace(c: ReturnType<typeof playableCards>[number]) {
  const skill = getSkill(c.skills[0]);
  return { id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, skillName: skill?.name, description: skill?.description };
}

export default function Match3Entry({ seed, mode }: { seed?: number; mode?: Match3ModeId }) {
  const pool = useMemo(() => playableCards().filter((c) => CARD_FACE_STATS[c.id]), []);
  const [teamIds, setTeamIds] = useState<string[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [tab, setTab] = useState<BeastElement | 'ALL'>('ALL');
  const [ready, setReady] = useState(false); // 先讀完網址參數再開局，避免先用預設隊伍開一局
  const [player, setPlayer] = useState<'self' | 'guest' | null>(null);
  const [hasLegacyProgress, setHasLegacyProgress] = useState(false);
  const [legacySaveFailed, setLegacySaveFailed] = useState(false);
  const showCardFaces = mode === 'hard45' || mode === 'hard45b';
  useEffect(() => { // 外部傳入：?team=id1,id2,...（不合法時沿用預設五元素各一）
    const q = new URLSearchParams(window.location.search).get('team');
    const ids = q?.split(',').filter(Boolean);
    setTeamIds(validTeamIds(ids, pool.map(c => c.id)) ? ids : null);
    setHasLegacyProgress(showCardFaces && readMatch3Progress(null) > 0);
    setReady(true);
  }, [pool, showCardFaces]);
  if (!ready) return <section className={styles.wrap} aria-busy="true" />;
  if (showCardFaces && !player) return (
    <section className={styles.picker} data-testid="match3-player-choice" aria-label="選擇遊玩身分">
      <Link href="/" className={styles.homeLink} data-testid="match3-home">回到首頁</Link>
      <h1>寶珠戰</h1>
      <div className={pickerStyles.playerChoices}>
        <button type="button" data-testid="play-self" onClick={() => setPlayer('self')}>
          <strong>我自己</strong><span>開始或接續自己的闖關進度</span>
        </button>
        <button type="button" data-testid="play-guest" onClick={() => { resetGuestMatch3Progress(); setPlayer('guest'); }}>
          <strong>親朋好友</strong><span>從第一關開始，不影響我的進度</span>
        </button>
      </div>
      {hasLegacyProgress && <button type="button" className={styles.again} data-testid="resume-legacy" onClick={() => {
        if (saveMatch3Progress('self', readMatch3Progress(null))) setPlayer('self');
        else setLegacySaveFailed(true);
      }}>確認這是我的舊進度，接續闖關</button>}
      {legacySaveFailed && <p role="alert">本次進度仍保留，但瀏覽器無法長期儲存。點「我自己」可繼續。</p>}
      <p className={styles.hint}>自己的進度保存在這個瀏覽器。</p>
    </section>
  );
  if (!picking) return (<>
    <Match3Board seed={seed} mode={mode} progressOwner={player} teamIds={teamIds} onRepick={() => { setSel(teamIds ?? []); setPicking(true); }} />
  </>);
  const shown = pool.filter((c) => tab === 'ALL' || c.element === tab);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < TEAM_SIZE ? [...s, id] : s));
  return (
    <section className={styles.picker} data-testid="team-picker" aria-label="自選出陣">
      {showCardFaces && <Link href="/" className={styles.homeLink} data-testid="match3-home">回到首頁</Link>}
      {showCardFaces && <button type="button" className={styles.again} data-testid="change-player" onClick={() => setPlayer(null)}>更換玩家</button>}
      <p className={styles.hint}>選 {TEAM_SIZE} 張（同屬性可重複）。同屬性多張時：戰鬥中點哪張，哪張就是主攻（預設第一張），其餘當輔助拿一半能量。</p>
      <div className={styles.pickTabs}>{(['ALL', ...MATCH3_ORB_ELEMENTS] as const).map((e) => <button key={e} type="button" aria-pressed={tab === e} onClick={() => setTab(e)}>{e === 'ALL' ? '全部' : MATCH3_ORB_LABEL[e]}</button>)}</div>
      <div className={showCardFaces ? pickerStyles.selectedRow : styles.pickRow} data-testid="picked-row" aria-label={`已選 ${sel.length} 張，點卡可移除`}>{sel.map((id, i) => {
        const c = pool.find((x) => x.id === id)!;
        return <button key={id} type="button" className={showCardFaces ? pickerStyles.selectedCard : undefined} aria-label={`移除第 ${i + 1} 張：${c.name}`} onClick={() => toggle(id)}>
          {showCardFaces ? <><span className={pickerStyles.face}><BeastCardFace card={pickerFace(c)} /></span><span className={pickerStyles.remove}>{i + 1} · 移除</span></> : <>{i + 1}. {c.name}（{MATCH3_ORB_LABEL[c.element]}）×</>}
        </button>;
      })}</div>
      <div className={showCardFaces ? pickerStyles.cardGrid : styles.pickGrid}>{shown.map((c) => <button key={c.id} type="button" className={showCardFaces ? pickerStyles.cardChoice : undefined} data-testid="pick-card" data-el={c.element} data-id={c.id} aria-label={`${c.name}，${MATCH3_ORB_LABEL[c.element]}屬性，攻擊 ${CARD_FACE_STATS[c.id].attack}`} aria-pressed={sel.includes(c.id)} onClick={() => toggle(c.id)}>
        {showCardFaces ? <><span className={pickerStyles.face}><BeastCardFace card={pickerFace(c)} /></span><span className={pickerStyles.choiceState}>{sel.includes(c.id) ? `已選 ${sel.indexOf(c.id) + 1}` : '點選出戰'}</span></> : <>{c.name}<small>{MATCH3_ORB_LABEL[c.element]}・攻 {CARD_FACE_STATS[c.id].attack}</small></>}
      </button>)}</div>
      <div className={styles.pickBar}>
        <button type="button" className={styles.again} data-testid="start-battle" disabled={sel.length !== TEAM_SIZE} onClick={() => { setTeamIds(sel); setPicking(false); }}>開戰（{sel.length}/{TEAM_SIZE}）</button>
        <button type="button" className={styles.again} onClick={() => { setTeamIds(null); setPicking(false); }}>用預設隊伍</button>
      </div>
    </section>
  );
}
