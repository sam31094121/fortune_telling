import 'server-only';

import { randomUUID } from 'node:crypto';
import { advance, chooseAI, newMatch, type Action, type Match } from '@/lib/beast-game/interactive';
import { interactiveCatalog } from '@/lib/beast-game/interactive';
import { buildGuideBook } from '@/lib/beast-game/guide-book';
import { getCard, playableCards } from '@/lib/beast-game/registry';
import { playSeries } from '@/lib/beast-game/series';
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

export function combatReviewPageData() {
  guard();
  return { cards: interactiveCatalog(), book: buildGuideBook() };
}

export function ritualReviewPageData(beast?: string) {
  guard();
  const guardian = ['baihu', 'qinglong', 'zhuque', 'xuanwu'].includes(beast ?? '') ? beast! : 'baihu';
  const card = getCard('beast_g_' + guardian)!;
  const support = playableCards().filter(c => c.form !== 'GUARDIAN').sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id)).slice(0, 2);
  const player = [card, ...support];
  const opponent = [getCard('beast_g_baihu')!, ...support];
  const result = playSeries(player.map(c => c.id), opponent.map(c => c.id), 29);
  const show = (c: typeof card) => ({ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail });
  return { player: player.map(show), opponent: opponent.map(show), pairs: result.pairs };
}
