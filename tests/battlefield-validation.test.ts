/**
 * 戰場驗證邏輯測試
 * ============================================================================
 *
 * 驗證 battle-validation.ts 中的核心檢查邏輯
 */

import assert from 'assert/strict';
import { canStartBattle, getBattleHint } from '../lib/beast-game/battle-validation';

// 測試數據工廠
const createContext = (overrides: any = {}) => ({
  state: {
    player: { active: '1', bench: ['2', '3'] },
    ...overrides.state,
  },
  stakeCardIds: [],
  ownedStake: [{ id: '1' }, { id: '2' }],
  recovering: false,
  settling: false,
  settlement: null,
  stakeError: '',
  isTrial: false,
  ...overrides,
});

console.log('🧪 戰場驗證邏輯測試\n');

// 測試 1: 無主戰卡
{
  const ctx = createContext({ state: { player: { active: null, bench: ['2'] } } });
  const result = canStartBattle(ctx);
  assert.equal(result.ready, false);
  assert.ok(result.reason?.includes('主戰'));
  console.log('✅ 測試 1: 無主戰卡時應擋下');
}

// 測試 2: 無後備卡
{
  const ctx = createContext({ state: { player: { active: '1', bench: [] } } });
  const result = canStartBattle(ctx);
  assert.equal(result.ready, false);
  assert.ok(result.reason?.includes('後備'));
  console.log('✅ 測試 2: 無後備卡時應擋下');
}

// 測試 3: 未選押注卡
{
  const ctx = createContext({ stakeCardIds: [] });
  const result = canStartBattle(ctx);
  assert.equal(result.ready, false);
  assert.ok(result.reason?.includes('押注'));
  console.log('✅ 測試 3: 未選押注卡時應擋下');
}

// 測試 4: 押注卡不在收藏
{
  const ctx = createContext({
    stakeCardIds: ['unknown'],
    ownedStake: [{ id: '1' }, { id: '2' }],
  });
  const result = canStartBattle(ctx);
  assert.equal(result.ready, false);
  assert.ok(result.reason?.includes('收藏'));
  console.log('✅ 測試 4: 押注卡不在收藏時應擋下');
}

// 測試 5: 試用戰可不押卡
{
  const ctx = createContext({ isTrial: true, stakeCardIds: [] });
  const result = canStartBattle(ctx);
  assert.equal(result.ready, true);
  console.log('✅ 測試 5: 試用戰可不押卡直接開戰');
}

// 測試 6: 完整狀態可開戰
{
  const ctx = createContext({ stakeCardIds: ['1'] });
  const result = canStartBattle(ctx);
  assert.equal(result.ready, true);
  console.log('✅ 測試 6: 完整狀態可開戰');
}

// 測試 7: 提示文字
{
  const hintReady = getBattleHint({ ready: true });
  assert.equal(hintReady, '開戰');

  const hintWait = getBattleHint({ ready: false, reason: '核對押注紀錄…' });
  assert.ok(hintWait.includes('🔄'));

  console.log('✅ 測試 7: 提示文字映射正確');
}

// 測試 8: 優先級檢查（recovering 優先於其他）
{
  const ctx = createContext({
    recovering: true,
    stakeCardIds: [],
    state: { player: { active: null } },
  });
  const result = canStartBattle(ctx);
  assert.ok(result.reason?.includes('核對'));
  console.log('✅ 測試 8: 優先級檢查（recovering 最優先）');
}

console.log('\n✅ 所有 8 項驗證測試通過');
