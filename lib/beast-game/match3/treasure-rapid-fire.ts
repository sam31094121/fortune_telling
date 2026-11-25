/**
 * 寶石捷連線寶器連發閘門與擊倒後預熱延後（只含純函式，方便測試）。
 * 斷風輪仍要等自己的 clearAt 才能再按，不改 5f412eed 的連擊時序。
 * 一般寶器不必等飛行動畫結束。
 */

export function canAcceptTreasurePress(input: {
  over: boolean;
  hasTarget: boolean;
  modeAllowed: boolean;
  boardActionLocked: boolean;
  isKelu: boolean;
  now: number;
  keluUnlockAt: number;
  count: number;
  available: boolean;
}): boolean {
  if (input.over || !input.hasTarget || !input.modeAllowed || input.boardActionLocked) return false;
  if (input.count < 1 || !input.available) return false;
  if (input.isKelu && input.now < input.keluUnlockAt) return false;
  return true;
}

export function decrementTreasureCatalog<T extends { element: string; variant: number; count: number }>(
  catalog: readonly T[],
  element: string,
  variant: number,
): T[] {
  return catalog.map((x) => (
    x.element === element && x.variant === variant
      ? { ...x, count: Math.max(0, x.count - 1) }
      : x
  ));
}

/** 把本次飛行動畫放進清單；同 id（斷風輪補傷害）則更新，不重開。 */
export function upsertTreasureFlight<T extends { effect: { id: string } }>(list: readonly T[], flight: T): T[] {
  const i = list.findIndex((f) => f.effect.id === flight.effect.id);
  if (i < 0) return [...list, flight];
  const next = list.slice();
  next[i] = { ...list[i], ...flight };
  return next;
}

export function removeTreasureFlight<T extends { effect: { id: string } }>(list: readonly T[], actionId: string): T[] {
  return list.filter((f) => f.effect.id !== actionId);
}

/**
 * 擊倒播完當幀先不要把「新鎖定目標」加進預熱名單，
 * 等 resume=true（idle／下一幀）再補，避免跟 destroy() 擠在同一工作。
 */
export function deathWarmTargets<T extends { foeId: string }>(
  all: readonly T[],
  opts: {
    deathPending: boolean;
    warmFreeze: readonly string[] | null | undefined;
    resume: boolean;
    hold: readonly string[] | null | undefined;
  },
): T[] {
  const freezeTo = opts.deathPending && opts.warmFreeze
    ? opts.warmFreeze
    : (!opts.resume ? (opts.hold ?? opts.warmFreeze ?? []) : null);
  if (!freezeTo) return [...all];
  const allow = new Set(freezeTo);
  return all.filter((w) => allow.has(w.foeId));
}
