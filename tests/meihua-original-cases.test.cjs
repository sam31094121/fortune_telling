const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const compiledModule = { exports: {} };
const source = fs.readFileSync(path.join(root, 'lib/iching-engine.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports,
  require: id => require(id.startsWith('.') ? path.join(root, 'lib', id) : id) });
const { calculateMeihuaTimeNumbers } = compiledModule.exports;
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'docs/技能戰鬥檔案/易經/梅花年月日時原典算例.json'), 'utf8'));
for (const item of fixtures.cases) {
  assert.deepEqual(JSON.parse(JSON.stringify(calculateMeihuaTimeNumbers(item.input))), item.expected, item.name);
}
const valid = { yearNumber: 5, monthNumber: 12, dayNumber: 17, hourNumber: 9 };
for (const input of [{ ...valid, yearNumber: 2024 }, { ...valid, monthNumber: -5 }, { ...valid, dayNumber: 31 }, { ...valid, hourNumber: null }, { ...valid, hourNumber: 1.5 }]) {
  assert.throws(() => calculateMeihuaTimeNumbers(input), /MEIHUA_INVALID_TRADITIONAL_NUMBER/);
}
// 獨立邊界手算：1+1+6=8，上卦坤；加4=12，下卦震、動爻六。
assert.deepEqual(JSON.parse(JSON.stringify(calculateMeihuaTimeNumbers({ yearNumber: 1, monthNumber: 1, dayNumber: 6, hourNumber: 4 }))), {
  upperSum: 8, totalSum: 12, upper: '坤', lower: '震', hexagramName: '地雷復', changingLine: 6,
});
console.log('PASS: 2 original examples, remainder boundary, invalid traditional numbers; customer birth pipeline not certified');
