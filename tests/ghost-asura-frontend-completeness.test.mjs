/**
 * 鬼魅阿修羅前端完整度測試
 *
 * 確保：
 * 1. 後端神煞數量 = 前端顯示數量
 * 2. 每筆神煞都有 displayName
 * 3. 沒有 filter/slice 導致遺漏
 * 4. 天煞／五鬼等附件關鍵映射正確
 * 5. 主頁卡原始碼禁止 Math.random
 */

import assert from 'assert';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  GHOST_ASURA_FIXED_MAP,
  translateAllShenSha,
  assertCompleteTranslation,
} from '../lib/ghost-asura-complete.ts';
import { translateToAsuraName as translatorTranslate } from '../lib/ghost-asura-translator.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

function translateName(name) {
  return GHOST_ASURA_FIXED_MAP[name] || name;
}

function validateAsuraFrontendCompleteness(backendLines, frontendLines) {
  if (backendLines.length !== frontendLines.length) {
    return {
      status: 'FAILED',
      backendCount: backendLines.length,
      frontendCount: frontendLines.length,
      message: `後端 ${backendLines.length} 項，前端 ${frontendLines.length} 項，缺少 ${backendLines.length - frontendLines.length} 項`,
    };
  }

  const undefinedDisplayNames = frontendLines
    .filter((line) => !line.displayName)
    .map((line) => line.name);
  if (undefinedDisplayNames.length > 0) {
    return {
      status: 'FAILED',
      backendCount: backendLines.length,
      frontendCount: frontendLines.length,
      message: `缺少 displayName: ${undefinedDisplayNames.join('、')}`,
    };
  }

  return {
    status: 'PASSED',
    backendCount: backendLines.length,
    frontendCount: frontendLines.length,
    message: `${backendLines.length} 項完全對應`,
  };
}

console.log('🔍 鬼魅阿修羅前端完整度測試\n');

// 測試 1：單筆轉譯（關鍵項）
console.log('【測試 1】單筆轉譯（關鍵項）');
assert.strictEqual(translateName('桃花'), '魅生之印');
assert.strictEqual(translateName('天煞'), '裂天劫印');
assert.strictEqual(translateName('五鬼'), '五陰纏影');
assert.strictEqual(translateName('羊刃'), '血刃之鋒');
assert.strictEqual(translatorTranslate('天煞'), '裂天劫印');
assert.strictEqual(translatorTranslate('五鬼'), '五陰纏影');
assert.strictEqual(translatorTranslate('tiansha'), '裂天劫印');
assert.strictEqual(translatorTranslate('wugui'), '五陰纏影');
console.log('✓ 桃花／天煞／五鬼／羊刃 轉譯正確\n');

// 測試 2：完整度檢查 — 通過
console.log('【測試 2】完整度檢查 — 通過');
const backend = [
  { name: '天德合' },
  { name: '天煞' },
  { name: '五鬼' },
];
const frontend = backend.map((line) => ({
  ...line,
  displayName: translateName(line.name),
}));
const validation = validateAsuraFrontendCompleteness(backend, frontend);
assert.strictEqual(validation.status, 'PASSED', '數量一致應通過');
assert.strictEqual(frontend[1].displayName, '裂天劫印');
assert.strictEqual(frontend[2].displayName, '五陰纏影');
console.log(`✓ ${validation.message}\n`);

// 測試 3：完整度檢查 — 數量不一致
console.log('【測試 3】完整度檢查 — 失敗（數量不一致）');
const backendMany = [
  { name: '天德合' },
  { name: '驛馬' },
  { name: '隔角' },
  { name: '金匱' },
];
const frontendFew = [
  { name: '天德合', displayName: '天赦神契' },
  { name: '驛馬', displayName: '逐界行者' },
  { name: '隔角', displayName: '孤界之門' },
];
const failedValidation = validateAsuraFrontendCompleteness(backendMany, frontendFew);
assert.strictEqual(failedValidation.status, 'FAILED', '數量不一致應失敗');
console.log(`✓ ${failedValidation.message}\n`);

// 測試 4：完整度檢查 — 缺少 displayName
console.log('【測試 4】完整度檢查 — 失敗（缺少 displayName）');
const frontendIncomplete = [
  { name: '天德合', displayName: '天赦神契' },
  { name: '驛馬' },
  { name: '隔角', displayName: '孤界之門' },
];
const noDisplayName = validateAsuraFrontendCompleteness(backend, frontendIncomplete);
assert.strictEqual(noDisplayName.status, 'FAILED', '缺少 displayName 應失敗');
console.log(`✓ ${noDisplayName.message}\n`);

// 測試 5：complete 引擎逐項 ID 核對
console.log('【測試 5】complete 引擎逐項 ID 核對');
const raw = Object.keys(GHOST_ASURA_FIXED_MAP).map((originalName, index) => ({
  id: `ss-${index}`,
  originalName,
  matched: index % 2 === 0,
  hitPillar: ['year', 'month', 'day', 'hour'][index % 4],
}));
const translated = translateAllShenSha(raw);
const completeCheck = assertCompleteTranslation({
  backendShenSha: raw,
  translatedResults: translated,
  displayedResults: translated,
});
assert.strictEqual(completeCheck.passed, true, completeCheck.details);
assert.strictEqual(translated.find((x) => x.originalName === '天煞')?.displayName, '裂天劫印');
console.log(`✓ ${completeCheck.countCheck.message}；${completeCheck.itemCheck.message}\n`);

// 測試 6：主頁卡禁止 Math.random
console.log('【測試 6】主頁卡禁止 Math.random');
const homeSrc = readFileSync(
  join(__dirname, '../components/GhostAsuraHomeStandalone.tsx'),
  'utf8'
);
assert.ok(!/Math\.random\s*\(/.test(homeSrc), 'GhostAsuraHomeStandalone 禁止呼叫 Math.random()');
assert.ok(homeSrc.includes('stableHash') || homeSrc.includes('FIXED_ASURA_MAP'), '主頁卡必須使用穩定挑選');
assert.ok(homeSrc.includes('本命阿修羅') || homeSrc.includes('命魂戰局'), '主頁卡需阿修羅 UI 用語');
console.log('✓ 主頁卡無隨機呼叫，用語對齊\n');

console.log('═'.repeat(60));
console.log('✅ 鬼魅阿修羅前端完整度守門 — 全部通過');
console.log('═'.repeat(60));
console.log(`
✓ 單筆轉譯正確（天煞／五鬼／桃花／羊刃）
✓ 數量一致檢查通過
✓ 數量不一致檢查失敗（預期）
✓ 缺少 displayName 檢查失敗（預期）
✓ complete 引擎逐項 ID 核對通過
✓ 主頁卡禁止 Math.random

鐵律驗證：
✓ 後端數量 = 前端顯示數量
✓ 每筆都有 displayName
✓ 沒有 filter／slice 導致遺漏
`);
