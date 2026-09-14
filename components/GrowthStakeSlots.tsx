'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  runOwnedStakesDuel,
  retryStakeSettlement,
  recoverPendingDuel,
  type BeastCollection,
  type Settlement,
} from '@/lib/beast-collection';
import type { StakeOutcome } from '@/lib/beast-collection-ledger';
import BeastElementRitual from './BeastElementRitual';
import styles from './GrowthStakeSlots.module.css';
import { recordBeastGameCompleted } from '@/lib/growth-center-client';
import BeastStakeResult from './BeastStakeResult';
import { namedStakeOutcome } from '@/lib/beast-stake-presentation';
import { MAX_REWARD_CARDS, MAX_STAKE_CARDS, describeStakeOdds } from '@/lib/beast-game/stake-rules';

type Card = { id: string; name: string; thumbnail: string };
type Result = { ok: boolean; stake?: StakeOutcome; error?: string };
type CollectionCard = BeastCollection['cards'][number];

function pickNextDifferentCard(
  collection: BeastCollection['cards'],
  alreadyIds: string[],
): CollectionCard | null {
  const remaining = collection.filter((card) => !alreadyIds.includes(card.id));
  if (remaining.length === 0) return null;

  const lastId = alreadyIds[alreadyIds.length - 1];
  const last = lastId ? collection.find((card) => card.id === lastId) : undefined;
  const lastBeast = last?.cardId;

  // 優先換「不同神獸」，讓連按感覺像在輪流選
  const differentBeast = remaining.find((card) => card.cardId !== lastBeast);
  return differentBeast ?? remaining[0] ?? null;
}

export default function GrowthStakeSlots({
  collection,
  pool,
}: {
  collection: BeastCollection;
  pool: Map<string, Card>;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<StakeOutcome | null>(null);
  const [saved, setSaved] = useState<Settlement | null>(null);
  const [guided, setGuided] = useState(true);
  const [movement, setMovement] = useState('');
  const slots = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLSelectElement>(null);

  const show = (element: HTMLElement | null) =>
    element?.scrollIntoView({ block: 'center', behavior: 'auto' });

  useEffect(() => {
    if (guided && (ids.length || saved)) show(slots.current);
  }, [ids, saved, guided]);

  useEffect(() => {
    let disposed = false;
    const timer = setTimeout(() => {
      void recoverPendingDuel<Result>()
        .then((r) => {
          if (disposed) return;
          if (r.result?.stake) setOutcome(r.result.stake);
          if (r.settlement) setSaved(r.settlement);
        })
        .catch((e) => {
          if (!disposed) setError(e.message);
        });
    }, 0);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, []);

  const selected = ids
    .map((id) => collection.cards.find((c) => c.id === id))
    .filter((c): c is CollectionCard => Boolean(c));

  const displayed = outcome?.selectedEntries ?? selected;
  const reward = pool.get(outcome?.gainedCardId ?? '');
  const won = saved?.saved && outcome?.verdict === 'WON';
  const lost = saved?.saved && outcome?.verdict === 'LOST';

  const remainingCount = useMemo(
    () => collection.cards.filter((card) => !ids.includes(card.id)).length,
    [collection.cards, ids],
  );

  useEffect(() => {
    if (saved?.saved) recordBeastGameCompleted('stake-duel');
  }, [saved?.saved]);

  function placeCard(id: string, announce?: string) {
    if (busy || saved) return;
    setIds((prev) => {
      if (!id || prev.includes(id) || prev.length >= MAX_STAKE_CARDS) return prev;
      const entry = collection.cards.find((c) => c.id === id);
      const name = pool.get(entry?.cardId ?? '')?.name ?? '卡片';
      const nextLen = prev.length + 1;
      setMovement(
        announce
          ?? `已放入「${name}」。目前 ${nextLen} 張。想多押就再按「再放一張」。尚未扣卡。`,
      );
      setError('');
      return [...prev, id];
    });
  }

  function autoPlaceNext() {
    if (busy || saved) return;
    setIds((prev) => {
      if (prev.length >= MAX_STAKE_CARDS) return prev;
      const next = pickNextDifferentCard(collection.cards, prev);
      if (!next) {
        setMovement('收藏卡都放完了，或已達上限。可以開戰，或取回幾張再換。');
        return prev;
      }
      const name = pool.get(next.cardId)?.name ?? '卡片';
      setMovement(
        `已自動放入「${name}」（換不同卡）。目前 ${prev.length + 1} 張。一直按就會繼續換卡放入。`,
      );
      setError('');
      return [...prev, next.id];
    });
    show(slots.current);
  }

  async function play() {
    if (selected.length < 1 || selected.length > MAX_STAKE_CARDS || busy) return;
    setBusy(true);
    setError('');
    setSaved(null);
    setOutcome(null);
    try {
      const result = await runOwnedStakesDuel(selected.map((c) => c.id), async (entries) => {
        const r = await fetch('/api/beast-game/stake-duel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries }),
          signal: AbortSignal.timeout(20000),
        });
        return r.json();
      });
      setOutcome(result.result.stake ?? null);
      setSaved(result.settlement);
    } catch (e) {
      setError(e instanceof Error ? e.message : '連線中斷，沒有扣卡。');
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!saved || !outcome || busy) return;
    setBusy(true);
    try {
      setSaved(await retryStakeSettlement(saved.matchId, outcome));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const canAutoAdd = !busy && !saved && ids.length < MAX_STAKE_CARDS && remainingCount > 0;
  // 畫面只強調：已放的格 + 下一個可放的空位（避免 20 格嚇到人）
  const visibleSlotCount = Math.min(
    MAX_STAKE_CARDS,
    Math.max(displayed.length + (saved || outcome ? 0 : 1), 1),
  );

  return (
    <section aria-label="收藏押注決鬥" className="mt-4 rounded-xl border border-amber-200/30 p-3">
      <h3 className="text-lg font-bold text-amber-100">收藏押注決鬥</h3>
      <BeastElementRitual lesson={outcome?.elementLesson} />

      <div className={styles.guide}>
        <p role="status" className={styles.guideLead}>
          {busy
            ? '正在對戰，請等結果出來。'
            : saved?.saved
              ? '③ 看結果：上面格子已更新。'
              : selected.length > 0
                ? `② 已放 ${selected.length} 張。想多押就按「再放一張」（會自動換不同卡）。最多 ${MAX_STAKE_CARDS} 張，不必放滿。`
                : '① 按一次「再放一張」，就會自動幫你放進第一格。一直按就會輪流放不同卡。'}
        </p>

        {canAutoAdd && (
          <button
            type="button"
            className={styles.primaryAdd}
            onClick={autoPlaceNext}
          >
            {selected.length === 0 ? '再放一張・開始選卡' : '再放一張・自動換不同卡'}
            <small>一直按就可以，不用一張一張重選</small>
          </button>
        )}

        {!selected.length && !busy && !saved && (
          <button
            type="button"
            className={styles.helpButton}
            onClick={() => {
              setGuided(true);
              autoPlaceNext();
            }}
          >
            帶我放第一張 <span aria-hidden="true">↓</span>
          </button>
        )}

        <button
          type="button"
          className={styles.toggle}
          onClick={() => setGuided((v) => !v)}
          aria-pressed={guided}
        >
          {guided ? '收起箭頭引導' : '開啟箭頭引導'}
        </button>
      </div>

      <p className="mt-2 text-sm leading-6">
        只可押已入庫的收藏卡。一次 1～{MAX_STAKE_CARDS} 張，不必放滿。
        輸了只沒收本場押注；贏了原牌保留，並依表現再給獎勵（最多 {MAX_REWARD_CARDS} 張）；平手原牌保留。
      </p>

      <ol className={styles.steps} aria-label="押牌三步驟">
        <li>① 按「再放一張」：系統自動輪流放不同收藏卡。</li>
        <li>② 看上方格子：不對就按「取回」。</li>
        <li>③ 按金色開戰：格子裡的牌才正式成為賭注。</li>
      </ol>

      <p className="mt-2 text-sm">
        持有共 {collection.cards.length} 張・目前押注 {displayed.length} 張
        {remainingCount > 0 && !saved ? `・還可再放 ${Math.min(remainingCount, MAX_STAKE_CARDS - ids.length)} 張` : ''}
      </p>

      {movement && !outcome && (
        <p role="status" className="mt-2 text-sm text-amber-100">{movement}</p>
      )}

      <div ref={slots} className={styles.slots}>
        {Array.from({ length: visibleSlotCount }, (_, i) => {
          const entry = displayed[i];
          const card = pool.get(entry?.cardId ?? '');
          return (
            <div key={i}>
              <p>
                押注格 {i + 1}
                {i === 0 ? ' · 出戰' : ''}
              </p>
              <div className={`${styles.slot} ${lost ? styles.lost : ''}`}>
                {card ? (
                  <img src={card.thumbnail} alt={card.name} />
                ) : (
                  <button
                    type="button"
                    className={styles.addCard}
                    disabled={busy || Boolean(saved)}
                    onClick={autoPlaceNext}
                  >
                    ＋ 再放一張
                    <br />
                    <small>{i === 0 ? '按一下就自動放入' : '連按會換不同卡'}</small>
                  </button>
                )}
              </div>
              <p className="text-sm">
                {card?.name}
                {lost ? ' · 已沒收' : ''}
              </p>
              {entry && !outcome && (
                <button
                  className="min-h-11 underline"
                  disabled={busy}
                  onClick={() => {
                    setIds((v) => v.filter((id) => id !== entry.id));
                    setMovement(
                      `已取回「${card?.name ?? '卡片'}」1 張，押注剩 ${selected.length - 1} 張。持有張數不變。`,
                    );
                  }}
                >
                  取回第 {i + 1} 張
                </button>
              )}
            </div>
          );
        })}

        <div>
          <p>獎勵卡格</p>
          <div className={`${styles.slot} ${won ? styles.won : ''}`}>
            {won && reward ? (
              <img src={reward.thumbnail} alt={`已入庫獎勵：${reward.name}`} />
            ) : (
              <span>{busy ? '結算中…' : lost ? '本場沒有獎勵' : '獲勝入庫後亮起'}</span>
            )}
          </div>
          {won && (
            <p className="text-sm">{reward?.name ?? '獎勵卡'} · 已加入收藏</p>
          )}
        </div>
      </div>

      {ids.length < displayed.length && !outcome && (
        <p className="text-sm text-slate-300">（其餘空格先收起，需要時再按「再放一張」展開）</p>
      )}

      {selected.length > 0 && !outcome && (
        <p className={styles.confirm}>
          本次押 {selected.length} 張。
          {describeStakeOdds(selected.length).lose}
          {describeStakeOdds(selected.length).win}
          現在只是放牌，還沒扣卡。
        </p>
      )}

      {guided && selected.length < MAX_STAKE_CARDS && !saved && (
        <p className={styles.arrow}>
          <span aria-hidden="true">↓</span>
          {selected.length === 0
            ? '按上方大按鈕，或按空格「再放一張」'
            : '想多押就再按一次；會自動換成另一張不同的卡'}
        </p>
      )}

      <details className={styles.advanced}>
        <summary>進階：自己指定某一張（可略過）</summary>
        <label htmlFor="growth-stake-entry" className="text-sm">
          從清單挑一張放入（1～{MAX_STAKE_CARDS} 張）
        </label>
        <select
          ref={picker}
          id="growth-stake-entry"
          className="mt-2 min-h-11 w-full rounded-lg bg-slate-900 p-2 text-white"
          value=""
          disabled={busy || selected.length >= MAX_STAKE_CARDS || Boolean(saved)}
          onChange={(e) => {
            const id = e.target.value;
            if (id) placeCard(id);
          }}
        >
          <option value="">點這裡指定某一張收藏卡</option>
          {collection.cards.map((c, i) =>
            !ids.includes(c.id) ? (
              <option key={c.id} value={c.id}>
                {pool.get(c.cardId)?.name ?? c.cardId} · 收藏第 {i + 1} 張
              </option>
            ) : null,
          )}
        </select>
      </details>

      {guided && selected.length > 0 && !outcome && (
        <p className={styles.arrow}>
          <span aria-hidden="true">↓</span>
          已放好 {selected.length} 張，不必放滿；確認後按下方金色開戰
        </p>
      )}

      <button
        className="mt-3 min-h-12 w-full rounded-xl bg-amber-200 p-3 text-base font-bold text-slate-950 disabled:opacity-40"
        disabled={
          selected.length < 1
          || selected.length > MAX_STAKE_CARDS
          || busy
          || Boolean(collection.storageError)
          || Boolean(saved)
        }
        onClick={() => void play()}
      >
        {busy
          ? '結算中…'
          : selected.length
            ? `確認押 ${selected.length} 張，開始對戰`
            : '先放一張卡，就能開戰'}
      </button>

      {outcome && (
        <BeastStakeResult
          outcome={namedStakeOutcome(outcome, (id) => pool.get(id)?.name ?? '神獸卡')}
          cards={[...pool.values()]}
          card={pool.get(outcome.gainedCardId ?? outcome.forfeitedCardId ?? outcome.stakes.player)}
          settlement={saved}
          isReplay={false}
          retrying={busy}
          onRetry={() => void retry()}
        />
      )}

      {saved?.saved && (
        <button
          className="min-h-11 underline"
          onClick={() => {
            setIds([]);
            setOutcome(null);
            setSaved(null);
            setError('');
            setMovement('已清空押注格，可以重新選卡。');
          }}
        >
          重新選牌
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>
      )}

      {collection.cards.length === 0 && (
        <p className="mt-2 text-sm">
          你還沒有收藏卡。先完成遊戲並領取 28 張幼子入庫，再回來按「再放一張」就能玩。
        </p>
      )}
    </section>
  );
}
