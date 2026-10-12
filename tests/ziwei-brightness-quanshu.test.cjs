// 紫微斗數單一版本守門：排盤結果一律對齊《紫微斗數全書》（公有領域古籍），iztro 只提供計算。
//  1. 主星、輔星亮度＝卷二廟旺表（data/ziwei/quanshu-brightness-table.txt 逐字存檔，測試自己解析，不信任 TS 表）
//  2. 四化＝卷二〈安祿權科忌四星變化詁〉：甲廉破武陽、乙機梁紫月、丙同機昌廉、丁月同機巨、戊貪月弼機、
//     己武貪梁曲、庚日武陰同、辛巨陽曲昌、壬梁紫府武、癸破巨陰貪（順序＝祿權科忌）
// iztro 2.5.8 的差異：七殺/太陰/太陽@酉 亮度，壬干化科取左輔（古籍為天府）。這支測試鎖住「引擎輸出＝古籍」。
// 執行：node tests/ziwei-brightness-quanshu.test.cjs（不需 dev server）
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

const cache = {};
function loadTs(file) {
  if (cache[file]) return cache[file];
  const out = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const m = { exports: {} };
  const req = (id) => (id === './brightness-quanshu' ? loadTs('lib/ziwei/brightness-quanshu.ts') : require(id));
  new Function('module', 'exports', 'require', out)(m, m.exports, req);
  return (cache[file] = m.exports);
}

let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.equal(a, b, m); checks++; };

// ── 解析古籍表（每個地支三行，標籤在中間行）
const LV = ['廟', '旺', '得', '利', '平', '不', '陷'];
const NAME = { 紫: '紫微', 机: '天機', 日: '太陽', 武: '武曲', 同: '天同', 廉: '廉貞', 府: '天府', 月: '太陰', 贪: '貪狼', 巨: '巨門', 相: '天相', 梁: '天梁', 杀: '七殺', 破: '破軍', 昌: '文昌', 曲: '文曲', 禄: '祿存', 羊: '擎羊', 陀: '陀羅', 火: '火星', 铃: '鈴星' };
const lines = fs.readFileSync(path.join(root, 'data/ziwei/quanshu-brightness-table.txt'), 'utf8').split('\n').filter((l) => l.startsWith('|') && !/庙/.test(l));
eq(lines.length, 36, '古籍表 12 宮 × 3 行');
const book = {};
for (let i = 0; i < lines.length; i += 3) {
  const g = lines.slice(i, i + 3);
  const br = g.map((l) => l.split('|')[1].trim()).find(Boolean);
  for (const l of g) l.split('|').slice(2, -1).forEach((cell, k) => { for (const ch of cell) if (NAME[ch]) book[`${NAME[ch]}@${br}`] = LV[k]; });
}
eq(Object.keys(book).length, 240, '古籍表 240 個星×宮條目');

// ── TS 表必須逐條等於古籍
const { quanshuBrightness, ZIWEI_MAJOR_BRIGHTNESS_QUANSHU: table } = loadTs('lib/ziwei/brightness-quanshu.ts');
eq(Object.keys(table).length, 14, '十四主星');
const MAJORS = new Set(Object.keys(table));
for (const [k, v] of Object.entries(book)) {
  const [n, b] = k.split('@');
  if (MAJORS.has(n)) eq(quanshuBrightness(n, b), v, `TS 表 ${k}`);
}
eq(quanshuBrightness('七殺', '酉'), '旺', '七殺在酉＝旺（古籍），不是廟');
eq(quanshuBrightness('太陰', '酉'), '旺'); eq(quanshuBrightness('太陽', '酉'), '平');
ok(quanshuBrightness('七殺', '？') === undefined && quanshuBrightness('不存在', '酉') === undefined, '查不到回傳 undefined');

// ── 引擎實排：大量盤面逐星對照古籍
const engine = loadTs('lib/ziwei/engine.ts');
const FOUR = { 甲: '廉破武陽', 乙: '機梁紫月', 丙: '同機昌廉', 丁: '月同機巨', 戊: '貪月弼機', 己: '武貪梁曲', 庚: '日武陰同', 辛: '巨陽曲昌', 壬: '梁紫府武', 癸: '破巨陰貪' };
const FULL = { 廉: '廉貞', 破: '破軍', 武: '武曲', 陽: '太陽', 機: '天機', 梁: '天梁', 紫: '紫微', 月: '太陰', 同: '天同', 昌: '文昌', 貪: '貪狼', 弼: '右弼', 巨: '巨門', 曲: '文曲', 陰: '太陰', 日: '太陽', 府: '天府' };
const MUT = ['祿', '權', '科', '忌'];
const stemsSeen = new Set();
let charts = 0;
for (let y = 1950; y <= 2010; y += 1) {
  for (const [m, h] of [[2, 0], [6, 5], [9, 8], [12, 11]]) {
    const a = engine.createZiweiAstrolabe({ calendarType: 'solar', date: `${y}-${m}-15`, timeIndex: h, gender: 'male', fixLeap: true });
    charts++;
    const stars = [];
    for (const p of a.palaces) for (const s of [...p.majorStars, ...p.minorStars]) stars.push({ ...s, branch: p.earthlyBranch });
    for (const s of stars) {
      const want = book[`${s.name}@${s.branch}`];
      if (want && s.brightness) eq(s.brightness, want, `${y}-${m} ${s.name}@${s.branch} 亮度對齊古籍`);
    }
    // 四化：以 iztro 實際標出的四化星為準，必須等於古籍該干的四星
    const got = {};
    for (const s of stars) if (s.mutagen) got[s.mutagen] = s.name;
    const stem = Object.keys(FOUR).find((k) => {
      const want = [...FOUR[k]].map((c) => FULL[c]);
      return MUT.every((mu, i) => got[mu] === want[i]);
    });
    ok(stem, `${y}-${m} 四化 ${JSON.stringify(got)} 必須等於古籍某一干`);
    stemsSeen.add(stem);
  }
}
eq(stemsSeen.size, 10, '十個天干的四化都實測過');
ok(charts >= 200, `實排 ${charts} 盤`);

// ── 指定盤：1974-06-28 18:00 男（命宮酉）
const a74 = engine.createZiweiAstrolabe({ calendarType: 'solar', date: '1974-6-28', timeIndex: 9, gender: 'male', fixLeap: true });
const qisha = a74.palaces.find((p) => p.earthlyBranch === '酉').majorStars.find((s) => s.name === '七殺');
eq(qisha.brightness, '旺', '引擎輸出七殺（旺）');
const core = engine.createZiweiCore({ calendarType: 'solar', date: '1974-6-28', timeIndex: 9, gender: 'male', fixLeap: true });
eq(core.lifePalace.majorStarDetails.find((s) => s.name === '七殺').brightness, '旺', 'createZiweiCore 七殺（旺）');

console.log(`ziwei-brightness-quanshu: ${checks} checks passed（${charts} 盤實排）`);
