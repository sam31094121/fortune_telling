/**
 * 完整戰鬥迴圈腳本（測試用）。
 * 斷言：隊伍重複拒絕、玩家標籤僅 风空水火地、變身同時換外觀+數值+技能。
 */

import {
  ALLY_TEST_CARDS,
  ENEMY_TEST_CARDS,
  assertNoForbiddenChars,
  assertPlayerFacingStrings,
  allPlayerElements,
  checkAndApplyTransform,
  createBattle,
  createBattleConfig,
  step,
  type BattleState,
} from '../src/index.js';

const FORBIDDEN = ['金', '木', '土'] as const;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`);
}

function scanStateForForbidden(state: BattleState): void {
  const blobs: string[] = [
    state.phase,
    ...state.allies.flatMap((c) => [
      c.nameZh,
      c.element,
      c.appearanceId,
      ...c.skillIds,
    ]),
    ...state.enemies.flatMap((c) => [
      c.nameZh,
      c.element,
      c.appearanceId,
      ...c.skillIds,
    ]),
    ...state.log.map((l) => l.message),
  ];
  for (const s of blobs) {
    for (const ch of FORBIDDEN) {
      assert(!s.includes(ch), `玩家面向出現禁止字「${ch}」於: ${s}`);
    }
  }
}

function summarize(state: BattleState): string {
  const lines: string[] = [];
  lines.push(`=== BattleState 摘要 ===`);
  lines.push(`phase=${state.phase} turn=${state.turn} energy=${state.energy} outcome=${state.outcome}`);
  lines.push('--- 友方 ---');
  for (const c of state.allies) {
    lines.push(
      `  ${c.nameZh}[${c.element}] HP=${c.currentHp}/${c.stats.hp} atk=${c.stats.atk} def=${c.stats.def} tier=${c.formTier} app=${c.appearanceId} skills=[${c.skillIds.join(',')}] inject=${c.injectPoints} alive=${c.alive}`,
    );
  }
  lines.push('--- 敵方 ---');
  for (const c of state.enemies) {
    lines.push(
      `  ${c.nameZh}[${c.element}] HP=${c.currentHp}/${c.stats.hp} tier=${c.formTier} app=${c.appearanceId} alive=${c.alive}`,
    );
  }
  if (state.lastTransform) {
    lines.push(
      `lastTransform: ${state.lastTransform.instanceId} → tier${state.lastTransform.newTier} ${state.lastTransform.appearanceId} skills=${state.lastTransform.skillIds.join(',')}`,
    );
  }
  return lines.join('\n');
}

// ---------- 單元式斷言 ----------
console.log('--- asserts ---');

// 1) 隊伍重複 cardId 必須拒絕
let dupRejected = false;
try {
  createBattle(
    ['ally_feng_01', 'ally_feng_01', 'ally_shui_01'],
    ENEMY_TEST_CARDS.slice(0, 3).map((c) => c.cardId),
  );
} catch (e) {
  dupRejected = String(e).includes('重複');
}
assert(dupRejected, '重複 cardId 應被拒絕');
console.log('OK: team duplicate rejected');

// 2) 玩家標籤僅 风空水火地
const labels = allPlayerElements();
assert(
  labels.length === 5 &&
    labels.includes('风') &&
    labels.includes('空') &&
    labels.includes('水') &&
    labels.includes('火') &&
    labels.includes('地'),
  '玩家元素集合錯誤',
);
for (const l of labels) {
  assertNoForbiddenChars(l);
  assertPlayerFacingStrings(l);
}
for (const c of [...ALLY_TEST_CARDS, ...ENEMY_TEST_CARDS]) {
  assertNoForbiddenChars(c.element);
  assertNoForbiddenChars(c.nameZh);
}
console.log('OK: player labels only 风空水火地');

// 3) 變身同時更換 appearance + stats + skills
{
  const card = ALLY_TEST_CARDS[0]!;
  const cfg = createBattleConfig({
    transform: { tierThresholds: [0, 3, 8] },
  });
  const before = card.forms[0]!;
  const result = checkAndApplyTransform(
    {
      currentTier: 0,
      injectPoints: 3,
      forms: card.forms,
    },
    cfg,
  );
  assert(result.didTransform, '應觸發變身');
  assert(result.newTier === 1, '應升至 tier 1');
  assert(result.appearanceId !== before.appearanceId, '外觀應改變');
  assert(result.stats.atk !== before.stats.atk, '數值應改變');
  assert(
    JSON.stringify(result.skillIds) !== JSON.stringify(before.skillIds),
    '技能應改變',
  );
  console.log(
    'OK: transform changes appearance+stats+skills together',
    `→ ${result.appearanceId} atk=${result.stats.atk} skills=${result.skillIds.join(',')}`,
  );
}

// ---------- 完整迴圈 ----------
console.log('\n--- full battle loop ---');

const config = createBattleConfig({
  // 測試暫用：讓變身較容易出現
  inject: {
    maxEnergySpendPerInject: 3,
    maxInjectsPerSlotPerTurn: 2,
    energyToInjectPoints: 1,
  },
  transform: { tierThresholds: [0, 3, 8] },
  energy: { energyPerTurn: 2, startingEnergy: 3 },
  turn: { maxTurnsPlaceholder: 20 },
});

const allyIds = ALLY_TEST_CARDS.map((c) => c.cardId);
const enemyIds = ENEMY_TEST_CARDS.map((c) => c.cardId);

let state = createBattle(allyIds, enemyIds, config);
console.log(`[phase] ${state.phase}`);

state = step(state, { type: 'start' });
console.log(`[phase] ${state.phase} turn=${state.turn}`);

let guard = 0;
const MAX_STEPS = 500;
let logCursor = state.log.length;
/** 輪流對槽 0 注入，促使變身 */
let injectFocus = 0;

while (state.phase !== 'ended' && guard < MAX_STEPS) {
  guard++;
  const phaseBefore = state.phase;

  if (state.phase === 'player_action') {
    // 腳本：每回合對一個友方槽注入 2 點，並自動選技能
    const slot = injectFocus % state.allies.length;
    const ally = state.allies[slot];
    const spend = Math.min(2, state.energy > 0 ? 2 : 0);
    // energy 會在 produce_energy 後增加，此處先宣告意圖
    state = step(state, {
      type: 'choose_inject',
      slotIndex: slot,
      spend: spend > 0 ? spend : 1,
    });
    injectFocus++;
  } else if (
    state.phase === 'select_inject' ||
    state.phase === 'produce_energy'
  ) {
    // 若卡在等輸入：補注入或 skip
    const slot = (injectFocus - 1 + state.allies.length) % state.allies.length;
    if (state.energy >= 1) {
      state = step(state, {
        type: 'choose_inject',
        slotIndex: slot,
        spend: Math.min(2, state.energy, config.inject.maxEnergySpendPerInject ?? 2),
      });
    } else {
      state = step(state, { type: 'skip_inject' });
    }
  } else {
    state = step(state, { type: 'auto_continue' });
  }

  // 印出本步新增的相位轉換（遞迴 step 會一次跨多相位）
  const newLogs = state.log.slice(logCursor);
  logCursor = state.log.length;
  for (const e of newLogs) {
    if (e.message.startsWith('→ ') || e.message.includes('勝利') || e.message.includes('敗北') || e.message.includes('變身')) {
      console.log(`[T${e.turn}] ${e.phase}: ${e.message}`);
    }
  }

  if (state.phase !== phaseBefore && state.phase === 'ended') {
    console.log(`[phase] ${phaseBefore} → ${state.phase} (turn ${state.turn})`);
  }

  scanStateForForbidden(state);
}

assert(state.phase === 'ended', `應結束但 phase=${state.phase} guard=${guard}`);
assert(state.outcome !== null, '應有 outcome');

console.log('\n' + summarize(state));
console.log(`\n總步驟=${guard} 最終 outcome=${state.outcome}`);
console.log('相位轉換次數（log 條數）=', state.log.length);

// 確認至少發生過一次變身（若注入足夠）
const transformed = state.allies.some((c) => c.formTier > 0);
console.log(transformed ? 'OK: 至少一張友方已變身' : 'NOTE: 本場無人變身（可能注入不足）');

scanStateForForbidden(state);
console.log('\n全部斷言通過。無玩家面向 金/木/土。');
