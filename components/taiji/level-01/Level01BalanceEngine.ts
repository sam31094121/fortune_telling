import {
  APPROACHING_THRESHOLD_DEG,
  ENTER_BALANCE_THRESHOLD_DEG,
  EXIT_BALANCE_THRESHOLD_DEG,
  LOCKED_HOLD_MS,
} from './level01.constants';

export type Level01BalanceState = 'UNBALANCED' | 'APPROACHING' | 'BALANCED' | 'HOLDING' | 'LOCKED';

export function resolveLevel01BalanceState(
  tilt: number,
  previousState: Level01BalanceState = 'UNBALANCED',
): Exclude<Level01BalanceState, 'HOLDING' | 'LOCKED'> {
  const wasInside = previousState === 'BALANCED' || previousState === 'HOLDING' || previousState === 'LOCKED';
  if (tilt <= (wasInside ? EXIT_BALANCE_THRESHOLD_DEG : ENTER_BALANCE_THRESHOLD_DEG)) return 'BALANCED';
  if (tilt <= APPROACHING_THRESHOLD_DEG) return 'APPROACHING';
  return 'UNBALANCED';
}

export function level01BalanceProgress(tilt: number) {
  if (!Number.isFinite(tilt)) return 0;
  return Math.max(0, Math.min(1, 1 - tilt / APPROACHING_THRESHOLD_DEG));
}

export function level01HoldProgress(balancedSince: number, now: number, state: Level01BalanceState) {
  if ((state !== 'BALANCED' && state !== 'HOLDING' && state !== 'LOCKED') || balancedSince < 0) return 0;
  if (state === 'LOCKED') return 1;
  return Math.max(0, Math.min(1, (now - balancedSince) / LOCKED_HOLD_MS));
}
