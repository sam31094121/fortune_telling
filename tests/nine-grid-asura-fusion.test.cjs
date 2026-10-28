/**
 * 阿修羅九宮融會測試（根→盤→合→位→名→斷）
 * ============================================================================
 * 驗證：順序固定；每個事實都能對回既有後端結果（不新增運算）；阿修羅短句全數通過 lintAsuraVoice；
 * 大師數不借單位數解說；沒填姓名不編造；同輸入同輸出；不改動輸入。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const load = require('./helpers/load-iching-shensha-ui.cjs');

const root = path.resolve(__dirname, '..');
const cache = new Map();
const L = (file) => load(file, 'zh-Hant', cache);

// lintAsuraVoice 在 server-only 檔內；測試時去掉那一行直接載入。
const voiceSrc = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-voice.ts'), 'utf8').replace("import 'server-only';", '');
const voice = { exports: {} };
new Function('module', 'exports', ts.transpileModule(voiceSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(voice, voice.exports);
const { lintAsuraVoice } = voice.exports;

const { parseBirthDate, buildNineGridStudy } = L('lib/nine-grid-numbers.ts');
const { buildNineGridNameOverlay } = L('lib/nine-grid-name-overlay.ts');
const { calculateLifeCode } = L('lib/western-life-code/engine.ts');
const { buildAsuraFusion, ASURA_FUSION_VERSION } = L('lib/nine-grid-asura-fusion.ts');
const meanings = JSON.parse(fs.readFileSync(path.join(root, 'docs/技能戰鬥檔案/西方生命密碼/主數解說.json'), 'utf8')).entries;

let checks = 0;
const ok = (cond, msg) => { checks += 1; assert.ok(cond, msg); };
const BAD = /必定|註定|大凶|血光|死|一定會/;

const studyOf = (birthDate) => buildNineGridStudy(parseBirthDate(birthDate));
const lifeOf = (birthDate) => calculateLifeCode({ birthDate });
const lifePathCard = (life) => life.cards.find((c) => c.id === 'lifePath');

// 取樣：找出各種情境（主數在盤／不在盤／大師數）各至少一組。
const seen = { present: 0, absent: 0, master: 0, noMissing: 0, missing: 0 };
const samples = [];
for (let year = 1960; year <= 2008 && samples.length < 400; year += 1) {
  for (const md of ['01-09', '03-15', '06-28', '07-02', '09-20', '11-29', '12-31']) samples.push(`${year}-${md}`);
}

const NAME_GRIDS = [
  { key: 'tian', label: '天格', value: 12 }, { key: 'ren', label: '人格', value: 25 },
  { key: 'di', label: '地格', value: 13 }, { key: 'wai', label: '外格', value: 6 }, { key: 'zong', label: '總格', value: 35 },
];
const NAME_CHARS = [{ char: '王', strokeCount: 4 }, { char: '小', strokeCount: 3 }, { char: '明', strokeCount: 8 }];

for (const birthDate of samples) {
  const study = studyOf(birthDate);
  const life = lifeOf(birthDate);
  const frozen = JSON.stringify({ study, life: lifePathCard(life) });
  const fusion = buildAsuraFusion({ study, lifeCode: life });

  ok(fusion.version === ASURA_FUSION_VERSION, '版本');
  ok(fusion.steps.map((s) => s.key).join(',') === 'root,grid,join,luoshu,name,verdict', `步驟順序 ${birthDate}`);
  ok(fusion.steps.map((s) => s.mark).join('') === '根盤合位名斷', '步驟名');

  const card = lifePathCard(life);
  const value = card.final_value;
  const isMaster = [11, 22, 33].includes(value);
  const root_ = fusion.steps[0];
  const join = fusion.steps[2];
  ok(fusion.basis.lifePath === value, `生命主數必須等於引擎結果 ${birthDate}`);
  ok(root_.facts[0] === `生命主數 ${value}`, '根的事實');

  // 解說只在引擎核可、非大師數時才出現，且一字不改地來自主數解說.json
  const entry = meanings.find((e) => e.number === value);
  const expectSource = card.interpretation && card.interpretation.review_status === 'SOURCE_CHECKED' && !isMaster && entry && entry.declaration;
  if (expectSource) {
    ok(root_.sources.length === 1 && root_.sources[0].text === entry.declaration, `根的解說必須原文照引 ${birthDate}`);
    seen.read = (seen.read || 0) + 1;
  } else {
    ok(root_.sources.length === 0, `未核可／大師數不得有解說 ${birthDate}`);
  }

  // 合：次數必須等於九宮格的計數
  if (isMaster) {
    seen.master += 1;
    ok(join.status === 'SKIPPED' && fusion.basis.mainInGrid === 'not-applicable', `大師數略過合 ${birthDate}`);
  } else {
    const count = study.cells.find((c) => c.digit === value).count;
    ok(join.status === 'READY', '合應成立');
    ok(join.facts[0].includes(`出現 ${count} 次`), `合的次數必須等於九宮格 ${birthDate}`);
    ok(fusion.basis.mainInGrid === (count > 0 ? 'present' : 'absent'), '在盤／不在盤');
    seen[count > 0 ? 'present' : 'absent'] += 1;
    // 位：主數所在宮必須是洛書同號宮，說明文字原文照引
    const palace = study.luoshu.palaces.find((p) => p.digit === value);
    const luoshu = fusion.steps[3];
    ok(luoshu.sources.length === 1 && luoshu.sources[0].text === palace.speech.text, `位的說明必須原文照引 ${birthDate}`);
    ok(luoshu.facts.some((f) => f.includes(palace.palace)), '位的宮名');
  }

  // 盤：缺的格數、亮線數與九宮格一致
  ok(fusion.basis.missingCount === study.summary.missing.length, '缺格數');
  seen[study.summary.missing.length ? 'missing' : 'noMissing'] += 1;
  const grid = fusion.steps[1];
  ok(grid.facts[0] === study.summary.text, '盤的事實必須等於九宮格摘要');
  for (const src of grid.sources) ok(study.digits.some((d) => src.text === `${d.digit}（${d.title}）：${d.trait}` && src.provenanceLabel === d.provenanceLabel), '盤的解說必須來自九宮格');

  // 沒填姓名：不編造
  const name = fusion.steps[4];
  ok(name.status === 'NOT_PROVIDED' && name.facts.length === 0 && name.sources.length === 0 && fusion.basis.nameFill === 'not-provided', '未填姓名不得有內容');

  // 阿修羅短句：全數通過話術規範，且不含禁字
  for (const step of fusion.steps) {
    ok(step.asura.length > 0, `每步都要有阿修羅短句 ${step.key}`);
    for (const line of step.asura) {
      const problems = lintAsuraVoice(line);
      ok(problems.length === 0, `話術不合規 ${birthDate} ${step.key}「${line}」：${problems.join('、')}`);
      ok(!BAD.test(line), `禁字：${line}`);
    }
  }
  ok(fusion.steps[5].asura.length >= 1, '斷');

  // 同輸入同輸出；不改動輸入
  assert.equal(JSON.stringify(buildAsuraFusion({ study, lifeCode: life })), JSON.stringify(fusion));
  checks += 1;
  ok(JSON.stringify({ study, life: lifePathCard(life) }) === frozen, `不得改動輸入 ${birthDate}`);
}

// 情境覆蓋：每一種分支都真的測到
for (const key of ['present', 'absent', 'master', 'missing', 'read']) ok((seen[key] || 0) > 0, `取樣沒有涵蓋情境：${key}`);

// 有姓名：名的事實來自 nameOverlay
for (const birthDate of ['1974-06-28', '1985-03-05', '1990-11-29']) {
  const study = studyOf(birthDate);
  const overlay = buildNineGridNameOverlay(study, '王小明', NAME_GRIDS, NAME_CHARS);
  const fusion = buildAsuraFusion({ study, lifeCode: lifeOf(birthDate), nameOverlay: overlay });
  const name = fusion.steps[4];
  ok(name.status === 'READY', '有姓名名步驟應成立');
  ok(name.facts[0] === `五格：${overlay.grids.map((g) => `${g.label}${g.value}`).join('、')}`, '五格必須等於姓名運算');
  const newly = overlay.lines.filter((l) => !l.litByBirth && l.litWithName).length;
  ok(fusion.basis.nameFill === (newly > 0 ? 'filled' : 'unfilled'), '補亮判斷必須等於姓名疊圖結果');
  ok(newly > 0 ? name.asura.some((l) => l.includes(`補亮 ${newly} 條`)) : name.asura.some((l) => l.includes('未補亮')), '補亮條數');
  ok(name.sources[0].text === overlay.note && name.sources[0].provenanceLabel === overlay.label, '姓名來源標示');
  for (const line of fusion.steps.flatMap((s) => s.asura)) ok(lintAsuraVoice(line).length === 0 && !BAD.test(line), `話術：${line}`);
}

// 生命密碼算不出來：根誠實標示，不編造
{
  const study = studyOf('1974-06-28');
  const fusion = buildAsuraFusion({ study, lifeCode: null });
  ok(fusion.steps[0].status === 'UNAVAILABLE' && fusion.basis.lifePath === null && fusion.steps[2].status === 'SKIPPED', '沒有生命密碼時要誠實標示');
  ok(fusion.steps[0].sources.length === 0, '沒有生命密碼不得有解說');
}

// 原始碼守則：純函式、不隨機、不連網；API 與技能檔案有登記
const src = fs.readFileSync(path.join(root, 'lib/nine-grid-asura-fusion.ts'), 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/Math\.random|Date\.now|fetch\(|server-only/.test(code), '融會必須是純函式');
ok(fs.readFileSync(path.join(root, 'app/api/nine-grid/asura/route.ts'), 'utf8').includes('buildAsuraFusion'), '融會 API 必須接上 buildAsuraFusion');
ok(!/asuraFusion|nine-grid-asura-fusion/.test(fs.readFileSync(path.join(root, 'app/api/nine-grid/route.ts'), 'utf8')), '原本的 /api/nine-grid 不得被改動');
const skillDoc = path.join(root, 'docs/技能戰鬥檔案/鬼魅阿修羅/九宮融會.md');
ok(fs.existsSync(skillDoc), '阿修羅技能檔案必須有九宮融會.md');
ok(fs.readFileSync(path.join(root, 'docs/技能戰鬥檔案/鬼魅阿修羅/技能清單.md'), 'utf8').includes('九宮融會.md'), '技能清單必須列出九宮融會');

// 前端只照印：用真實融會結果渲染卡片，六個步驟依序出現，每一句話都照後端原文印出，沒有 undefined
{
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const AsuraFusionCard = L('components/nine-grid/AsuraFusionCard.tsx').default;
  const study = studyOf('1974-06-28');
  const overlay = buildNineGridNameOverlay(study, '王小明', NAME_GRIDS, NAME_CHARS);
  const fusion = buildAsuraFusion({ study, lifeCode: lifeOf('1974-06-28'), nameOverlay: overlay });
  const html = renderToStaticMarkup(React.createElement(AsuraFusionCard, { fusion }));
  const order = fusion.steps.map((s) => html.indexOf(`data-fusion-step="${s.key}"`));
  ok(order.every((n, i) => n >= 0 && (i === 0 || n > order[i - 1])), '六個步驟必須依序出現在畫面');
  for (const step of fusion.steps) {
    for (const line of [...step.asura, ...step.facts, ...step.sources.flatMap((x) => [x.text, x.provenanceLabel])]) {
      ok(html.includes(line), `畫面必須照印後端原文：${line.slice(0, 20)}`);
    }
  }
  ok(!/undefined|NaN|\[object/.test(html), '畫面不得出現 undefined');
  ok(html.includes(fusion.label), '畫面必須印出來源標示');
  ok(renderToStaticMarkup(React.createElement(AsuraFusionCard, { fusion: null })) === '', '舊格式或沒有資料時不顯示');
  const src = fs.readFileSync(path.join(root, 'components/nine-grid/AsuraFusionCard.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/Math\.|Date|fetch\(|useState|useEffect|\.sort\(|\.filter\(|\.reduce\(/.test(src), '前端不得運算、不得自己篩選或排序');
}

console.log(`PASS: ${checks} checks | birthdays=${samples.length} | present=${seen.present} absent=${seen.absent} master=${seen.master} missing=${seen.missing} noMissing=${seen.noMissing} reviewedReadings=${seen.read}`);
