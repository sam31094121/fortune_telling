'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { recordBeastGameCompleted } from '@/lib/growth-center-client';
import type { interactiveCatalog, Match, Action } from '@/lib/beast-game/interactive';
import { BATTLE_VENUES } from '@/lib/beast-game/venues';
import BattleArena from './battlefield/BattleArena';
import BattlePanel from './battlefield/BattlePanel';
import BattleCardGuide from './battlefield/BattleCardGuide';
import BeastCardTile, { CardDetailSheet } from './battlefield/BeastCardTile';
import styles from './BeastTurnGame.module.css';
import battleStyles from './battlefield/BattleScreen.module.css';
import venueStyles from './battlefield/BattleVenue.module.css';

type Card = ReturnType<typeof interactiveCatalog>[number];
// Account progression remains on the server; this screen reads only battle data.
type Account = { owned: string[]; match: Match | null; revision: number };
const labels: Record<string, string> = { SPACE: '空', AIR: '風', WATER: '水', FIRE: '火', EARTH: '地' };

export default function BeastTurnGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('組隊');
  const [filter, setFilter] = useState('全部');
  const [detail, setDetail] = useState<Card | null>(null);
  const [inspection, setInspection] = useState<{ cardId: string; side: 'player' | 'opponent' } | null>(null);
  const pending = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const match = account?.match;

  // Keep completion accounting invisible to the battle interface.
  useEffect(() => { if (match?.status === 'FINISHED') recordBeastGameCompleted('battlefield'); }, [match?.status]);

  async function load(signal?: AbortSignal) {
    try {
      const res = await fetch('/api/beast-game/turns', { signal: signal ?? AbortSignal.timeout(15000) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? '卡池讀取失敗');
      if (signal?.aborted) return;
      setCards(data.cards); setAccount(data.account); setError('');
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : '連線中斷，請重新載入。');
    }
  }
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); if (!disposed) setError('卡池讀取逾時，請重新載入。'); }, 15000);
    void load(controller.signal).finally(() => clearTimeout(timer));
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, []);

  async function send(type: 'START' | 'ACTION' | 'LEAVE', extra: Record<string, unknown> = {}) {
    if (!account || pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const res = await fetch('/api/beast-game/turns', {
        method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, revision: account.revision, requestId: crypto.randomUUID(), ...extra }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? '戰鬥操作未完成');
      setAccount(data.account);
      if (type !== 'ACTION') { setInspection(null); setDetail(null); setTab('組隊'); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '連線中斷，請重新載入確認戰況。');
    } finally { pending.current = false; setBusy(false); }
  }

  const errorNotice = error && <p role="alert" className={styles.error}>{error} <button type="button" disabled={busy} onClick={() => void load()}>重新載入戰況</button></p>;

  if (match) {
    const inspected = inspection ? match[inspection.side].team.find(f => f.cardId === inspection.cardId) : undefined;
    const other = inspection?.side === 'opponent' ? match.player : match.opponent;
    const inspect = (cardId: string, side: 'player' | 'opponent') => { setInspection({ cardId, side }); scroll.current?.scrollTo({ top: 0 }); };
    return <main className={battleStyles.page} data-mobile-battle>
      <div className={battleStyles.shell}>
        <header className={battleStyles.header}><h1>卡片戰鬥</h1><span>自由組隊・戰鬥／操控 50:50</span></header>
        <div className={battleStyles.split} data-battle-split>
          <BattleArena match={match} cards={cards} onInspect={inspect} />
          <section className={battleStyles.controls} aria-label="手部操控" data-battle-controls>
            <div className={battleStyles.controlsHeading}><strong>{inspection ? '能力與相剋' : match.status === 'FINISHED' ? '對戰結果' : '選擇本回合動作'}</strong><span>{busy ? '出招中…' : '自由組隊・免押卡'}</span></div>
            <div className={battleStyles.controlScroll} ref={scroll} data-control-scroll>
              {errorNotice}
              {inspection && <BattleCardGuide cardId={inspection.cardId} fighter={inspected} opponentElement={other.team[other.active].element} onClose={() => { setInspection(null); scroll.current?.scrollTo({ top: 0 }); }} />}
              <div hidden={Boolean(inspection)}>
                <BattlePanel match={match} onAction={(action: Action) => void send('ACTION', { action })} busy={busy} compact cards={cards} />
                {match.status === 'FINISHED' ? <p className={battleStyles.notice}>本場結束，持有卡片不扣除。可回到組隊更換陣容。</p> : <details className={battleStyles.details}>
                  <summary>對戰規則與離場</summary>
                  <p>切換先於攻擊；其餘按速度。同速隨機決定，最多 80 回合。擊倒對方三隻即獲勝。</p>
                  <p>本模式免押卡。空、風、水、火、地的相剋與技能效果，可點戰鬥卡查看。</p>
                  <button type="button" className={battleStyles.restart} disabled={busy} onClick={() => void send('LEAVE')}>離開本場，回到組隊（不扣卡）</button>
                </details>}
              </div>
            </div>
            {match.status === 'FINISHED' && <div className={battleStyles.footer}><button type="button" className={battleStyles.start} disabled={busy} onClick={() => void send('LEAVE')}>回到組隊，再戰一場</button></div>}
          </section>
        </div>
      </div>
    </main>;
  }

  return <main className={styles.page}>
    <header className={venueStyles.banner} data-battle-venue="cards">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BATTLE_VENUES.cards.image} alt="" aria-hidden="true" />
      <p>卡片模式・{BATTLE_VENUES.cards.name}</p><h1>神獸戰鬥・自由組隊</h1>
      <p>選三張卡，親手決定攻擊、技能與換陣。擊倒對方三隻即獲勝。</p>
      <nav aria-label="戰鬥模式"><Link href="/beast-game/battlefield">抽牌戰場</Link><Link href="/beast-game/lineup">格鬥競技場</Link></nav>
    </header>
    {errorNotice}
    {!account ? <p>正在讀取戰鬥卡…</p> : <>
      <nav className={styles.toolbar} aria-label="戰鬥卡片"><button aria-pressed={tab === '組隊'} onClick={() => { setTab('組隊'); setDetail(null); }}>組隊</button><button aria-pressed={tab === '圖鑑'} onClick={() => { setTab('圖鑑'); setDetail(null); }}>戰鬥圖鑑</button></nav>
      <p className={styles.muted}>60 張卡皆可出戰・本模式免押卡</p>
      {tab === '組隊' && <>
        <div className={styles.slots}>{[0, 1, 2].map(i => {
          const card = cards.find(c => c.id === selected[i]);
          return <div key={i} className={styles.card}>{card
            ? <BeastCardTile card={card} selected onOpen={() => setSelected(s => s.filter((_, j) => j !== i))} />
            : <BeastCardTile card={{ id: 'empty' + i, name: i === 0 ? '主戰' : '備戰', thumbnail: '/beast-game/card-back.webp', element: '' }} onOpen={() => {}} />}</div>;
        })}</div>
        <button disabled={busy || selected.length !== 3} onClick={() => void send('START', { lineup: selected })}>開始回合對戰</button>
        <p className={styles.muted}>點卡片入陣，再點陣中卡可移出。第一張先出場，其餘可在回合中切換。三張不可重複。</p>
      </>}
      <div className={styles.filters}>{['全部', ...Object.keys(labels)].map(element => <button key={element} aria-pressed={filter === element} onClick={() => setFilter(element)}>{labels[element] ?? element}</button>)}</div>
      <div className={styles.grid}>{cards.filter(c => filter === '全部' || c.element === filter).map(card => <div className={styles.card} key={card.id}>
        <BeastCardTile card={card} selected={selected.includes(card.id)} onOpen={() => {
          if (tab !== '組隊' || selected.includes(card.id) || selected.length >= 3) setDetail(card);
          else setSelected(s => [...s, card.id]);
        }} />
      </div>)}</div>
      {detail && <CardDetailSheet card={{ ...detail, story: undefined }} onClose={() => setDetail(null)} />}
    </>}
  </main>;
}
