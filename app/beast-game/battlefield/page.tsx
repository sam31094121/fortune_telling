'use client';

/**
 * 神獸戰場 V1
 * ============================================================================
 *
 * 業主定調〈二十三、第一階段驗收〉：這一版只驗桌面，不驗戰鬥平衡。
 * 六十張卡可載入、卡片全部 1:1、牌庫／手牌／主戰／五格後備／棄牌正常、
 * 卡片可選取、可放入合法格子、主戰後備可交換、非法位置不能放、
 * 玩家與對手完全分離、手機不卡頓。
 *
 * 【規則不在這一頁】
 *
 * 能不能放、放完長什麼樣，全部走 lib/beast-game/battlefield.ts。
 * 這一頁只做三件事：把卡池抓回來、把狀態交給畫面、把點擊轉成引擎呼叫。
 * 傷害與勝負更不在這裡——那在 interactive.ts，戰場層一行都不重算。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import GameBattlefield, { type BattlefieldCardArt } from '@/components/battlefield/GameBattlefield';
import {
  BENCH_SIZE,
  moveCard,
  newBattle,
  selectCard,
  type BattleState,
  type Destination,
} from '@/lib/beast-game/battlefield';
import BattlePanel from '@/components/battlefield/BattlePanel';
import { autoPlaceOpponent, canStartBattle, startFromField } from '@/lib/beast-game/battle-bridge';
import { advance, type Action, type Match } from '@/lib/beast-game/interactive';

/** 一副牌的張數。六十張是卡池，不是一副牌全部上桌。 */
const DECK_SIZE = 20;

/**
 * 種子亂數。
 *
 * 用種子而不是 Math.random：同一顆種子洗出同一副牌，
 * 客戶回報「我這局怪怪的」時才查得回去。
 */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDeck(ids: string[], rng: () => number, size: number): string[] {
  // 一副牌內不重複——同一張神獸不會在自己的牌庫裡出現兩次。
  const pool = ids.slice();
  const out: string[] = [];
  while (out.length < size && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}

export default function BattlefieldPage() {
  const [cards, setCards] = useState<BattlefieldCardArt[]>([]);
  const [state, setState] = useState<BattleState | null>(null);
  /** 開戰之後的戰鬥狀態。null＝還在佈陣。 */
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    fetch('/api/beast-game', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.ok || !Array.isArray(data.cards)) throw new Error('卡池回應不正確');
        setCards(data.cards as BattlefieldCardArt[]);
      })
      .catch(() => setError('卡池沒有載入成功。請重新整理，或稍後再試。'))
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  // 卡池到齊才開桌。開桌本身是純函式，換種子就是重開一局。
  useEffect(() => {
    if (!cards.length) return;
    const ids = cards.map((card) => card.id);
    const rng = seeded(seed);
    const fresh = newBattle(buildDeck(ids, rng, DECK_SIZE), buildDeck(ids, rng, DECK_SIZE), rng);
    // 對手用同一套佈陣規則自動上場——沒有特權、沒有額外格子。
    setState(autoPlaceOpponent(fresh, rng));
    setMatch(null);
  }, [cards, seed]);

  /** 從目前的佈陣開戰。種子固定，同一局可重播。 */
  const start = useCallback(() => {
    if (!state) return;
    try {
      setMatch(startFromField(state, seed * 7919));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '還不能開戰。');
    }
  }, [state, seed]);

  /**
   * 出招。
   *
   * 只把動作交給 advance()，對手要出什麼由它自己的 AI 決定（預設參數）。
   * 這裡不挑對手的動作，也不預測結果——**畫面不是裁判**。
   */
  const act = useCallback((action: Action) => {
    setMatch((current) => {
      if (!current || current.status !== 'PLAYING') return current;
      try {
        return advance(current, action);
      } catch {
        // 不合法的動作根本不會出現在畫面上；真的發生就維持原狀，不要亂改狀態。
        return current;
      }
    });
  }, []);

  /*
    開戰之後把畫面帶到戰鬥面板。

    實測：按下開戰、面板確實出現了，但它在整張桌子下面，
    手機上完全在視窗外——客戶按完鈕看不到任何變化，
    會以為沒反應而再按一次。按鈕做了事，就要讓人看見它做了什麼。

    用 nearest 而不是 center：只捲到剛好看得到，不把戰場推出畫面，
    客戶還是要同時看到雙方場上有誰。
  */
  useEffect(() => {
    // 只在剛開戰那一刻捲一次。revision 0 就是還沒出過招的那一場——
    // 每次出招都捲會把畫面拉來拉去，比不捲更煩。
    if (!match || match.revision !== 0) return;
    document.querySelector('[data-battle-panel]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [match]);

  const handleSelect = useCallback((cardId: string) => {
    setState((current) => (current ? selectCard(current, cardId) : current));
  }, []);

  const handleDestination = useCallback((to: Destination) => {
    setState((current) => {
      if (!current?.selectedCardId) return current;
      try {
        return moveCard(current, 'PLAYER', current.selectedCardId, to);
      } catch {
        // 非法移動在引擎就被擋下了。畫面本來就不該給出非法的格子，
        // 真的走到這裡代表有 bug——取消選取，不要讓客戶卡在半途。
        return selectCard(current, null);
      }
    });
  }, []);

  const startCheck = useMemo(() => (state ? canStartBattle(state) : { ready: false as const }), [state]);
  const placed = useMemo(() => {
    if (!state) return 0;
    return (state.player.active ? 1 : 0) + state.player.bench.filter(Boolean).length;
  }, [state]);

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-4 text-slate-100">
      <div className="mx-auto max-w-[520px]">
        <Link href="/beast-game" className="inline-flex min-h-11 items-center text-sm text-cyan-200">
          ← 神獸決鬥・組陣台
        </Link>
        <h1 className="mt-1 font-serif text-2xl font-black">神獸戰場</h1>
        {/*
          這行字要跟著功能走。它原本寫「尚未接上傷害、能量與勝負」，
          V2 接上之後那句就變成假的——畫面說的話必須跟實際做的一致。
        */}
        <p className="mt-1 text-xs text-amber-200">
          戰場操作預覽：每副試用牌 20 張，不扣收藏。
          {match ? '傷害、氣與勝負由後端規則判定，畫面只顯示。' : '佈陣完成後即可開戰。'}
        </p>
        <p className="mt-1 text-xs leading-5 text-white/60">
          點一張卡，再點發光的格子放牌；電腦也可拖曳手牌。主戰一格、後備 {BENCH_SIZE} 格。
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-amber-300/10 p-3 text-sm text-amber-100">{error}</p>
        ) : !state ? (
          <p className="mt-4 text-sm text-white/60">正在發牌…</p>
        ) : (
          <>
            <div className="mt-3">
              <GameBattlefield
                state={state}
                cards={cards}
                inBattle={Boolean(match)}
                onSelect={handleSelect}
                onDestination={handleDestination}
              />
            </div>
            {match ? (
              <BattlePanel match={match} onAction={act} />
            ) : (
              <>
                <p className="mt-3 text-center text-xs text-white/60" data-placed>
                  已上場 {placed} 隻（主戰 {state.player.active ? 1 : 0}・後備 {state.player.bench.filter(Boolean).length}）
                </p>
                <button
                  type="button"
                  data-start-battle
                  disabled={!startCheck.ready}
                  className="mt-2 min-h-11 w-full rounded-xl bg-amber-200 text-sm font-black text-slate-950 disabled:bg-white/10 disabled:text-white/50"
                  onClick={start}
                >
                  {startCheck.ready ? '開戰' : ('reason' in startCheck && startCheck.reason) || '還不能開戰'}
                </button>
              </>
            )}
            <button
              type="button"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/20 text-sm font-bold text-white/80"
              onClick={() => { setSeed((value) => value + 1); setError(null); }}
            >
              {match ? '重新發牌，再打一場' : '重新發牌'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
