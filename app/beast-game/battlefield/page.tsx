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
    setState(newBattle(buildDeck(ids, rng, DECK_SIZE), buildDeck(ids, rng, DECK_SIZE), rng));
  }, [cards, seed]);

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
        <p className="mt-1 text-xs leading-5 text-white/60">
          點一張卡選取，發光的格子就是能放的位置。主戰一格、後備 {BENCH_SIZE} 格。
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
                onSelect={handleSelect}
                onDestination={handleDestination}
              />
            </div>
            <p className="mt-3 text-center text-xs text-white/60" data-placed>
              已上場 {placed} 隻（主戰 {state.player.active ? 1 : 0}・後備 {state.player.bench.filter(Boolean).length}）
            </p>
            <button
              type="button"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/20 text-sm font-bold text-white/80"
              onClick={() => setSeed((value) => value + 1)}
            >
              重新發牌
            </button>
          </>
        )}
      </div>
    </main>
  );
}
