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

/**
 * 排隊中的寶器輪到自己時要怎麼處理（P0 卡死修正）：
 * - cancelled：整局重置／離開，或前一發失敗（只取消「還沒送出」的排隊項）→ 退庫存、收動畫。
 * - no-target：前一發已把敵人全打倒 → 退庫存、收動畫，不報錯、不取消已確認的那一發。
 * - fire：照常送出，打 target。
 */
export function treasureRunDecision(input: {
  pressGen: number;
  fireGen: number;
  pressQueueGen: number;
  queueGen: number;
  foes: readonly { hp: number }[];
  preferred: number;
}): { kind: 'cancelled' } | { kind: 'no-target' } | { kind: 'fire'; target: number } {
  if (input.pressGen !== input.fireGen || input.pressQueueGen !== input.queueGen) return { kind: 'cancelled' };
  let target = input.preferred;
  if (!input.foes[target] || input.foes[target].hp <= 0) target = input.foes.findIndex((f) => f.hp > 0);
  if (target < 0) return { kind: 'no-target' };
  return { kind: 'fire', target };
}

/** 伺服端最新的敵人名單（沒有就用畫面上的）是否還有活的；全倒後不再接受寶器按壓。 */
export function anyFoeAlive(foes: readonly { hp: number }[]): boolean {
  return foes.some((f) => f.hp > 0);
}

/** 一般寶器樂觀起飛：按下當下先飛，伺服端確認後只補傷害；傷害與收動畫時間從按下起算。 */
export const OPTIMISTIC_TREASURE_DAMAGE_MS = 950;
export const OPTIMISTIC_TREASURE_CLEAR_MS = 1900;
/** 確認晚到時，傷害數字至少還要留這麼久才收（數字在掛上後約 918ms 才浮現）。 */
export const OPTIMISTIC_TREASURE_MIN_CLEAR_AFTER_CONFIRM_MS = 1250;
export function optimisticTreasureDelays(elapsedSincePress: number): { damageDelay: number; clearDelay: number } {
  const e = Math.max(0, elapsedSincePress);
  return {
    damageDelay: Math.max(0, OPTIMISTIC_TREASURE_DAMAGE_MS - e),
    clearDelay: Math.max(OPTIMISTIC_TREASURE_CLEAR_MS - e, OPTIMISTIC_TREASURE_MIN_CLEAR_AFTER_CONFIRM_MS),
  };
}

/**
 * 擊倒後預熱下一隻敵人（B 案）：要等手指放開、且沒有任何動畫 / 輸入 ≥ idleMs 才開始；
 * 否則回傳還要等多久（最少 minRetryMs）。
 */
export const DEATH_WARM_IDLE_MS = 1000;
export function deathWarmIdleWait(input: {
  now: number;
  pointerDown: boolean;
  lastInputAt: number;
  quietSince: number | null;
  idleMs?: number;
  minRetryMs?: number;
}): number {
  const idle = input.idleMs ?? DEATH_WARM_IDLE_MS;
  const minRetry = input.minRetryMs ?? 250;
  if (input.pointerDown || input.quietSince === null) return idle;
  const since = Math.min(input.now - input.lastInputAt, input.now - input.quietSince);
  if (since >= idle) return 0;
  return Math.max(minRetry, idle - since);
}
