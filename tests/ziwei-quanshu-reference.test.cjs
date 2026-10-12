// 紫微斗數對照古籍（獨立計算）：依《紫微斗數全書》安星口訣算出標準答案，逐盤對照排盤引擎輸出。
// 範圍與分類見 data/ziwei/quanshu-coverage.json；口訣原文見 data/ziwei/quanshu-rules.md。
// 執行：node tests/ziwei-quanshu-reference.test.cjs（不需 dev server）
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { Solar } = require('lunar-typescript');
const root = path.resolve(__dirname, '..');
const cache = {};
function loadTs(file) {
  if (cache[file]) return cache[file];
  const out = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const m = { exports: {} };
  const req = (id) => (id === './brightness-quanshu' ? loadTs('lib/ziwei/brightness-quanshu.ts') : require(id));
  new Function('module', 'exports', 'require', out)(m, m.exports, req);
  return (cache[file] = m.exports);
}
const R = loadTs('lib/ziwei/quanshu-reference.ts');
const engine = loadTs('lib/ziwei/engine.ts');
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'data/ziwei/quanshu-coverage.json'), 'utf8'));
const { BRANCHES: BR, STEMS: ST } = R;
let checks = 0;
const eq = (a, b, m) => { assert.equal(a, b, m); checks += 1; };
const yes = (c, m) => { assert.ok(c, m); checks += 1; };
const SEQ = ['博士', '力士', '青龍', '小耗', '將軍', '奏書', '飛廉', '喜神', '病符', '大耗', '伏兵', '官府'];
const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
const BUREAU = { 水二局: 2, 木三局: 3, 金四局: 4, 土五局: 5, 火六局: 6 };
const JIE_PAIR = { 0: [8, 9], 5: [8, 9], 1: [6, 7], 6: [6, 7], 2: [4, 5], 7: [4, 5], 3: [2, 3], 8: [2, 3], 4: [0, 1], 9: [0, 1] };
const seenStars = new Set();
let charts = 0;

for (let y = 1950; y <= 2010; y += 1) {
  for (const [m, d, h] of [[2, 3, 0], [3, 17, 5], [5, 28, 9], [7, 9, 2], [8, 22, 7], [10, 13, 11], [11, 29, 3], [12, 5, 8]]) {
    const lunar = Solar.fromYmd(y, m, d).getLunar();
    if (lunar.getMonth() < 0) continue; // 閏月：古籍口訣沒有閏月規則，不納入
    const ys = ST.indexOf(lunar.getYearGan());
    const yb = BR.indexOf(lunar.getYearZhi());
    const month = lunar.getMonth();
    const day = lunar.getDay();
    for (const gender of ['男', '女']) {
      const a = engine.createZiweiAstrolabe({ calendarType: 'solar', date: `${y}-${m}-${d}`, timeIndex: h, gender, fixLeap: true });
      charts += 1;
      const tag = `${y}-${m}-${d}/${h}${gender}`;
      const pos = {};
      const palaceAt = {};
      for (const p of a.palaces) {
        const b = BR.indexOf(p.earthlyBranch);
        palaceAt[b] = p;
        for (const s of [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]) {
          (pos[s.name] = pos[s.name] || []).push(b);
          seenStars.add(s.name);
        }
      }
      // 命宮、身宮、十二宮次序
      const { life, body } = R.lifeAndBody(month, h);
      eq(BR.indexOf(a.palaces.find((p) => p.name === '命宮').earthlyBranch), life, `${tag} 命宮`);
      eq(BR.indexOf(a.palaces.find((p) => p.isBodyPalace).earthlyBranch), body, `${tag} 身宮`);
      PALACES.forEach((name, k) => eq(palaceAt[(((life - k) % 12) + 12) % 12].name, name, `${tag} 十二宮次序 ${name}`));
      // 五行局（五虎遁＋納音）
      const bureau = R.bureauOf(R.palaceStem(ys, life), life);
      eq(BUREAU[a.fiveElementsClass], bureau, `${tag} 五行局`);
      // 十四主星
      for (const [name, b] of Object.entries(R.majorStars(R.ziweiBranch(bureau, day)))) eq(pos[name][0], b, `${tag} ${name}`);
      // 輔星、小星（古籍有位置口訣者）
      const minors = R.minorStars({ yearStem: ys, yearBranch: yb, month, day, hour: h }, 0);
      for (const [name, b] of Object.entries(minors)) eq(pos[name] && pos[name][0], b, `${tag} ${name}`);
      // 魁鉞：兩地與古籍一致
      const [p1, p2] = R.KUIYUE_PAIRS[ys];
      const kui = pos['天魁'][0];
      const yue = pos['天鉞'][0];
      yes((kui === p1 && yue === p2) || (kui === p2 && yue === p1), `${tag} 魁鉞兩地`);
      // 截路、空亡（古籍只給兩支）、旬空（旬中空亡兩支）
      yes(JIE_PAIR[ys].includes(pos['截路'][0]) && JIE_PAIR[ys].includes(pos['空亡'][0]), `${tag} 截路空亡`);
      const xun = Math.floor(R.sixtyIndex(ys, yb) / 10);
      yes([(10 - 2 * xun + 120) % 12, (11 - 2 * xun + 120) % 12].includes(pos['旬空'][0]), `${tag} 旬空`);
      // 命主、身主
      eq(a.soul, R.LIFE_MASTER[life], `${tag} 命主`);
      eq(a.body, R.BODY_MASTER[yb], `${tag} 身主`);
      // 長生起點、博士十二神（祿存起，陽男陰女順）、大限（命宮起局數歲，陽男陰女順）
      eq(BR.indexOf(a.palaces.find((p) => p.changsheng12 === '長生').earthlyBranch), R.CHANGSHENG_START[bureau], `${tag} 長生起點`);
      const forward = (gender === '男') === (ys % 2 === 0);
      const luPos = minors.祿存;
      SEQ.forEach((name, k) => eq(palaceAt[(((luPos + (forward ? k : -k)) % 12) + 12) % 12].boshi12, name, `${tag} 博士十二神 ${name}`));
      eq(a.palaces.find((p) => p.name === '命宮').decadal.range[0], bureau, `${tag} 大限起歲`);
      eq(palaceAt[(life + (forward ? 1 : 11)) % 12].decadal.range[0], bureau + 10, `${tag} 大限方向`);
    }
  }
}

// 每一顆引擎輸出的星都必須分類（新增、改名的星會被擋下）
const classified = [...ledger.verified, ...Object.keys(ledger.verifiedWithNote), ...ledger.noQuanshuVerse];
const unclassified = [...seenStars].filter((n) => !classified.includes(n));
assert.deepEqual(unclassified, [], `引擎輸出的星尚未分類：${unclassified.join('、')}`);
checks += 1;
const dup = classified.filter((n, i, all) => all.indexOf(n) !== i);
assert.deepEqual(dup, [], `一顆星不能同時在兩類：${dup.join('、')}`);
checks += 1;
yes(ledger.bookInternalConflict['長生十二神方向'], '書內矛盾必須寫明');

console.log(`ziwei-quanshu-reference: ${checks} checks passed（${charts} 盤）｜古籍口訣一致 ${ledger.verified.length} 顆、口訣含糊但位置一致 ${Object.keys(ledger.verifiedWithNote).length} 顆、古籍無口訣 ${ledger.noQuanshuVerse.length} 顆、書內矛盾 ${Object.keys(ledger.bookInternalConflict).length} 項`);
