'use server';

import type { Action } from '@/lib/beast-game/interactive';
import { startCombatReview as start, stepCombatReview as step } from '@/lib/server/beast-review';

export async function startCombatReview(beast: string, difficulty: string) {
  return start(beast, difficulty);
}

export async function stepCombatReview(id: string, revision: number, action?: Action) {
  return step(id, revision, action);
}
