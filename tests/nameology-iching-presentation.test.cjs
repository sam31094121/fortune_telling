const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const ctx={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/nameology-iching-presentation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);
const gua={hexagramName:'測試卦',kingWen:1,glyph:'䷀',upper:{name:'乾'},lower:{name:'乾'},changingLine:3,essence:'既有卦義',advice:'既有建議',seedText:'私人出生資料'};
for(const hasHour of [true,false]) {
  const output=ctx.exports.presentNameologyIChing(gua,hasHour);
  assert.equal(output.hexagramName,gua.hexagramName);
  assert.equal(output.changingLine,gua.changingLine);
  assert.equal(output.essence,gua.essence);
  assert.equal(output.method,hasHour?'birth-date-hour':'name-date-symbolic');
  assert.equal(output.seedText,undefined);
}
const route=fs.readFileSync('app/api/nameology-analyze/route.ts','utf8');
assert.ok(route.includes('analysis.iching = presentNameologyIChing(gua, normalized.shichen != null)'));
console.log('PASS: backend hexagram fields preserved, method differentiated, private seed omitted');
