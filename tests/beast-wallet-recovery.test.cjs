// 共同卡庫識別碼的格式與還原規則（純函式）。瀏覽器端的多重保存另由實機試玩驗證。
const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, f);
const W = require('../lib/beast-wallet-recovery.ts');
const key = '8969904efd9ed2c22c52425cd844a0fd7c8363f34b8c6f6985c83bf478c7932b';
assert.equal(W.isWalletKey(key), true);
for (const bad of ['', 'abc', key.slice(1), key + 'a', key.toUpperCase(), 'g'.repeat(64), null, 123]) assert.equal(W.isWalletKey(bad), false, String(bad));
const code = W.formatRecoveryCode(key);
assert.equal(code.split('-').length, 8); assert.ok(code.split('-').every(part => part.length === 8));
assert.equal(W.parseRecoveryCode(code), key, '格式化後可以還原成同一把');
assert.equal(W.parseRecoveryCode(code.toUpperCase()), key, '大小寫不拘');
assert.equal(W.parseRecoveryCode('  ' + code.replaceAll('-', ' ') + '\n'), key, '空白、換行、分隔符號都能容忍');
assert.equal(W.parseRecoveryCode(code.slice(0, -1)), null, '少一個字元不收');
assert.equal(W.parseRecoveryCode(''), null);
// 客戶端必須先找回識別碼再決定要不要建新的，且已接過共同卡庫卻找不回時不得偷偷建空卡庫
const client = fs.readFileSync(require('node:path').join(__dirname, '../lib/beast-cultivation-client.ts'), 'utf8');
assert.match(client, /await recoverWalletKey\(\)/); assert.match(client, /if\(old\.sharedCultivation\)throw new Error\(WALLET_LOST_MESSAGE\)/);
console.log('PASS wallet recovery: format/parse round trip, tolerant input, invalid rejected, no silent empty vault when key lost');
