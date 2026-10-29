'use server';

import { randomUUID } from 'node:crypto';
import { advance, chooseAI, newMatch, type Action, type Match } from '@/lib/beast-game/interactive';
import { battleViewFor } from '@/lib/beast-game/battle-view';

// Isolated developer sessions. No account, collection, stakes, rewards or production tokens.
// Preserve review-only sessions across Next development hot reloads while teammates refine art.
const reviewGlobal = globalThis as typeof globalThis & { __beastCombatReviewSessions?: Map<string, Match> };
const sessions = reviewGlobal.__beastCombatReviewSessions ?? new Map<string, Match>();
if (process.env.NODE_ENV === 'development') reviewGlobal.__beastCombatReviewSessions = sessions;
const guard = () => { if (process.env.NODE_ENV !== 'development') throw new Error('驗收僅供本機開發使用'); };
const reply = (id: string, match: Match) => ({ id, match, view: battleViewFor(match) });

export async function startCombatReview(beast: string, difficulty: string) {
  guard();
  if (!['baihu', 'qinglong', 'zhuque', 'xuanwu'].includes(beast) || !['EASY', 'HARD'].includes(difficulty)) throw new Error('驗收條件不正確');
  if (sessions.size >= 24) sessions.delete(sessions.keys().next().value!);
  const id = randomUUID();
  const match = newMatch([`beast_g_${beast}`], ['beast_g_baihu'], 29, { difficulty: difficulty as 'EASY' | 'HARD' });
  sessions.set(id, match);
  return reply(id, match);
}

export async function stepCombatReview(id: string, revision: number, action?: Action) {
  guard();
  const previous = sessions.get(id);
  if (!previous) throw new Error('驗收場次已重置，請重新開戰');
  if (revision !== previous.revision) throw new Error('請等本次動作完成');
  const match = advance(previous, action ?? chooseAI(previous, 'player', 'EASY'));
  sessions.set(id, match);
  return reply(id, match);
}
