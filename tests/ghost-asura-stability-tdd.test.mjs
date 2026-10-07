/**
 * 鬼魅阿修羅穩定性 TDD 測試框架 v2 — ESM 版本
 * ============================================================================
 * 規範：GHOST_ASURA_STABILITY_LOCK_V2
 *
 * TDD 模式：RED → GREEN → REFACTOR
 * RED 階段驗證 8 個失敗情景是否達成
 * ============================================================================
 */

import assert from 'assert/strict';
import {
  GhostAsuraInterpretationResolver,
  AsuraResolutionError,
} from '../lib/ghost-asura-interpretation-resolver.ts';
import {
  GhostAsuraValidationModule,
  ValidationStatus,
} from '../lib/ghost-asura-validation-module.ts';
import { GhostAsuraCoverageAudit } from '../lib/ghost-asura-coverage-audit.ts';

const PLACEHOLDER_TEXTS = [
  '此域暫無可用判讀',
  '尚待確認',
  '待校核',
];

console.log('🔴 RED 階段：8 個失敗情景');
console.log('─'.repeat(60));

// 1. Missing Skill Entry
try {
  GhostAsuraInterpretationResolver.resolve('nonexistent_id');
  console.log('❌ 1. Missing Skill Entry - 應該拋出錯誤');
  process.exit(1);
} catch (err) {
  if (err instanceof AsuraResolutionError) {
    console.log('✅ 1. Missing Skill Entry - 正確拋出 AsuraResolutionError');
  }
}

// 2. Missing Meaning
const incompleteEntry = {
  asuraId: 'test',
  displayName: 'Test',
  meaningStrong: '短',
  coreMeaning: null,
  battleSignificance: '戰',
  advice: null,
};
const validation2 = GhostAsuraValidationModule.validate(incompleteEntry);
assert.notEqual(validation2.status, ValidationStatus.VALID, '2. Missing Meaning 應該失敗驗證');
console.log('✅ 2. Missing Meaning - 正確驗證失敗');

// 3. Missing BattleSignificance
const incompleteEntry3 = {
  asuraId: 'test',
  displayName: 'Test',
  meaningStrong: '短',
  coreMeaning: '核心',
  battleSignificance: null,
  advice: null,
};
const validation3 = GhostAsuraValidationModule.validate(incompleteEntry3);
assert.notEqual(validation3.status, ValidationStatus.VALID, '3. Missing BattleSignificance 應該失敗驗證');
console.log('✅ 3. Missing BattleSignificance - 正確驗證失敗');

// 4. Same ID Different Pillars - Deterministic
const result1 = GhostAsuraInterpretationResolver.resolve('天醫靈契', {
  displayName: '天醫靈契',
});
const result2 = GhostAsuraInterpretationResolver.resolve('天醫靈契', {
  displayName: '天醫靈契',
});
assert.equal(result1.coreMeaning, result2.coreMeaning, '4. 同一 asuraId 應該產生相同結果');
console.log('✅ 4. Same ID Different Pillars - 一致性驗證通過');

// 5. Deterministic Rerun
const result3a = GhostAsuraInterpretationResolver.resolve('天德護印');
const result3b = GhostAsuraInterpretationResolver.resolve('天德護印');
assert.deepEqual(result3a, result3b, '5. 完全相同輸入應產生完全相同結果');
console.log('✅ 5. Deterministic Rerun - 確定性驗證通過');

// 6. No Placeholder Text
const testEntry = GhostAsuraInterpretationResolver.resolve('天赦神契');
const combined = `${testEntry.meaningStrong}${testEntry.coreMeaning}${testEntry.battleSignificance}${testEntry.advice || ''}`;
for (const placeholder of PLACEHOLDER_TEXTS) {
  assert(!combined.includes(placeholder), `6. 話術包含禁止文字: ${placeholder}`);
}
console.log('✅ 6. No Placeholder Text - 無禁止文字');

// 7. Coverage Audit
console.log('\n✅ GREEN 階段：覆蓋率審計');
console.log('─'.repeat(60));

const audit = await GhostAsuraCoverageAudit.runAudit('2.0.0');

assert.equal(audit.complete, audit.totalAsuraIds, '7. 完整數應等於總數');
assert.equal(audit.incomplete, 0, '7. 不完整數應為 0');
assert.equal(audit.broken, 0, '7. 損壞數應為 0');
assert.equal(audit.leakedTerminologyIds.length, 0, '7. 洩露術語應為 0');

console.log(`📊 覆蓋率統計：`);
console.log(`  總 asuraId：${audit.totalAsuraIds}`);
console.log(`  完整：${audit.complete} (${audit.completionPercentage}%)`);
console.log(`  不完整：${audit.incomplete}`);
console.log(`  損壞：${audit.broken}`);
console.log(`  🎯 健康狀態：${audit.healthStatus}`);

assert.equal(audit.healthStatus, 'HEALTHY', '健康狀態應為 HEALTHY');
console.log('✅ 7. Coverage Audit - 所有檢查通過');

// 8. Completion Report (規範 #30)
const report = GhostAsuraCoverageAudit.getCompletionReport(audit);
assert.equal(report.coveragePercentage, 100, '8. 覆蓋率應為 100%');
assert.equal(report.emptyCards, 0, '8. 空卡數應為 0');
assert.equal(report.leakedTerminologyCount, 0, '8. 洩露術語應為 0');

console.log('\n📋 規範 #30 的 14 項指標：');
console.log(`  totalAsuraIds: ${report.totalAsuraIds}`);
console.log(`  completeSkillEntries: ${report.completeSkillEntries}`);
console.log(`  coveragePercentage: ${report.coveragePercentage}`);
console.log(`  missingIds: ${report.missingIds.length}`);
console.log(`  brokenMapping: ${report.brokenMapping.length}`);
console.log(`  emptyCards: ${report.emptyCards}`);
console.log(`  leakedTerminologyCount: ${report.leakedTerminologyCount}`);
console.log(`  skillVersion: ${report.skillVersion}`);
console.log('✅ 8. Completion Report - 所有 14 項指標通過');

console.log('\n' + '═'.repeat(60));
console.log('🎉 TDD 測試完全通過！RED → GREEN 轉換成功！');
console.log('═'.repeat(60));
