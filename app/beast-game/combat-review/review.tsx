'use client';

import { useEffect, useState } from 'react';
import BattleArena from '@/components/battlefield/BattleArena';
import BattleDock from '@/components/battlefield/BattleDock';
import BattlePanel from '@/components/battlefield/BattlePanel';
import { GuideBookProvider } from '@/components/battlefield/GuideBookContext';
import { useCombatPlayback } from '@/components/battlefield/useCombatPlayback';
import type { BattlefieldCardArt } from '@/components/battlefield/GameBattlefield';
import type { GuideBook } from '@/lib/beast-game/guide-book';
import type { Action } from '@/lib/beast-game/interactive';
import styles from '@/components/battlefield/BattleScreen.module.css';
import { startCombatReview, stepCombatReview } from './actions';

export default function CombatReview({ cards, book }: { cards: BattlefieldCardArt[]; book: GuideBook }) {
  const [beast, setBeast] = useState('baihu');
  const [difficulty, setDifficulty] = useState('HARD');
  const [result, setResult] = useState<Awaited<ReturnType<typeof startCombatReview>> | null>(null);
  const [error, setError] = useState('');
  const [automatic, setAutomatic] = useState(false);
  const [starting, setStarting] = useState(false);
  const { playing, begin, play, reset } = useCombatPlayback();
  const act = async (action?: Action) => {
    if (!result || !begin()) return;
    try { const next = await stepCombatReview(result.id, result.match.revision, action); setResult(next); play(next.match); }
    catch (e) { reset(); setAutomatic(false); setError(e instanceof Error ? e.message : '驗收連線失敗'); }
  };
  useEffect(() => {
    if (!automatic || !result || playing || error || result.match.status !== 'PLAYING') return;
    const timer = setTimeout(() => { void act(); }, 150);
    return () => clearTimeout(timer);
    // The server chooses the next legal action. This timer never computes battle results.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automatic, result, playing, error]);
  const start = async () => {
    if (starting || playing) return;
    setStarting(true); setAutomatic(false); setError(''); reset();
    try { setResult(await startCombatReview(beast, difficulty)); }
    catch (e) { setError(e instanceof Error ? e.message : '無法開始驗收'); }
    finally { setStarting(false); }
  };
  return <GuideBookProvider value={book}>
    <main className={styles.page}><div className={styles.shell}>
      <header className={styles.header}><h1>本機戰鬥驗收・不押卡、不改收藏</h1></header>
      {!result ? <section style={{ padding: 20, color: '#fff', display: 'grid', gap: 16 }}>
        <label>神獸 <select aria-label="驗收神獸" value={beast} onChange={e => setBeast(e.target.value)} style={{ color: '#000', minHeight: 44 }}>
          {['baihu', 'qinglong', 'zhuque', 'xuanwu'].map((id, i) => <option key={id} value={id}>{['白虎', '青龍', '朱雀', '玄武'][i]}</option>)}
        </select></label>
        <label>後端難度 <select aria-label="驗收難度" value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ color: '#000', minHeight: 44 }}>
          <option value="EASY">簡單 EASY</option><option value="HARD">困難 HARD（含首領反制）</option>
        </select></label>
        <button onClick={start} disabled={starting} style={{ minHeight: 48, border: '1px solid #d4af37' }}>開始隔離驗收</button>
      </section> : <>
        <div className={styles.split} data-battle-split data-dock="true" data-finished={result.match.status === 'FINISHED' && !playing}>
          <BattleArena cards={cards} match={result.match} view={result.view} onInspect={() => {}} playing={playing} tapToAttack onSkill={!playing ? act : null} />
          <section className={styles.controls} data-battle-controls>
            <div className={styles.controlsHeading}>隔離驗收・真實後端戰報</div>
            <div className={styles.controlScroll}>
              <p data-review-difficulty={result.match.difficulty ?? 'EASY'}>實際後端難度：{result.match.difficulty ?? 'EASY'}・回合 {result.match.round}</p>
              <button disabled={result.match.status !== 'PLAYING'} onClick={() => setAutomatic(v => !v)} style={{ minHeight: 44 }}>{automatic ? '暫停連擊' : '自動打完本場'}</button>
              <BattlePanel match={result.match} view={result.view} cards={cards} onAction={act} busy={playing} compact />
              {result.match.status === 'FINISHED' && !playing && <p data-review-complete>驗收戰鬥結束：{result.match.winner ?? 'draw'}；沒有寫入收藏或獎勵。</p>}
              <button onClick={() => { reset(); setAutomatic(false); setResult(null); setError(''); }} style={{ minHeight: 44 }}>離開驗收・重新選擇</button>
            </div>
          </section>
        </div>
        <BattleDock match={result.match} view={result.view} cards={cards} playing={playing} busy={playing}
          onAction={act} onActiveTap={!playing && result.view.legal.some(a => a.type === 'ATTACK') ? () => { void act({ type: 'ATTACK' }); } : null} activeTapLabel="attack" />
      </>}
      {error && <p role="alert">{error}</p>}
    </div></main>
  </GuideBookProvider>;
}
