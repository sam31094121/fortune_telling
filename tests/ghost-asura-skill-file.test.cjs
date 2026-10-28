/**
 * 鬼魅阿修羅技能檔案：後端運算、前端顯示，固定前後順序（守門）
 * ============================================================================
 * 1. 區塊順序固定（壹…拾貳＋拾參 技能清單），編號連續、不重複；輸出可序列化、同輸入同輸出。
 * 2. 內容全由後端給：每一個內容匯出（術語表、柱位、承諾條款、固定名稱…）都完整、依原順序出現在輸出裡。
 * 3. 技能清單順序＝ASURA_SKILLS＝技能清單.md 的列順序；融會技能（九宮融會）在名相技能之後。
 * 4. 前端只照印：頁面與顯示層程式碼沒有任何中文內容、不匯入內容檔、不排序／篩選／反轉。
 * 5. 阿修羅口吻的短句通過 lintAsuraVoice。
 * 6. 只有一份內容來源：舊位置 app/ghost-asura/skill/content.ts 不得再出現。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const load = require('./helpers/load-iching-shensha-ui.cjs');

const root = path.resolve(__dirname, '..');
const cache = new Map();
const L = (file) => load(file, 'zh-Hant', cache);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let checks = 0;
const ok = (cond, msg) => { checks += 1; assert.ok(cond, msg); };
const same = (a, b, msg) => { checks += 1; assert.equal(JSON.stringify(a), JSON.stringify(b), msg); };

// lintAsuraVoice 在 server-only 檔內；測試時去掉那一行直接載入。
const voiceSrc = read('lib/server/ghost-asura-voice.ts').replace("import 'server-only';", '');
const voice = { exports: {} };
new Function('module', 'exports', ts.transpileModule(voiceSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(voice, voice.exports);

const fileMod = L('lib/ghost-asura-skill-file.ts');
const alias = L('lib/asura-display-alias.ts');
const RAW = L('lib/ghost-asura-skill-content.ts');
const { buildAsuraSkillFile, buildSkillList, SECTION_ORDER, ASURA_FUSION_SKILLS, ASURA_SKILL_FILE_VERSION } = fileMod;
const file = buildAsuraSkillFile();
const C = alias.asuraDeepScrub(RAW);

// 1. 順序
const EXPECTED_ORDER = ['mark', 'law', 'cards', 'voice', 'layers', 'count', 'terms', 'names', 'reading', 'visual', 'promise', 'scope', 'skills'];
same([...SECTION_ORDER], EXPECTED_ORDER, '區塊順序固定');
same(file.sections.map((s) => s.key), EXPECTED_ORDER, '輸出順序＝固定順序');
same(file.sections.map((s) => s.order), EXPECTED_ORDER.map((_, i) => i + 1), '編號從 1 連續');
ok(new Set(file.sections.map((s) => s.id)).size === file.sections.length, '區塊 id 不重複');
same(file.sections.slice(0, 12).map((s) => s.seal), ['壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖', '拾', '拾壹', '拾貳'], '前十二區的印記順序不變');
ok(file.sections[12].seal === '拾參' && file.sections[12].id === 'skills', '技能清單固定在最後');
ok(file.version === ASURA_SKILL_FILE_VERSION && /^ASURA_SKILL_FILE_V\d+$/.test(file.version), '版本標記');
same(JSON.parse(JSON.stringify(file)), file, '可序列化（JSON 來回相同）');
same(buildAsuraSkillFile(), file, '同輸入同輸出');

// 2. 內容完整、依原順序（逐項對回內容檔）
const sec = (k) => file.sections.find((s) => s.key === k);
const blocksOf = (k, type) => sec(k).blocks.filter((b) => b.type === type);
const walk = (blocks, fn) => { for (const b of blocks) { fn(b); if (b.type === 'details') walk(b.blocks, fn); } };
const allBlocks = []; for (const s of file.sections) walk(s.blocks, (b) => allBlocks.push(b));

same(blocksOf('terms', 'pairs')[0].rows, C.TERMS, '術語表：全部、依原順序');
same(blocksOf('terms', 'pillars')[0].rows, ['year', 'month', 'day', 'hour'].map((k) => [alias.ASURA_TIME_TERMS[k].unit, alias.ASURA_TIME_TERMS[k].term]), '柱位：年月日時順序');
ok(blocksOf('terms', 'note').map((b) => b.text).join('|') === [C.TERMS_NOTE, C.PILLARS_NOTE].join('|'), '術語與柱位的說明');
same(blocksOf('promise', 'promises')[0].items.map((p) => [p.title, p.items]), C.PROMISES.map((p) => [p.title, p.items]), '三大承諾：標題與條款依原順序');
same(blocksOf('promise', 'twoCol')[0].left.items, C.USAGE_RULES.allow, '使用規則：允許');
same(blocksOf('promise', 'twoCol')[0].right.items, C.USAGE_RULES.deny, '使用規則：禁止');
same(blocksOf('names', 'nameGrid')[0].items, C.FIXED_NAMES.map(([, a]) => a), '固定名稱表依原順序');
same(blocksOf('reading', 'levels')[0].items.map((l) => [l.level, l.name, l.items]), C.READING_LEVELS.map((l) => [l.level, l.name, l.items]), '四層解盤');
same(blocksOf('layers', 'showcase')[0].items.map((i) => i.title), C.FIXED_COPY.map((c) => c.asura), '固定話術方向');
same(blocksOf('law', 'ironRules')[0].items, C.BACKEND_LAW.rules, '最高鐵律');
same(blocksOf('count', 'table')[0].rows, C.COUNT_LAW.examples.map((r) => [r.state, r.backend, r.translated, r.shown, r.result]), '數量鐵律範例表');
const checklist = []; walk(sec('scope').blocks, (b) => { if (b.type === 'checklist') checklist.push(...b.items); });
same(checklist, C.CHECKLIST, '驗收清單');
same(file.closing, C.CLOSING, '結語');
same(sec('mark').blocks.find((b) => b.type === 'facts').rows.map((r) => [r.label, r.value]), C.SKILL_MARK.facts.map((f) => [f.label, f.value]), '技能印記事實列');

// 3. 技能清單：順序＝ASURA_SKILLS＝技能清單.md
const skillBlocks = blocksOf('skills', 'skillList');
same(skillBlocks[0].items.map((s) => s.name), alias.ASURA_SKILLS.map((s) => s.name), '名相技能順序＝ASURA_SKILLS');
same(skillBlocks[0].items.map((s) => s.order), alias.ASURA_SKILLS.map((_, i) => i + 1), '名相技能編號連續');
same(buildSkillList().map((s) => s.anchor), alias.ASURA_SKILLS.map((s) => s.anchor), 'buildSkillList 順序');
const doc = read('docs/技能戰鬥檔案/鬼魅阿修羅/技能清單.md');
const docAnchors = [...doc.matchAll(/id="skill-([a-z]+)"/g)].map((m) => m[1]);
same(docAnchors, alias.ASURA_SKILLS.map((s) => s.anchor), '技能清單.md 的列順序＝ASURA_SKILLS');
ok(skillBlocks[1].items.map((s) => s.name).join() === ASURA_FUSION_SKILLS.map((s) => s.name).join() && skillBlocks[1].items[0].name === '九宮融會', '融會技能：九宮融會');
same(skillBlocks[1].items.map((s) => s.order), ASURA_FUSION_SKILLS.map((_, i) => alias.ASURA_SKILLS.length + i + 1), '融會技能接在名相技能之後');
ok(doc.includes('九宮融會.md') && fs.existsSync(path.join(root, 'docs/技能戰鬥檔案/鬼魅阿修羅/九宮融會.md')), '文件列出九宮融會');
ok(fs.existsSync(path.join(root, 'docs/技能戰鬥檔案/鬼魅阿修羅/技能檔案後端化.md')), '技能檔案後端化.md 存在');

// 5. 阿修羅口吻
for (const s of [...skillBlocks[0].items, ...skillBlocks[1].items]) same(voice.exports.lintAsuraVoice(s.use), [], `技能 ${s.name} 話術規範`);
same(voice.exports.lintAsuraVoice(sec('skills').lead), [], '技能清單引言話術規範');
// 不得出現術數用語（上畫面的文字）
const forbidden = alias.ASURA_FORBIDDEN_TERMS;
const texts = []; (function collect(v) { if (typeof v === 'string') texts.push(v); else if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') Object.values(v).forEach(collect); })(skillBlocks);
for (const t of texts) ok(!forbidden.some((w) => t.includes(w)), `技能清單不得含術數用語：${t}`);

// 4. 前端只照印
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const pageSrc = strip(read('app/ghost-asura/skill/page.tsx'));
const blocksSrc = strip(read('app/ghost-asura/skill/AsuraSkillBlocks.tsx'));
for (const [name, src] of [['page.tsx', pageSrc], ['AsuraSkillBlocks.tsx', blocksSrc]]) {
  ok(!/[一-鿿]/.test(src), `${name} 不得內建中文內容（文字全部來自後端）`);
  ok(!/ghost-asura-skill-content/.test(src), `${name} 不得直接匯入內容檔`);
  ok(!/\.(sort|filter|reverse|reduce|flatMap)\(/.test(src), `${name} 不得排序、篩選、反轉`);
  ok(!/Math\.|Date\.|fetch\(|useState|useEffect/.test(src), `${name} 不得運算或自行取資料`);
}
ok(/buildAsuraSkillFile\(\)/.test(pageSrc) && /FILE\.sections\.map/.test(pageSrc), '頁面依後端資料的順序輸出');
// 顯示層必須認得後端會送出的每一種 block
const handled = new Set([...blocksSrc.matchAll(/case '([A-Za-z]+)':/g)].map((m) => m[1]));
const used = new Set(allBlocks.map((b) => b.type));
for (const t of used) ok(handled.has(t), `顯示層缺少版型：${t}`);
const apiSrc = read('app/api/ghost-asura/skill-file/route.ts');
ok(/buildAsuraSkillFile\(\)/.test(apiSrc) && /export async function GET/.test(apiSrc), 'API 提供同一份資料');

// 6. 只有一份內容來源
ok(!fs.existsSync(path.join(root, 'app/ghost-asura/skill/content.ts')), '舊位置 content.ts 不得再出現');
ok(fs.existsSync(path.join(root, 'lib/ghost-asura-skill-content.ts')), '內容檔在後端 lib/');

console.log(`PASS: ${checks} checks | sections=${file.sections.length} blocks=${allBlocks.length} types=${used.size} skills=${skillBlocks[0].items.length}+${skillBlocks[1].items.length} version=${file.version}`);
