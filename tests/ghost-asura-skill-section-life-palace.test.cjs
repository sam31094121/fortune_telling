// 鬼魅阿修羅｜技能欄〈鎖定盤命宮 21 筆單一表〉核對（14:21）：筆數＝後端、每筆恰好一次、每筆恰好一欄（一般路／命宮例外／排除）、登錄狀態未翻。
// 執行：node tests/ghost-asura-skill-section-life-palace.test.cjs（不需 dev server）
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, load } = require('./fixtures/ghost-asura-nature/load.cjs');
const disp = load('lib/server/ghost-asura-display.ts');
let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
const dir = path.join(root, 'docs/技能戰鬥檔案/鬼魅阿修羅');
const j = JSON.parse(fs.readFileSync(path.join(dir, '技能欄-四源驗證清單.json'), 'utf8'));
const md = fs.readFileSync(path.join(dir, '技能欄-四源驗證清單.md'), 'utf8');
const ev = disp.computeNatureCard(disp.normalizeAsuraInput({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', name: '曾威艷' }), false).evidence;
const rows = j.life_palace_table.rows;
// 14:27：21 筆＋命宮檔案欄位素材 10 筆＝31
const TOTAL = 31;
assert.equal(ev.length, TOTAL, `backend 命宮 items = ${TOTAL}`); checks++;
assert.equal(rows.length, TOTAL, `skill-section rows = ${TOTAL}`); checks++;
const k = (item, kind, traitKey) => `${item}|${kind}|${traitKey}`;
const rowKeys = rows.map((r) => k(r.item, r.evidence_kind, r.traitKey));
for (const e of ev) ok(rowKeys.filter((x) => x === k(e.refs[0].item, e.kind, e.traitKey)).length === 1, `exactly once: ${e.refs[0].item} ${e.kind}`);
ok(new Set(rowKeys).size === TOTAL, 'no duplicate rows');
const PATHS = ['NORMAL', 'LIFE_PALACE_EXCEPTION', 'EXCLUDED'];
for (const r of rows) ok(PATHS.includes(r.path), `row ${r.no} in exactly one path`);
const c = j.life_palace_table.counts;
ok(c.total === TOTAL && c.NORMAL + c.LIFE_PALACE_EXCEPTION + c.EXCLUDED === TOTAL, `counts add up to ${TOTAL}`);
for (const p of PATHS) ok(c[p] === rows.filter((r) => r.path === p).length, `count ${p}`);
// md 表：21 列，每列三欄恰好一個 ●
const sec = md.slice(md.indexOf(`### 紫微｜鎖定盤命宮 ${TOTAL} 筆單一表`), md.indexOf('核對：node tests/ghost-asura-skill-section-life-palace.test.cjs'));
const lines = sec.split(/\r?\n/).filter((l) => /^\| \d+ \|/.test(l));
assert.equal(lines.length, TOTAL, `md table rows = ${TOTAL}`); checks++;
for (const l of lines) { const cells = l.split('|').map((x) => x.trim()); ok([cells[6], cells[7], cells[8]].filter((x) => x === '●').length === 1, `md row ${cells[1]} exactly one column`); }
for (const e of ev) ok(lines.filter((l) => l.split('|')[2].trim() === e.refs[0].item.replace(/\|/g, '｜')).length >= 1, `md lists ${e.refs[0].item}`);
// 例外路是獨立標記，登錄狀態不得翻成 VERIFIED
const reg = JSON.parse(fs.readFileSync(path.join(root, 'docs/技能戰鬥檔案/紫微斗數/來源登記.json'), 'utf8'));
for (const id of ['C-ZIWEI-CHART', 'C-ZIWEI-CLASSICS']) ok(reg.claims.find((x) => x.claim_id === id).status === 'CONFLICT', `${id} stays CONFLICT`);
ok(j.admission_paths.some((p) => p.id === 'LIFE_PALACE_EXCEPTION' && /14:19/.test(p.source)), 'exception path rule recorded');
// 14:23 使用者決定：可產話術／只當資料 旗標與後端證據一致
const D = '使用者決定 2026-10-09 14:23';
ok(j.life_palace_table.wording_decisions.some((d) => d.source === D), '14:23 decision recorded');
const evOf = (r) => ev.find((e) => e.refs[0].item === r.item && e.kind === r.evidence_kind && e.traitKey === r.traitKey);
for (const r of rows) {
  ok(typeof r.wording_usable === 'boolean', `row ${r.no} has wording flag`);
  const e = evOf(r);
  ok(r.wording_usable ? e.listedOnly !== true : e.listedOnly === true, `row ${r.no} flag matches backend (${r.wording_usable ? 'usable' : 'data-only'})`);
}
ok(c.exception_with_wording === rows.filter((r) => r.wording_usable).length && c.exception_data_only === rows.filter((r) => !r.wording_usable).length, 'wording counts match rows');
assert.equal(c.exception_with_wording, 21); assert.equal(c.exception_data_only, 10); checks += 2;
const byNo = (n) => rows.find((r) => r.no === n);
ok(byNo(5).wording_usable && byNo(5).traitKey === 'NATURE.DECIDER' && evOf(byNo(5)).refs[0].source.includes(D), '#5 七殺本性 usable, decision on backend source');
const tl = load('lib/server/ghost-asura-translation-layer.ts');
const mats = tl.asuraWordingMaterials(ev);
for (const [no, key, txt, at] of [[19, 'MATERIAL.RESOURCE_EXECUTOR', '資源中的執行者', 'lib/ziwei-destiny-card.ts:107'], [20, 'MATERIAL.BREAKER_COMMANDER', '破局中的掌舵者', 'lib/ziwei-destiny-card.ts:104']]) {
  ok(byNo(no).wording_usable && byNo(no).traitKey === key && evOf(byNo(no)).material === true, `#${no} material flag`);
  ok(mats.some((m) => m.traitKey === key && m.source.includes(`「${txt}」`) && m.source.includes(at) && m.source.includes(D)), `#${no} available to translation layer`);
  const line = fs.readFileSync(path.join(root, 'lib/ziwei-destiny-card.ts'), 'utf8').split(/\r?\n/)[Number(at.split(':').pop()) - 1];
  ok(line.includes(`subtitle: '${txt}'`), `#${no} verbatim at ${at}`);
}
// 卡面四段定稿不變、素材不進前台
const nc = disp.computeNatureCard(disp.normalizeAsuraInput({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', name: '曾威艷' }), false);
const pub = JSON.stringify(nc.public ?? nc.pub ?? tl.toPublic(nc.card ?? nc));
for (const s of ['你向來都是硬骨加殺氣，不繞彎。兩股力在你身上：一手是秤，只秤結果，只秤效率；一手是戰旗，你走在最前面，軍隊跟著你衝。這就是你的底色。', '你不吃軟，不吃轟，你只認實力和結果。', '記住，一旦你開始猶豫和退讓，你就把自己磨鈍了。別怕得罪人，該硬就硬到底。']) ok(pub.includes(s), `card text unchanged: ${s.slice(0, 8)}`);
for (const s of ['資源中的執行者', '破局中的掌舵者', '老闆命', '決策者']) ok(!pub.includes(s), `not in public: ${s}`);
// 14:27：命宮檔案 武曲／七殺 全部既有欄位逐欄一筆素材——原文逐字對回 lib/ziwei-destiny-card.ts、表格有列、wording_source、翻譯層取得到、不進前台
{
  const persona = load('lib/server/ghost-asura-persona.ts');
  const D27 = persona.WORDING_DECISION_1427;
  const fileLines = fs.readFileSync(path.join(root, 'lib/ziwei-destiny-card.ts'), 'utf8').split(/\r?\n/);
  const FIELDS = ['subtitle', 'keywords', 'power', 'challenge', 'direction', 'action'];
  for (const star of ['武曲', '七殺']) ok(FIELDS.every((f) => persona.LIFE_PALACE_WORDING_MATERIAL.some((m) => m.star === star && m.field === f)), `${star} all existing fields opened`);
  for (const m of persona.LIFE_PALACE_WORDING_MATERIAL) {
    const ln = Number(m.at.split(' ')[0].split(':').pop());
    const src = fileLines[ln - 1];
    ok(src.includes(`${m.archetype}: {`) && src.includes(m.field === 'keywords' ? `keywords: ${m.text}` : `${m.field}: '${m.text}'`), `${m.traitKey} verbatim at :${ln}`);
    ok(mats.some((x) => x.traitKey === m.traitKey && x.source.includes(`「${m.text}」`) && x.source.includes(m.decision)), `${m.traitKey} in asuraWordingMaterials`);
    const row = rows.find((r) => r.traitKey === m.traitKey);
    ok(row && row.wording_usable === true && row.path === 'LIFE_PALACE_EXCEPTION' && row.wording_source === m.decision, `${m.traitKey} row flags`);
    if (m.decision === D27) ok(row.verbatim === m.text && lines.some((l) => l.includes(`原文「${m.text}」`)), `${m.traitKey} row verbatim in json + md`);
    const words = m.field === 'keywords' ? JSON.parse(m.text.replace(/'/g, '"')) : [m.text];
    for (const w of words) ok(!pub.includes(w), `${m.traitKey} not in public: ${w}`);
  }
  assert.equal(rows.filter((r) => r.wording_source === D27).length, 10); checks++;
  ok(j.life_palace_table.wording_decisions.some((d) => d.source === D27), '14:27 decision recorded');
}
// 14:29：〈紫微十四主星權威來源（古籍）〉——權威背景；章節存在、適用性旗標齊、引文有書／章節／URL、31 筆表不動
{
  const H = '## 紫微十四主星權威來源（古籍）';
  ok(md.includes(H) && md.indexOf(H) > md.indexOf(`### 紫微｜鎖定盤命宮 ${TOTAL} 筆單一表`), 'authority section in md');
  const A = j.ziwei_authority_sources;
  ok(A && A.title === '紫微十四主星權威來源（古籍）', 'authority section in json');
  const flag = (id) => A.applicability.find((a) => a.id === id);
  ok(flag('QISHA_CHAO_DOU').applicable === false && flag('QISHA_CHAO_DOU').condition.includes('寅申子午'), '七殺朝斗 not applicable');
  ok(flag('WUQU_SHOU_YUAN').applicable === false && flag('WUQU_SHOU_YUAN').quote.includes('武守命卯宫是也，余不是'), '武曲守垣 not applicable');
  ok(flag('MAOYOU_WUSHA_CAIGUAN').applicable === false && flag('MAOYOU_WUSHA_CAIGUAN').condition.includes('乙辛') && flag('MAOYOU_WUSHA_CAIGUAN').chart_fact.includes('甲'), '卯酉 財官格 condition 乙辛 not met');
  ok(/年干甲/.test(flag('WUQU_HUAKE_STEM').flag) && /宮干癸/.test(flag('WUQU_HUAKE_STEM').flag), '武曲化科 from year stem 甲, not palace stem 癸');
  for (const a of A.applicability) ok(md.includes(`| ${a.name} | **${a.flag}** |`), `md flag row ${a.name}`);
  // 本盤事實（引擎）：命宮酉、宮干癸、年干甲、命宮無火星
  const threeCore = load('lib/three-core-engine.ts'); const zwe = load('lib/ziwei/engine.ts');
  const tc = threeCore.computeThreeCore({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male' });
  const mingP = tc.ziwei.analysis.allPalaces.find((x) => x.key === 'MING');
  const astro = zwe.createZiweiAstrolabe(tc.ziwei.analysis.ziweiBirthInput);
  const ap = astro.palaces.find((x) => x.name === '命宮');
  ok(mingP.branch === '酉' && String(ap.earthlyBranch) === '酉' && String(ap.heavenlyStem) === '癸', 'chart: 命宮酉、宮干癸');
  ok(String(astro.chineseDate).startsWith('甲'), `chart: year stem 甲 (${astro.chineseDate})`);
  ok(![...ap.majorStars, ...ap.minorStars, ...ap.adjectiveStars].some((s) => String(s.name) === '火星'), 'chart: no 火星 in 命宮');
  // 引文：逐字、有書／章節／URL、已重抓核對；現代只轉述；unverified 有標
  for (const q of [...A.classical_verbatim, ...A.novel_verbatim]) ok(q.status === 'verbatim_retrieved' && q.text && q.source && /^https:\/\/zh\.wikisource\.org\//.test(q.url) && q.reverified_1429 === true, `classical ${q.star ?? ''}${q.item}`);
  for (const q of A.modern_paraphrase) ok(q.status === 'modern_paraphrase' && q.paraphrase && q.source, `modern ${q.item ?? q.source}`);
  ok(A.unverified.length > 0 && A.unverified.every((u) => u.status === 'unverified') && md.includes('**unverified**'), 'unverified marked');
  ok(A.counts.classical_verbatim === A.classical_verbatim.length && A.counts.stars === 14 && Object.keys(A.brightness_juan2_tables).length === 14, 'authority counts');
  ok(A.fengshen && /不是出自《封神演義》/.test(A.fengshen.conclusion) && A.fengshen.chapter99_verified.includes('七殺星　張　諱奎') && A.fengshen.chapter99_verified.includes('竇　諱榮（武曲）'), '封神 finding recorded');
  ok(/不改/.test(A.scope) && A.research_files.every((f) => fs.existsSync(path.join(root, f))), 'scope + research files on disk');
}
console.log(`ghost-asura-skill-section-life-palace: ${checks} checks passed`, JSON.stringify(c));
