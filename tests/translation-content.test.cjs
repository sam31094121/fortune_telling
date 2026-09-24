const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/translation-content.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { module: moduleUnderTest, exports: moduleUnderTest.exports });
const { parseSrt, renderTranslatedSrt } = moduleUnderTest.exports;
const input = '\uFEFF1\r\n00:00:01,000 --> 00:00:03,250\r\nHello\r\nworld\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\nGoodbye';
const cues = parseSrt(input);
assert.equal(cues.length, 2);
const result = renderTranslatedSrt(cues, ['你好，世界', '再見'], true);
assert.ok(result.includes('Hello\nworld\n你好，世界'));
const output = parseSrt(result);
assert.equal(output[0].timing, cues[0].timing);
assert.equal(output[1].index, '2');
assert.throws(() => renderTranslatedSrt(cues, ['only one']));
assert.throws(() => renderTranslatedSrt(cues, ['bad\n\nblock', 'ok']));
assert.throws(() => parseSrt('1\n00:00:05,000 --> 00:00:01,000\nBad timing'));
assert.throws(() => parseSrt('1\n00:70:00,000 --> 00:71:00,000\nBad minutes'));
assert.throws(() => parseSrt('1\n00:00:01,000 --> 00:00:03,000\n' + 'x'.repeat(5001)));
assert.throws(() => parseSrt(input + '\n\n2\n00:00:06,000 --> 00:00:07,000\nDuplicate'));
console.log('PASS: SRT timing/order preservation, bilingual output, malformed and incomplete results rejected');
