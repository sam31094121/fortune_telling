// AUDIT-2 H5（fix-3）：寶珠闖關五語字典守門。每個鍵三語都有譯文、譯文不等於原文、不含繁中；動態句樣本能套用；只在神獸戰鬥頁生效。
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const ts = require('typescript');
const src = fs.readFileSync(path.join(__dirname, '../lib/i18n-copy/match3.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} }; const win = { location: { pathname: '/beast-game/match3-hard' } };
vm.runInNewContext(js, { module: mod, exports: mod.exports, require, window: win });
const { createMatch3Translator, onMatch3Page, MATCH3_COPY_KEYS, MATCH3_PATTERN_COUNT } = mod.exports;
let n = 0; const jaSame = [];
for (const loc of ['en', 'ja', 'ko']) {
  const t = createMatch3Translator(loc);
  for (const k of MATCH3_COPY_KEYS) {
    const v = t(k); assert.ok(v && v.trim(), `${loc} 缺譯文：${k}`); if (loc === 'ja' && v === k) jaSame.push(k); else assert.notEqual(v, k, `${loc} 譯文等於原文：${k}`);
    if (loc !== 'ja') assert.ok(!/[\u4e00-\u9fff]/.test(v), `${loc} 譯文混入漢字：${k} → ${v}`);
    n++;
  }
}
const samples = {
  '已選 2／4 位夥伴，還差 3 位': ['2/4 companions chosen, 3 to go', '仲間 2／4 体を選択、あと 3 体', '동료 2/4명 선택, 3명 남음'],
  '攻 74／上限 111': ['ATK 74 / cap 111', '攻撃 74／上限 111', '공격 74/상한 111'],
  '強化青龍，攻擊 74／上限 111': ['Boost 青龍, attack 74 / cap 111', '青龍を強化、攻撃 74／上限 111', '青龍 강화, 공격 74/상한 111'],
  '確認出手（3 顆）': ['Confirm move (3)', '確定して出す（3 個）', '확정하고 공격(3개)'],
  ' 張（幼子 3、同卡共鳴 1），材料剩 ': [' cards (young 3, resonance 1), materials left:', '枚（幼獣 3、同カード共鳴 1）、残りの素材', '장(어린 신수 3, 같은 카드 공명 1), 남은 재료'],
  '壁水貐・幼子，出戰攻擊 27': ['壁水貐・幼子, battle attack 27', '壁水貐・幼子、出撃時の攻撃 27', '壁水貐・幼子, 출전 공격 27'],
  '顯示全部 28 張幼子': ['Show all 28 young beasts', '幼獣を全 28 枚表示', '어린 신수 28장 모두 보기'],
};
for (const [zh, [en, ja, ko]] of Object.entries(samples)) {
  const core = zh.trim();
  assert.equal(createMatch3Translator('en')(core), en.trim() === en ? en : en, `en 動態句：${zh}`);
  assert.equal(createMatch3Translator('ja')(core), ja); assert.equal(createMatch3Translator('ko')(core), ko);
}
assert.equal(createMatch3Translator('en')('幼子'), undefined, '「幼子」單字不收（卡面小標籤同字）');
assert.equal(createMatch3Translator('en')('完全無關的句子'), undefined, '查不到就保留原文');
assert.equal(createMatch3Translator('en')('第 13 關 · 6顆可攻擊'), 'Stage 13 · 6 orbs to attack');
assert.equal(createMatch3Translator('ko')('回合 3'), '3턴');
// 簡中大陸用語補正（只在神獸戰鬥頁）
const { fixMatch3Hans } = mod.exports;
assert.equal(fixMatch3Hans('伺服端目前没有共用的战局纪录保存'), '服务器目前没有共用的战局记录保存');
assert.equal(fixMatch3Hans('下载自己的存盘'), '下载自己的存档');
assert.equal(fixMatch3Hans('选择宝珠备份档（最多 2 MB）'), '选择宝珠备份文件（最多 2 MB）');
assert.equal(onMatch3Page(), true); win.location.pathname = '/'; assert.equal(onMatch3Page(), false, '首頁不套用');
assert.equal(fixMatch3Hans('伺服端纪录'), '伺服端纪录', '其他頁面不補正');
assert.ok(jaSame.length <= 5, `日文和原文完全相同的太多：${jaSame.join('、')}`);
console.log(`日文與原文同字（日文本來就這樣寫）：${jaSame.join('、') || '無'}`);
console.log(`PASS i18n match3 copy: ${MATCH3_COPY_KEYS.length} keys × 3 locales (${n}), ${MATCH3_PATTERN_COUNT} patterns, samples ok`);
