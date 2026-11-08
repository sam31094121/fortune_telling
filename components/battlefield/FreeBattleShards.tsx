'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CatalogBeastCard from './CatalogBeastCard';
import { creditFreeBattleReward, exchangeFreeBattleShards, type ShardCreditResult } from '@/lib/beast-collection';
import type { BattleReward, ShardExchangeKind } from '@/lib/beast-game/battle-reward';
import styles from './FreeBattleShards.module.css';

type Summary = NonNullable<ShardCreditResult['summary']>;

/**
 * 免費戰場的「戰利碎片」結算：贏了一眼看到拿了幾片、哪幾項戰績加分、離下一張卡還差多少。
 *
 * 純顯示：戰績（reward）由後端算好、重播驗證後送來；入帳、連勝、兌換、說明文字、下一個目標
 * 全部由收藏帳本（lib/beast-collection）算好，這裡只照印，不自己加總、不自己判斷。
 * 保存成功才顯示「已獲得」；保存中只顯示保存中；失敗可重試，絕不假裝已發獎。
 */
export default function FreeBattleShards({ reward }: { reward: BattleReward | null }) {
  const [state, setState] = useState<'saving' | 'saved' | 'failed'>('saving');
  const [result, setResult] = useState<ShardCreditResult | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [won, setWon] = useState<{ cardId: string; kind: ShardExchangeKind } | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const creditedKey = useRef<string | null>(null);

  const credit = useCallback(async (r: BattleReward) => {
    setState('saving');
    setError('');
    const done = await creditFreeBattleReward(r);
    if (done.saved) { setResult(done); setSummary(done.summary ?? null); setState('saved'); }
    else { setError(done.error ?? '戰利碎片尚未保存，請重試。'); setState('failed'); }
  }, []);

  useEffect(() => {
    if (!reward || creditedKey.current === reward.key) return;
    creditedKey.current = reward.key;
    setWon(null);
    void credit(reward);
  }, [reward, credit]);

  const exchange = async (kind: ShardExchangeKind) => {
    setExchanging(true);
    setError('');
    const done = await exchangeFreeBattleShards(kind);
    if (done.saved && done.cardId) { setWon({ cardId: done.cardId, kind }); setSummary(done.summary ?? null); }
    else setError(done.error ?? '兌換尚未完成，碎片沒有扣除，請重試。');
    setExchanging(false);
  };

  if (!reward) return null;
  const receipt = result?.receipt;

  return (
    <section className={styles.box} data-free-battle-shards data-shard-status={state} aria-live="polite" aria-label="戰利碎片">
      <h3 className={styles.heading}><span aria-hidden="true">💎</span> 戰利碎片</h3>

      {state === 'saving' ? <p className={styles.line}>正在保存本場戰利品…</p> : null}

      {state === 'failed' ? (
        <>
          <p className={styles.error} role="alert">{error}</p>
          <button type="button" className={styles.button} onClick={() => void credit(reward)}>重試保存</button>
        </>
      ) : null}

      {state === 'saved' && receipt && summary ? (
        <>
          {receipt.outcome === 'win' ? (
            <>
              <p className={styles.gain}>＋{receipt.gained} 片</p>
              <ul className={styles.lines}>{receipt.lines.map((line) => <li key={line}>{line}</li>)}</ul>
            </>
          ) : receipt.outcome === 'lose' ? (
            <p className={styles.line}>這場沒有碎片，連勝歸零。下一場再來！</p>
          ) : (
            <p className={styles.line}>平手：碎片和連勝都不變。</p>
          )}

          <p className={styles.total}>目前共 <strong>{summary.shards}</strong> 片　連勝 <strong>{summary.streak}</strong> 場</p>
          <p className={styles.goal}>{summary.nextStreakGoal}</p>

          {won ? (
            <div className={styles.won} data-shard-exchanged>
              <p className={styles.line}>{won.kind === 'ADULT' ? '兌換成功，獲得一張成獸卡！' : '兌換成功，獲得一張四象守護獸！'}</p>
              <div className={styles.card}><CatalogBeastCard id={won.cardId} /></div>
              <p className={styles.line}>已存入我的卡片。</p>
            </div>
          ) : null}

          <div className={styles.exchange}>
            <button type="button" className={styles.button} disabled={!summary.canAdult || exchanging} onClick={() => void exchange('ADULT')}>
              {summary.canAdult ? `用 ${summary.adultCost} 片兌換一張成獸` : `成獸 還差 ${summary.adultNeed} 片`}
            </button>
            <button type="button" className={styles.buttonAlt} disabled={!summary.canGuardian || exchanging} onClick={() => void exchange('GUARDIAN')}>
              {summary.canGuardian ? `用 ${summary.guardianCost} 片兌換四象守護獸` : `四象守護獸 還差 ${summary.guardianNeed} 片`}
            </button>
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </>
      ) : null}
    </section>
  );
}
